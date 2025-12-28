import { useWorkflowStore, type DataRow } from '@/store/workflowStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { 
  Trash2, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  X, 
  FileSpreadsheet,
  Edit2,
  Check,
  FileText,
  Variable,
  Search,
  Filter,
  Upload,
  Database,
  File,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { LogLevel, VariableType, DataAsset } from '@/types'
import { dataAssetApi } from '@/services/api'
import { ExcelPreviewDialog } from './config-panels/ExcelPreviewDialog'

type LogFilterType = 'all' | LogLevel

export function LogPanel() {
  const logs = useWorkflowStore((state) => state.logs)
  const clearLogs = useWorkflowStore((state) => state.clearLogs)
  const selectNode = useWorkflowStore((state) => state.selectNode)
  const variables = useWorkflowStore((state) => state.variables)
  const addVariable = useWorkflowStore((state) => state.addVariable)
  const updateVariable = useWorkflowStore((state) => state.updateVariable)
  const deleteVariable = useWorkflowStore((state) => state.deleteVariable)
  const { 
    collectedData, 
    setCollectedData,
    updateDataRow, 
    deleteDataRow, 
    addDataRow,
    clearCollectedData,
    name: workflowName,
    dataAssets,
    addDataAsset,
    deleteDataAsset,
    bottomPanelTab: activeTab,
    setBottomPanelTab: setActiveTab,
    verboseLog,
    setVerboseLog,
  } = useWorkflowStore()

  const { confirm, alert, ConfirmDialog } = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  
  // 日志搜索和筛选
  const [logSearchQuery, setLogSearchQuery] = useState('')
  const [logLevelFilter, setLogLevelFilter] = useState<LogFilterType>('all')
  
  // 变量相关状态
  const [isAddingVar, setIsAddingVar] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarType, setNewVarType] = useState<VariableType>('string')
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editVarValue, setEditVarValue] = useState('')

  // 显示的最大日志条数（用于渲染优化）
  const MAX_DISPLAY_LOGS = 100

  // Excel预览状态
  const [previewAsset, setPreviewAsset] = useState<DataAsset | null>(null)

  // 过滤后的日志
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      // 类型筛选
      if (logLevelFilter !== 'all' && log.level !== logLevelFilter) {
        return false
      }
      // 搜索筛选
      if (logSearchQuery.trim()) {
        const query = logSearchQuery.toLowerCase()
        return log.message.toLowerCase().includes(query)
      }
      return true
    })
    // 只显示最近的日志，避免渲染过多DOM
    return filtered.slice(-MAX_DISPLAY_LOGS)
  }, [logs, logLevelFilter, logSearchQuery])

  // 自动滚动到最新日志
  useEffect(() => {
    // 每次 filteredLogs 变化都滚动到底部
    if (logEndRef.current && activeTab === 'logs' && filteredLogs.length > 0) {
      requestAnimationFrame(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'auto' })
      })
    }
  }, [filteredLogs, activeTab])

  // 获取所有列名
  const columns = Array.from(
    new Set(collectedData.flatMap(row => Object.keys(row)))
  )

  const handleExportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogClick = (nodeId?: string) => {
    if (nodeId) {
      selectNode(nodeId)
    }
  }

  // 数据表格相关方法
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const startEdit = (rowIndex: number, colName: string, value: unknown) => {
    setEditingCell({ row: rowIndex, col: colName })
    setEditValue(formatCellValue(value))
  }

  const saveEdit = () => {
    if (editingCell) {
      const row = { ...collectedData[editingCell.row] }
      row[editingCell.col] = editValue
      updateDataRow(editingCell.row, row)
      setEditingCell(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleAddRow = () => {
    const newRow: DataRow = {}
    columns.forEach(col => { newRow[col] = '' })
    if (columns.length === 0) {
      newRow['列1'] = ''
    }
    addDataRow(newRow)
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return
    const updatedData = collectedData.map(row => ({
      ...row,
      [newColumnName]: ''
    }))
    setCollectedData(updatedData.length > 0 ? updatedData : [{ [newColumnName]: '' }])
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  const handleDeleteColumn = (colName: string) => {
    const updatedData = collectedData.map(row => {
      const newRow = { ...row }
      delete newRow[colName]
      return newRow
    })
    setCollectedData(updatedData)
  }

  const handleDownloadCSV = useCallback(async () => {
    if (collectedData.length === 0) {
      await alert('没有数据可下载')
      return
    }
    const headers = columns.join(',')
    const rows = collectedData.map(row => 
      columns.map(col => {
        const value = String(row[col] ?? '')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
    const BOM = '\uFEFF'
    const csvContent = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflowName || '数据'}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [collectedData, columns, workflowName])

  // 变量相关方法
  const parseVariableValue = (value: string, type: VariableType): unknown => {
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
      if (type === 'array') return []
      if (type === 'object') return {}
      return value
    }
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    const parsedValue = parseVariableValue(newVarValue, newVarType)
    addVariable({ name: newVarName.trim(), value: parsedValue, type: newVarType, scope: 'global' })
    setNewVarName('')
    setNewVarValue('')
    setNewVarType('string')
    setIsAddingVar(false)
  }

  // 格式化变量值用于显示
  const formatVariableValue = (value: unknown, type: VariableType): string => {
    if (value === null || value === undefined) return ''
    if (type === 'array' || type === 'object' || typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const startEditVar = (name: string, value: unknown, type: VariableType) => {
    setEditingVar(name)
    setEditVarValue(formatVariableValue(value, type))
  }

  const saveEditVar = () => {
    if (editingVar) {
      const variable = variables.find(v => v.name === editingVar)
      if (variable) {
        const parsedValue = parseVariableValue(editVarValue, variable.type)
        updateVariable(editingVar, parsedValue)
      }
      setEditingVar(null)
      setEditVarValue('')
    }
  }

  // Excel文件资源相关方法
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      await alert('请上传Excel文件 (.xlsx 或 .xls)')
      return
    }

    setIsUploading(true)
    try {
      const result = await dataAssetApi.upload(file)
      if (result.error) {
        await alert(`上传失败: ${result.error}`)
      } else if (result.data) {
        addDataAsset(result.data)
      }
    } catch (error) {
      await alert(`上传失败: ${error}`)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleDeleteAsset = async (id: string) => {
    const confirmed = await confirm('确定要删除这个文件吗？', { type: 'warning', title: '删除文件' })
    if (!confirmed) return
    
    const result = await dataAssetApi.delete(id)
    if (!result.error) {
      deleteDataAsset(id)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const levelColors = {
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    success: 'text-green-500',
  }

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    if (index === -1) return text
    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    )
  }

  return (
    <footer className={cn(
      'border-t bg-card transition-all',
      isCollapsed ? 'h-10' : 'h-64'
    )}>
      <div className="h-10 px-4 flex items-center justify-between border-b bg-gradient-to-r from-blue-500 to-blue-400">
        <div className="flex items-center gap-4">
          {/* 分页标签 */}
          <div className="flex items-center gap-1">
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors border',
                activeTab === 'logs' 
                  ? 'bg-white text-blue-600 border-white' 
                  : 'text-white/90 hover:bg-white/20 border-transparent'
              )}
              onClick={() => setActiveTab('logs')}
            >
              <FileText className="w-3.5 h-3.5" />
              执行日志
              <span className="text-xs opacity-70">({logs.length})</span>
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors border',
                activeTab === 'data' 
                  ? 'bg-white text-blue-600 border-white' 
                  : 'text-white/90 hover:bg-white/20 border-transparent'
              )}
              onClick={() => setActiveTab('data')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              数据表格
              <span className="text-xs opacity-70">({collectedData.length}行)</span>
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors border',
                activeTab === 'variables' 
                  ? 'bg-white text-blue-600 border-white' 
                  : 'text-white/90 hover:bg-white/20 border-transparent'
              )}
              onClick={() => setActiveTab('variables')}
            >
              <Variable className="w-3.5 h-3.5" />
              全局变量
              <span className="text-xs opacity-70">({variables.length})</span>
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors border',
                activeTab === 'assets' 
                  ? 'bg-white text-blue-600 border-white' 
                  : 'text-white/90 hover:bg-white/20 border-transparent'
              )}
              onClick={() => setActiveTab('assets')}
            >
              <Database className="w-3.5 h-3.5" />
              Excel资源
              <span className="text-xs opacity-70">({dataAssets.length})</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'logs' && (
            <>
              {/* 详细日志开关 */}
              <button
                className={cn(
                  'h-7 px-2 text-xs rounded-md flex items-center gap-1.5 transition-colors border',
                  verboseLog 
                    ? 'bg-green-500 text-white border-green-600 hover:bg-green-600' 
                    : 'bg-white/90 text-gray-500 border-white/50 hover:bg-white'
                )}
                onClick={() => setVerboseLog(!verboseLog)}
                title={verboseLog ? '关闭后只显示打印日志模块的内容和系统日志' : '开启后显示所有模块的执行日志'}
              >
                {verboseLog ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    详细日志
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    简洁日志
                  </>
                )}
              </button>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white/90 border-white/50 text-blue-700 hover:bg-white" onClick={handleExportLogs} title="下载日志">
                <Download className="w-3.5 h-3.5 mr-1" />
                下载
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white/90 border-white/50 text-red-500 hover:bg-white" onClick={clearLogs} title="清除日志">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {activeTab === 'data' && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={handleAddRow}>
                <Plus className="w-3.5 h-3.5 mr-1" />行
              </Button>
              {isAddingColumn ? (
                <div className="flex items-center gap-1">
                  <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="列名" className="w-20 h-7 text-xs bg-white" onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} />
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={handleAddColumn}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-white/90 border-white/50 text-gray-500 hover:bg-white" onClick={() => setIsAddingColumn(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={() => setIsAddingColumn(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />列
                </Button>
              )}
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white/90 border-white/50 text-red-500 hover:bg-white" onClick={clearCollectedData} title="清空数据"><Trash2 className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white/90 border-white/50 text-blue-600 hover:bg-white" onClick={handleDownloadCSV} title="下载CSV"><Download className="w-4 h-4" /></Button>
            </>
          )}
          {activeTab === 'variables' && (
            <>
              {isAddingVar ? (
                <div className="flex items-center gap-1">
                  <Input value={newVarName} onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="变量名" className="w-20 h-7 text-xs bg-white" />
                  <Select 
                    value={newVarType} 
                    onChange={(e) => setNewVarType(e.target.value as VariableType)}
                    className="w-16 h-7 text-xs bg-white"
                  >
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                    <option value="array">列表</option>
                    <option value="object">字典</option>
                  </Select>
                  {newVarType === 'boolean' ? (
                    <Select 
                      value={newVarValue || 'false'} 
                      onChange={(e) => setNewVarValue(e.target.value)}
                      className="w-16 h-7 text-xs bg-white"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </Select>
                  ) : (
                    <Input value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)}
                      placeholder={newVarType === 'number' ? '0' : newVarType === 'array' ? '[]' : newVarType === 'object' ? '{}' : '值'} 
                      className="w-20 h-7 text-xs bg-white" 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()} />
                  )}
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={handleAddVariable}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-white/90 border-white/50 text-gray-500 hover:bg-white" onClick={() => setIsAddingVar(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={() => setIsAddingVar(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />添加变量
                </Button>
              )}
            </>
          )}
          {activeTab === 'assets' && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white/90 border-white/50 text-green-600 hover:bg-white" onClick={handleUploadClick} disabled={isUploading}>
                <Upload className="w-3.5 h-3.5 mr-1" />
                {isUploading ? '上传中...' : '上传Excel'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
          <Button variant="outline" size="icon" className="h-7 w-7 bg-white/90 border-white/50 text-gray-600 hover:bg-white" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? '展开' : '收起'}>
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="h-[calc(100%-2.5rem)]">
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col">
              {/* 日志搜索和筛选栏 */}
              <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="搜索日志内容..."
                    className="pl-7 h-7 text-xs"
                  />
                  {logSearchQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setLogSearchQuery('')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <Select
                    value={logLevelFilter}
                    onChange={(e) => setLogLevelFilter(e.target.value as LogFilterType)}
                    className="h-7 text-xs w-24"
                  >
                    <option value="all">全部</option>
                    <option value="info">信息</option>
                    <option value="success">成功</option>
                    <option value="warning">警告</option>
                    <option value="error">错误</option>
                  </Select>
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredLogs.length}/{logs.length}
                </span>
              </div>
              
              <ScrollArea className="flex-1 p-2">
                {filteredLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    {logs.length === 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground">暂无日志</p>
                        <p className="text-xs text-muted-foreground/70 mt-2 text-center px-4">
                          💡 提示：默认只显示"打印日志"模块的内容，开启"详细日志"可查看所有模块执行日志
                        </p>
                      </>
                    ) : (
                      <>
                        <Search className="w-8 h-8 mb-2 opacity-50 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">未找到匹配的日志</p>
                        <p className="text-xs text-muted-foreground mt-1">试试其他关键词或筛选条件</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className={cn('text-xs font-mono px-2 py-1 rounded hover:bg-accent cursor-pointer break-words')}
                        onClick={() => handleLogClick(log.nodeId)}>
                        <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                        <span className={levelColors[log.level]}>[{log.level.toUpperCase()}]</span>{' '}
                        <span className="break-all">{logSearchQuery ? highlightText(log.message, logSearchQuery) : log.message}</span>
                        {log.duration !== undefined && <span className="text-muted-foreground ml-2">({log.duration}ms)</span>}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-2">
                {collectedData.length === 0 && columns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <FileSpreadsheet className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">暂无数据</p>
                    <p className="text-xs mt-1">执行工作流后，收集的数据将显示在这里</p>
                    <p className="text-xs text-muted-foreground/70 mt-2 text-center px-4">
                      💡 提示：此处最多实时预览20条数据，完整数据请使用"导出数据表"模块导出
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border px-2 py-1.5 text-left font-medium w-10">#</th>
                          {columns.map(col => (
                            <th key={col} className="border px-2 py-1.5 text-left font-medium min-w-[100px]">
                              <div className="flex items-center justify-between gap-1">
                                <span>{col}</span>
                                <Button variant="ghost" size="icon" className="w-5 h-5 opacity-50 hover:opacity-100" onClick={() => handleDeleteColumn(col)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </th>
                          ))}
                          <th className="border px-2 py-1.5 w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectedData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-muted/30">
                              <td className="border px-2 py-1 text-muted-foreground">{rowIndex + 1}</td>
                              {columns.map(col => (
                                <td key={col} className="border px-2 py-1 cursor-pointer hover:bg-muted/50" onClick={() => startEdit(rowIndex, col, row[col])}>
                                  {editingCell?.row === rowIndex && editingCell?.col === col ? (
                                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-6 text-xs" autoFocus
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} onBlur={saveEdit} />
                                  ) : (
                                    <div className="flex items-center justify-between group">
                                      <span className="truncate max-w-[150px]" title={formatCellValue(row[col])}>{formatCellValue(row[col])}</span>
                                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="border px-2 py-1 text-center">
                                <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => deleteDataRow(rowIndex)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                    {collectedData.length >= 20 && (
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        ⚠️ 此处仅展示前 20 条数据用于预览，完整数据请使用"导出数据表"模块导出
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {activeTab === 'variables' && (
            <ScrollArea className="h-full p-2">
              {variables.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Variable className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">暂无全局变量</p>
                  <p className="text-xs mt-1">点击"添加变量"创建全局变量</p>
                  <p className="text-[10px] mt-2 text-center opacity-70">
                    引用语法：{'{变量名}'} · {'{列表[0]}'} · {'{列表[-1]}'} · {'{字典[键名]}'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border px-2 py-1.5 text-left font-medium w-32">变量名</th>
                          <th className="border px-2 py-1.5 text-left font-medium">值</th>
                          <th className="border px-2 py-1.5 text-left font-medium w-20">类型</th>
                          <th className="border px-2 py-1.5 w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variables.map((v) => (
                          <tr key={v.name} className="hover:bg-muted/30">
                            <td className="border px-2 py-1 font-mono text-blue-600">{v.name}</td>
                            <td className="border px-2 py-1 cursor-pointer hover:bg-muted/50" onClick={() => startEditVar(v.name, v.value, v.type)}>
                              {editingVar === v.name ? (
                                <Input value={editVarValue} onChange={(e) => setEditVarValue(e.target.value)} className="h-6 text-xs" autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditVar(); if (e.key === 'Escape') setEditingVar(null); }} onBlur={saveEditVar} />
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span className="truncate max-w-[200px]" title={formatVariableValue(v.value, v.type)}>{formatVariableValue(v.value, v.type)}</span>
                                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                </div>
                              )}
                            </td>
                            <td className="border px-2 py-1 text-muted-foreground">{v.type}</td>
                            <td className="border px-2 py-1 text-center">
                              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => deleteVariable(v.name)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-2 border-t mt-2 text-[10px] text-muted-foreground">
                    <span className="font-medium">引用语法：</span>
                    {'{变量名}'} · {'{列表[0]}'} · {'{列表[-1]}'} · {'{字典[键名]}'} · {'{数据[0][name]}'}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}

          {activeTab === 'assets' && (
            <ScrollArea className="h-full p-2">
              {dataAssets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Database className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">暂无Excel文件资源</p>
                  <p className="text-xs mt-1">点击"上传Excel"添加Excel文件，供工作流读取使用</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {dataAssets.map((asset) => (
                    <div key={asset.id} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <File className="w-8 h-8 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={asset.originalName}>
                            {asset.originalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(asset.size)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {asset.sheetNames.length} 个工作表
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6 border-blue-200 hover:bg-blue-50"
                            onClick={() => setPreviewAsset(asset)}
                            title="预览数据"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6 border-red-200 hover:bg-red-50"
                            onClick={() => handleDeleteAsset(asset.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}

      {/* Excel预览对话框 */}
      {previewAsset && (
        <ExcelPreviewDialog
          open={!!previewAsset}
          onClose={() => setPreviewAsset(null)}
          fileId={previewAsset.id}
          fileName={previewAsset.originalName}
          previewOnly
        />
      )}
      
      {/* 确认对话框 */}
      {ConfirmDialog}
    </footer>
  )
}
