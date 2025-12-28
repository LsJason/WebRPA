# Module executors
from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    LogMessage,
    ExecutorRegistry,
    registry,
    register_executor,
)

# 导入所有执行器以触发注册
from . import basic
from . import advanced
from . import control
from . import captcha
from . import data_structure
from . import ai
from . import table
from . import subflow
from . import database

# 调试：打印已注册的执行器
print(f"[DEBUG] 已注册的执行器类型: {registry.get_all_types()}")

__all__ = [
    "ModuleExecutor",
    "ExecutionContext",
    "ModuleResult",
    "LogMessage",
    "ExecutorRegistry",
    "registry",
    "register_executor",
]
