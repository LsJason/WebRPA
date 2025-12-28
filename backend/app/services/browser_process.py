"""独立的浏览器进程 - 使用 async Playwright API"""
import sys
import json
import asyncio
import threading
import queue

# Windows 上使用 ProactorEventLoop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from pathlib import Path

# 元素选择器脚本
PICKER_SCRIPT = """(function() {
    if (window.__elementPickerActive) return;
    window.__elementPickerActive = true;
    
    // 清理之前的元素
    ['__picker_box', '__picker_tip', '__picker_style', '__picker_first'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });
    document.querySelectorAll('.__picker_highlight').forEach(function(h) { h.remove(); });
    
    // 高亮框
    var box = document.createElement('div');
    box.id = '__picker_box';
    box.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #3b82f6;background:rgba(59,130,246,0.2);z-index:2147483647;border-radius:4px;display:none;';
    document.body.appendChild(box);
    
    // 第一个选中元素的标记框
    var firstBox = document.createElement('div');
    firstBox.id = '__picker_first';
    firstBox.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #22c55e;background:rgba(34,197,94,0.3);z-index:2147483646;border-radius:4px;display:none;';
    document.body.appendChild(firstBox);
    
    // 提示条
    var tip = document.createElement('div');
    tip.id = '__picker_tip';
    tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1e40af;color:white;padding:10px 20px;border-radius:8px;font-size:14px;z-index:2147483647;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
    document.body.appendChild(tip);
    
    // 闪烁动画样式
    var style = document.createElement('style');
    style.id = '__picker_style';
    style.textContent = '@keyframes pickerBlink{0%,100%{opacity:1}50%{opacity:0.3}}.__picker_highlight{animation:pickerBlink 0.6s infinite;pointer-events:none;position:fixed;border:3px solid #f59e0b;background:rgba(245,158,11,0.3);z-index:2147483646;border-radius:4px;}';
    document.head.appendChild(style);
    
    // 状态
    var highlights = [];
    var firstElement = null;  // 第一个选中的元素
    var altMode = false;
    
    function clearHighlights() {
        highlights.forEach(function(h) { h.remove(); });
        highlights = [];
    }
    
    function highlightElement(el, color) {
        var r = el.getBoundingClientRect();
        var h = document.createElement('div');
        h.className = '__picker_highlight';
        if (color) h.style.borderColor = color;
        h.style.left = (r.left + window.scrollX) + 'px';
        h.style.top = (r.top + window.scrollY) + 'px';
        h.style.width = r.width + 'px';
        h.style.height = r.height + 'px';
        h.style.position = 'absolute';
        document.body.appendChild(h);
        highlights.push(h);
    }
    
    function highlightElements(elements) {
        clearHighlights();
        elements.forEach(function(el) { highlightElement(el); });
    }
    
    // 获取元素的路径选择器
    function getPathSelector(el) {
        if (!el || el === document.body || el === document.documentElement) return [];
        var path = [];
        while (el && el !== document.body && el !== document.documentElement) {
            var tag = el.tagName.toLowerCase();
            var parent = el.parentElement;
            var index = -1;
            if (parent) {
                var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
                if (siblings.length > 1) {
                    index = siblings.indexOf(el) + 1;
                }
            }
            // 记录 id 和有用的 class
            var id = el.id;
            var classes = Array.from(el.classList || []).filter(function(c) {
                // 过滤掉动态生成的 class（包含数字或特殊字符）
                return c && !/[0-9_-]{4,}|^[0-9]/.test(c) && c.length < 30;
            });
            path.unshift({ tag: tag, index: index, el: el, id: id, classes: classes });
            el = parent;
        }
        return path;
    }
    
    // 根据两个元素找出相似元素的模式
    function findSimilarPattern(el1, el2) {
        var path1 = getPathSelector(el1);
        var path2 = getPathSelector(el2);
        
        // 找到路径中不同的位置（应该只有索引不同）
        if (path1.length !== path2.length) return null;
        
        var diffIndex = -1;
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].tag !== path2[i].tag) return null;
            if (path1[i].index !== path2[i].index) {
                if (diffIndex >= 0) return null; // 多个位置不同，无法确定模式
                diffIndex = i;
            }
        }
        
        if (diffIndex < 0) return null; // 完全相同
        
        // 找到最近的有 ID 的祖先元素作为起点
        var startIndex = 0;
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].id) {
                startIndex = i;
                break;
            }
        }
        
        // 构建选择器模式
        var selectorParts = [];
        for (var i = startIndex; i < path1.length; i++) {
            var part = path1[i];
            if (part.id && i <= diffIndex) {
                selectorParts.push('#' + part.id);
            } else if (i === diffIndex) {
                selectorParts.push(part.tag + ':nth-child({index})');
            } else if (part.index > 0) {
                selectorParts.push(part.tag + ':nth-child(' + part.index + ')');
            } else {
                selectorParts.push(part.tag);
            }
        }
        
        var pattern = selectorParts.join(' > ');
        
        // 找出所有匹配的元素
        var parent = path1[diffIndex].el.parentElement;
        var allSiblings = parent ? Array.from(parent.children).filter(function(c) {
            return c.tagName === path1[diffIndex].el.tagName;
        }) : [];
        
        return {
            pattern: pattern,
            elements: allSiblings,
            indices: allSiblings.map(function(_, i) { return i + 1; })
        };
    }
    
    // 生成简单选择器
    function getSimpleSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + el.id;
        
        var path = getPathSelector(el);
        
        // 找到最近的有 ID 的祖先元素作为起点
        var startIndex = 0;
        for (var i = path.length - 1; i >= 0; i--) {
            if (path[i].id) {
                startIndex = i;
                break;
            }
        }
        
        // 构建选择器
        var parts = [];
        for (var i = startIndex; i < path.length; i++) {
            var p = path[i];
            if (p.id) {
                parts.push('#' + p.id);
            } else if (p.classes.length > 0) {
                // 使用第一个有意义的 class
                var selector = p.tag + '.' + p.classes[0];
                if (p.index > 0) {
                    selector += ':nth-child(' + p.index + ')';
                }
                parts.push(selector);
            } else if (p.index > 0) {
                parts.push(p.tag + ':nth-child(' + p.index + ')');
            } else {
                parts.push(p.tag);
            }
        }
        
        return parts.join(' > ');
    }
    
    // 更新第一个元素的标记
    function updateFirstBox() {
        if (firstElement) {
            var r = firstElement.getBoundingClientRect();
            firstBox.style.left = r.left + 'px';
            firstBox.style.top = r.top + 'px';
            firstBox.style.width = r.width + 'px';
            firstBox.style.height = r.height + 'px';
            firstBox.style.display = 'block';
        } else {
            firstBox.style.display = 'none';
        }
    }
    
    // 重置相似元素选择状态
    function resetAltMode() {
        firstElement = null;
        altMode = false;
        clearHighlights();
        updateFirstBox();
        tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
        tip.style.background = '#1e40af';
    }
    
    // 鼠标移动
    document.addEventListener('mousemove', function(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id && el.id.startsWith('__picker') || el.className === '__picker_highlight') return;
        
        var r = el.getBoundingClientRect();
        box.style.left = r.left + 'px';
        box.style.top = r.top + 'px';
        box.style.width = r.width + 'px';
        box.style.height = r.height + 'px';
        box.style.display = 'block';
        
        if (e.altKey) {
            box.style.borderColor = '#f59e0b';
            box.style.background = 'rgba(245,158,11,0.2)';
        } else {
            box.style.borderColor = '#3b82f6';
            box.style.background = 'rgba(59,130,246,0.2)';
        }
    }, true);
    
    // 点击选择
    document.addEventListener('click', function(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id && el.id.startsWith('__picker') || el.className === '__picker_highlight') return;
        
        if (e.altKey) {
            // Alt+点击：相似元素选择模式
            e.preventDefault();
            e.stopPropagation();
            
            if (!firstElement) {
                // 第一次点击：记录第一个元素
                firstElement = el;
                updateFirstBox();
                tip.textContent = '已选择第一个元素，请点击第二个相似元素';
                tip.style.background = '#d97706';
            } else {
                // 第二次点击：分析并找出所有相似元素
                var result = findSimilarPattern(firstElement, el);
                
                if (result && result.elements.length > 1) {
                    // 成功找到相似元素
                    highlightElements(result.elements);
                    
                    window.__elementPickerSimilar = {
                        pattern: result.pattern,
                        count: result.elements.length,
                        indices: result.indices,
                        minIndex: 1,
                        maxIndex: result.elements.length
                    };
                    
                    tip.textContent = '已选择 ' + result.elements.length + ' 个相似元素';
                    tip.style.background = '#059669';
                    
                    // 3秒后重置
                    setTimeout(function() {
                        resetAltMode();
                    }, 3000);
                } else {
                    // 无法找到相似模式
                    tip.textContent = '无法识别相似元素，请重新选择';
                    tip.style.background = '#dc2626';
                    setTimeout(resetAltMode, 2000);
                }
                
                firstElement = null;
                updateFirstBox();
            }
        } else if (e.ctrlKey) {
            // Ctrl+点击：选择单个元素
            e.preventDefault();
            e.stopPropagation();
            
            resetAltMode();
            var sel = getSimpleSelector(el);
            window.__elementPickerResult = { selector: sel, tagName: el.tagName.toLowerCase() };
            
            // 复制选择器到剪贴板
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(sel).then(function() {
                    tip.textContent = '已选择并复制: ' + sel;
                }).catch(function() {
                    tip.textContent = '已选择: ' + sel;
                });
            } else {
                // 降级方案：使用 execCommand
                var textarea = document.createElement('textarea');
                textarea.value = sel;
                textarea.style.cssText = 'position:fixed;left:-9999px;';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    tip.textContent = '已选择并复制: ' + sel;
                } catch(err) {
                    tip.textContent = '已选择: ' + sel;
                }
                document.body.removeChild(textarea);
            }
            tip.style.background = '#059669';
        }
    }, true);
    
    // 按键监听
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Alt') e.preventDefault();
        if (e.key === 'Escape') resetAltMode();
    }, true);
    
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Alt' && firstElement) {
            // 如果松开Alt但还没选第二个元素，重置
            // 给一点延迟，允许用户快速点击
        }
    }, true);
})();"""

# 命令队列
cmd_queue = queue.Queue()


def stdin_reader():
    """在单独线程中读取 stdin"""
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                cmd_queue.put(line.strip())
            else:
                cmd_queue.put(None)
                break
        except:
            break


async def main():
    """主函数"""
    from playwright.async_api import async_playwright
    
    user_data_dir = Path(__file__).parent.parent.parent / "browser_data"
    user_data_dir.mkdir(exist_ok=True)
    
    # 清理锁文件
    lock_file = user_data_dir / "SingletonLock"
    if lock_file.exists():
        try: lock_file.unlink()
        except: pass
    
    # 启动 stdin 读取线程
    reader_thread = threading.Thread(target=stdin_reader, daemon=True)
    reader_thread.start()
    
    playwright = await async_playwright().start()
    print(json.dumps({"status": "playwright_started"}), flush=True)
    
    context = None
    page = None
    
    try:
        # 启动浏览器
        try:
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=False,
                channel='msedge',
                args=['--start-maximized'],
                no_viewport=True,
            )
        except Exception as e:
            # 如果使用用户数据目录失败，打印警告并使用临时目录
            print(json.dumps({"warning": f"无法使用共享数据目录: {str(e)}，使用临时目录"}), flush=True)
            import tempfile
            temp_dir = tempfile.mkdtemp(prefix="browser_data_")
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=temp_dir,
                headless=False,
                channel='msedge',
                args=['--start-maximized'],
                no_viewport=True,
            )
        
        # 关闭所有已有的页面（之前的历史页面）
        existing_pages = context.pages[:]
        for old_page in existing_pages:
            try:
                await old_page.close()
            except:
                pass
        
        # 创建新页面
        page = await context.new_page()
        
        # 确保页面获得焦点
        try:
            await page.bring_to_front()
        except:
            pass
        
        print(json.dumps({"status": "browser_opened"}), flush=True)
        
        # 处理命令
        while True:
            try:
                # 检查浏览器是否还在运行
                if not context.pages:
                    print(json.dumps({"status": "closed", "reason": "no_pages"}), flush=True)
                    break
                
                # 确保使用最新的页面
                page = context.pages[-1]
                
                # 非阻塞获取命令
                try:
                    line = cmd_queue.get(timeout=0.1)
                except queue.Empty:
                    await asyncio.sleep(0.1)
                    continue
                
                if line is None:
                    break
                
                if not line:
                    continue
                
                cmd = json.loads(line)
                action = cmd.get('action')
                result = {"success": True}
                
                if action == 'quit':
                    break
                elif action == 'navigate':
                    url = cmd.get('url', 'about:blank')
                    try:
                        await page.goto(url, timeout=30000)
                        await page.bring_to_front()
                        result["data"] = {"message": "导航成功"}
                    except Exception as nav_err:
                        # 如果导航失败，尝试创建新页面
                        try:
                            page = await context.new_page()
                            await page.goto(url, timeout=30000)
                            await page.bring_to_front()
                            result["data"] = {"message": "导航成功（新页面）"}
                        except Exception as e2:
                            result = {"success": False, "error": str(e2)}
                elif action == 'find_page_by_url':
                    # 查找是否有页面已打开指定URL
                    target_url = cmd.get('url', '')
                    found = False
                    page_index = -1
                    for i, p in enumerate(context.pages):
                        try:
                            current_url = p.url
                            # 比较URL（忽略末尾斜杠和协议差异）
                            def normalize_url(u):
                                u = u.rstrip('/')
                                if u.startswith('http://'):
                                    u = u[7:]
                                elif u.startswith('https://'):
                                    u = u[8:]
                                return u.lower()
                            if normalize_url(current_url) == normalize_url(target_url):
                                found = True
                                page_index = i
                                break
                        except:
                            continue
                    result["data"] = {"found": found, "pageIndex": page_index}
                elif action == 'switch_to_page':
                    # 切换到指定索引的页面
                    page_index = cmd.get('pageIndex', 0)
                    try:
                        if 0 <= page_index < len(context.pages):
                            page = context.pages[page_index]
                            await page.bring_to_front()
                            result["data"] = {"message": "已切换页面"}
                        else:
                            result = {"success": False, "error": "页面索引无效"}
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                elif action == 'start_picker':
                    try:
                        await page.wait_for_load_state('domcontentloaded', timeout=5000)
                    except: pass
                    await page.evaluate(PICKER_SCRIPT)
                    result["data"] = {"message": "选择器已启动"}
                elif action == 'stop_picker':
                    try:
                        await page.evaluate("""() => {
                            var tip = document.getElementById('__picker_tip');
                            var box = document.getElementById('__picker_box');
                            if (tip) tip.remove();
                            if (box) box.remove();
                            window.__elementPickerActive = false;
                        }""")
                    except: pass
                    result["data"] = {"message": "选择器已停止"}
                elif action == 'get_selected':
                    data = await page.evaluate("""() => {
                        var r = window.__elementPickerResult;
                        window.__elementPickerResult = null;
                        return r;
                    }""")
                    result["data"] = data
                elif action == 'get_similar':
                    data = await page.evaluate("""() => {
                        var r = window.__elementPickerSimilar;
                        window.__elementPickerSimilar = null;
                        return r;
                    }""")
                    result["data"] = data
                
                print(json.dumps(result), flush=True)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_msg = str(e)
                # 如果是页面关闭错误，尝试恢复
                if 'closed' in error_msg.lower() or 'Target page' in error_msg:
                    try:
                        if context.pages:
                            page = context.pages[-1]
                        else:
                            page = await context.new_page()
                    except:
                        pass
                print(json.dumps({"success": False, "error": error_msg}), flush=True)
    
    finally:
        if page:
            try: await page.close()
            except: pass
        if context:
            try: await context.close()
            except: pass
        if playwright:
            try: await playwright.stop()
            except: pass
        print(json.dumps({"status": "closed"}), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
