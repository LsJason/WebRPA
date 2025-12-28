import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Input } from './input'
import { Button } from './button'
import { useWorkflowStore } from '@/store/workflowStore'
import { cn } from '@/lib/utils'

interface VariableInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  type?: string
  multiline?: boolean
  rows?: number
}

interface VariableHint {
  varName: string
  show: boolean
  startIndex: number  // 匹配到的变量名在文本中的起始位置
  endIndex: number    // 匹配到的变量名在文本中的结束位置
}

// 会创建变量的字段名（这些字段的值会成为可引用的变量）
const VAR_FIELDS = [
  // 通用变量存储字段
  'variableName',
  'resultVariable',
  // 循环相关变量
  'itemVariable',      // foreach 的当前项变量
  'indexVariable',     // foreach/loop 的索引变量
  // 数据源引用（虽然是引用，但也是变量名）
  'dataSource',        // 遍历列表的数据源
  'listVariable',      // 列表操作的目标变量
  'dictVariable',      // 字典操作的目标变量
  'sourceVariable',    // JSON解析的源变量
  'imageVariable',     // AI视觉的图片变量
]

// 模块类型对应的默认变量值
const MODULE_DEFAULT_VARS: Record<string, Record<string, string>> = {
  foreach: {
    itemVariable: 'item',
    indexVariable: 'index',
  },
  loop: {
    indexVariable: 'loop_index',
  },
}

export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
  multiline = false,
  rows = 3,
}: VariableInputProps) {
  const globalVars = useWorkflowStore((state) => state.variables)
  const nodes = useWorkflowStore((state) => state.nodes)
  const [showPopup, setShowPopup] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)
  const [varHint, setVarHint] = useState<VariableHint>({ varName: '', show: false, startIndex: -1, endIndex: -1 })
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  // 从节点中提取所有定义的变量
  const allVars = useMemo(() => {
    const vars: Array<{ name: string; type: string; source: string }> = []
    const seen = new Set<string>()

    // 添加全局变量
    for (const v of globalVars) {
      if (!seen.has(v.name)) {
        seen.add(v.name)
        vars.push({ name: v.name, type: v.type, source: '全局' })
      }
    }

    // 从节点配置中提取变量
    for (const node of nodes) {
      const data = node.data as Record<string, unknown>
      const moduleType = data.moduleType as string
      const nodeLabel = (data.label as string) || (data.name as string) || moduleType
      
      // 获取该模块类型的默认变量值
      const defaultVars = MODULE_DEFAULT_VARS[moduleType] || {}
      
      for (const field of VAR_FIELDS) {
        // 优先使用用户设置的值，否则使用默认值
        let varName = data[field] as string | undefined
        if (!varName && defaultVars[field]) {
          varName = defaultVars[field]
        }
        
        if (typeof varName === 'string' && varName.trim() && !seen.has(varName)) {
          seen.add(varName)
          
          // 根据模块类型和字段推断变量类型
          let varType = 'string'
          
          // 列表/数组类型
          if (moduleType === 'list_operation' || moduleType === 'dict_keys' || moduleType === 'read_excel') {
            varType = 'array'
          }
          // 字典/对象类型
          else if (moduleType === 'dict_operation' || moduleType === 'json_parse') {
            varType = 'object'
          }
          // 数字类型
          else if (moduleType === 'random_number' || moduleType === 'list_length' || moduleType === 'list_get') {
            varType = 'number'
          }
          // 循环模块的索引变量是数字
          else if ((moduleType === 'foreach' || moduleType === 'loop') && field === 'indexVariable') {
            varType = 'number'
          }
          // 遍历列表的当前项变量类型取决于数据源
          else if (moduleType === 'foreach' && field === 'itemVariable') {
            varType = 'any'
          }
          
          vars.push({ 
            name: varName, 
            type: varType, 
            source: nodeLabel
          })
        }
      }
    }

    return vars
  }, [globalVars, nodes])

  // 过滤变量列表
  const filteredVars = useMemo(
    () =>
      allVars.filter((v) =>
        v.name.toLowerCase().includes(searchText.toLowerCase())
      ),
    [allVars, searchText]
  )

  // 处理输入变化
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value
    const pos = e.target.selectionStart || 0
    onChange(newValue)
    setCursorPos(pos)

    // 检查是否在花括号内（支持 {变量} 格式）
    checkAndShowPopup(newValue, pos)
    
    // 检查输入内容是否完全匹配某个变量名（且不在花括号内）
    checkVariableNameMatch(newValue)
  }

  // 检查输入内容中是否包含未被花括号包裹的变量名（作为独立单词）
  const checkVariableNameMatch = useCallback((text: string) => {
    // 找出所有 {xxx} 的位置，避免检测到已经是变量引用的部分
    const bracketRanges: Array<{ start: number; end: number }> = []
    
    const bracketRegex = /\{[^{}]*\}/g
    let match
    while ((match = bracketRegex.exec(text)) !== null) {
      bracketRanges.push({ start: match.index, end: match.index + match[0].length })
    }
    
    // 判断字符是否为单词边界字符（非字母数字下划线，以及中文等）
    const isWordBoundary = (char: string | undefined) => {
      if (!char) return true // 字符串开头或结尾
      // 匹配非单词字符（空格、标点等）
      return /[^a-zA-Z0-9_\u4e00-\u9fa5]/.test(char)
    }
    
    // 检查每个变量名是否在文本中出现（且不在花括号内，且是独立单词）
    for (const v of allVars) {
      const varName = v.name
      if (!varName) continue
      
      // 在文本中查找变量名
      let searchStart = 0
      while (searchStart < text.length) {
        const idx = text.indexOf(varName, searchStart)
        if (idx === -1) break
        
        const endIdx = idx + varName.length
        
        // 检查是否为独立单词（前后都是边界字符）
        const charBefore = text[idx - 1]
        const charAfter = text[endIdx]
        const isStandalone = isWordBoundary(charBefore) && isWordBoundary(charAfter)
        
        if (!isStandalone) {
          searchStart = idx + 1
          continue
        }
        
        // 检查这个位置是否在花括号内
        const isInBracket = bracketRanges.some(
          range => idx >= range.start && endIdx <= range.end
        )
        
        if (!isInBracket) {
          // 找到了未被包裹的独立变量名
          setVarHint({ varName, show: true, startIndex: idx, endIndex: endIdx })
          return
        }
        
        searchStart = idx + 1
      }
    }
    
    // 没有找到匹配的变量名
    setVarHint({ varName: '', show: false, startIndex: -1, endIndex: -1 })
  }, [allVars])

  // 检查光标位置并显示变量提示
  const checkAndShowPopup = (text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos)
    
    // 找到光标前最近的 { 位置
    const lastOpen = beforeCursor.lastIndexOf('{')
    // 找到光标前最近的 } 位置
    const lastCloseBefore = beforeCursor.lastIndexOf('}')

    // 条件：光标前有 {，且这个 { 在最近的 } 之后（说明光标在未闭合的 { 内）
    if (lastOpen !== -1 && lastOpen > lastCloseBefore) {
      // 在花括号内，提取搜索文本（{ 和光标之间的内容）
      const search = beforeCursor.slice(lastOpen + 1)
      setSearchText(search)
      setShowPopup(true)
      setSelectedIndex(0)
    } else {
      setShowPopup(false)
    }
  }

  // 处理光标位置变化（点击或键盘移动）
  const handleSelect = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const pos = target.selectionStart || 0
    setCursorPos(pos)
    checkAndShowPopup(value, pos)
  }

  // 选择变量
  const selectVariable = useCallback(
    (varName: string) => {
      const beforeCursor = value.slice(0, cursorPos)
      const afterCursor = value.slice(cursorPos)
      const lastOpen = beforeCursor.lastIndexOf('{')

      // 检查光标后面是否已经有 }
      const hasClosingBrace = afterCursor.startsWith('}')
      
      // 替换花括号内的内容
      let newValue: string
      let newPos: number
      
      if (hasClosingBrace) {
        // 光标后面已有 }，不需要再加
        newValue = beforeCursor.slice(0, lastOpen + 1) + varName + afterCursor
        newPos = lastOpen + varName.length + 1
      } else {
        // 光标后面没有 }，需要加上
        newValue = beforeCursor.slice(0, lastOpen + 1) + varName + '}' + afterCursor
        newPos = lastOpen + varName.length + 2
      }
      
      onChange(newValue)
      setShowPopup(false)

      // 移动光标到变量后面（} 之后）
      setTimeout(() => {
        inputRef.current?.setSelectionRange(newPos, newPos)
        inputRef.current?.focus()
      }, 0)
    },
    [value, cursorPos, onChange]
  )

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 变量提示弹窗的回车确认
    if (varHint.show && !showPopup && e.key === 'Enter') {
      e.preventDefault()
      confirmVarRef()
      return
    }
    
    // Esc 关闭变量提示
    if (varHint.show && e.key === 'Escape') {
      e.preventDefault()
      dismissVarHint()
      return
    }

    if (!showPopup || filteredVars.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % filteredVars.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filteredVars.length) % filteredVars.length)
    } else if (e.key === 'Enter' && showPopup) {
      e.preventDefault()
      selectVariable(filteredVars[selectedIndex].name)
    } else if (e.key === 'Tab' && showPopup) {
      e.preventDefault()
      selectVariable(filteredVars[selectedIndex].name)
    } else if (e.key === 'Escape') {
      setShowPopup(false)
    }
  }

  // 确认转换为变量引用
  const confirmVarRef = useCallback(() => {
    // 将匹配到的变量名替换为 {变量名}
    const before = value.slice(0, varHint.startIndex)
    const after = value.slice(varHint.endIndex)
    const newValue = before + `{${varHint.varName}}` + after
    onChange(newValue)
    setVarHint({ varName: '', show: false, startIndex: -1, endIndex: -1 })
    // 移动光标到替换后的位置
    const newPos = varHint.startIndex + varHint.varName.length + 2
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newPos, newPos)
      inputRef.current?.focus()
    }, 0)
  }, [varHint, value, onChange])

  // 忽略变量引用提示
  const dismissVarHint = useCallback(() => {
    setVarHint({ varName: '', show: false, startIndex: -1, endIndex: -1 })
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowPopup(false)
      }
      // 点击外部也关闭变量提示
      if (
        hintRef.current &&
        !hintRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setVarHint({ varName: '', show: false, startIndex: -1, endIndex: -1 })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md border border-input bg-background resize-none',
            className
          )}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          placeholder={placeholder}
          className={className}
        />
      )}
      {showPopup && filteredVars.length > 0 && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {filteredVars.map((v, i) => (
            <div
              key={v.name}
              className={cn(
                'px-3 py-1.5 text-sm cursor-pointer',
                i === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              )}
              onClick={() => selectVariable(v.name)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-blue-600">{v.name}</span>
                <span className="text-xs text-gray-500">{v.type}</span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                来源: {v.source}
              </div>
            </div>
          ))}
        </div>
      )}
      {showPopup && filteredVars.length === 0 && searchText && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg p-2"
        >
          <p className="text-xs text-gray-500 text-center">
            未找到变量 "{searchText}"
          </p>
        </div>
      )}
      {/* 变量名匹配提示 */}
      {varHint.show && !showPopup && (
        <div
          ref={hintRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-orange-200 bg-orange-50 shadow-lg p-3"
        >
          <p className="text-sm text-orange-800 mb-2">
            检测到变量 <span className="font-mono font-medium text-orange-600">"{varHint.varName}"</span>，是否引用该变量？
            <span className="text-xs text-orange-500 ml-1">(按 Enter 确认)</span>
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={dismissVarHint}
              className="h-7 text-xs"
            >
              否 (Esc)
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmVarRef}
              className="h-7 text-xs"
            >
              是 (Enter)
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
