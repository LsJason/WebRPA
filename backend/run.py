import uvicorn
import sys
import asyncio

if __name__ == "__main__":
    # Windows 上需要设置事件循环策略以支持 Playwright
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # 禁用 reload 避免缓存问题
        log_level="info",
        access_log=True
    )
