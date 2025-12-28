import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import type { ModuleType, Variable, LogEntry, ExecutionStatus, ModuleConfig, DataAsset } from '@/types'
import { useGlobalConfigStore } from './globalConfigStore'

// 底栏 Tab 类型
export type BottomPanelTab = 'logs' | 'data' | 'variables' | 'assets'

// 历史记录快照类型
interface HistorySnapshot {
  nodes: Node<NodeData>[]
  edges: Edge[]
}

// React Flow节点数据类型
export interface NodeData extends ModuleConfig {
  label: string
  moduleType: ModuleType
}

// 数据行类型
export type DataRow = Record<string, unknown>

// 工作流状态
interface WorkflowState {
  // 工作流基本信息
  id: string
  name: string
  
  // React Flow节点和边
  nodes: Node<NodeData>[]
  edges: Edge[]
  
  // 变量
  variables: Variable[]
  
  // 选中的节点
  selectedNodeId: string | null
  
  // 剪贴板（用于复制粘贴，支持多选）
  clipboard: Node<NodeData>[]
  clipboardEdges: Edge[]  // 复制的连线
  
  // 执行状态
  executionStatus: ExecutionStatus
  currentExecutingNodeId: string | null
  
  // 日志
  logs: LogEntry[]
  
  // 详细日志开关（默认关闭，只显示打印日志模块的内容）
  verboseLog: boolean
  
  // 收集的数据（用于预览和导出）
  collectedData: DataRow[]
  
  // Excel文件资源（上传的Excel文件）
  dataAssets: DataAsset[]
  
  // 底栏当前激活的 Tab
  bottomPanelTab: BottomPanelTab
  
  // 历史记录（用于撤销/重做）
  history: HistorySnapshot[]
  historyIndex: number
  
  // 节点操作
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  
  // 添加节点
  addNode: (type: ModuleType, position: { x: number; y: number }) => void
  
  // 更新节点数据
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  
  // 删除节点
  deleteNode: (nodeId: string) => void
  
  // 选择节点
  selectNode: (nodeId: string | null) => void
  
  // 复制粘贴（支持多选）
  copyNodes: (nodeIds: string[]) => void
  pasteNodes: (position?: { x: number; y: number }) => void
  
  // 变量操作
  addVariable: (variable: Omit<Variable, 'name'> & { name: string }) => void
  updateVariable: (name: string, value: unknown) => void
  deleteVariable: (name: string) => void
  
  // 日志操作
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void
  setVerboseLog: (enabled: boolean) => void
  
  // 执行状态
  setExecutionStatus: (status: ExecutionStatus) => void
  setCurrentExecutingNode: (nodeId: string | null) => void
  
  // 数据操作
  setCollectedData: (data: DataRow[]) => void
  addDataRow: (row: DataRow) => void
  addDataRows: (rows: DataRow[]) => void
  updateDataRow: (index: number, row: DataRow) => void
  deleteDataRow: (index: number) => void
  clearCollectedData: () => void
  
  // Excel文件资源操作
  setDataAssets: (assets: DataAsset[]) => void
  addDataAsset: (asset: DataAsset) => void
  deleteDataAsset: (id: string) => void
  
  // 底栏 Tab 操作
  setBottomPanelTab: (tab: BottomPanelTab) => void
  
  // 历史记录操作（撤销/重做）
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  
  // 工作流操作
  setWorkflowName: (name: string) => void
  clearWorkflow: () => void
  loadWorkflow: (workflow: { nodes: Node<NodeData>[]; edges: Edge[]; variables: Variable[]; name: string }) => void
  
  // 导出工作流
  exportWorkflow: () => string
  
  // 导入工作流
  importWorkflow: (json: string | object) => boolean
  
  // 合并导入工作流（追加到现有画布）
  mergeWorkflow: (json: string, position?: { x: number; y: number }) => boolean
  
  // 禁用/启用节点
  toggleNodesDisabled: (nodeIds: string[]) => void
}

// 模块类型到标签的映射
export const moduleTypeLabels: Record<ModuleType, string> = {
  // 浏览器操作
  open_page: '打开网页',
  click_element: '点击元素',
  hover_element: '悬停元素',
  input_text: '输入文本',
  get_element_info: '提取数据',
  wait: '固定等待',
  wait_element: '等待元素',
  close_page: '关闭网页',
  refresh_page: '刷新页面',
  go_back: '后退',
  go_forward: '前进',
  handle_dialog: '处理弹窗',
  // 表单操作
  select_dropdown: '下拉选择',
  set_checkbox: '勾选框',
  drag_element: '拖拽元素',
  scroll_page: '滚动页面',
  upload_file: '上传文件',
  // 数据处理
  set_variable: '设置变量',
  json_parse: 'JSON解析',
  base64: 'Base64',
  random_number: '随机数',
  get_time: '获取时间',
  download_file: '下载文件',
  save_image: '保存图片',
  screenshot: '截图',
  read_excel: '读取Excel',
  // 字符串操作
  regex_extract: '正则提取',
  string_replace: '替换文本',
  string_split: '分割文本',
  string_join: '连接文本',
  string_concat: '拼接文本',
  string_trim: '去除空白',
  string_case: '大小写',
  string_substring: '截取文本',
  // 列表操作
  list_operation: '列表操作',
  list_get: '列表取值',
  list_length: '列表长度',
  // 字典操作
  dict_operation: '字典操作',
  dict_get: '字典取值',
  dict_keys: '字典键列表',
  // 数据表格操作
  table_add_row: '添加行',
  table_add_column: '添加列',
  table_set_cell: '设置单元格',
  table_get_cell: '读取单元格',
  table_delete_row: '删除行',
  table_clear: '清空表格',
  table_export: '导出表格',
  // 数据库操作
  db_connect: '连接数据库',
  db_query: '查询数据',
  db_execute: '执行SQL',
  db_insert: '插入数据',
  db_update: '更新数据',
  db_delete: '删除数据',
  db_close: '关闭连接',
  // 网络请求
  api_request: 'HTTP请求',
  send_email: '发送邮件',
  // AI能力
  ai_chat: 'AI对话',
  ai_vision: '图像识别',
  // 验证码
  ocr_captcha: 'OCR识别',
  slider_captcha: '滑块验证',
  // 流程控制
  condition: '条件判断',
  loop: '循环',
  foreach: '遍历列表',
  break_loop: '跳出循环',
  continue_loop: '继续循环',
  scheduled_task: '定时任务',
  subflow: '子流程',
  // 辅助工具
  print_log: '打印日志',
  play_sound: '提示音',
  play_music: '播放音乐',
  input_prompt: '用户输入',
  text_to_speech: '语音播报',
  js_script: '执行脚本',
  set_clipboard: '写入剪贴板',
  get_clipboard: '读取剪贴板',
  keyboard_action: '模拟按键',
  real_mouse_scroll: '真实鼠标滚动',
  // 分组/备注
  group: '分组',
  note: '便签',
}

// 创建store
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  id: nanoid(),
  name: '未命名工作流',
  nodes: [],
  edges: [],
  variables: [],
  selectedNodeId: null,
  clipboard: [],
  clipboardEdges: [],
  executionStatus: 'pending',
  currentExecutingNodeId: null,
  logs: [],
  verboseLog: false,  // 默认关闭详细日志
  collectedData: [],
  dataAssets: [],
  bottomPanelTab: 'logs',
  history: [{ nodes: [], edges: [] }],  // 初始状态
  historyIndex: 0,

  onNodesChange: (changes) => {
    // 检查是否有实质性变化（位置拖拽结束、删除、添加）
    const hasSubstantialChange = changes.some(c => 
      (c.type === 'position' && (c as { dragging?: boolean }).dragging === false) ||
      c.type === 'remove' ||
      c.type === 'add' ||
      c.type === 'dimensions'
    )
    
    // 先保存历史（变化之前）
    if (hasSubstantialChange) {
      get().pushHistory()
    }
    
    let updatedNodes = applyNodeChanges(changes, get().nodes)
    
    // 确保 groupNode 和 noteNode 的 zIndex 始终保持在底层
    updatedNodes = updatedNodes.map(node => {
      if (node.type === 'groupNode' || node.type === 'noteNode') {
        return { ...node, zIndex: -1 }
      }
      return node
    })
    
    set({ nodes: updatedNodes })
  },

  onEdgesChange: (changes) => {
    // 检查是否有实质性变化
    const hasSubstantialChange = changes.some(c => 
      c.type === 'remove' || c.type === 'add'
    )
    
    // 先保存历史（变化之前）
    if (hasSubstantialChange) {
      get().pushHistory()
    }
    
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },

  onConnect: (connection) => {
    // 先保存当前状态到历史（连线之前）
    get().pushHistory()
    set({
      edges: addEdge(connection, get().edges),
    })
  },

  addNode: (type, position) => {
    // 先保存当前状态到历史（添加节点之前）
    get().pushHistory()
    
    // 获取全局配置
    const globalConfig = useGlobalConfigStore.getState().config
    
    // 根据模块类型应用默认配置
    let defaultData: Partial<NodeData> = {}
    
    if (type === 'ai_chat') {
      defaultData = {
        apiUrl: globalConfig.ai.apiUrl,
        apiKey: globalConfig.ai.apiKey,
        model: globalConfig.ai.model,
        temperature: globalConfig.ai.temperature,
        maxTokens: globalConfig.ai.maxTokens,
        systemPrompt: globalConfig.ai.systemPrompt,
      }
    } else if (type === 'send_email') {
      defaultData = {
        senderEmail: globalConfig.email.senderEmail,
        authCode: globalConfig.email.authCode,
      }
    }
    
    // 分组节点和便签节点使用特殊的节点类型和默认尺寸
    const isGroup = type === 'group'
    const isNote = type === 'note'
    
    const newNode: Node<NodeData> = {
      id: nanoid(),
      type: isGroup ? 'groupNode' : isNote ? 'noteNode' : 'moduleNode',
      position,
      ...(isGroup ? {
        style: { width: 300, height: 200 },
        zIndex: -1, // 分组节点在最底层
      } : {}),
      ...(isNote ? {
        style: { width: 200, height: 120 },
        zIndex: -1, // 便签也在底层
      } : {}),
      data: {
        label: isGroup ? '' : isNote ? '' : moduleTypeLabels[type],
        moduleType: type,
        ...(isGroup ? { color: '#3b82f6', width: 300, height: 200 } : {}),
        ...(isNote ? { color: '#fef08a', content: '' } : {}),
        ...defaultData,
      },
    }
    set({
      nodes: [...get().nodes, newNode],
    })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    })
  },

  deleteNode: (nodeId) => {
    // 先保存当前状态到历史（删除之前）
    get().pushHistory()
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    })
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId })
  },

  copyNodes: (nodeIds) => {
    const nodesToCopy = get().nodes.filter((n) => nodeIds.includes(n.id))
    if (nodesToCopy.length > 0) {
      // 同时复制节点之间的连线
      const nodeIdSet = new Set(nodeIds)
      const edgesToCopy = get().edges.filter(
        (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
      )
      set({ 
        clipboard: nodesToCopy.map(n => ({ ...n })),
        clipboardEdges: edgesToCopy.map(e => ({ ...e })),
      })
    }
  },

  pasteNodes: (position) => {
    const clipboard = get().clipboard
    const clipboardEdges = (get() as WorkflowState & { clipboardEdges?: Edge[] }).clipboardEdges || []
    if (clipboard.length === 0) return
    
    // 计算边界框，用于确定粘贴位置
    const minX = Math.min(...clipboard.map(n => n.position.x))
    const minY = Math.min(...clipboard.map(n => n.position.y))
    
    // 计算偏移量
    const offsetX = position ? position.x - minX : 50
    const offsetY = position ? position.y - minY : 50

    // 创建旧ID到新ID的映射
    const idMap = new Map<string, string>()
    
    // 创建新节点，保持相对位置
    const newNodes: Node<NodeData>[] = clipboard.map(node => {
      const newId = nanoid()
      idMap.set(node.id, newId)
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: true,
        data: {
          ...node.data,
        },
      }
    })

    // 创建新的连线，使用新的节点ID
    const newEdges: Edge[] = clipboardEdges.map(edge => ({
      ...edge,
      id: nanoid(),
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }))

    // 取消之前的选中状态
    const updatedNodes = get().nodes.map(n => ({ ...n, selected: false }))

    // 先保存当前状态到历史（粘贴之前）
    get().pushHistory()
    
    set({
      nodes: [...updatedNodes, ...newNodes],
      edges: [...get().edges, ...newEdges],
      selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null,
    })
  },

  addVariable: (variable) => {
    const existing = get().variables.find((v) => v.name === variable.name)
    if (existing) {
      get().updateVariable(variable.name, variable.value)
      return
    }
    set({
      variables: [...get().variables, variable],
    })
  },

  updateVariable: (name, value) => {
    set({
      variables: get().variables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
    })
  },

  deleteVariable: (name) => {
    set({
      variables: get().variables.filter((v) => v.name !== name),
    })
  },

  addLog: (log) => {
    const MAX_LOGS = 100 // 最大日志条数
    const newLog: LogEntry = {
      ...log,
      id: nanoid(),
      timestamp: new Date().toISOString(),
    }
    const currentLogs = get().logs
    // 如果超过最大数量，删除最旧的日志
    const updatedLogs = currentLogs.length >= MAX_LOGS
      ? [...currentLogs.slice(currentLogs.length - MAX_LOGS + 1), newLog]
      : [...currentLogs, newLog]
    set({ logs: updatedLogs })
  },

  clearLogs: () => {
    set({ logs: [] })
  },

  setVerboseLog: (enabled) => {
    set({ verboseLog: enabled })
    // 同步到后端
    import('@/services/socket').then(({ socketService }) => {
      socketService.setVerboseLog(enabled)
    })
  },

  setExecutionStatus: (status) => {
    set({ executionStatus: status })
  },

  setCurrentExecutingNode: (nodeId) => {
    set({ currentExecutingNodeId: nodeId })
  },

  // 数据操作
  setCollectedData: (data) => {
    set({ collectedData: data })
  },

  addDataRow: (row) => {
    // 最多接收20条数据用于实时预览
    const MAX_PREVIEW_ROWS = 20
    const currentData = get().collectedData
    if (currentData.length < MAX_PREVIEW_ROWS) {
      set({ collectedData: [...currentData, row] })
    }
  },

  addDataRows: (rows) => {
    if (rows.length === 0) return
    // 最多接收20条数据用于实时预览
    const MAX_PREVIEW_ROWS = 20
    const currentData = get().collectedData
    if (currentData.length >= MAX_PREVIEW_ROWS) return
    const remaining = MAX_PREVIEW_ROWS - currentData.length
    const rowsToAdd = rows.slice(0, remaining)
    set({ collectedData: [...currentData, ...rowsToAdd] })
  },

  updateDataRow: (index, row) => {
    const data = [...get().collectedData]
    data[index] = row
    set({ collectedData: data })
  },

  deleteDataRow: (index) => {
    set({ collectedData: get().collectedData.filter((_, i) => i !== index) })
  },

  clearCollectedData: () => {
    set({ collectedData: [] })
  },

  // Excel文件资源操作
  setDataAssets: (assets) => {
    set({ dataAssets: assets })
  },

  addDataAsset: (asset) => {
    set({ dataAssets: [...get().dataAssets, asset] })
  },

  deleteDataAsset: (id) => {
    set({ dataAssets: get().dataAssets.filter((a) => a.id !== id) })
  },

  setBottomPanelTab: (tab) => {
    set({ bottomPanelTab: tab })
  },

  pushHistory: () => {
    const state = get()
    // 保存当前状态作为新的历史记录点
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    }
    
    // 检查是否与当前历史记录相同（避免重复）
    const currentSnapshot = state.history[state.historyIndex]
    if (currentSnapshot && 
        JSON.stringify(currentSnapshot.nodes) === JSON.stringify(snapshot.nodes) &&
        JSON.stringify(currentSnapshot.edges) === JSON.stringify(snapshot.edges)) {
      return // 没有变化，不保存
    }
    
    // 如果当前不在历史末尾，截断后面的历史
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    // 限制历史记录数量为50
    const MAX_HISTORY = 50
    if (newHistory.length >= MAX_HISTORY) {
      newHistory.shift()
    }
    newHistory.push(snapshot)
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1
      const snapshot = state.history[newIndex]
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNodeId: null,
      })
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1
      const snapshot = state.history[newIndex]
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNodeId: null,
      })
    }
  },

  canUndo: () => {
    return get().historyIndex > 0
  },

  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  setWorkflowName: (name) => {
    set({ name })
  },

  clearWorkflow: () => {
    set({
      id: nanoid(),
      name: '未命名工作流',
      nodes: [],
      edges: [],
      variables: [],
      selectedNodeId: null,
      clipboard: [],
      clipboardEdges: [],
      executionStatus: 'pending',
      currentExecutingNodeId: null,
      logs: [],
      collectedData: [],
      history: [{ nodes: [], edges: [] }],
      historyIndex: 0,
    })
  },

  loadWorkflow: (workflow) => {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(workflow.nodes)),
      edges: JSON.parse(JSON.stringify(workflow.edges)),
    }
    set({
      nodes: workflow.nodes,
      edges: workflow.edges,
      variables: workflow.variables,
      name: workflow.name,
      selectedNodeId: null,
      history: [snapshot],
      historyIndex: 0,
    })
  },

  exportWorkflow: () => {
    const state = get()
    const workflow = {
      id: state.id,
      name: state.name,
      nodes: state.nodes,
      edges: state.edges,
      variables: state.variables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return JSON.stringify(workflow, null, 2)
  },

  importWorkflow: (json) => {
    try {
      // 支持字符串或对象
      const workflow = typeof json === 'string' ? JSON.parse(json) : json
      if (!workflow.nodes || !workflow.edges) {
        return false
      }
      set({
        id: workflow.id || nanoid(),
        name: workflow.name || '导入的工作流',
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables || [],
        selectedNodeId: null,
      })
      return true
    } catch {
      return false
    }
  },
  
  mergeWorkflow: (json, position) => {
    try {
      const workflow = JSON.parse(json)
      if (!workflow.nodes || !workflow.edges) {
        return false
      }
      
      const state = get()
      
      // 生成新的节点ID映射（旧ID -> 新ID）
      const idMap = new Map<string, string>()
      workflow.nodes.forEach((node: Node<NodeData>) => {
        idMap.set(node.id, nanoid())
      })
      
      // 计算导入节点的边界框
      let minX = Infinity, minY = Infinity
      workflow.nodes.forEach((node: Node<NodeData>) => {
        if (node.position.x < minX) minX = node.position.x
        if (node.position.y < minY) minY = node.position.y
      })
      
      // 计算位置偏移（如果提供了目标位置）
      const offsetX = position ? position.x - minX : 0
      const offsetY = position ? position.y - minY : 0
      
      // 转换节点（更新ID和位置）
      const newNodes: Node<NodeData>[] = workflow.nodes.map((node: Node<NodeData>) => ({
        ...node,
        id: idMap.get(node.id) || nanoid(),
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: false,
      }))
      
      // 转换边（更新源和目标ID）
      const newEdges: Edge[] = workflow.edges.map((edge: Edge) => ({
        ...edge,
        id: nanoid(),
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      }))
      
      // 合并变量（避免重复）
      const existingVarNames = new Set(state.variables.map(v => v.name))
      const newVariables = (workflow.variables || []).filter(
        (v: Variable) => !existingVarNames.has(v.name)
      )
      
      set({
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges],
        variables: [...state.variables, ...newVariables],
        selectedNodeId: null,
      })
      
      return true
    } catch {
      return false
    }
  },
  
  toggleNodesDisabled: (nodeIds) => {
    set({
      nodes: get().nodes.map((node) => {
        if (nodeIds.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              disabled: !node.data.disabled,
            },
          }
        }
        return node
      }),
    })
  },
}))
