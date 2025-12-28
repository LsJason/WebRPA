import { useWorkflowStore } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { workflowApi } from '@/services/api'
import { socketService } from '@/services/socket'
import { GlobalConfigDialog } from './GlobalConfigDialog'
import { DocumentationDialog } from './documentation'
import { AutoBrowserDialog } from './AutoBrowserDialog'
import { WorkflowHubDialog } from './WorkflowHubDialog'
import { LocalWorkflowDialog } from './LocalWorkflowDialog'
import {
  Play,
  Square,
  Save,
  FolderOpen,
  Trash2,
  Settings,
  BookOpen,
  Globe,
  Package,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

export function Toolbar() {
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [showGlobalConfig, setShowGlobalConfig] = useState(false)
  const [showDocumentation, setShowDocumentation] = useState(false)
  const [showAutoBrowser, setShowAutoBrowser] = useState(false)
  const [showWorkflowHub, setShowWorkflowHub] = useState(false)
  const [showLocalWorkflow, setShowLocalWorkflow] = useState(false)
  const [defaultFolder, setDefaultFolder] = useState('')
  const { confirm, ConfirmDialog } = useConfirm()
  
  const { config } = useGlobalConfigStore()
  const name = useWorkflowStore((state) => state.name)
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)
  const variables = useWorkflowStore((state) => state.variables)
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName)
  const executionStatus = useWorkflowStore((state) => state.executionStatus)
  const exportWorkflow = useWorkflowStore((state) => state.exportWorkflow)
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const addLog = useWorkflowStore((state) => state.addLog)
  const setExecutionStatus = useWorkflowStore((state) => state.setExecutionStatus)
  const clearLogs = useWorkflowStore((state) => state.clearLogs)
  const clearCollectedData = useWorkflowStore((state) => state.clearCollectedData)
  const setBottomPanelTab = useWorkflowStore((state) => state.setBottomPanelTab)

  const isRunning = executionStatus === 'running'

  // 获取默认文件夹
  useEffect(() => {
    fetch(`${API_BASE}/api/local-workflows/default-folder`)
      .then(res => res.json())
      .then(data => {
        if (data.folder) setDefaultFolder(data.folder)
      })
      .catch(console.error)
  }, [])

  const handleRun = async () => {
    if (nodes.length === 0) {
      addLog({ level: 'warning', message: '工作流没有任何节点' })
      return
    }

    clearLogs()
    clearCollectedData()
    setBottomPanelTab('logs')  // 切换到日志栏
    addLog({ level: 'info', message: '正在准备执行工作流...' })

    try {
      // 先创建或更新工作流
      let currentWorkflowId = workflowId

      if (!currentWorkflowId) {
        const createResult = await workflowApi.create({
          name,
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.moduleType,
            position: n.position,
            data: n.data,
            style: n.style,
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          variables: variables.map(v => ({
            name: v.name,
            value: v.value,
            type: v.type,
            scope: v.scope,
          })),
        })

        if (createResult.error) {
          addLog({ level: 'error', message: `创建工作流失败: ${createResult.error}` })
          return
        }

        currentWorkflowId = createResult.data!.id
        setWorkflowId(currentWorkflowId)
      } else {
        // 更新现有工作流
        await workflowApi.update(currentWorkflowId, {
          name,
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.moduleType,
            position: n.position,
            data: n.data,
            style: n.style,
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          variables: variables.map(v => ({
            name: v.name,
            value: v.value,
            type: v.type,
            scope: v.scope,
          })),
        })
      }

      // 执行工作流（始终使用有头模式）
      const executeResult = await workflowApi.execute(currentWorkflowId, { headless: false })
      
      if (executeResult.error) {
        addLog({ level: 'error', message: `执行失败: ${executeResult.error}` })
        return
      }

      setExecutionStatus('running')
      addLog({ level: 'info', message: '工作流开始执行' })
    } catch (error) {
      addLog({ level: 'error', message: `执行异常: ${error}` })
    }
  }

  const handleStop = async () => {
    if (workflowId) {
      socketService.stopExecution(workflowId)
      await workflowApi.stop(workflowId)
    }
    setExecutionStatus('stopped')
    addLog({ level: 'warning', message: '工作流已停止' })
  }

  const handleSave = useCallback(async () => {
    if (nodes.length === 0) {
      addLog({ level: 'warning', message: '工作流没有任何节点，无法保存' })
      return
    }

    const currentFolder = config.workflow?.localFolder || defaultFolder
    if (!currentFolder) {
      addLog({ level: 'error', message: '未配置工作流保存路径' })
      return
    }

    // 使用工作流名称作为文件名
    const filename = name || '未命名工作流'
    const workflowData = JSON.parse(exportWorkflow())

    try {
      const response = await fetch(`${API_BASE}/api/local-workflows/save-to-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          content: { ...workflowData, _folder: currentFolder }
        })
      })
      const data = await response.json()

      if (data.success) {
        addLog({ level: 'success', message: `工作流已保存: ${data.filename}` })
      } else {
        addLog({ level: 'error', message: `保存失败: ${data.error}` })
      }
    } catch (e) {
      addLog({ level: 'error', message: `保存出错: ${e}` })
    }
  }, [nodes.length, config.workflow?.localFolder, defaultFolder, name, exportWorkflow, addLog])

  const handleNewWorkflow = useCallback(() => {
    clearWorkflow()
    setWorkflowId(null)
    addLog({ level: 'info', message: '已创建新工作流' })
  }, [clearWorkflow, addLog])

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Alt+N 新建
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        handleNewWorkflow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleNewWorkflow])

  const handleOpen = () => {
    setShowLocalWorkflow(true)
  }

  const handleClear = async () => {
    const confirmed = await confirm('确定要清空当前工作流吗？', { type: 'warning', title: '清空工作流' })
    if (confirmed) {
      clearWorkflow()
      setWorkflowId(null)
      addLog({ level: 'info', message: '工作流已清空' })
    }
  }

  const handleBrowserLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    addLog({ level, message })
  }

  return (
    <header className="h-14 border-b bg-gradient-to-r from-blue-500 to-blue-400 flex items-center px-4 gap-4">
      {/* Logo/标题 */}
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Logo" className="w-6 h-6" />
        <span className="font-semibold text-lg text-white">Web RPA</span>
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-white/30" />

      {/* 工作流名称 */}
      <Input
        value={name}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="w-48 h-8 bg-white/90 border-white/50"
        placeholder="工作流名称"
      />

      {/* 分隔线 */}
      <div className="h-6 w-px bg-white/30" />

      {/* 执行控制 */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white border-0" onClick={handleRun}>
            <Play className="w-4 h-4 mr-1" />
            运行
          </Button>
        ) : (
          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={handleStop}>
            <Square className="w-4 h-4 mr-1" />
            停止
          </Button>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-white/30" />

      {/* 文件操作 */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-blue-700 hover:bg-white hover:text-blue-800" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1" />
          保存
        </Button>
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-blue-700 hover:bg-white hover:text-blue-800" onClick={handleOpen}>
          <FolderOpen className="w-4 h-4 mr-1" />
          打开
        </Button>
      </div>

      {/* 右侧操作 */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-indigo-700 hover:bg-white hover:text-indigo-800" onClick={() => setShowWorkflowHub(true)}>
          <Package className="w-4 h-4 mr-1" />
          工作流仓库
        </Button>
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-cyan-700 hover:bg-white hover:text-cyan-800" onClick={() => setShowAutoBrowser(true)}>
          <Globe className="w-4 h-4 mr-1" />
          自动化浏览器
        </Button>
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-purple-700 hover:bg-white hover:text-purple-800" onClick={() => setShowDocumentation(true)}>
          <BookOpen className="w-4 h-4 mr-1" />
          教学文档
        </Button>
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-gray-700 hover:bg-white hover:text-gray-800" onClick={() => setShowGlobalConfig(true)}>
          <Settings className="w-4 h-4 mr-1" />
          全局配置
        </Button>
        <Button variant="outline" size="sm" className="bg-white/90 border-white/50 text-red-600 hover:bg-white hover:text-red-700" onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-1" />
          清空
        </Button>
      </div>

      {/* 全局配置对话框 */}
      <GlobalConfigDialog isOpen={showGlobalConfig} onClose={() => setShowGlobalConfig(false)} />
      
      {/* 教学文档对话框 */}
      <DocumentationDialog isOpen={showDocumentation} onClose={() => setShowDocumentation(false)} />
      
      {/* 自动化浏览器对话框 */}
      <AutoBrowserDialog 
        isOpen={showAutoBrowser} 
        onClose={() => setShowAutoBrowser(false)} 
        onLog={handleBrowserLog}
      />
      
      {/* 工作流仓库对话框 */}
      <WorkflowHubDialog
        open={showWorkflowHub}
        onClose={() => setShowWorkflowHub(false)}
      />
      
      {/* 本地工作流对话框 */}
      <LocalWorkflowDialog
        isOpen={showLocalWorkflow}
        onClose={() => setShowLocalWorkflow(false)}
        onLog={(level, message) => addLog({ level, message })}
      />
      
      {/* 确认对话框 */}
      {ConfirmDialog}
    </header>
  )
}
