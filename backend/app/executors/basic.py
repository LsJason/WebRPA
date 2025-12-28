"""基础模块执行器实现 - 异步版本"""
import asyncio
import time

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)
from .type_utils import to_int, to_float


@register_executor
class GroupExecutor(ModuleExecutor):
    """备注分组模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "group"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        return ModuleResult(success=True, message="备注分组（跳过）")


@register_executor
class OpenPageExecutor(ModuleExecutor):
    """打开网页模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "open_page"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        url = context.resolve_value(config.get('url', ''))
        wait_until = config.get('waitUntil', 'load')
        
        if not url:
            return ModuleResult(success=False, error="URL不能为空")
        
        try:
            # 如果没有浏览器实例，创建一个
            if context.browser_context is None:
                p = context._playwright
                if p is None:
                    return ModuleResult(success=False, error="Playwright未初始化")
                
                user_data_dir = context._user_data_dir
                print(f"[OpenPage] user_data_dir={user_data_dir}")
                
                if user_data_dir:
                    from pathlib import Path
                    
                    # 清理锁文件
                    user_data_path = Path(user_data_dir)
                    lock_file = user_data_path / "SingletonLock"
                    if lock_file.exists():
                        try:
                            lock_file.unlink()
                            print(f"[OpenPage] 已清理锁文件")
                        except Exception as e:
                            print(f"[OpenPage] 清理锁文件失败: {e}")
                    
                    # 多次尝试启动持久化上下文
                    max_retries = 3
                    last_error = None
                    for attempt in range(max_retries):
                        try:
                            print(f"[OpenPage] 启动持久化浏览器上下文 (尝试 {attempt + 1}/{max_retries})...")
                            context.browser_context = await p.chromium.launch_persistent_context(
                                user_data_dir=user_data_dir,
                                headless=False,
                                channel='msedge',
                            )
                            
                            # 关闭所有已有的页面（之前的历史页面）
                            existing_pages = context.browser_context.pages[:]
                            for old_page in existing_pages:
                                try:
                                    await old_page.close()
                                except:
                                    pass
                            
                            # 创建新页面
                            context.page = await context.browser_context.new_page()
                            print(f"[OpenPage] 持久化浏览器上下文启动成功，已清理旧页面并创建新页面")
                            break
                        except Exception as e:
                            last_error = e
                            print(f"[OpenPage] 持久化上下文启动失败 (尝试 {attempt + 1}): {e}")
                            if lock_file.exists():
                                try:
                                    lock_file.unlink()
                                except:
                                    pass
                            await asyncio.sleep(0.5)
                    else:
                        return ModuleResult(
                            success=False, 
                            error=f"无法启动持久化浏览器: {last_error}"
                        )
                else:
                    print(f"[OpenPage] 使用普通模式启动浏览器")
                    context.browser = await p.chromium.launch(
                        headless=False,
                        channel='msedge'
                    )
                    context.browser_context = await context.browser.new_context()
                    context.page = await context.browser_context.new_page()
            
            # 如果没有页面，创建一个新页面
            if context.page is None:
                context.page = await context.browser_context.new_page()
            
            # 导航到目标URL
            await context.page.goto(url, wait_until=wait_until)
            
            # 确保页面获得焦点
            await context.page.bring_to_front()
            
            return ModuleResult(success=True, message=f"已打开网页: {url}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"打开网页失败: {str(e)}")


@register_executor
class ClickElementExecutor(ModuleExecutor):
    """点击元素模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "click_element"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        click_type = config.get('clickType', 'single')
        wait_for_selector = config.get('waitForSelector', True)
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            element = context.page.locator(selector).first
            
            if wait_for_selector:
                try:
                    await element.wait_for(state='attached', timeout=5000)
                except:
                    await context.page.wait_for_selector(selector, state='visible', timeout=10000)
            
            if click_type == 'double':
                await element.dblclick()
            elif click_type == 'right':
                await element.click(button='right')
            else:
                await element.click()
            
            return ModuleResult(success=True, message=f"已点击元素: {selector}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"点击元素失败: {str(e)}")


@register_executor
class HoverElementExecutor(ModuleExecutor):
    """悬停元素模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "hover_element"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        hover_duration = to_int(config.get('hoverDuration', 500), 500, context)
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            element = context.page.locator(selector).first
            
            try:
                await element.wait_for(state='attached', timeout=5000)
            except:
                await context.page.wait_for_selector(selector, state='visible', timeout=10000)
            
            await element.hover()
            
            if hover_duration > 0:
                await asyncio.sleep(hover_duration / 1000)
            
            return ModuleResult(success=True, message=f"已悬停到元素: {selector}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"悬停元素失败: {str(e)}")


@register_executor
class InputTextExecutor(ModuleExecutor):
    """输入文本模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "input_text"
    
    async def _find_input_element(self, page, selector: str):
        """查找可输入的元素"""
        element = page.locator(selector).first
        
        tag_name = await element.evaluate("el => el.tagName.toLowerCase()")
        is_contenteditable = await element.evaluate("el => el.isContentEditable")
        
        if tag_name in ['input', 'textarea', 'select'] or is_contenteditable:
            return element, 'direct'
        
        inner_input = element.locator('input, textarea').first
        if await inner_input.count() > 0:
            return inner_input, 'inner'
        
        inner_editable = element.locator('[contenteditable="true"]').first
        if await inner_editable.count() > 0:
            return inner_editable, 'contenteditable'
        
        return element, 'keyboard'
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        text = context.resolve_value(config.get('text', ''))
        clear_before = config.get('clearBefore', True)
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            try:
                await context.page.wait_for_selector(selector, state='visible', timeout=10000)
            except:
                pass
            
            element, input_type = await self._find_input_element(context.page, selector)
            
            if input_type == 'keyboard':
                await element.click()
                if clear_before:
                    await context.page.keyboard.press('Control+a')
                    await context.page.keyboard.press('Backspace')
                await context.page.keyboard.type(text)
                return ModuleResult(success=True, message=f"已通过键盘输入文本到: {selector}")
            else:
                if clear_before:
                    await element.clear()
                await element.fill(text)
                suffix = f" (在内部{input_type}元素)" if input_type == 'inner' else ""
                return ModuleResult(success=True, message=f"已输入文本到: {selector}{suffix}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"输入文本失败: {str(e)}")


@register_executor
class GetElementInfoExecutor(ModuleExecutor):
    """获取元素信息模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "get_element_info"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        attribute = config.get('attribute', 'text')
        variable_name = config.get('variableName', '')
        column_name = config.get('columnName', '')
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            element = context.page.locator(selector).first
            
            try:
                await element.wait_for(state='attached', timeout=5000)
            except:
                try:
                    await context.page.wait_for_selector(selector, state='visible', timeout=10000)
                    element = context.page.locator(selector).first
                except:
                    pass
            
            if await element.count() == 0:
                return ModuleResult(success=False, error=f"未找到元素: {selector}")
            
            value = None
            for retry in range(3):
                if attribute == 'text':
                    value = await element.text_content()
                elif attribute == 'innerHTML':
                    value = await element.inner_html()
                elif attribute == 'value':
                    value = await element.input_value()
                elif attribute == 'href':
                    value = await element.get_attribute('href')
                elif attribute == 'src':
                    value = await element.get_attribute('src')
                else:
                    value = await element.get_attribute(attribute)
                
                if value is not None and value != '':
                    break
                
                if retry < 2:
                    await asyncio.sleep(0.1)
            
            if variable_name:
                context.set_variable(variable_name, value)
            
            if column_name:
                context.add_data_value(column_name, value)
            
            return ModuleResult(success=True, message=f"已获取元素信息: {value}", data=value)
        
        except Exception as e:
            return ModuleResult(success=False, error=f"获取元素信息失败: {str(e)}")


@register_executor
class WaitExecutor(ModuleExecutor):
    """等待模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "wait"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        wait_type = config.get('waitType', 'time')
        
        try:
            if wait_type == 'time':
                duration = to_int(config.get('duration', 1000), 1000, context)
                await asyncio.sleep(duration / 1000)
                return ModuleResult(success=True, message=f"已等待 {duration}ms")
            
            elif wait_type == 'selector':
                selector = context.resolve_value(config.get('selector', ''))
                state = config.get('state', 'visible')
                
                if not selector:
                    return ModuleResult(success=False, error="选择器不能为空")
                
                if context.page is None:
                    return ModuleResult(success=False, error="没有打开的页面")
                
                await context.switch_to_latest_page()
                await context.page.wait_for_selector(selector, state=state)
                return ModuleResult(success=True, message=f"元素已{state}: {selector}")
            
            elif wait_type == 'navigation':
                if context.page is None:
                    return ModuleResult(success=False, error="没有打开的页面")
                
                await context.switch_to_latest_page()
                await context.page.wait_for_load_state('networkidle')
                return ModuleResult(success=True, message="页面导航完成")
            
            return ModuleResult(success=False, error=f"未知的等待类型: {wait_type}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"等待失败: {str(e)}")


@register_executor
class WaitElementExecutor(ModuleExecutor):
    """等待元素模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "wait_element"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        wait_condition = config.get('waitCondition', 'visible')
        wait_timeout = to_int(config.get('waitTimeout', 30000), 30000, context)
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            state_map = {
                'visible': 'visible',
                'hidden': 'hidden',
                'attached': 'attached',
                'detached': 'detached',
            }
            state = state_map.get(wait_condition, 'visible')
            
            await context.page.wait_for_selector(selector, state=state, timeout=wait_timeout)
            
            condition_labels = {
                'visible': '可见',
                'hidden': '隐藏/消失',
                'attached': '存在于DOM',
                'detached': '从DOM移除',
            }
            label = condition_labels.get(wait_condition, wait_condition)
            
            return ModuleResult(
                success=True, 
                message=f"元素已{label}: {selector}",
                data={'selector': selector, 'condition': wait_condition}
            )
        
        except Exception as e:
            error_msg = str(e)
            if 'Timeout' in error_msg:
                return ModuleResult(success=False, error=f"等待超时 ({wait_timeout}ms): 元素 {selector} 未满足条件 '{wait_condition}'")
            return ModuleResult(success=False, error=f"等待元素失败: {error_msg}")


@register_executor
class ClosePageExecutor(ModuleExecutor):
    """关闭网页模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "close_page"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            if context.page is not None:
                await context.page.close()
                context.page = None
                return ModuleResult(success=True, message="已关闭页面")
            return ModuleResult(success=True, message="没有需要关闭的页面")
        except Exception as e:
            return ModuleResult(success=False, error=f"关闭页面失败: {str(e)}")


@register_executor
class SetVariableExecutor(ModuleExecutor):
    """设置变量模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "set_variable"
    
    def _evaluate_expression(self, expr: str, context: ExecutionContext):
        """安全地计算表达式"""
        import re
        
        def replace_var(match):
            var_name = match.group(1).strip()
            value = context.variables.get(var_name, 0)
            try:
                if isinstance(value, (int, float)):
                    return str(value)
                return str(float(value))
            except (ValueError, TypeError):
                return str(value)
        
        resolved = re.sub(r'\{([^}]+)\}', replace_var, expr)
        
        if re.match(r'^[\d\s\+\-\*\/\.\(\)]+$', resolved):
            try:
                result = eval(resolved, {"__builtins__": {}}, {})
                if isinstance(result, float) and result.is_integer():
                    return int(result)
                return result
            except:
                pass
        
        try:
            if '.' in resolved:
                return float(resolved)
            return int(resolved)
        except ValueError:
            return resolved
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        variable_name = config.get('variableName', '')
        variable_value = config.get('variableValue', '')
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        try:
            resolved_value = self._evaluate_expression(variable_value, context)
            context.set_variable(variable_name, resolved_value)
            
            return ModuleResult(
                success=True, 
                message=f"已设置变量 {variable_name} = {resolved_value}",
                data=resolved_value
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"设置变量失败: {str(e)}")


@register_executor
class PrintLogExecutor(ModuleExecutor):
    """打印日志模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "print_log"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        log_message = config.get('logMessage', '') or '(空日志)'
        log_level = config.get('logLevel', 'info')
        
        try:
            resolved_message = context.resolve_value(log_message)
            
            return ModuleResult(
                success=True, 
                message=resolved_message,
                data={'level': log_level, 'message': resolved_message},
                log_level=log_level
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"打印日志失败: {str(e)}")


@register_executor
class PlaySoundExecutor(ModuleExecutor):
    """播放提示音模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "play_sound"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import winsound
        
        beep_count = to_int(config.get('beepCount', 1), 1, context)
        beep_interval = to_int(config.get('beepInterval', 300), 300, context)
        
        try:
            for i in range(beep_count):
                winsound.Beep(1000, 200)
                if i < beep_count - 1:
                    await asyncio.sleep(beep_interval / 1000)
            
            return ModuleResult(
                success=True, 
                message=f"已播放 {beep_count} 次提示音",
                data={'count': beep_count}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"播放提示音失败: {str(e)}")


@register_executor
class PlayMusicExecutor(ModuleExecutor):
    """播放音乐模块执行器"""

    @property
    def module_type(self) -> str:
        return "play_music"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import base64
        import httpx
        from app.main import request_play_music_sync

        audio_url = context.resolve_value(config.get("audioUrl", ""))
        wait_for_end = config.get("waitForEnd", False)

        if not audio_url:
            return ModuleResult(success=False, error="音频URL不能为空")

        try:
            url = audio_url.strip()
            if not url.startswith(("http://", "https://")):
                url = "https://" + url

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://music.163.com/",
                "Accept": "*/*",
            }

            async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=headers) as client:
                response = await client.get(url)
                response.raise_for_status()
                audio_data = response.content

            content_type = response.headers.get("content-type", "audio/mpeg")
            if ";" in content_type:
                content_type = content_type.split(";")[0].strip()

            b64_data = base64.b64encode(audio_data).decode("utf-8")
            final_url = f"data:{content_type};base64,{b64_data}"

            # 使用线程池执行同步等待，避免阻塞事件循环
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_play_music_sync(
                    audio_url=final_url,
                    wait_for_end=wait_for_end,
                    timeout=600 if wait_for_end else 10,
                )
            )

            if not result.get("success"):
                return ModuleResult(
                    success=False,
                    error=f"播放音乐失败: {result.get('error', '未知错误')}",
                )

            source_display = audio_url
            if len(source_display) > 50:
                source_display = source_display[:50] + "..."

            return ModuleResult(success=True, message=f"正在播放: {source_display}")

        except Exception as e:
            return ModuleResult(success=False, error=f"播放音乐失败: {str(e)}")


@register_executor
class InputPromptExecutor(ModuleExecutor):
    """变量输入框模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "input_prompt"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        from app.main import request_input_prompt_sync
        
        variable_name = config.get('variableName', '')
        prompt_title = context.resolve_value(config.get('promptTitle', '输入'))
        prompt_message = context.resolve_value(config.get('promptMessage', '请输入值:'))
        default_value = context.resolve_value(config.get('defaultValue', ''))
        input_mode = config.get('inputMode', 'single')
        min_value = config.get('minValue')
        max_value = config.get('maxValue')
        max_length = config.get('maxLength')
        required = config.get('required', True)
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        try:
            # 使用线程池执行同步等待，避免阻塞事件循环
            loop = asyncio.get_event_loop()
            user_input = await loop.run_in_executor(
                None,
                lambda: request_input_prompt_sync(
                    variable_name=variable_name,
                    title=prompt_title,
                    message=prompt_message,
                    default_value=default_value,
                    input_mode=input_mode,
                    min_value=min_value,
                    max_value=max_value,
                    max_length=max_length,
                    required=required,
                    timeout=300
                )
            )
            
            if user_input is None:
                return ModuleResult(
                    success=True, 
                    message=f"用户取消输入，变量 {variable_name} 保持不变",
                    data={'cancelled': True}
                )
            
            # 根据输入模式处理结果
            if input_mode == 'list':
                result_list = [line.strip() for line in user_input.split('\n') if line.strip()]
                context.set_variable(variable_name, result_list)
                return ModuleResult(
                    success=True, 
                    message=f"已设置变量 {variable_name} = 列表({len(result_list)}项)",
                    data={'value': result_list, 'count': len(result_list)}
                )
            elif input_mode in ('number', 'integer'):
                try:
                    if input_mode == 'integer':
                        num_value = int(user_input)
                    else:
                        num_value = float(user_input)
                    context.set_variable(variable_name, num_value)
                    return ModuleResult(
                        success=True, 
                        message=f"已设置变量 {variable_name} = {num_value}",
                        data={'value': num_value}
                    )
                except ValueError:
                    return ModuleResult(success=False, error=f"输入的值不是有效的{'整数' if input_mode == 'integer' else '数字'}")
            else:
                # single, multiline, password 都保存为字符串
                context.set_variable(variable_name, user_input)
                display_value = '******' if input_mode == 'password' else user_input
                return ModuleResult(
                    success=True, 
                    message=f"已设置变量 {variable_name} = {display_value}",
                    data={'value': user_input}
                )
        except Exception as e:
            return ModuleResult(success=False, error=f"输入框失败: {str(e)}")


@register_executor
class RandomNumberExecutor(ModuleExecutor):
    """生成随机数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "random_number"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import random
        
        random_type = config.get('randomType', 'integer')
        min_value = to_float(config.get('minValue', 0), 0, context)
        max_value = to_float(config.get('maxValue', 100), 100, context)
        decimal_places = to_int(config.get('decimalPlaces', 2), 2, context)
        variable_name = config.get('variableName', '')
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        try:
            if min_value > max_value:
                min_value, max_value = max_value, min_value
            
            if random_type == 'integer':
                result = random.randint(int(min_value), int(max_value))
            else:
                result = random.uniform(float(min_value), float(max_value))
                result = round(result, decimal_places)
            
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"已生成随机数: {result}",
                data={'value': result}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"生成随机数失败: {str(e)}")


@register_executor
class GetTimeExecutor(ModuleExecutor):
    """获取时间模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "get_time"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        from datetime import datetime
        
        time_format = config.get('timeFormat', 'datetime')
        custom_format = config.get('customFormat', '')
        variable_name = config.get('variableName', '')
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        try:
            now = datetime.now()
            
            if time_format == 'datetime':
                result = now.strftime('%Y-%m-%d %H:%M:%S')
            elif time_format == 'date':
                result = now.strftime('%Y-%m-%d')
            elif time_format == 'time':
                result = now.strftime('%H:%M:%S')
            elif time_format == 'timestamp':
                result = int(now.timestamp() * 1000)
            elif time_format == 'custom' and custom_format:
                result = now.strftime(custom_format)
            else:
                result = now.strftime('%Y-%m-%d %H:%M:%S')
            
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"已获取时间: {result}",
                data={'value': result}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取时间失败: {str(e)}")


@register_executor
class ScreenshotExecutor(ModuleExecutor):
    """网页截图模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "screenshot"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os
        from datetime import datetime
        
        screenshot_type = config.get('screenshotType', 'fullpage')
        selector = context.resolve_value(config.get('selector', ''))
        save_path = context.resolve_value(config.get('savePath', ''))
        file_name_pattern = context.resolve_value(config.get('fileNamePattern', ''))
        variable_name = config.get('variableName', '')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if file_name_pattern:
                file_name = file_name_pattern.replace('{时间戳}', timestamp)
                if not file_name.endswith('.png'):
                    file_name += '.png'
            else:
                file_name = f"screenshot_{timestamp}.png"
            
            if save_path:
                if save_path.endswith('.png'):
                    final_path = save_path
                else:
                    os.makedirs(save_path, exist_ok=True)
                    final_path = os.path.join(save_path, file_name)
            else:
                screenshots_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'screenshots')
                os.makedirs(screenshots_dir, exist_ok=True)
                final_path = os.path.join(screenshots_dir, file_name)
            
            os.makedirs(os.path.dirname(final_path), exist_ok=True)
            
            if screenshot_type == 'element' and selector:
                await context.page.wait_for_selector(selector, state='visible')
                element = context.page.locator(selector).first
                await element.screenshot(path=final_path)
            elif screenshot_type == 'viewport':
                await context.page.screenshot(path=final_path, full_page=False)
            else:
                await context.page.screenshot(path=final_path, full_page=True)
            
            if variable_name:
                context.set_variable(variable_name, final_path)
            
            return ModuleResult(
                success=True,
                message=f"已保存截图: {final_path}",
                data={'path': final_path}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"截图失败: {str(e)}")


@register_executor
class TextToSpeechExecutor(ModuleExecutor):
    """文本朗读模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "text_to_speech"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        from app.main import request_tts_sync
        
        text = context.resolve_value(config.get('text', ''))
        lang = config.get('lang', 'zh-CN')
        rate = config.get('rate', 1)
        pitch = config.get('pitch', 1)
        volume = config.get('volume', 1)
        
        if not text:
            return ModuleResult(success=False, error="朗读文本不能为空")
        
        try:
            # 使用线程池执行同步等待，避免阻塞事件循环
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                None,
                lambda: request_tts_sync(
                    text=text,
                    lang=lang,
                    rate=rate,
                    pitch=pitch,
                    volume=volume,
                    timeout=60
                )
            )
            
            if success:
                return ModuleResult(
                    success=True,
                    message=f"已朗读文本: {text[:50]}{'...' if len(text) > 50 else ''}",
                    data={'text': text, 'lang': lang}
                )
            else:
                return ModuleResult(success=False, error="语音合成超时或失败")
        except Exception as e:
            return ModuleResult(success=False, error=f"文本朗读失败: {str(e)}")


@register_executor
class JsScriptExecutor(ModuleExecutor):
    """JS脚本模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "js_script"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        from app.main import request_js_script_sync
        
        code = config.get('code', '')
        result_variable = config.get('resultVariable', '')
        
        if not code:
            return ModuleResult(success=False, error="JavaScript代码不能为空")
        
        try:
            variables = dict(context.variables)
            
            # 使用线程池执行同步等待，避免阻塞事件循环
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_js_script_sync(
                    code=code,
                    variables=variables,
                    timeout=30
                )
            )
            
            if result.get('success'):
                script_result = result.get('result')
                
                if result_variable:
                    context.set_variable(result_variable, script_result)
                
                result_str = str(script_result)
                if len(result_str) > 100:
                    result_str = result_str[:100] + '...'
                
                return ModuleResult(
                    success=True,
                    message=f"JS脚本执行成功，返回值: {result_str}",
                    data={'result': script_result}
                )
            else:
                error = result.get('error', '未知错误')
                return ModuleResult(success=False, error=f"JS脚本执行失败: {error}")
        except Exception as e:
            return ModuleResult(success=False, error=f"JS脚本执行异常: {str(e)}")


@register_executor
class RefreshPageExecutor(ModuleExecutor):
    """刷新页面模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "refresh_page"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        wait_until = config.get('waitUntil', 'load')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            await context.page.reload(wait_until=wait_until)
            return ModuleResult(success=True, message="已刷新页面")
        except Exception as e:
            return ModuleResult(success=False, error=f"刷新页面失败: {str(e)}")


@register_executor
class GoBackExecutor(ModuleExecutor):
    """返回上一页模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "go_back"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        wait_until = config.get('waitUntil', 'load')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            response = await context.page.go_back(wait_until=wait_until)
            
            if response is None:
                return ModuleResult(success=True, message="已返回上一页（无历史记录）")
            
            return ModuleResult(success=True, message=f"已返回上一页: {context.page.url}")
        except Exception as e:
            return ModuleResult(success=False, error=f"返回上一页失败: {str(e)}")


@register_executor
class GoForwardExecutor(ModuleExecutor):
    """前进下一页模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "go_forward"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        wait_until = config.get('waitUntil', 'load')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            response = await context.page.go_forward(wait_until=wait_until)
            
            if response is None:
                return ModuleResult(success=True, message="已前进下一页（无前进记录）")
            
            return ModuleResult(success=True, message=f"已前进下一页: {context.page.url}")
        except Exception as e:
            return ModuleResult(success=False, error=f"前进下一页失败: {str(e)}")


@register_executor
class HandleDialogExecutor(ModuleExecutor):
    """处理弹窗模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "handle_dialog"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        dialog_action = config.get('dialogAction', 'accept')
        prompt_text = context.resolve_value(config.get('promptText', ''))
        save_message = config.get('saveMessage', '')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            dialog_info = {'handled': False, 'message': '', 'type': ''}
            
            async def handle_dialog(dialog):
                dialog_info['message'] = dialog.message
                dialog_info['type'] = dialog.type
                dialog_info['handled'] = True
                
                if dialog_action == 'accept':
                    if dialog.type == 'prompt' and prompt_text:
                        await dialog.accept(prompt_text)
                    else:
                        await dialog.accept()
                else:
                    await dialog.dismiss()
            
            context.page.on('dialog', handle_dialog)
            await asyncio.sleep(0.5)
            context.page.remove_listener('dialog', handle_dialog)
            
            if save_message and dialog_info['message']:
                context.set_variable(save_message, dialog_info['message'])
            
            if dialog_info['handled']:
                action_text = '确认' if dialog_action == 'accept' else '取消'
                return ModuleResult(
                    success=True,
                    message=f"已{action_text}{dialog_info['type']}弹窗: {dialog_info['message'][:50]}",
                    data=dialog_info
                )
            else:
                return ModuleResult(
                    success=True,
                    message="弹窗处理器已设置，等待弹窗出现",
                    data={'waiting': True}
                )
        except Exception as e:
            return ModuleResult(success=False, error=f"处理弹窗失败: {str(e)}")
