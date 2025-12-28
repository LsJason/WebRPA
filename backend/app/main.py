import asyncio
import sys
import threading
import uuid

# Windows 上需要设置事件循环策略以支持 Playwright
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

# 创建Socket.IO服务器
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=120,  # ping 超时 120秒
    ping_interval=25,  # ping 间隔 25秒
)

# 创建FastAPI应用
app = FastAPI(
    title="Web Automation API",
    description="网页自动化工作流构建平台后端API",
    version="0.1.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入并注册路由
from app.api.workflows import router as workflows_router
from app.api.element_picker import router as element_picker_router
from app.api.data_assets import router as data_assets_router
from app.api.browser import router as browser_router
from app.api.system import router as system_router
from app.api.local_workflows import router as local_workflows_router
app.include_router(workflows_router)
app.include_router(element_picker_router)
app.include_router(data_assets_router)
app.include_router(browser_router)
app.include_router(system_router)
app.include_router(local_workflows_router)

# 将Socket.IO挂载到FastAPI
socket_app = socketio.ASGIApp(sio, app)


@app.get("/")
async def root():
    return {"message": "Web Automation API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """应用启动时设置主事件循环"""
    loop = asyncio.get_event_loop()
    set_main_loop(loop)


# Socket.IO事件处理
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # 清理该客户端的日志开关状态
    if sid in log_enabled_by_client:
        del log_enabled_by_client[sid]


@sio.event
async def execution_stop(sid, data):
    """处理停止执行请求"""
    workflow_id = data.get('workflowId')
    if workflow_id:
        # 先清理所有等待中的事件，让阻塞的线程能够退出
        clear_all_pending_events()
        
        from app.api.workflows import executions_store
        executor = executions_store.get(workflow_id)
        if executor and executor.is_running:
            await executor.stop()


# 全局日志开关状态
log_enabled_by_client: dict[str, bool] = {}


@sio.event
async def set_verbose_log(sid, data):
    """处理详细日志开关设置"""
    enabled = data.get('enabled', False)
    log_enabled_by_client[sid] = enabled
    print(f"Client {sid} set verbose_log to {enabled}")


def is_log_enabled() -> bool:
    """检查是否有客户端连接"""
    # 只要有客户端连接就发送日志，由前端决定是否显示
    return len(log_enabled_by_client) > 0 or True  # 始终返回True，确保日志发送


def clear_all_pending_events():
    """清理所有等待中的事件，用于停止执行时释放阻塞的线程"""
    # 清理输入弹窗事件
    with input_prompt_lock:
        for event in input_prompt_events.values():
            event.set()
        input_prompt_events.clear()
        input_prompt_results.clear()
    
    # 清理语音合成事件
    with tts_lock:
        for event in tts_events.values():
            event.set()
        tts_events.clear()
        tts_results.clear()
    
    # 清理JS脚本事件
    with js_script_lock:
        for event in js_script_events.values():
            event.set()
        js_script_events.clear()
        js_script_results.clear()
    
    # 清理播放音乐事件
    with play_music_lock:
        for event in play_music_events.values():
            event.set()
        play_music_events.clear()
        play_music_results.clear()


# 存储输入弹窗的等待事件（使用线程安全的Event）
input_prompt_events: dict[str, threading.Event] = {}
input_prompt_results: dict[str, str | None] = {}
input_prompt_lock = threading.Lock()

# 存储语音合成的等待事件
tts_events: dict[str, threading.Event] = {}
tts_results: dict[str, bool] = {}
tts_lock = threading.Lock()

# 存储JS脚本执行的等待事件
js_script_events: dict[str, threading.Event] = {}
js_script_results: dict[str, dict] = {}
js_script_lock = threading.Lock()

# 存储播放音乐的等待事件
play_music_events: dict[str, threading.Event] = {}
play_music_results: dict[str, dict] = {}
play_music_lock = threading.Lock()

# 存储主事件循环引用
main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop):
    """设置主事件循环引用"""
    global main_loop
    main_loop = loop


@sio.event
async def input_prompt_result(sid, data):
    """处理输入弹窗结果"""
    request_id = data.get('requestId')
    value = data.get('value')
    
    if request_id:
        with input_prompt_lock:
            input_prompt_results[request_id] = value
            if request_id in input_prompt_events:
                input_prompt_events[request_id].set()


@sio.event
async def tts_result(sid, data):
    """处理语音合成结果"""
    request_id = data.get('requestId')
    success = data.get('success', False)
    
    if request_id:
        with tts_lock:
            tts_results[request_id] = success
            if request_id in tts_events:
                tts_events[request_id].set()


@sio.event
async def js_script_result(sid, data):
    """处理JS脚本执行结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with js_script_lock:
            js_script_results[request_id] = {
                'success': data.get('success', False),
                'result': data.get('result'),
                'error': data.get('error'),
            }
            if request_id in js_script_events:
                js_script_events[request_id].set()


@sio.event
async def play_music_result(sid, data):
    """处理播放音乐结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with play_music_lock:
            play_music_results[request_id] = {
                'success': data.get('success', False),
                'error': data.get('error'),
            }
            if request_id in play_music_events:
                play_music_events[request_id].set()


def request_input_prompt_sync(
    variable_name: str, 
    title: str, 
    message: str, 
    default_value: str, 
    input_mode: str = 'single',
    min_value: float | None = None,
    max_value: float | None = None,
    max_length: int | None = None,
    required: bool = True,
    timeout: float = 300
) -> str | None:
    """同步请求前端弹出输入框并等待结果（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with input_prompt_lock:
        input_prompt_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:input_prompt', {
                'requestId': request_id,
                'variableName': variable_name,
                'title': title,
                'message': message,
                'defaultValue': default_value,
                'inputMode': input_mode,
                'minValue': min_value,
                'maxValue': max_value,
                'maxLength': max_length,
                'required': required,
            }),
            main_loop
        )
    
    try:
        # 等待用户输入（带超时）
        if event.wait(timeout=timeout):
            with input_prompt_lock:
                result = input_prompt_results.get(request_id)
            return result
        return None
    finally:
        # 清理
        with input_prompt_lock:
            input_prompt_events.pop(request_id, None)
            input_prompt_results.pop(request_id, None)


def request_tts_sync(text: str, lang: str, rate: float, pitch: float, volume: float, timeout: float = 60) -> bool:
    """同步请求前端执行语音合成并等待完成（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with tts_lock:
        tts_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:tts_request', {
                'requestId': request_id,
                'text': text,
                'lang': lang,
                'rate': rate,
                'pitch': pitch,
                'volume': volume,
            }),
            main_loop
        )
    
    try:
        # 等待语音合成完成（带超时）
        if event.wait(timeout=timeout):
            with tts_lock:
                result = tts_results.get(request_id, False)
            return result
        return False
    finally:
        # 清理
        with tts_lock:
            tts_events.pop(request_id, None)
            tts_results.pop(request_id, None)


def request_js_script_sync(code: str, variables: dict, timeout: float = 30) -> dict:
    """同步请求前端执行JS脚本并等待结果（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with js_script_lock:
        js_script_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:js_script', {
                'requestId': request_id,
                'code': code,
                'variables': variables,
            }),
            main_loop
        )
    
    try:
        # 等待脚本执行完成（带超时）
        if event.wait(timeout=timeout):
            with js_script_lock:
                result = js_script_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'脚本执行超时 ({timeout}秒)'}
    finally:
        # 清理
        with js_script_lock:
            js_script_events.pop(request_id, None)
            js_script_results.pop(request_id, None)


def request_play_music_sync(audio_url: str, wait_for_end: bool, timeout: float = 600) -> dict:
    """同步请求前端播放音乐（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with play_music_lock:
        play_music_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:play_music', {
                'requestId': request_id,
                'audioUrl': audio_url,
                'waitForEnd': wait_for_end,
            }),
            main_loop
        )
    
    try:
        # 等待播放完成（带超时）
        if event.wait(timeout=timeout):
            with play_music_lock:
                result = play_music_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'播放超时 ({timeout}秒)'}
    finally:
        # 清理
        with play_music_lock:
            play_music_events.pop(request_id, None)
            play_music_results.pop(request_id, None)


# 导出socket_app作为ASGI应用
def get_app():
    return socket_app
