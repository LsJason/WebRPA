"""模块执行器基类和注册机制 - 异步版本"""
from abc import ABC, abstractmethod
from typing import Any, Optional, Type
from dataclasses import dataclass, field
from playwright.async_api import Page, Browser, BrowserContext
import asyncio

from app.models.workflow import LogLevel


@dataclass
class ExecutionContext:
    """执行上下文 - 在模块执行器之间共享的状态（异步版本）"""
    browser: Optional[Browser] = None
    browser_context: Optional[BrowserContext] = None
    page: Optional[Page] = None
    variables: dict[str, Any] = field(default_factory=dict)
    data_rows: list[dict[str, Any]] = field(default_factory=list)
    current_row: dict[str, Any] = field(default_factory=dict)
    loop_stack: list[dict] = field(default_factory=list)  # 循环状态栈
    should_break: bool = False
    should_continue: bool = False
    headless: bool = False  # 无头模式
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)  # 异步锁
    
    # Playwright 实例引用
    _playwright: Any = None
    _user_data_dir: Optional[str] = None
    
    async def switch_to_latest_page(self) -> bool:
        """切换到最新的页面（处理新标签页打开的情况）
        
        Returns:
            bool: 是否切换了页面
        """
        if self.browser_context is None:
            return False
        
        try:
            # 获取所有页面
            pages = self.browser_context.pages
            if not pages:
                return False
            
            # 获取最新的页面（最后一个）
            latest_page = pages[-1]
            
            # 如果最新页面不是当前页面，切换过去
            if self.page != latest_page:
                self.page = latest_page
                return True
            
            return False
        except Exception:
            return False
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """获取变量值，支持${var}语法"""
        if name.startswith('${') and name.endswith('}'):
            name = name[2:-1]
        return self.variables.get(name, default)
    
    def set_variable(self, name: str, value: Any):
        """设置变量值"""
        self.variables[name] = value
    
    def resolve_value(self, value: Any) -> Any:
        """解析值中的变量引用
        
        支持格式：
        - ${varName} - 标准格式
        - {varName} - 简化格式
        - {listName[0]} - 列表索引访问
        - {dictName[key]} 或 {dictName["key"]} - 字典键访问
        - {data[0][name]} - 嵌套访问
        """
        if isinstance(value, str):
            import re
            
            def resolve_access_path(var_name: str) -> Any:
                """解析变量访问路径，支持索引和键访问"""
                var_name = var_name.strip()
                
                # 解析基础变量名和访问路径
                # 匹配: varName 或 varName[...][...]...
                base_match = re.match(r'^([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)((?:\[[^\]]+\])*)', var_name)
                if not base_match:
                    return None
                
                base_name = base_match.group(1)
                access_path = base_match.group(2)
                
                # 获取基础变量
                if base_name not in self.variables:
                    return None
                result = self.variables[base_name]
                # 深拷贝以避免并发修改问题
                if isinstance(result, (list, dict)):
                    import copy
                    result = copy.deepcopy(result)
                
                # 如果没有访问路径，直接返回
                if not access_path:
                    return result
                
                # 解析所有的 [xxx] 访问
                bracket_pattern = r'\[([^\]]+)\]'
                accessors = re.findall(bracket_pattern, access_path)
                
                for accessor in accessors:
                    accessor = accessor.strip()
                    
                    # 移除引号（如果有）
                    if (accessor.startswith('"') and accessor.endswith('"')) or \
                       (accessor.startswith("'") and accessor.endswith("'")):
                        accessor = accessor[1:-1]
                    
                    try:
                        if isinstance(result, list):
                            # 列表索引访问（支持负数索引，如 -1 表示最后一个元素）
                            index = int(accessor)
                            if -len(result) <= index < len(result):
                                result = result[index]
                            else:
                                return None
                        elif isinstance(result, dict):
                            # 字典键访问 - 先尝试原始键，再尝试数字键
                            if accessor in result:
                                result = result[accessor]
                            else:
                                # 尝试将键转为数字
                                try:
                                    num_key = int(accessor)
                                    if num_key in result:
                                        result = result[num_key]
                                    else:
                                        return None
                                except ValueError:
                                    return None
                        else:
                            # 不支持的类型
                            return None
                    except (ValueError, IndexError, KeyError, TypeError):
                        return None
                
                return result
            
            def replacer(match):
                var_expr = match.group(1).strip()
                resolved = resolve_access_path(var_expr)
                if resolved is not None:
                    # 如果是复杂类型，转为JSON字符串
                    if isinstance(resolved, (list, dict)):
                        import json
                        return json.dumps(resolved, ensure_ascii=False)
                    return str(resolved)
                # 未找到变量，返回原始匹配
                return match.group(0)
            
            # 先替换 ${varName} 格式
            pattern1 = r'\$\{([^}]+)\}'
            result = re.sub(pattern1, replacer, value)
            
            # 再替换 {varName} 格式（但不匹配已经有$的）
            pattern2 = r'(?<!\$)\{([^}]+)\}'
            result = re.sub(pattern2, replacer, result)
            
            return result
        return value
    
    def add_data_value(self, column: str, value: Any):
        """添加数据值到当前行
        
        如果当前行已经有该列的数据，则自动提交当前行并开始新行
        """
        # 如果当前行已经有这个列的数据，先提交当前行
        if column in self.current_row:
            self._commit_row_internal()
        self.current_row[column] = value
    
    def _commit_row_internal(self):
        """内部提交方法"""
        if self.current_row:
            self.data_rows.append(self.current_row.copy())
            self.current_row = {}
    
    def commit_row(self):
        """提交当前行到数据集"""
        self._commit_row_internal()


@dataclass
class ModuleResult:
    """模块执行结果"""
    success: bool
    message: str = ""
    data: Any = None
    error: Optional[str] = None
    branch: Optional[str] = None  # 用于条件分支，值为 "true" 或 "false"
    duration: float = 0  # 执行耗时（毫秒）
    log_level: Optional[str] = None  # 自定义日志级别（用于打印日志模块）


@dataclass
class LogMessage:
    """日志消息"""
    level: LogLevel
    message: str
    node_id: Optional[str] = None
    details: Optional[dict] = None
    duration: Optional[float] = None


class ModuleExecutor(ABC):
    """模块执行器基类 - 纯异步版本"""
    
    @property
    @abstractmethod
    def module_type(self) -> str:
        """返回此执行器处理的模块类型"""
        pass
    
    @abstractmethod
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行模块逻辑（异步版本）"""
        pass
    
    def validate_config(self, config: dict) -> tuple[bool, str]:
        """验证配置有效性，子类可重写"""
        return True, ""


class ExecutorRegistry:
    """执行器注册表"""
    
    def __init__(self):
        self._executors: dict[str, ModuleExecutor] = {}
    
    def register(self, executor_class: Type[ModuleExecutor]):
        """注册执行器类 - 每次都创建新实例"""
        executor = executor_class()
        self._executors[executor.module_type] = executor
    
    def get(self, module_type: str) -> Optional[ModuleExecutor]:
        """获取指定类型的执行器"""
        return self._executors.get(module_type)
    
    def get_all_types(self) -> list[str]:
        """获取所有已注册的模块类型"""
        return list(self._executors.keys())
    
    def clear(self):
        """清空注册表"""
        self._executors.clear()


# 全局注册表实例
registry = ExecutorRegistry()


def register_executor(cls: Type[ModuleExecutor]) -> Type[ModuleExecutor]:
    """装饰器：注册执行器 - 每次都重新注册"""
    registry.register(cls)
    return cls
