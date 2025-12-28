import { Button } from './button'
import { AlertTriangle, Info, HelpCircle } from 'lucide-react'

export type ConfirmDialogType = 'confirm' | 'alert' | 'warning'

interface ConfirmDialogProps {
  isOpen: boolean
  type?: ConfirmDialogType
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmDialog({
  isOpen,
  type = 'confirm',
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const isAlertOnly = type === 'alert'

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />
      case 'alert':
        return <Info className="w-6 h-6 text-blue-500" />
      default:
        return <HelpCircle className="w-6 h-6 text-blue-500" />
    }
  }

  const getTitle = () => {
    if (title) return title
    switch (type) {
      case 'warning':
        return '警告'
      case 'alert':
        return '提示'
      default:
        return '确认'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {getTitle()}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 rounded-b-lg border-t">
          {!isAlertOnly && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            size="sm"
            className={
              type === 'warning'
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

// 用于创建全局确认对话框的 hook
import { useState, useCallback } from 'react'

interface UseConfirmOptions {
  type?: ConfirmDialogType
  title?: string
  confirmText?: string
  cancelText?: string
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean
    message: string
    options: UseConfirmOptions
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    message: '',
    options: {},
    resolve: null,
  })

  const confirm = useCallback((message: string, options: UseConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        message,
        options,
        resolve,
      })
    })
  }, [])

  const alert = useCallback((message: string, options: Omit<UseConfirmOptions, 'type'> = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        message,
        options: { ...options, type: 'alert' },
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={state.isOpen}
      type={state.options.type}
      title={state.options.title}
      message={state.message}
      confirmText={state.options.confirmText}
      cancelText={state.options.cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return {
    confirm,
    alert,
    ConfirmDialog: ConfirmDialogComponent,
  }
}
