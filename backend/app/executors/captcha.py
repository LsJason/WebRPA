"""验证码处理模块执行器实现 - 异步版本"""
import asyncio
import base64
import random

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


def _patch_pil_antialias():
    """修复 Pillow 10.0+ 移除 ANTIALIAS 的兼容性问题"""
    try:
        from PIL import Image
        if not hasattr(Image, 'ANTIALIAS'):
            Image.ANTIALIAS = Image.Resampling.LANCZOS
    except Exception:
        pass


_patch_pil_antialias()


@register_executor
class OCRCaptchaExecutor(ModuleExecutor):
    """文本验证码识别模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "ocr_captcha"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        image_selector = context.resolve_value(config.get('imageSelector', ''))
        input_selector = context.resolve_value(config.get('inputSelector', ''))
        variable_name = config.get('variableName', '')
        auto_submit = config.get('autoSubmit', False)
        submit_selector = context.resolve_value(config.get('submitSelector', ''))
        
        if not image_selector:
            return ModuleResult(success=False, error="验证码图片选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            import ddddocr
            ocr = ddddocr.DdddOcr()
            
            element = context.page.locator(image_selector)
            src = await element.get_attribute('src')
            
            if src and src.startswith('data:'):
                header, data = src.split(',', 1)
                image_bytes = base64.b64decode(data)
            else:
                image_bytes = await element.screenshot()
            
            # 使用线程池执行同步OCR操作
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, ocr.classification, image_bytes)
            
            if variable_name:
                context.set_variable(variable_name, result)
            
            if input_selector:
                await context.page.fill(input_selector, result)
            
            if auto_submit and submit_selector:
                await context.page.click(submit_selector)
            
            return ModuleResult(success=True, message=f"验证码识别结果: {result}", data=result)
        
        except ImportError:
            return ModuleResult(success=False, error="ddddocr未安装，请运行: pip install ddddocr")
        except Exception as e:
            return ModuleResult(success=False, error=f"验证码识别失败: {str(e)}")


@register_executor
class SliderCaptchaExecutor(ModuleExecutor):
    """滑块验证码模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "slider_captcha"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        slider_selector = context.resolve_value(config.get('sliderSelector', ''))
        background_selector = context.resolve_value(config.get('backgroundSelector', ''))
        gap_selector = context.resolve_value(config.get('gapSelector', ''))
        
        if not slider_selector:
            return ModuleResult(success=False, error="滑块选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            slider = context.page.locator(slider_selector)
            slider_box = await slider.bounding_box()
            
            if not slider_box:
                return ModuleResult(success=False, error="无法获取滑块位置")
            
            slide_distance = 200
            
            if background_selector and gap_selector:
                try:
                    import ddddocr
                    det = ddddocr.DdddOcr(det=False, ocr=False)
                    
                    bg_element = context.page.locator(background_selector)
                    gap_element = context.page.locator(gap_selector)
                    
                    bg_bytes = await bg_element.screenshot()
                    gap_bytes = await gap_element.screenshot()
                    
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        None, 
                        lambda: det.slide_match(gap_bytes, bg_bytes, simple_target=True)
                    )
                    if result and 'target' in result:
                        slide_distance = result['target'][0]
                except:
                    pass
            
            start_x = slider_box['x'] + slider_box['width'] / 2
            start_y = slider_box['y'] + slider_box['height'] / 2
            
            await context.page.mouse.move(start_x, start_y)
            await context.page.mouse.down()
            
            current_x = start_x
            target_x = start_x + slide_distance
            
            while current_x < target_x:
                step = random.randint(5, 20)
                current_x = min(current_x + step, target_x)
                y_offset = random.randint(-2, 2)
                await context.page.mouse.move(current_x, start_y + y_offset)
                await asyncio.sleep(random.uniform(0.01, 0.03))
            
            await context.page.mouse.up()
            await asyncio.sleep(1)
            
            return ModuleResult(success=True, message=f"滑块验证完成，滑动距离: {slide_distance}px")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"滑块验证失败: {str(e)}")
