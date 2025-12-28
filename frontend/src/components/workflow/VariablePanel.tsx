import { useWorkflowStore } from '@/store/workflowStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useCallback } from 'react'
import type { VariableType } from '@/types'

// 变量类型标签
const typeLabels: Record<VariableType, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  array: '列表',
  object: '字典',
}

// 变量类型颜色
const typeColors: Record<VariableType, string> = {
  string: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  number: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  boolean: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  array: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  object: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
}

export function VariablePanel() {
  const variables = useWorkflowStore((state) => state.variables)
  const addVariable = useWorkflowStore((state) => state.addVariable)
  const updateVariable = useWorkflowStore((state) => state.updateVariable)
  const deleteVariable = useWorkflowStore((state) => state.deleteVariable)

  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarType, setNewVarType] = useState<VariableType>('string')
  const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set())
  const [selectedVarName, setSelectedVarName] = useState<string | null>(null)

  // 处理键盘事件（Delete删除选中变量）
  const handleKeyDown = useCallback((e: React.KeyboardEvent, varName: string) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      deleteVariable(varName)
      setSelectedVarName(null)
    }
  }, [deleteVariable])

  // 解析输入值为对应类型
  const parseValue = (value: string, type: VariableType): unknown => {
    try {
      switch (type) {
        case 'number':
          const num = parseFloat(value)
          return isNaN(num) ? 0 : num
        case 'boolean':
          return value.toLowerCase() === 'true' || value === '1'
        case 'array':
          if (!value.trim()) return []
          return JSON.parse(value)
        case 'object':
          if (!value.trim()) return {}
          return JSON.parse(value)
        default:
          return value
      }
    } catch {
      // 解析失败返回默认值
      if (type === 'array') return []
      if (type === 'object') return {}
      return value
    }
  }

  // 获取类型的默认值
  const getDefaultValue = (type: VariableType): string => {
    switch (type) {
      case 'number': return '0'
      case 'boolean': return 'false'
      case 'array': return '[]'
      case 'object': return '{}'
      default: return ''
    }
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return

    const value = newVarValue.trim() || getDefaultValue(newVarType)
    const parsedValue = parseValue(value, newVarType)

    addVariable({
      name: newVarName.trim(),
      value: parsedValue,
      type: newVarType,
      scope: 'global',
    })

    setNewVarName('')
    setNewVarValue('')
    setNewVarType('string')
  }

  const handleTypeChange = (type: VariableType) => {
    setNewVarType(type)
    setNewVarValue(getDefaultValue(type))
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const formatDisplayValue = (value: unknown, type: VariableType): string => {
    if (value === null || value === undefined) return ''
    if (type === 'array' && Array.isArray(value)) {
      return `[${value.length}项]`
    }
    if (type === 'object' && typeof value === 'object') {
      return `{${Object.keys(value as object).length}个键}`
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedVars)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedVars(newExpanded)
  }

  const handleUpdateVariable = (name: string, value: string, type: VariableType) => {
    const parsedValue = parseValue(value, type)
    updateVariable(name, parsedValue)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium mb-2">全局变量</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              placeholder="变量名"
              className="h-8 text-xs flex-1"
            />
            <Select
              value={newVarType}
              onChange={(e) => handleTypeChange(e.target.value as VariableType)}
              className="h-8 text-xs w-24"
            >
              <option value="string">字符串</option>
              <option value="number">数字</option>
              <option value="boolean">布尔</option>
              <option value="array">列表</option>
              <option value="object">字典</option>
            </Select>
          </div>
          <div className="flex gap-2">
            {newVarType === 'boolean' ? (
              <Select
                value={newVarValue || 'false'}
                onChange={(e) => setNewVarValue(e.target.value)}
                className="h-8 text-xs flex-1"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            ) : (newVarType === 'array' || newVarType === 'object') ? (
              <textarea
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder={newVarType === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
                className="flex-1 h-16 px-2 py-1 text-xs rounded-md border border-input bg-background font-mono resize-none"
              />
            ) : (
              <Input
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder={newVarType === 'number' ? '0' : '初始值'}
                type={newVarType === 'number' ? 'number' : 'text'}
                className="h-8 text-xs flex-1"
              />
            )}
            <Button size="sm" className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleAddVariable}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {variables.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            暂无变量
          </p>
        ) : (
          <div className="space-y-2">
            {variables.map((variable) => (
              <div
                key={variable.name}
                className={`p-2 rounded bg-muted/50 cursor-pointer outline-none transition-colors ${
                  selectedVarName === variable.name ? 'ring-2 ring-primary bg-muted' : 'hover:bg-muted/70'
                }`}
                tabIndex={0}
                onClick={(e) => {
                  // 只有点击容器本身时才选中，点击内部元素不选中
                  if (e.target === e.currentTarget) {
                    setSelectedVarName(variable.name)
                  }
                }}
                onFocus={() => setSelectedVarName(variable.name)}
                onKeyDown={(e) => handleKeyDown(e, variable.name)}
              >
                <div className="flex items-center gap-2">
                  {(variable.type === 'array' || variable.type === 'object') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(variable.name)
                      }}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {expandedVars.has(variable.name) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setSelectedVarName(variable.name)}
                    >
                      <span className="text-xs font-medium truncate">
                        {variable.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[variable.type]}`}>
                        {typeLabels[variable.type]}
                      </span>
                    </div>
                    {(variable.type === 'array' || variable.type === 'object') ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayValue(variable.value, variable.type)}
                      </span>
                    ) : variable.type === 'boolean' ? (
                      <Select
                        value={String(variable.value)}
                        onChange={(e) => handleUpdateVariable(variable.name, e.target.value, variable.type)}
                        className="h-6 text-xs mt-1"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </Select>
                    ) : (
                      <Input
                        value={formatValue(variable.value)}
                        onChange={(e) => handleUpdateVariable(variable.name, e.target.value, variable.type)}
                        type={variable.type === 'number' ? 'number' : 'text'}
                        className="h-6 text-xs mt-1"
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteVariable(variable.name)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {/* 展开显示列表/字典内容 */}
                {expandedVars.has(variable.name) && (variable.type === 'array' || variable.type === 'object') && (
                  <div className="mt-2 pt-2 border-t">
                    <textarea
                      value={formatValue(variable.value)}
                      onChange={(e) => handleUpdateVariable(variable.name, e.target.value, variable.type)}
                      className="w-full h-24 px-2 py-1 text-xs rounded-md border border-input bg-background font-mono resize-none"
                      placeholder={variable.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 变量引用语法提示 */}
      <div className="p-2 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-medium">引用语法：</span>
          {'{变量名}'} · {'{列表[0]}'} · {'{列表[-1]}'} · {'{字典[键名]}'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          💡 点击变量名选中后，按 Delete 键可快速删除
        </p>
      </div>
    </div>
  )
}
