"""类型转换工具函数"""


def to_int(value, default: int, context=None) -> int:
    """将值转换为整数，支持变量解析"""
    if value is None:
        return default
    
    # 如果提供了 context，先解析变量
    if context is not None and isinstance(value, str):
        value = context.resolve_value(value)
    
    try:
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return default
            return int(float(value))
        return default
    except (ValueError, TypeError):
        return default


def to_float(value, default: float, context=None) -> float:
    """将值转换为浮点数，支持变量解析"""
    if value is None:
        return default
    
    # 如果提供了 context，先解析变量
    if context is not None and isinstance(value, str):
        value = context.resolve_value(value)
    
    try:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return default
            return float(value)
        return default
    except (ValueError, TypeError):
        return default
