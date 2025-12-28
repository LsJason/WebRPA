"""全局浏览器管理器 - 确保所有功能共享同一个浏览器实例"""
import subprocess
import json
import threading
import sys
from pathlib import Path
from typing import Optional, Callable

# 浏览器进程
_browser_proc: Optional[subprocess.Popen] = None
_browser_lock = threading.Lock()
_browser_open = False
_picker_active = False

# 用户数据目录
USER_DATA_DIR = Path(__file__).parent.parent.parent / "browser_data"
# 确保目录存在
USER_DATA_DIR.mkdir(exist_ok=True)


def get_user_data_dir() -> str:
    """获取用户数据目录"""
    return str(USER_DATA_DIR)


def is_browser_open() -> bool:
    """检查浏览器是否打开"""
    return _browser_open and _browser_proc is not None and _browser_proc.poll() is None


def get_browser_proc() -> Optional[subprocess.Popen]:
    """获取浏览器进程"""
    return _browser_proc


def start_browser() -> bool:
    """启动浏览器进程"""
    global _browser_proc, _browser_open
    
    with _browser_lock:
        if is_browser_open():
            return True
        
        script_path = Path(__file__).parent / "browser_process.py"
        print(f"[BrowserManager] Starting browser process: {script_path}")
        
        try:
            _browser_proc = subprocess.Popen(
                [sys.executable, str(script_path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
            
            # 等待 playwright 启动（设置超时）
            import select
            import time
            
            start_time = time.time()
            timeout = 30  # 30秒超时
            
            while time.time() - start_time < timeout:
                line = _browser_proc.stdout.readline()
                print(f"[BrowserManager] Received: {line.strip()}")
                if line:
                    try:
                        data = json.loads(line)
                        if data.get('status') == 'playwright_started':
                            print("[BrowserManager] Playwright started, waiting for browser...")
                            continue
                        elif data.get('status') == 'browser_opened':
                            _browser_open = True
                            print("[BrowserManager] Browser started successfully")
                            return True
                        elif data.get('status') == 'closed':
                            print(f"[BrowserManager] Browser closed: {data.get('reason', 'unknown')}")
                            return False
                    except json.JSONDecodeError:
                        print(f"[BrowserManager] Invalid JSON: {line}")
                        continue
                else:
                    # 检查进程是否还在运行
                    if _browser_proc.poll() is not None:
                        stderr = _browser_proc.stderr.read()
                        print(f"[BrowserManager] Process exited, stderr: {stderr}")
                        return False
                    time.sleep(0.1)
            
            print("[BrowserManager] Timeout waiting for browser to start")
            return False
        except Exception as e:
            import traceback
            print(f"[BrowserManager] Failed to start browser: {e}")
            traceback.print_exc()
            return False


def stop_browser():
    """停止浏览器进程"""
    global _browser_proc, _browser_open, _picker_active
    
    with _browser_lock:
        if _browser_proc:
            try:
                _browser_proc.stdin.write(json.dumps({"action": "quit"}) + "\n")
                _browser_proc.stdin.flush()
                _browser_proc.wait(timeout=5)
            except:
                try:
                    _browser_proc.terminate()
                except:
                    pass
            _browser_proc = None
        
        _browser_open = False
        _picker_active = False


def send_command(action: str, **kwargs) -> dict:
    """发送命令到浏览器进程"""
    global _browser_proc, _browser_open
    
    if not is_browser_open():
        return {"success": False, "error": "浏览器未打开"}
    
    try:
        cmd = json.dumps({"action": action, **kwargs})
        _browser_proc.stdin.write(cmd + "\n")
        _browser_proc.stdin.flush()
        
        line = _browser_proc.stdout.readline()
        if line:
            result = json.loads(line)
            # 检查是否浏览器已关闭
            if result.get("status") == "closed":
                _browser_open = False
                return {"success": False, "error": "浏览器已关闭"}
            return result
        return {"success": False, "error": "无响应"}
    except Exception as e:
        # 如果发生异常，可能是进程已终止
        if _browser_proc and _browser_proc.poll() is not None:
            _browser_open = False
        return {"success": False, "error": str(e)}


def navigate(url: str) -> dict:
    """导航到指定URL"""
    return send_command("navigate", url=url)


def start_picker() -> dict:
    """启动元素选择器"""
    global _picker_active
    result = send_command("start_picker")
    if result.get("success"):
        _picker_active = True
    return result


def stop_picker() -> dict:
    """停止元素选择器"""
    global _picker_active
    result = send_command("stop_picker")
    _picker_active = False
    return result


def get_selected_element() -> dict:
    """获取选中的元素"""
    return send_command("get_selected")


def get_similar_elements() -> dict:
    """获取相似元素"""
    return send_command("get_similar")


def is_picker_active() -> bool:
    """检查选择器是否激活"""
    return _picker_active


def find_page_by_url(url: str) -> dict:
    """查找是否有页面已打开指定URL"""
    return send_command("find_page_by_url", url=url)


def switch_to_page(page_index: int) -> dict:
    """切换到指定索引的页面"""
    return send_command("switch_to_page", pageIndex=page_index)


def ensure_browser_open() -> bool:
    """确保浏览器已打开，如果没有则启动"""
    if is_browser_open():
        return True
    return start_browser()
