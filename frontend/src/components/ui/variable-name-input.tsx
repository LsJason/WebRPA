import { Input } from './input'
import { cn } from '@/lib/utils'

interface VariableNameInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * 变量名输入组件
 * 用于输入变量名，自动过滤非法字符，只允许字母、数字、下划线和中文
 */
export function VariableNameInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: VariableNameInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // 过滤非法字符，只保留字母、数字、下划线和中文
    const filtered = newValue.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')
    onChange(filtered)
  }

  return (
    <Input
      id={id}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn('font-mono', className)}
    />
  )
}
