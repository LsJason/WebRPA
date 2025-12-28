// 位置
export interface Position {
  x: number
  y: number
}

// 模块类型
export type ModuleType =
  // 浏览器操作
  | 'open_page'
  | 'click_element'
  | 'hover_element'
  | 'input_text'
  | 'get_element_info'
  | 'wait'
  | 'wait_element'
  | 'close_page'
  | 'refresh_page'
  | 'go_back'
  | 'go_forward'
  | 'handle_dialog'
  // 表单操作
  | 'select_dropdown'
  | 'set_checkbox'
  | 'drag_element'
  | 'scroll_page'
  | 'upload_file'
  // 数据处理
  | 'set_variable'
  | 'json_parse'
  | 'base64'
  | 'random_number'
  | 'get_time'
  | 'download_file'
  | 'save_image'
  | 'screenshot'
  | 'read_excel'
  // 字符串操作
  | 'regex_extract'
  | 'string_replace'
  | 'string_split'
  | 'string_join'
  | 'string_concat'
  | 'string_trim'
  | 'string_case'
  | 'string_substring'
  // 列表操作
  | 'list_operation'
  | 'list_get'
  | 'list_length'
  // 字典操作
  | 'dict_operation'
  | 'dict_get'
  | 'dict_keys'
  // 数据表格操作
  | 'table_add_row'
  | 'table_add_column'
  | 'table_set_cell'
  | 'table_get_cell'
  | 'table_delete_row'
  | 'table_clear'
  | 'table_export'
  // 数据库操作
  | 'db_connect'
  | 'db_query'
  | 'db_execute'
  | 'db_insert'
  | 'db_update'
  | 'db_delete'
  | 'db_close'
  // 网络请求
  | 'api_request'
  | 'send_email'
  // AI能力
  | 'ai_chat'
  | 'ai_vision'
  // 验证码
  | 'ocr_captcha'
  | 'slider_captcha'
  // 流程控制
  | 'condition'
  | 'loop'
  | 'foreach'
  | 'break_loop'
  | 'continue_loop'
  | 'scheduled_task'
  | 'subflow'  // 子流程调用
  // 辅助工具
  | 'print_log'
  | 'play_sound'
  | 'play_music'
  | 'input_prompt'
  | 'text_to_speech'
  | 'js_script'
  | 'set_clipboard'
  | 'get_clipboard'
  | 'keyboard_action'
  | 'real_mouse_scroll'
  // 分组/备注
  | 'group'
  | 'note'

// Excel文件资源
export interface DataAsset {
  id: string
  name: string
  originalName: string
  size: number
  uploadedAt: string
  sheetNames: string[]
}

// 工作流节点
export interface WorkflowNode {
  id: string
  type: ModuleType
  position: Position
  data: ModuleConfig
}

// 工作流边
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

// 变量类型
export type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object'

// 变量
export interface Variable {
  name: string
  value: unknown
  type: VariableType
  scope: 'global' | 'local'
}

// 工作流
export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables: Variable[]
  createdAt: string
  updatedAt: string
}

// 模块配置基类
export interface ModuleConfig {
  name?: string
  description?: string
  timeout?: number
  timeoutAction?: 'retry' | 'skip'  // 超时后的处理方式：重试或跳过
  retryCount?: number
  [key: string]: unknown
}

// 执行状态
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped'

// 执行结果
export interface ExecutionResult {
  workflowId: string
  status: ExecutionStatus
  startedAt: string
  completedAt?: string
  totalNodes: number
  executedNodes: number
  failedNodes: number
  errorMessage?: string
  dataFile?: string
}

// 日志级别
export type LogLevel = 'info' | 'warning' | 'error' | 'success'

// 日志条目
export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  nodeId?: string
  message: string
  details?: Record<string, unknown>
  duration?: number
}
