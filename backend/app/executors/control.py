"""流程控制模块执行器实现 - 异步版本"""
import asyncio
from datetime import datetime

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)
from .type_utils import to_int


@register_executor
class ConditionExecutor(ModuleExecutor):
    """条件判断模块执行器"""

    @property
    def module_type(self) -> str:
        return "condition"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        condition_type = config.get('conditionType', 'variable')
        operator = config.get('operator', '==')

        try:
            result = False

            if condition_type == 'variable':
                left_operand = context.resolve_value(config.get('leftOperand', ''))
                right_operand = context.resolve_value(config.get('rightOperand', ''))
                left_value = context.get_variable(left_operand, left_operand)
                right_value = context.get_variable(right_operand, right_operand)

                try:
                    left_num = float(left_value) if left_value else 0
                    right_num = float(right_value) if right_value else 0
                    use_numeric = True
                except (ValueError, TypeError):
                    use_numeric = False

                if operator == '==':
                    result = str(left_value) == str(right_value)
                elif operator == '!=':
                    result = str(left_value) != str(right_value)
                elif operator == 'isEmpty':
                    if left_value is None:
                        result = True
                    elif isinstance(left_value, str):
                        result = left_value.strip() == ''
                    elif isinstance(left_value, (list, dict)):
                        result = len(left_value) == 0
                    else:
                        result = not bool(left_value)
                elif operator == 'isNotEmpty':
                    if left_value is None:
                        result = False
                    elif isinstance(left_value, str):
                        result = left_value.strip() != ''
                    elif isinstance(left_value, (list, dict)):
                        result = len(left_value) > 0
                    else:
                        result = bool(left_value)
                elif operator == '>' and use_numeric:
                    result = left_num > right_num
                elif operator == '<' and use_numeric:
                    result = left_num < right_num
                elif operator == '>=' and use_numeric:
                    result = left_num >= right_num
                elif operator == '<=' and use_numeric:
                    result = left_num <= right_num
                elif operator == 'contains':
                    result = str(right_value) in str(left_value)

            elif condition_type == 'element_exists':
                if context.page is None:
                    return ModuleResult(success=False, error="没有打开的页面，请先使用'打开网页'模块")
                selector = context.resolve_value(config.get('leftOperand', ''))
                if not selector:
                    return ModuleResult(success=False, error="元素选择器不能为空")
                try:
                    element = context.page.locator(selector)
                    count = await element.count()
                    result = count > 0
                except Exception as e:
                    return ModuleResult(
                        success=True, 
                        message=f"条件判断结果: False (检查元素时出错: {str(e)})", 
                        branch='false', 
                        data=False
                    )

            elif condition_type == 'element_visible':
                if context.page is None:
                    return ModuleResult(success=False, error="没有打开的页面，请先使用'打开网页'模块")
                selector = context.resolve_value(config.get('leftOperand', ''))
                if not selector:
                    return ModuleResult(success=False, error="元素选择器不能为空")
                try:
                    element = context.page.locator(selector)
                    if await element.count() > 0:
                        result = await element.first.is_visible()
                    else:
                        result = False
                except Exception as e:
                    return ModuleResult(
                        success=True, 
                        message=f"条件判断结果: False (检查元素时出错: {str(e)})", 
                        branch='false', 
                        data=False
                    )

            branch = 'true' if result else 'false'
            return ModuleResult(success=True, message=f"条件判断结果: {result}", branch=branch, data=result)

        except Exception as e:
            return ModuleResult(success=False, error=f"条件判断失败: {str(e)}")


@register_executor
class LoopExecutor(ModuleExecutor):
    """循环执行模块执行器"""

    @property
    def module_type(self) -> str:
        return "loop"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        loop_type = config.get('loopType', 'count')
        
        count = to_int(config.get('count', 10), 10, context)
        condition = config.get('condition', '')
        max_iterations = to_int(config.get('maxIterations', 1000), 1000, context)
        index_variable = config.get('indexVariable', 'loop_index')
        
        start_value = to_int(config.get('startValue', 1), 1, context)
        end_value = to_int(config.get('endValue', 10), 10, context)
        step_value = to_int(config.get('stepValue', 1), 1, context)

        if loop_type == 'range':
            initial_index = start_value
            if step_value > 0:
                count = max(0, (end_value - start_value) // step_value + 1)
            elif step_value < 0:
                count = max(0, (start_value - end_value) // abs(step_value) + 1)
            else:
                count = 0
        else:
            initial_index = 0

        loop_state = {
            'type': loop_type,
            'count': count,
            'condition': condition,
            'max_iterations': max_iterations,
            'index_variable': index_variable,
            'current_index': initial_index,
            'start_value': start_value,
            'end_value': end_value,
            'step_value': step_value,
        }

        context.loop_stack.append(loop_state)
        context.set_variable(index_variable, initial_index)

        if loop_type == 'range':
            return ModuleResult(
                success=True,
                message=f"开始范围循环 ({start_value} 到 {end_value}，步长 {step_value})",
                data=loop_state
            )
        return ModuleResult(
            success=True,
            message=f"开始循环 (类型: {loop_type}, 次数: {count})",
            data=loop_state
        )


@register_executor
class ForeachExecutor(ModuleExecutor):
    """遍历列表模块执行器"""

    @property
    def module_type(self) -> str:
        return "foreach"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        data_source = config.get('dataSource', '')
        item_variable = config.get('itemVariable', 'item')
        index_variable = config.get('indexVariable', 'index')
        data = context.get_variable(data_source, [])

        if not isinstance(data, (list, tuple)):
            return ModuleResult(success=False, error=f"数据源不是数组: {data_source}")

        loop_state = {
            'type': 'foreach',
            'data': list(data),
            'item_variable': item_variable,
            'index_variable': index_variable,
            'current_index': 0,
        }

        context.loop_stack.append(loop_state)

        if len(data) > 0:
            context.set_variable(item_variable, data[0])
            context.set_variable(index_variable, 0)

        return ModuleResult(
            success=True,
            message=f"开始遍历 (共 {len(data)} 项)",
            data=loop_state
        )


@register_executor
class BreakLoopExecutor(ModuleExecutor):
    """跳出循环模块执行器"""

    @property
    def module_type(self) -> str:
        return "break_loop"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not context.loop_stack:
            return ModuleResult(success=False, error="当前不在循环中")
        context.should_break = True
        return ModuleResult(success=True, message="跳出循环")


@register_executor
class ContinueLoopExecutor(ModuleExecutor):
    """继续下一次循环模块执行器"""

    @property
    def module_type(self) -> str:
        return "continue_loop"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not context.loop_stack:
            return ModuleResult(success=False, error="当前不在循环中")
        context.should_continue = True
        return ModuleResult(success=True, message="继续下一次循环")


@register_executor
class ScheduledTaskExecutor(ModuleExecutor):
    """定时执行模块执行器"""

    @property
    def module_type(self) -> str:
        return "scheduled_task"

    def _format_duration(self, seconds: float) -> str:
        """格式化时间长度"""
        seconds = int(seconds)
        if seconds < 60:
            return f"{seconds}秒"
        elif seconds < 3600:
            minutes = seconds // 60
            secs = seconds % 60
            return f"{minutes}分{secs}秒" if secs else f"{minutes}分钟"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}小时{minutes}分钟" if minutes else f"{hours}小时"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        schedule_type = config.get('scheduleType', 'datetime')

        try:
            if schedule_type == 'datetime':
                target_date = config.get('targetDate', '')
                target_time = config.get('targetTime', '')

                if not target_date or not target_time:
                    return ModuleResult(success=False, error="请设置执行日期和时间")

                target_datetime_str = f"{target_date} {target_time}"
                target_datetime = datetime.strptime(target_datetime_str, "%Y-%m-%d %H:%M")
                now = datetime.now()

                if target_datetime <= now:
                    return ModuleResult(
                        success=True,
                        message=f"目标时间 {target_datetime_str} 已过，立即执行"
                    )

                wait_seconds = (target_datetime - now).total_seconds()
                await asyncio.sleep(wait_seconds)

                return ModuleResult(
                    success=True,
                    message=f"已到达指定时间 {target_datetime_str}，开始执行"
                )

            elif schedule_type == 'delay':
                delay_hours = config.get('delayHours', 0) or 0
                delay_minutes = config.get('delayMinutes', 0) or 0
                delay_seconds = config.get('delaySeconds', 0) or 0

                total_seconds = delay_hours * 3600 + delay_minutes * 60 + delay_seconds

                if total_seconds <= 0:
                    return ModuleResult(success=True, message="延迟时间为0，立即执行")

                await asyncio.sleep(total_seconds)

                return ModuleResult(
                    success=True,
                    message=f"延迟 {self._format_duration(total_seconds)} 完成，开始执行"
                )

            else:
                return ModuleResult(success=False, error=f"未知的定时类型: {schedule_type}")

        except Exception as e:
            return ModuleResult(success=False, error=f"定时执行失败: {str(e)}")
