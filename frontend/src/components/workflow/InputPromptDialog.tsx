import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { socketService } from '@/services/socket'
import { X, List, Hash, Type, Lock, AlignLeft } from 'lucide-react'

interface PromptData {
  requestId: string
  variableName: string
  title: string
  message: string
  defaultValue: string
  inputMode: 'single' | 'multiline' | 'number' | 'integer' | 'password' | 'list'
  minValue?: number
  maxValue?: number
  maxLength?: number
  required?: boolean
}

export function InputPromptDialog() {
  const [promptData, setPromptData] = useState<PromptData | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const handlePromptRequest = useCallback((data: PromptData) => {
    setPromptData(data)
    setInputValue(data.defaultValue || '')
    setError('')
  }, [])

  useEffect(() => {
    socketService.setInputPromptCallback(handlePromptRequest)
    return () => {
      socketService.setInputPromptCallback(null)
    }
  }, [handlePromptRequest])

  const validateInput = (): boolean => {
    if (!promptData) return false
    
    const { inputMode, required, minValue, maxValue, maxLength } = promptData
    const trimmedValue = inputValue.trim()
    
    // 必填检查
    if (required !== false && !trimmedValue) {
      setError('此项为必填')
      return false
    }
    
    // 数字模式验证
    if (inputMode === 'number' || inputMode === 'integer') {
      if (trimmedValue) {
        const num = Number(trimmedValue)
        if (isNaN(num)) {
          setError(inputMode === 'integer' ? '请输入有效的整数' : '请输入有效的数字')
          return false
        }
        if (inputMode === 'integer' && !Number.isInteger(num)) {
          setError('请输入整数，不能包含小数')
          return false
        }
        if (minValue != null && num < minValue) {
          setError(`数值不能小于 ${minValue}`)
          return false
        }
        if (maxValue != null && num > maxValue) {
          setError(`数值不能大于 ${maxValue}`)
          return false
        }
      }
      // 数字模式不检查字符长度
      setError('')
      return true
    }
    
    // 长度检查（仅对非数字模式）
    if (maxLength != null && maxLength > 0 && trimmedValue.length > maxLength) {
      setError(`长度不能超过 ${maxLength} 个字符`)
      return false
    }
    
    setError('')
    return true
  }

  const handleSubmit = () => {
    if (!validateInput()) return
    
    if (promptData) {
      let resultValue: string = inputValue
      
      // 数字模式转换
      if ((promptData.inputMode === 'number' || promptData.inputMode === 'integer') && inputValue.trim()) {
        resultValue = inputValue.trim()
      }
      
      socketService.sendInputResult(promptData.requestId, resultValue)
      setPromptData(null)
      setInputValue('')
      setError('')
    }
  }

  const handleCancel = () => {
    if (promptData) {
      socketService.sendInputResult(promptData.requestId, null)
      setPromptData(null)
      setInputValue('')
      setError('')
    }
  }

  if (!promptData) return null

  const { inputMode } = promptData
  const isListMode = inputMode === 'list'
  const isMultiline = inputMode === 'multiline' || isListMode
  const isNumber = inputMode === 'number' || inputMode === 'integer'
  const isPassword = inputMode === 'password'
  const lineCount = inputValue.split('\n').filter(line => line.trim()).length

  const getModeIcon = () => {
    switch (inputMode) {
      case 'list': return <List className="w-4 h-4 text-blue-500" />
      case 'number':
      case 'integer': return <Hash className="w-4 h-4 text-green-500" />
      case 'password': return <Lock className="w-4 h-4 text-orange-500" />
      case 'multiline': return <AlignLeft className="w-4 h-4 text-purple-500" />
      default: return <Type className="w-4 h-4 text-gray-500" />
    }
  }

  const getModeLabel = () => {
    switch (inputMode) {
      case 'list': return '列表输入'
      case 'number': return '数字输入'
      case 'integer': return '整数输入'
      case 'password': return '密码输入'
      case 'multiline': return '多行输入'
      default: return '文本输入'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white text-black border border-gray-200 rounded-lg shadow-xl w-full max-w-md p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getModeIcon()}
            <h3 className="font-semibold text-gray-900">{promptData.title || '输入'}</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{getModeLabel()}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-700">{promptData.message || '请输入值:'}</Label>
            {isMultiline ? (
              <>
                <textarea
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError('') }}
                  placeholder={isListMode ? "每行输入一个值..." : "请输入内容..."}
                  className={`w-full h-40 px-3 py-2 bg-white text-black border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
                  autoFocus
                />
                {isListMode && (
                  <p className="text-xs text-gray-500">
                    每行一个值，当前 {lineCount} 项 → 变量: <code className="bg-gray-100 px-1 rounded">{promptData.variableName}</code>
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  type={isPassword ? 'password' : isNumber ? 'number' : 'text'}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError('') }}
                  placeholder={isNumber ? "请输入数字..." : "请输入..."}
                  className={`bg-white text-black ${error ? 'border-red-500' : 'border-gray-300'}`}
                  autoFocus
                  step={inputMode === 'integer' ? '1' : 'any'}
                  min={promptData.minValue}
                  max={promptData.maxValue}
                  maxLength={promptData.maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  将设置变量: <code className="bg-gray-100 px-1 rounded">{promptData.variableName}</code>
                  {isNumber && promptData.minValue !== undefined && promptData.maxValue !== undefined && (
                    <span className="ml-2">范围: {promptData.minValue} ~ {promptData.maxValue}</span>
                  )}
                </p>
              </>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={handleCancel}>
              取消
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSubmit}>
              确定
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
