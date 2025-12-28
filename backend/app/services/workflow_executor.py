"""工作流执行器 - 异步版本，支持真正的并行执行"""
import asyncio
import time
from datetime import datetime
from typing import Optional, Callable, Awaitable
from uuid import uuid4

from app.models.workflow import (
    Workflow,
    WorkflowNode,
    ExecutionResult,
    ExecutionStatus,
    LogLevel,
    LogEntry,
)
from app.executors import ExecutionContext, ModuleResult, registry
from app.services.workflow_parser import WorkflowParser, ExecutionGraph


class WorkflowExecutor:
    """工作流执行器 - 使用异步Playwright实现真正的并行执行"""
    
    def __init__(
        self,
        workflow: Workflow,
        on_log: Optional[Callable[[LogEntry], Awaitable[None]]] = None,
        on_node_start: Optional[Callable[[str], Awaitable[None]]] = None,
        on_node_complete: Optional[Callable[[str, ModuleResult], Awaitable[None]]] = None,
        on_variable_update: Optional[Callable[[str, any], Awaitable[None]]] = None,
        on_data_row: Optional[Callable[[dict], Awaitable[None]]] = None,
        headless: bool = False,
    ):
        self.workflow = workflow
        self.on_log = on_log
        self.on_node_start = on_node_start
        self.on_node_complete = on_node_complete
        self.on_variable_update = on_variable_update
        self.on_data_row = on_data_row
        self.headless = headless
        
        self.context = ExecutionContext(headless=headless)
        self.graph: Optional[ExecutionGraph] = None
        self.is_running = False
        self.should_stop = False
        
        self.executed_nodes = 0
        self.failed_nodes = 0
        self.start_time: Optional[datetime] = None
        
        self._result: Optional[ExecutionResult] = None
        
        # 并行执行相关
        self._executed_node_ids: set[str] = set()
        self._executing_node_ids: set[str] = set()
        self._node_lock = asyncio.Lock()
        self._pending_nodes: dict[str, set[str]] = {}
        self._last_data_rows_count = 0
        self._sent_data_rows_count = 0
        self._running_tasks: set[asyncio.Task] = set()  # 跟踪所有运行中的任务


    async def _log(self, level: LogLevel, message: str, node_id: Optional[str] = None, 
                   details: Optional[dict] = None, duration: Optional[float] = None,
                   is_user_log: bool = False, is_system_log: bool = False):
        """记录日志"""
        log_details = details.copy() if details else {}
        log_details['is_user_log'] = is_user_log
        log_details['is_system_log'] = is_system_log
        
        entry = LogEntry(
            id=str(uuid4()),
            timestamp=datetime.now(),
            level=level,
            node_id=node_id,
            message=message,
            details=log_details,
            duration=duration,
        )
        if self.on_log:
            try:
                await self.on_log(entry)
            except Exception as e:
                print(f"发送日志失败: {e}")
    
    async def _send_data_row(self, row_data: dict):
        """发送数据行到前端"""
        MAX_PREVIEW_ROWS = 20
        if self._sent_data_rows_count >= MAX_PREVIEW_ROWS:
            return
        if self.on_data_row:
            try:
                await self.on_data_row(row_data)
            except Exception as e:
                print(f"发送数据行失败: {e}")
        self._sent_data_rows_count += 1
    
    async def _notify_node_start(self, node_id: str):
        """通知节点开始执行"""
        if self.on_node_start:
            try:
                await self.on_node_start(node_id)
            except Exception as e:
                print(f"通知节点开始失败: {e}")
    
    async def _notify_node_complete(self, node_id: str, result: ModuleResult):
        """通知节点执行完成"""
        if self.on_node_complete:
            try:
                await self.on_node_complete(node_id, result)
            except Exception as e:
                print(f"通知节点完成失败: {e}")
    
    async def _notify_variable_update(self, name: str, value: any):
        """通知变量更新"""
        if self.on_variable_update:
            try:
                await self.on_variable_update(name, value)
            except Exception as e:
                print(f"通知变量更新失败: {e}")

    async def _execute_parallel(self, node_ids: list[str]):
        """并行执行多个节点分支"""
        if not node_ids or self.should_stop:
            return
        
        async with self._node_lock:
            nodes_to_execute = [
                nid for nid in node_ids 
                if nid not in self._executed_node_ids and nid not in self._executing_node_ids
            ]
            if not nodes_to_execute:
                return
            for nid in nodes_to_execute:
                self._executing_node_ids.add(nid)
        
        # 调试：打印要执行的节点
        for nid in nodes_to_execute:
            node = self.graph.get_node(nid)
            if node:
                label = node.data.get('label', node.type)
                print(f"[DEBUG] 准备执行节点: {nid} ({node.type}: {label})")
        
        if len(nodes_to_execute) == 1:
            if self.should_stop:
                return
            task = asyncio.create_task(self._execute_from_node(nodes_to_execute[0]))
            self._running_tasks.add(task)
            try:
                await task
            except asyncio.CancelledError:
                pass
            finally:
                self._running_tasks.discard(task)
        else:
            await self._log(LogLevel.INFO, f"🔀 检测到 {len(nodes_to_execute)} 个分支，并行执行...")
            tasks = []
            for node_id in nodes_to_execute:
                if self.should_stop:
                    break
                task = asyncio.create_task(self._execute_from_node(node_id))
                self._running_tasks.add(task)
                tasks.append(task)
            
            if tasks:
                try:
                    await asyncio.gather(*tasks, return_exceptions=True)
                except asyncio.CancelledError:
                    pass
                finally:
                    for task in tasks:
                        self._running_tasks.discard(task)
            
            if not self.should_stop:
                await self._log(LogLevel.INFO, f"🔀 {len(nodes_to_execute)} 个分支执行完成")
    
    async def _execute_from_node(self, node_id: str):
        """从指定节点开始执行"""
        if self.should_stop:
            return
        
        async with self._node_lock:
            if node_id in self._executed_node_ids:
                return
            self._executing_node_ids.add(node_id)
        
        node = self.graph.get_node(node_id)
        if not node:
            async with self._node_lock:
                self._executing_node_ids.discard(node_id)
            return
        
        result = await self._execute_node(node)
        
        async with self._node_lock:
            self._executed_node_ids.add(node_id)
            self._executing_node_ids.discard(node_id)
        
        if self.should_stop:
            return
        
        if self.context.should_break:
            return
        
        if self.context.should_continue:
            return
        
        if result and result.branch:
            next_nodes = self.graph.get_next_nodes(node_id, result.branch)
        else:
            next_nodes = self.graph.get_next_nodes(node_id)
        
        # 如果节点执行失败，不继续执行后续节点（除非是非关键节点）
        if result and not result.success:
            # 对于浏览器相关的关键节点，失败后不继续
            if node.type in ('open_page', 'click_element', 'input_text', 'wait_element', 'select_dropdown'):
                print(f"[DEBUG] 关键节点 {node.type} 失败，停止后续执行")
                return
        
        if node.type in ('loop', 'foreach'):
            body_nodes = self.graph.get_loop_body_nodes(node_id)
            done_nodes = self.graph.get_loop_done_nodes(node_id)
            await self._handle_loop(node, body_nodes, done_nodes)
        else:
            await self._notify_successors(next_nodes, node_id)


    async def _notify_successors(self, next_nodes: list[str], completed_node_id: str):
        """通知后继节点当前节点已完成"""
        if not next_nodes or self.should_stop:
            return
        
        nodes_ready_to_execute = []
        
        async with self._node_lock:
            for next_id in next_nodes:
                if next_id in self._executed_node_ids or next_id in self._executing_node_ids:
                    continue
                
                prev_nodes = self.graph.get_prev_nodes(next_id)
                
                if len(prev_nodes) <= 1:
                    nodes_ready_to_execute.append(next_id)
                    continue
                
                if next_id not in self._pending_nodes:
                    self._pending_nodes[next_id] = set(
                        pid for pid in prev_nodes if pid not in self._executed_node_ids
                    )
                
                self._pending_nodes[next_id].discard(completed_node_id)
                
                if len(self._pending_nodes[next_id]) == 0:
                    nodes_ready_to_execute.append(next_id)
                    del self._pending_nodes[next_id]
                else:
                    remaining = len(self._pending_nodes[next_id])
                    await self._log(LogLevel.INFO, f"⏳ 等待汇合: 还有 {remaining} 个前驱分支未完成")
        
        if nodes_ready_to_execute:
            await self._execute_parallel(nodes_ready_to_execute)

    async def _execute_node(self, node: WorkflowNode) -> Optional[ModuleResult]:
        """执行单个节点"""
        if self.should_stop:
            return None
        
        if node.type in ('group', 'note'):
            return ModuleResult(success=True, message="跳过")
        
        # 检查节点是否被禁用
        if node.data.get('disabled', False):
            label = node.data.get('label', node.type)
            return ModuleResult(success=True, message=f"已跳过（禁用）")
        
        label = node.data.get('label', node.type)
        print(f"[DEBUG] 开始执行节点: {node.id} ({node.type}: {label})")
        
        await self._notify_node_start(node.id)
        
        executor = registry.get(node.type)
        if not executor:
            print(f"[DEBUG] 未找到执行器: {node.type}")
            await self._log(LogLevel.WARNING, f"未知的模块类型: {node.type}", node_id=node.id)
            return ModuleResult(success=True, message=f"跳过未知模块: {node.type}")
        
        config = node.data.get('config', None)
        if config is None:
            # 配置直接在 node.data 中，而不是在 config 子字段
            config = node.data
        print(f"[DEBUG] 节点配置: {config}")
        
        start_time = time.time()
        
        try:
            print(f"[DEBUG] 调用执行器: {node.type}")
            result = await executor.execute(config, self.context)
            print(f"[DEBUG] 执行器返回: success={result.success}, message={result.message}, error={result.error}")
            
            # 处理子流程调用
            if node.type == 'subflow' and result.success and result.data:
                subflow_group_id = result.data.get('subflow_group_id')
                subflow_name = config.get('subflowName', '')
                if subflow_group_id:
                    subflow_result = await self._execute_subflow_group(subflow_group_id, subflow_name)
                    if not subflow_result.success:
                        result = subflow_result
            
            duration = (time.time() - start_time) * 1000
            result.duration = duration
            
            self.executed_nodes += 1
            
            if result.success:
                is_user_log = node.type == 'print_log'
                log_level = LogLevel.INFO
                if is_user_log and result.log_level:
                    level_map = {'info': LogLevel.INFO, 'warning': LogLevel.WARNING, 
                                 'error': LogLevel.ERROR, 'success': LogLevel.SUCCESS}
                    log_level = level_map.get(result.log_level, LogLevel.INFO)
                
                await self._log(log_level, f"[{label}] {result.message}", 
                               node_id=node.id, duration=duration, is_user_log=is_user_log)
            else:
                self.failed_nodes += 1
                print(f"[ERROR] 节点失败: {label} - {result.error}")
                await self._log(LogLevel.ERROR, f"[{label}] {result.error}", 
                               node_id=node.id, duration=duration)
            
            current_rows_count = len(self.context.data_rows)
            if current_rows_count > self._last_data_rows_count:
                for i in range(self._last_data_rows_count, current_rows_count):
                    await self._send_data_row(self.context.data_rows[i])
                self._last_data_rows_count = current_rows_count
            
            await self._notify_node_complete(node.id, result)
            return result
            
        except Exception as e:
            import traceback
            duration = (time.time() - start_time) * 1000
            self.failed_nodes += 1
            error_msg = f"执行异常: {str(e)}"
            print(f"[ERROR] 节点 {node.id} ({label}) 执行失败: {e}")
            traceback.print_exc()
            await self._log(LogLevel.ERROR, f"[{label}] {error_msg}", node_id=node.id, duration=duration)
            result = ModuleResult(success=False, error=error_msg, duration=duration)
            await self._notify_node_complete(node.id, result)
            return result

    def _parse_dimension(self, value, default: int = 300) -> int:
        """解析尺寸值，支持数字和字符串（如 '300px'）"""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            # 移除 'px' 后缀并转换为数字
            try:
                return int(value.replace('px', '').strip())
            except ValueError:
                return default
        return default

    def _get_subflow_node_ids(self) -> set[str]:
        """获取所有子流程分组内的节点ID"""
        subflow_node_ids = set()
        
        # 找出所有子流程分组
        subflow_groups = []
        for node in self.workflow.nodes:
            if node.type == 'group' and node.data.get('isSubflow', False):
                subflow_groups.append(node)
        
        # 对于每个子流程分组，找出其范围内的所有节点
        for group in subflow_groups:
            group_x = group.position.x
            group_y = group.position.y
            # 优先从 data 属性获取宽高（前端 NodeResizer 保存的），其次从 style 属性获取
            group_width = group.data.get('width')
            group_height = group.data.get('height')
            if group_width is None or group_height is None:
                style = group.style or {}
                group_width = group_width or style.get('width', 300)
                group_height = group_height or style.get('height', 200)
            # 确保宽高是数字类型
            group_width = self._parse_dimension(group_width, 300)
            group_height = self._parse_dimension(group_height, 200)
            
            for node in self.workflow.nodes:
                if node.id == group.id:
                    continue
                if node.type in ('group', 'note'):
                    continue
                # 检查节点是否在分组范围内
                node_x = node.position.x
                node_y = node.position.y
                if (group_x <= node_x <= group_x + group_width and
                    group_y <= node_y <= group_y + group_height):
                    subflow_node_ids.add(node.id)
        
        return subflow_node_ids

    async def _execute_subflow_group(self, group_id: str, subflow_name: str = None) -> ModuleResult:
        """执行子流程分组内的模块"""
        # 找到子流程分组 - 优先通过名称查找（因为导入后 ID 会变），ID 作为备用
        group_node = None
        
        # 优先通过名称查找
        if subflow_name:
            for node in self.workflow.nodes:
                if (node.type == 'group' and 
                    node.data.get('isSubflow') == True and 
                    node.data.get('subflowName') == subflow_name):
                    group_node = node
                    break
        
        # 如果通过名称找不到，尝试通过 ID 查找
        if not group_node and group_id:
            for node in self.workflow.nodes:
                if node.id == group_id and node.type == 'group':
                    group_node = node
                    break
        
        if not group_node:
            error_msg = f"找不到子流程分组: {subflow_name or group_id}"
            return ModuleResult(success=False, error=error_msg)
        
        subflow_name = group_node.data.get('subflowName', '子流程')
        await self._log(LogLevel.INFO, f"📦 开始执行子流程 [{subflow_name}]", is_system_log=True)
        
        # 获取分组的位置和大小
        # 优先从 data 属性获取宽高（前端 NodeResizer 保存的），其次从 style 属性获取
        group_x = group_node.position.x
        group_y = group_node.position.y
        group_width = group_node.data.get('width')
        group_height = group_node.data.get('height')
        if group_width is None or group_height is None:
            style = group_node.style or {}
            group_width = group_width or style.get('width', 300)
            group_height = group_height or style.get('height', 200)
        # 确保宽高是数字类型
        group_width = self._parse_dimension(group_width, 300)
        group_height = self._parse_dimension(group_height, 200)
        
        # 调试：打印分组范围
        print(f"[DEBUG] 子流程分组范围: x={group_x}, y={group_y}, width={group_width}, height={group_height}")
        print(f"[DEBUG] 分组 data.width={group_node.data.get('width')}, data.height={group_node.data.get('height')}")
        
        # 找出在分组范围内的所有节点
        nodes_in_group = []
        for node in self.workflow.nodes:
            if node.id == group_node.id:
                continue
            if node.type in ('group', 'note'):
                continue
            # 检查节点是否在分组范围内
            node_x = node.position.x
            node_y = node.position.y
            # 节点在分组范围内的判断：节点左上角在分组内
            if (group_x <= node_x <= group_x + group_width and
                group_y <= node_y <= group_y + group_height):
                nodes_in_group.append(node)
                print(f"[DEBUG] 节点在分组内: {node.id} ({node.type}) at ({node_x}, {node_y})")
            else:
                print(f"[DEBUG] 节点不在分组内: {node.id} ({node.type}) at ({node_x}, {node_y})")
        
        if not nodes_in_group:
            await self._log(LogLevel.WARNING, f"📦 子流程 [{subflow_name}] 为空", is_system_log=True)
            return ModuleResult(success=True, message=f"子流程 [{subflow_name}] 为空")
        
        # 找出子流程内的起始节点（没有入边的节点）
        node_ids_in_group = {n.id for n in nodes_in_group}
        nodes_with_incoming = set()
        for edge in self.workflow.edges:
            if edge.target in node_ids_in_group and edge.source in node_ids_in_group:
                nodes_with_incoming.add(edge.target)
        
        start_nodes = [n for n in nodes_in_group if n.id not in nodes_with_incoming]
        
        if not start_nodes:
            # 如果没有明确的起始节点，按位置排序取第一个
            start_nodes = sorted(nodes_in_group, key=lambda n: (n.position.y, n.position.x))[:1]
        
        # 执行子流程内的节点
        executed_count = 0
        executed_ids = set()
        to_execute = [n.id for n in start_nodes]
        
        while to_execute and not self.should_stop:
            node_id = to_execute.pop(0)
            
            if node_id in executed_ids:
                continue
            if node_id not in node_ids_in_group:
                continue
            
            node = self.graph.get_node(node_id)
            if not node:
                continue
            
            # 执行节点
            result = await self._execute_node(node)
            executed_ids.add(node_id)
            executed_count += 1
            
            if result and not result.success:
                await self._log(LogLevel.ERROR, f"📦 子流程 [{subflow_name}] 执行失败", is_system_log=True)
                return ModuleResult(success=False, error=f"子流程执行失败: {result.error}")
            
            # 获取下一个节点（只在子流程范围内）
            if result and result.branch:
                next_nodes = self.graph.get_next_nodes(node_id, result.branch)
            else:
                next_nodes = self.graph.get_next_nodes(node_id)
            
            for next_id in next_nodes:
                if next_id in node_ids_in_group and next_id not in executed_ids:
                    to_execute.append(next_id)
        
        await self._log(LogLevel.INFO, f"📦 子流程 [{subflow_name}] 执行完成，共执行 {executed_count} 个节点", is_system_log=True)
        return ModuleResult(success=True, message=f"子流程 [{subflow_name}] 执行完成")


    async def _handle_loop(self, loop_node: WorkflowNode, body_nodes: list[str], done_nodes: list[str]):
        """处理循环执行"""
        if not self.context.loop_stack:
            await self._notify_successors(done_nodes, loop_node.id)
            return
        
        loop_state = self.context.loop_stack[-1]
        loop_type = loop_state['type']
        
        while not self.should_stop:
            should_continue = False
            
            if loop_type == 'count':
                should_continue = loop_state['current_index'] < loop_state['count']
            elif loop_type == 'range':
                current = loop_state['current_index']
                end_value = loop_state['end_value']
                step_value = loop_state['step_value']
                should_continue = current <= end_value if step_value > 0 else current >= end_value
            elif loop_type == 'while':
                condition_value = self.context.get_variable(loop_state['condition'], False)
                should_continue = bool(condition_value)
            elif loop_type == 'foreach':
                should_continue = loop_state['current_index'] < len(loop_state['data'])
            
            if not should_continue:
                break
            
            self.context.should_continue = False
            
            if body_nodes:
                async with self._node_lock:
                    for nid in body_nodes:
                        self._executed_node_ids.discard(nid)
                        self._executing_node_ids.discard(nid)
                
                all_body_nodes = await self._collect_loop_body_nodes(body_nodes)
                async with self._node_lock:
                    for nid in all_body_nodes:
                        self._executed_node_ids.discard(nid)
                        self._executing_node_ids.discard(nid)
                        # 清除待处理节点的前驱等待状态
                        if nid in self._pending_nodes:
                            del self._pending_nodes[nid]
                
                await self._execute_parallel(body_nodes)
            
            if self.context.should_break:
                self.context.should_break = False
                break
            
            if loop_type == 'count':
                loop_state['current_index'] += 1
                self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'range':
                loop_state['current_index'] += loop_state['step_value']
                self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'foreach':
                loop_state['current_index'] += 1
                if loop_state['current_index'] < len(loop_state['data']):
                    self.context.set_variable(loop_state['item_variable'], 
                                              loop_state['data'][loop_state['current_index']])
                    self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
        
        if self.context.loop_stack:
            self.context.loop_stack.pop()
        
        if done_nodes and not self.should_stop:
            await self._execute_parallel(done_nodes)

    async def _collect_loop_body_nodes(self, start_nodes: list[str]) -> set[str]:
        """收集循环体内的所有节点（包括条件分支的所有路径）"""
        collected = set()
        to_visit = list(start_nodes)
        
        while to_visit:
            node_id = to_visit.pop(0)
            if node_id in collected:
                continue
            collected.add(node_id)
            
            node = self.graph.get_node(node_id)
            if not node:
                continue
            
            # 获取所有后继节点
            next_nodes = []
            
            # 如果是条件节点，获取所有分支
            if node.type == 'condition':
                if node_id in self.graph.condition_branches:
                    for branch_target in self.graph.condition_branches[node_id].values():
                        if branch_target:
                            next_nodes.append(branch_target)
            # 如果是循环节点，获取循环体和完成分支
            elif node.type in ('loop', 'foreach'):
                if node_id in self.graph.loop_branches:
                    for branch_targets in self.graph.loop_branches[node_id].values():
                        next_nodes.extend(branch_targets)
            else:
                # 普通节点，获取默认后继
                next_nodes = self.graph.get_next_nodes(node_id)
            
            for next_id in next_nodes:
                if next_id not in collected:
                    to_visit.append(next_id)
        
        return collected

    async def _cleanup(self):
        """清理资源"""
        try:
            if self.context.page:
                try:
                    await self.context.page.close()
                except:
                    pass
                self.context.page = None
            
            if self.context.browser_context:
                try:
                    await self.context.browser_context.close()
                except:
                    pass
                self.context.browser_context = None
            
            if self.context.browser:
                try:
                    await self.context.browser.close()
                except:
                    pass
                self.context.browser = None
            
            if self.context._playwright:
                try:
                    await self.context._playwright.stop()
                except:
                    pass
                self.context._playwright = None
        except Exception as e:
            print(f"清理资源时出错: {e}")


    async def execute(self) -> ExecutionResult:
        """执行工作流"""
        from playwright.async_api import async_playwright
        import os
        
        self.is_running = True
        self.should_stop = False
        self.start_time = datetime.now()
        self.executed_nodes = 0
        self.failed_nodes = 0
        self._executed_node_ids.clear()
        self._executing_node_ids.clear()
        self._pending_nodes.clear()
        self._last_data_rows_count = 0
        self._sent_data_rows_count = 0
        self._running_tasks.clear()
        
        self.context.variables.clear()
        self.context.data_rows.clear()
        self.context.current_row.clear()
        self.context.loop_stack.clear()
        self.context.should_break = False
        self.context.should_continue = False
        
        for var in self.workflow.variables:
            self.context.set_variable(var.name, var.value)
        
        await self._log(LogLevel.INFO, "🚀 工作流开始执行", is_system_log=True)
        
        try:
            parser = WorkflowParser(self.workflow)
            self.graph = parser.parse()
            
            playwright = await async_playwright().start()
            self.context._playwright = playwright
            
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            user_data_dir = os.path.join(backend_dir, 'browser_data')
            # 确保目录存在
            os.makedirs(user_data_dir, exist_ok=True)
            self.context._user_data_dir = user_data_dir
            
            # 收集所有子流程分组内的节点ID（这些节点不应该被主流程直接执行）
            subflow_node_ids = self._get_subflow_node_ids()
            
            start_nodes = self.graph.get_start_nodes()
            # 过滤掉子流程内的起始节点
            start_nodes = [nid for nid in start_nodes if nid not in subflow_node_ids]
            
            # 调试：打印起始节点信息
            print(f"[DEBUG] 找到 {len(start_nodes)} 个起始节点:")
            for nid in start_nodes:
                node = self.graph.get_node(nid)
                if node:
                    label = node.data.get('label', node.type)
                    print(f"  - {nid}: {node.type} ({label})")
            
            # 调试：打印所有节点和边的信息
            print(f"[DEBUG] 工作流共有 {len(self.graph.nodes)} 个节点:")
            for nid, node in self.graph.nodes.items():
                label = node.data.get('label', node.type)
                prev_nodes = self.graph.get_prev_nodes(nid)
                next_nodes = self.graph.get_next_nodes(nid)
                print(f"  - {nid}: {node.type} ({label})")
                print(f"    前驱: {prev_nodes}")
                print(f"    后继: {next_nodes}")
            
            if not start_nodes:
                await self._log(LogLevel.WARNING, "没有找到起始节点")
            else:
                await self._execute_parallel(start_nodes)
            
            if self.context.current_row:
                self.context.commit_row()
                if len(self.context.data_rows) > self._last_data_rows_count:
                    for i in range(self._last_data_rows_count, len(self.context.data_rows)):
                        await self._send_data_row(self.context.data_rows[i])
            
            if self.should_stop:
                status = ExecutionStatus.STOPPED
                await self._log(LogLevel.WARNING, "⏹️ 工作流已停止", is_system_log=True)
            elif self.failed_nodes > 0:
                status = ExecutionStatus.FAILED
                await self._log(LogLevel.ERROR, f"❌ 工作流执行完成，有 {self.failed_nodes} 个节点失败", is_system_log=True)
            else:
                status = ExecutionStatus.COMPLETED
                duration = (datetime.now() - self.start_time).total_seconds()
                await self._log(LogLevel.SUCCESS, f"✅ 工作流执行完成，共执行 {self.executed_nodes} 个节点，耗时 {duration:.2f}秒", is_system_log=True)
            
            self._result = ExecutionResult(
                workflow_id=self.workflow.id,
                status=status,
                started_at=self.start_time,
                completed_at=datetime.now(),
                total_nodes=len(self.workflow.nodes),
                executed_nodes=self.executed_nodes,
                failed_nodes=self.failed_nodes,
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            await self._log(LogLevel.ERROR, f"💥 工作流执行异常: {str(e)}", is_system_log=True)
            self._result = ExecutionResult(
                workflow_id=self.workflow.id,
                status=ExecutionStatus.FAILED,
                started_at=self.start_time,
                completed_at=datetime.now(),
                total_nodes=len(self.workflow.nodes),
                executed_nodes=self.executed_nodes,
                failed_nodes=self.failed_nodes,
                error_message=str(e),
            )
        finally:
            await self._cleanup()
            self.is_running = False
        
        return self._result

    async def stop(self):
        """停止工作流执行 - 立即强制停止所有操作"""
        self.should_stop = True
        await self._log(LogLevel.WARNING, "正在停止工作流...", is_system_log=True)
        
        # 1. 取消所有正在运行的任务
        for task in list(self._running_tasks):
            if not task.done():
                task.cancel()
        
        # 等待任务取消完成（最多1秒）
        if self._running_tasks:
            try:
                await asyncio.wait(list(self._running_tasks), timeout=1.0)
            except:
                pass
        self._running_tasks.clear()
        
        # 2. 强制关闭浏览器以中断正在进行的操作
        try:
            if self.context.page:
                try:
                    await self.context.page.close()
                except:
                    pass
                self.context.page = None
            
            if self.context.browser_context:
                try:
                    await self.context.browser_context.close()
                except:
                    pass
                self.context.browser_context = None
            
            if self.context.browser:
                try:
                    await self.context.browser.close()
                except:
                    pass
                self.context.browser = None
            
            if self.context._playwright:
                try:
                    await self.context._playwright.stop()
                except:
                    pass
                self.context._playwright = None
        except Exception as e:
            print(f"停止时关闭浏览器出错: {e}")
        
        self.is_running = False

    def get_collected_data(self) -> list[dict]:
        """获取收集的数据"""
        if self.context.current_row:
            self.context.commit_row()
        return self.context.data_rows.copy()
