import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { NodeData } from '@/store/workflowStore'
import {
  Globe,
  MousePointer,
  Type,
  Search,
  Clock,
  Hourglass,
  X,
  ChevronDown,
  CheckSquare,
  Move,
  ArrowDown,
  Upload,
  Download,
  Image,
  Eye,
  SlidersHorizontal,
  GitBranch,
  Repeat,
  List,
  LogOut,
  SkipForward,
  Variable,
  MessageSquare,
  Mail,
  Volume2,
  FormInput,
  Brain,
  Send,
  FileJson,
  Dices,
  Calendar,
  Camera,
  ListPlus,
  ListMinus,
  Hash,
  BookOpen,
  Key,
  Braces,
  FileSpreadsheet,
  ScanEye,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Music,
  Speech,
  Code,
  Clipboard,
  Keyboard,
  RowsIcon,
  Columns,
  Grid3X3,
  TableProperties,
  Trash2,
  FileDown,
  Square,
  StickyNote,
  Workflow,
} from 'lucide-react'
import type { ModuleType } from '@/types'

// 模块图标映射
const moduleIcons: Record<ModuleType, React.ElementType> = {
  open_page: Globe,
  click_element: MousePointer,
  hover_element: MousePointer,
  input_text: Type,
  get_element_info: Search,
  wait: Clock,
  wait_element: Hourglass,
  close_page: X,
  refresh_page: RefreshCw,
  go_back: ArrowLeft,
  go_forward: ArrowRight,
  handle_dialog: MessageCircle,
  set_variable: Variable,
  json_parse: FileJson,
  base64: Code,
  random_number: Dices,
  get_time: Calendar,
  print_log: MessageSquare,
  play_sound: Volume2,
  play_music: Music,
  input_prompt: FormInput,
  text_to_speech: Speech,
  js_script: Code,
  set_clipboard: Clipboard,
  get_clipboard: Clipboard,
  keyboard_action: Keyboard,
  real_mouse_scroll: MousePointer,
  select_dropdown: ChevronDown,
  set_checkbox: CheckSquare,
  drag_element: Move,
  scroll_page: ArrowDown,
  upload_file: Upload,
  download_file: Download,
  save_image: Image,
  screenshot: Camera,
  read_excel: FileSpreadsheet,
  // 列表操作
  list_operation: ListPlus,
  list_get: ListMinus,
  list_length: Hash,
  // 字典操作
  dict_operation: Braces,
  dict_get: BookOpen,
  dict_keys: Key,
  // 字符串操作
  regex_extract: Search,
  string_replace: Type,
  string_split: List,
  string_join: ListPlus,
  string_concat: ListPlus,
  string_trim: Type,
  string_case: Type,
  string_substring: Type,
  // 数据表格操作
  table_add_row: RowsIcon,
  table_add_column: Columns,
  table_set_cell: Grid3X3,
  table_get_cell: TableProperties,
  table_delete_row: Trash2,
  table_clear: X,
  table_export: FileDown,
  api_request: Send,
  send_email: Mail,
  ai_chat: Brain,
  ai_vision: ScanEye,
  ocr_captcha: Eye,
  slider_captcha: SlidersHorizontal,
  condition: GitBranch,
  loop: Repeat,
  foreach: List,
  break_loop: LogOut,
  continue_loop: SkipForward,
  scheduled_task: Clock,
  subflow: Workflow,
  group: Square,
  note: StickyNote,
}

// 模块颜色映射 - 使用不透明背景
const moduleColors: Record<string, string> = {
  // 浏览器操作 - 蓝色
  open_page: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  click_element: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  hover_element: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  input_text: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  get_element_info: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  wait: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  wait_element: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  close_page: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  refresh_page: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  go_back: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  go_forward: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  handle_dialog: 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  // 表单操作 - 靛蓝色
  select_dropdown: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100',
  set_checkbox: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100',
  drag_element: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100',
  scroll_page: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100',
  upload_file: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100',
  // 数据处理 - 青色
  set_variable: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  json_parse: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  base64: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  random_number: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  get_time: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  download_file: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  save_image: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  screenshot: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  read_excel: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  // 列表操作 - 青绿色
  list_operation: 'border-teal-500 bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100',
  list_get: 'border-teal-500 bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100',
  list_length: 'border-teal-500 bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100',
  // 字典操作 - 琥珀色
  dict_operation: 'border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100',
  dict_get: 'border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100',
  dict_keys: 'border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100',
  // 字符串操作 - 青色
  regex_extract: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_replace: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_split: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_join: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_concat: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_trim: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_case: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  string_substring: 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100',
  // 数据表格操作 - 粉红色
  table_add_row: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_add_column: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_set_cell: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_get_cell: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_delete_row: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_clear: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  table_export: 'border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-100',
  // 网络请求 - 紫色
  api_request: 'border-purple-500 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100',
  send_email: 'border-purple-500 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100',
  // AI能力 - 紫罗兰色
  ai_chat: 'border-violet-500 bg-violet-100 dark:bg-violet-900 text-violet-900 dark:text-violet-100',
  ai_vision: 'border-violet-500 bg-violet-100 dark:bg-violet-900 text-violet-900 dark:text-violet-100',
  // 验证码模块 - 橙色
  ocr_captcha: 'border-orange-500 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100',
  slider_captcha: 'border-orange-500 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100',
  // 流程控制模块 - 绿色
  condition: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  loop: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  foreach: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  break_loop: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  continue_loop: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  scheduled_task: 'border-green-500 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100',
  subflow: 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100',
  // 辅助工具 - 灰色
  print_log: 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
  play_sound: 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
  play_music: 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
  input_prompt: 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
  text_to_speech: 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
  js_script: 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  set_clipboard: 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  get_clipboard: 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  keyboard_action: 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  real_mouse_scroll: 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
  group: 'border-gray-400 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  note: 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100',
}

function ModuleNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as NodeData
  // 移除执行动画以提升性能
  const isDisabled = nodeData.disabled === true
  
  const Icon = moduleIcons[nodeData.moduleType] || Globe
  const colorClass = moduleColors[nodeData.moduleType] || 'border-gray-500 bg-gray-50'
  
  // 获取配置摘要
  const getSummary = () => {
    if (nodeData.url) return nodeData.url as string
    if (nodeData.selector) return nodeData.selector as string
    if (nodeData.text) return nodeData.text as string
    if (nodeData.logMessage) return nodeData.logMessage as string
    if (nodeData.variableName) return `→ ${nodeData.variableName}`
    if (nodeData.userPrompt) return nodeData.userPrompt as string
    if (nodeData.requestUrl) return nodeData.requestUrl as string
    return ''
  }
  
  // 截断文本
  const truncateText = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen) + '...'
  }
  
  const summary = truncateText(getSummary(), 30)
  const customName = nodeData.name as string | undefined

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 shadow-sm min-w-[180px] max-w-[280px] transition-all',
        isDisabled ? 'border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-50' : colorClass,
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* 禁用标记 */}
      {isDisabled && (
        <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          已禁用
        </div>
      )}
      
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      
      {/* 节点内容 */}
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {nodeData.label}
            {customName && (
              <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                ({customName})
              </span>
            )}
          </div>
          {summary && (
            <div className="text-xs opacity-75 truncate mt-0.5">
              {summary}
            </div>
          )}
        </div>
      </div>
      
      {/* 输出连接点 */}
      {nodeData.moduleType === 'condition' ? (
        // 条件判断：绿色=true，红色=false
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
            style={{ left: '30%' }}
          />
          <div className="absolute -bottom-5 text-[10px] text-green-600 font-medium" style={{ left: '30%', transform: 'translateX(-50%)' }}>是</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
            style={{ left: '70%' }}
          />
          <div className="absolute -bottom-5 text-[10px] text-red-600 font-medium" style={{ left: '70%', transform: 'translateX(-50%)' }}>否</div>
        </>
      ) : nodeData.moduleType === 'loop' || nodeData.moduleType === 'foreach' ? (
        // 循环模块：绿色=循环体，红色=循环结束后
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="loop"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
            style={{ left: '30%' }}
          />
          <div className="absolute -bottom-5 text-[10px] text-green-600 font-medium" style={{ left: '30%', transform: 'translateX(-50%)' }}>循环</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="done"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
            style={{ left: '70%' }}
          />
          <div className="absolute -bottom-5 text-[10px] text-red-600 font-medium" style={{ left: '70%', transform: 'translateX(-50%)' }}>完成</div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
    </div>
  )
}

export const ModuleNode = memo(ModuleNodeComponent)
