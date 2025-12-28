import { useCallback, useRef, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Keyboard, ChevronDown, ChevronUp, FileJson } from 'lucide-react'

import { useWorkflowStore, type NodeData } from '@/store/workflowStore'
import { ModuleNode } from './ModuleNode'
import { GroupNode } from './GroupNode'
import { NoteNode } from './NoteNode'
import { ModuleSidebar } from './ModuleSidebar'
import { ConfigPanel } from './ConfigPanel'
import { LogPanel } from './LogPanel'
import { Toolbar } from './Toolbar'
import type { ModuleType } from '@/types'

// 操作提示组件
function ControlsHelp() {
  const [expanded, setExpanded] = useState(false)
  
  const shortcuts = [
    { keys: '左键拖拽', desc: '框选多个模块' },
    { keys: '中键拖拽', desc: '平移画布' },
    { keys: '滚轮', desc: '缩放画布' },
    { keys: 'Delete', desc: '删除选中' },
    { keys: 'Ctrl+S', desc: '保存工作流' },
    { keys: 'Alt+N', desc: '新建工作流' },
    { keys: 'Ctrl+C', desc: '复制' },
    { keys: 'Ctrl+V', desc: '粘贴' },
    { keys: 'Ctrl+A', desc: '全选' },
    { keys: 'Ctrl+D', desc: '禁用/启用' },
    { keys: 'Ctrl+Z', desc: '撤销' },
    { keys: 'Ctrl+Y', desc: '重做' },
  ]
  
  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground w-full"
        >
          <Keyboard className="w-4 h-4" />
          <span>操作提示</span>
          {expanded ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronUp className="w-4 h-4 ml-auto" />}
        </button>
        {expanded && (
          <div className="px-3 pb-3 space-y-1.5 border-t pt-2">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono min-w-[80px] text-center">
                  {s.keys}
                </kbd>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 自定义节点类型
const nodeTypes = {
  moduleNode: ModuleNode,
  groupNode: GroupNode,
  noteNode: NoteNode,
}

export function WorkflowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance<Node<NodeData>> | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    selectedNodeId,
    deleteNode,
    copyNodes,
    pasteNodes,
    addLog,
    mergeWorkflow,
    toggleNodesDisabled,
    undo,
    redo,
  } = useWorkflowStore()

  // 获取选中的节点
  const selectedNodes = nodes.filter(n => n.selected)

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      // 检查是否在 Monaco Editor 或其他代码编辑器中
      if (target.closest('.monaco-editor') || target.closest('[role="textbox"]')) {
        return
      }
      
      // Delete/Backspace 删除选中节点或边
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        
        // 优先删除多选的节点
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map(n => n.id)
          nodeIds.forEach(id => deleteNode(id))
          selectNode(null)
          addLog({ level: 'info', message: `已删除 ${nodeIds.length} 个模块` })
        } else if (selectedEdgeIds.length > 0) {
          // 删除选中的边（支持多选）
          onEdgesChange(selectedEdgeIds.map(id => ({ type: 'remove', id })))
          setSelectedEdgeIds([])
          addLog({ level: 'info', message: `已删除 ${selectedEdgeIds.length} 条连线` })
        } else if (selectedNodeId) {
          // 删除单个选中的节点
          deleteNode(selectedNodeId)
          selectNode(null)
        }
      }
      
      // Ctrl+C 复制节点（支持多选）
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault()
        if (selectedNodes.length > 0) {
          copyNodes(selectedNodes.map(n => n.id))
          addLog({ level: 'info', message: `已复制 ${selectedNodes.length} 个模块到剪贴板` })
        } else if (selectedNodeId) {
          copyNodes([selectedNodeId])
          addLog({ level: 'info', message: '模块已复制到剪贴板' })
        }
      }
      
      // Ctrl+V 粘贴节点
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault()
        pasteNodes()
      }
      
      // Ctrl+D 禁用/启用节点
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map(n => n.id)
          toggleNodesDisabled(nodeIds)
          const firstNode = selectedNodes[0]
          const willBeDisabled = !firstNode.data.disabled
          addLog({ level: 'info', message: `已${willBeDisabled ? '禁用' : '启用'} ${nodeIds.length} 个模块` })
        } else if (selectedNodeId) {
          const node = nodes.find(n => n.id === selectedNodeId)
          if (node) {
            toggleNodesDisabled([selectedNodeId])
            const willBeDisabled = !node.data.disabled
            addLog({ level: 'info', message: `已${willBeDisabled ? '禁用' : '启用'}模块` })
          }
        }
      }
      
      // Ctrl+A 全选
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        onNodesChange(nodes.map(n => ({ type: 'select' as const, id: n.id, selected: true })))
      }
      
      // Ctrl+Z 撤销
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, selectedEdgeIds, selectedNodes, nodes, deleteNode, selectNode, copyNodes, pasteNodes, addLog, onEdgesChange, onNodesChange, toggleNodesDisabled, undo, redo])

  const onInit = useCallback((instance: ReactFlowInstance<Node<NodeData>>) => {
    reactFlowInstance.current = instance
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    // 检查是否是文件拖拽
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy'
    } else {
      event.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      // 如果是文件拖拽，由外层容器处理
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        return
      }

      // 模块拖拽逻辑
      const type = event.dataTransfer.getData('application/reactflow') as ModuleType
      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return
      }

      // screenToFlowPosition 需要屏幕坐标，直接使用 clientX/clientY
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(type, position)
    },
    [addNode]
  )

  // 处理文件拖拽到画布
  const handleFileDragOver = useCallback((event: React.DragEvent) => {
    // 只处理文件拖拽
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
      setIsDraggingFile(true)
    }
  }, [])

  const handleFileDragLeave = useCallback((event: React.DragEvent) => {
    // 检查是否真的离开了容器
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingFile(false)
    }
  }, [])

  const handleFileDrop = useCallback((event: React.DragEvent) => {
    setIsDraggingFile(false)
    
    // 检查是否是文件拖拽
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      
      const files = Array.from(event.dataTransfer.files)
      const jsonFiles = files.filter(f => f.name.endsWith('.json'))
      
      if (jsonFiles.length > 0 && reactFlowInstance.current && reactFlowWrapper.current) {
        // screenToFlowPosition 需要屏幕坐标
        const position = reactFlowInstance.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        
        // 读取并导入所有JSON文件
        jsonFiles.forEach((file, index) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const content = e.target?.result as string
            if (content) {
              // 每个文件在Y方向上偏移一些，避免重叠
              const success = mergeWorkflow(content, { 
                x: position.x, 
                y: position.y + index * 150 
              })
              if (success) {
                addLog({ level: 'success', message: `已导入工作流: ${file.name}` })
              } else {
                addLog({ level: 'error', message: `导入失败: ${file.name}，文件格式无效` })
              }
            }
          }
          reader.onerror = () => {
            addLog({ level: 'error', message: `读取文件失败: ${file.name}` })
          }
          reader.readAsText(file)
        })
      }
    }
  }, [mergeWorkflow, addLog])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
      setSelectedEdgeIds([])
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeIds([edge.id])
      selectNode(null)
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    setSelectedEdgeIds([])
  }, [selectNode])

  // 处理框选变化（包括节点和边）
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      // 更新选中的边
      setSelectedEdgeIds(selectedEdges.map(e => e.id))
      
      // 如果有选中的节点，更新 selectedNodeId
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0].id)
      } else if (selectedNodes.length === 0) {
        // 只有当没有选中节点时才清除
        // 但如果有选中的边，不清除节点选择状态
      }
    },
    [selectNode]
  )

  return (
    <div className="h-full w-full flex flex-col">
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧模块面板 */}
        <ModuleSidebar />
        
        {/* 中间画布区域 */}
        <main 
          className="flex-1 bg-muted/30 relative" 
          ref={reactFlowWrapper}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
        >
          <ControlsHelp />
          
          {/* 拖拽文件提示遮罩 */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center gap-3">
                <FileJson className="w-12 h-12 text-blue-500" />
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-800">释放以导入工作流</p>
                  <p className="text-sm text-gray-500 mt-1">支持导入 .json 格式的工作流文件</p>
                </div>
              </div>
            </div>
          )}
          
          <ReactFlow
            nodes={nodes}
            edges={edges.map(e => ({
              ...e,
              selected: selectedEdgeIds.includes(e.id),
              style: selectedEdgeIds.includes(e.id) ? { stroke: '#ef4444', strokeWidth: 3 } : e.style
            })) as typeof edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            selectNodesOnDrag={false}
            panOnDrag={[1]}
            elevateNodesOnSelect={false}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              selectable: true,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={15} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const data = node.data as NodeData
                if (data.moduleType?.startsWith('condition') || data.moduleType?.startsWith('loop') || data.moduleType?.startsWith('foreach')) {
                  return '#22c55e'
                }
                if (data.moduleType?.includes('captcha')) {
                  return '#f97316'
                }
                if (['select_dropdown', 'set_checkbox', 'drag_element', 'scroll_page', 'upload_file', 'download_file', 'save_image'].includes(data.moduleType)) {
                  return '#a855f7'
                }
                return '#3b82f6'
              }}
            />
          </ReactFlow>
        </main>
        
        {/* 右侧配置面板 */}
        <ConfigPanel selectedNodeId={selectedNodeId} />
      </div>
      
      {/* 底部日志面板 */}
      <LogPanel />
    </div>
  )
}
