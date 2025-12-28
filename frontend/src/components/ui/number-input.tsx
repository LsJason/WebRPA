import * as React from 'react'
import { cn } from '@/lib/utils'

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: number | string
  onChange: (value: number) => void
  defaultValue?: number
  min?: number
  max?: number
}

/**
 * 数字输入框组件
 * - 输入时允许清空
 * - 失焦时如果为空则自动填充默认值（默认为0）
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, defaultValue = 0, min, max, ...props }, ref) => {
    // 内部状态用于控制显示值，允许为空字符串
    const [displayValue, setDisplayValue] = React.useState<string>(String(value ?? defaultValue))

    // 当外部 value 变化时同步
    React.useEffect(() => {
      setDisplayValue(String(value ?? defaultValue))
    }, [value, defaultValue])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      // 允许输入空字符串、负号、数字
      if (inputValue === '' || inputValue === '-' || /^-?\d*\.?\d*$/.test(inputValue)) {
        setDisplayValue(inputValue)
        // 只有当是有效数字时才触发 onChange
        const num = parseFloat(inputValue)
        if (!isNaN(num)) {
          onChange(num)
        }
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      let finalValue = parseFloat(displayValue)
      
      // 如果不是有效数字，使用默认值
      if (isNaN(finalValue)) {
        finalValue = defaultValue
      }
      
      // 应用 min/max 限制
      if (min !== undefined && finalValue < min) {
        finalValue = min
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max
      }
      
      setDisplayValue(String(finalValue))
      onChange(finalValue)
      
      // 调用原有的 onBlur
      props.onBlur?.(e)
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
NumberInput.displayName = 'NumberInput'

export { NumberInput }
