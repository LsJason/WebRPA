import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { moduleTypeLabels } from '@/store/workflowStore'
import type { ModuleType } from '@/types'
import { useState, useMemo } from 'react'
import {
  Globe,
  MousePointer,
  MousePointerClick,
  Type,
  Search,
  Clock,
  Timer,
  X,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  GripHorizontal,
  ArrowDownUp,
  Upload,
  Download,
  ImageDown,
  Eye,
  SlidersHorizontal,
  GitBranch,
  Repeat,
  ListOrdered,
  LogOut,
  SkipForward,
  Variable,
  MessageSquareText,
  Mail,
  Bell,
  Music,
  TextCursorInput,
  Bot,
  Send,
  FileJson,
  Dices,
  CalendarClock,
  Camera,
  FileSpreadsheet,
  ListPlus,
  ListMinus,
  Hash,
  BookOpen,
  KeyRound,
  Braces,
  ScanText,
  Square,
  AudioLines,
  Code2,
  Table2,
  TableProperties,
  Columns3,
  Grid3X3,
  Trash2,
  FileOutput,
  ClipboardPaste,
  Keyboard,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  MessageCircleWarning,
  StickyNote,
  Regex,
  Replace,
  Scissors,
  Link2,
  TextSelect,
  CaseSensitive,
  RemoveFormatting,
  ClipboardCopy,
  Plus,
  Workflow,
  Database,
  DatabaseZap,
  TableCellsSplit,
  CirclePlus,
  Pencil,
  CircleMinus,
  Unplug,
} from 'lucide-react'

// 模块图标映射 - 优化后更直观的图标
const moduleIcons: Record<ModuleType, React.ElementType> = {
  // 页面导航
  open_page: Globe,
  close_page: X,
  refresh_page: RefreshCw,
  go_back: ArrowLeft,
  go_forward: ArrowRight,
  // 元素交互
  click_element: MousePointerClick,
  hover_element: MousePointer,
  input_text: Type,
  select_dropdown: ChevronDown,
  set_checkbox: CheckSquare,
  drag_element: GripHorizontal,
  scroll_page: ArrowDownUp,
  handle_dialog: MessageCircleWarning,
  // 数据提取
  get_element_info: Search,
  screenshot: Camera,
  save_image: ImageDown,
  download_file: Download,
  // 文件上传
  upload_file: Upload,
  // 等待控制
  wait: Clock,
  wait_element: Timer,
  // 变量与数据
  set_variable: Variable,
  json_parse: FileJson,
  base64: Code2,
  random_number: Dices,
  get_time: CalendarClock,
  // 字符串处理
  regex_extract: Regex,
  string_replace: Replace,
  string_split: Scissors,
  string_join: Link2,
  string_concat: Plus,
  string_trim: RemoveFormatting,
  string_case: CaseSensitive,
  string_substring: TextSelect,
  // 列表操作
  list_operation: ListPlus,
  list_get: ListMinus,
  list_length: Hash,
  // 字典操作
  dict_operation: Braces,
  dict_get: BookOpen,
  dict_keys: KeyRound,
  // 数据表格
  table_add_row: TableProperties,
  table_add_column: Columns3,
  table_set_cell: Grid3X3,
  table_get_cell: Table2,
  table_delete_row: Trash2,
  table_clear: X,
  table_export: FileOutput,
  // Excel
  read_excel: FileSpreadsheet,
  // 数据库操作
  db_connect: Database,
  db_query: DatabaseZap,
  db_execute: TableCellsSplit,
  db_insert: CirclePlus,
  db_update: Pencil,
  db_delete: CircleMinus,
  db_close: Unplug,
  // 流程控制
  condition: GitBranch,
  loop: Repeat,
  foreach: ListOrdered,
  break_loop: LogOut,
  continue_loop: SkipForward,
  scheduled_task: Clock,
  subflow: Workflow,
  // 网络请求
  api_request: Send,
  // AI
  ai_chat: Bot,
  ai_vision: ScanText,
  // 验证码
  ocr_captcha: Eye,
  slider_captcha: SlidersHorizontal,
  // 消息通知
  print_log: MessageSquareText,
  play_sound: Bell,
  play_music: Music,
  text_to_speech: AudioLines,
  send_email: Mail,
  // 用户交互
  input_prompt: TextCursorInput,
  // 系统操作
  set_clipboard: ClipboardPaste,
  get_clipboard: ClipboardCopy,
  keyboard_action: Keyboard,
  real_mouse_scroll: MousePointer,
  // 脚本
  js_script: Code2,
  // 画布工具
  group: Square,
  note: StickyNote,
}

// 模块搜索关键词（用于模糊搜索）
const moduleKeywords: Record<ModuleType, string[]> = {
  open_page: ['打开', '网页', '浏览器', 'url', '地址', 'open', 'page'],
  click_element: ['点击', '单击', '双击', '右键', 'click', '按钮'],
  hover_element: ['悬停', '鼠标', '移动', 'hover', 'mouse', '移入', '经过', '停留'],
  input_text: ['输入', '文本', '填写', 'input', 'text', '表单'],
  get_element_info: ['提取', '数据', '获取', '元素', '信息', 'get', 'element', '采集'],
  wait: ['等待', '延迟', '暂停', 'wait', 'delay', '时间', '固定'],
  wait_element: ['等待', '元素', '出现', '消失', 'wait', 'element', '存在', '隐藏'],
  close_page: ['关闭', '网页', 'close', 'page'],
  refresh_page: ['刷新', '页面', '重新加载', 'refresh', 'reload', 'f5'],
  go_back: ['返回', '上一页', '后退', 'back', 'history', '历史'],
  go_forward: ['前进', '下一页', 'forward', 'history', '历史'],
  handle_dialog: ['弹窗', '对话框', '确认', '取消', 'alert', 'confirm', 'prompt', 'dialog', '提示框'],
  set_variable: ['设置', '变量', 'set', 'variable', '赋值'],
  json_parse: ['json', '解析', '提取', 'parse', '数据', 'jsonpath'],
  base64: ['base64', '编码', '解码', 'encode', 'decode', '转换', '图片', '文件'],
  random_number: ['随机', '数字', 'random', '生成', '随机数'],
  get_time: ['时间', '日期', 'time', 'date', '当前', '获取'],
  print_log: ['打印', '日志', 'print', 'log', '输出'],
  play_sound: ['播放', '提示音', '声音', 'sound', 'beep', '滴'],
  play_music: ['播放', '音乐', '音频', 'music', 'audio', 'mp3', '歌曲', 'url'],
  input_prompt: ['用户', '输入', '弹窗', '对话框', 'prompt', 'input'],
  text_to_speech: ['语音', '播报', '朗读', 'tts', 'speech', '文本转语音', '读'],
  js_script: ['执行', '脚本', 'js', 'javascript', 'script', '代码', 'code', '自定义', '函数'],
  set_clipboard: ['剪贴板', '写入', '复制', '粘贴', 'clipboard', 'copy', 'paste', '图片', '文本'],
  get_clipboard: ['剪贴板', '读取', '获取', '粘贴', 'clipboard', 'paste', '内容'],
  keyboard_action: ['模拟', '按键', '键盘', '快捷键', 'keyboard', 'key', 'ctrl', 'alt', 'shift', '热键'],
  real_mouse_scroll: ['真实', '鼠标', '滚轮', '滚动', '物理', 'mouse', 'scroll', 'wheel', '系统', '硬件', '模拟'],
  select_dropdown: ['下拉', '选择', 'select', 'dropdown'],
  set_checkbox: ['复选框', '勾选', 'checkbox', '选中'],
  drag_element: ['拖拽', '拖动', 'drag', '移动'],
  scroll_page: ['滚动', '滑动', 'scroll', '翻页'],
  upload_file: ['上传', '文件', 'upload', 'file'],
  download_file: ['下载', '文件', 'download', 'file'],
  save_image: ['保存', '图片', 'save', 'image'],
  screenshot: ['截图', '网页', '屏幕', 'screenshot', '快照', '截屏'],
  read_excel: ['读取', 'excel', '表格', 'xlsx', 'xls', '数据', '文件', '资产'],
  // 字符串操作
  regex_extract: ['正则', '提取', '匹配', 'regex', 'regexp', '表达式', '搜索', 'match', 'find', '查找'],
  string_replace: ['替换', '字符串', 'replace', '文本', '修改', '更换'],
  string_split: ['分割', '拆分', '字符串', 'split', '切割', '分隔'],
  string_join: ['连接', '合并', '拼接', 'join', '字符串', '组合', '列表'],
  string_concat: ['拼接', '字符串', 'concat', '合并', '连接', '组合', '加'],
  string_trim: ['去除', '空白', '空格', 'trim', '修剪', '清理', '首尾'],
  string_case: ['大小写', '转换', '大写', '小写', 'case', 'upper', 'lower', '首字母'],
  string_substring: ['截取', '子串', '字符串', 'substring', 'slice', '切片', '部分'],
  // 列表操作
  list_operation: ['列表', '数组', '添加', '删除', '修改', 'list', 'array', 'push', 'pop', 'append'],
  list_get: ['列表', '取值', '获取', '元素', '索引', 'list', 'get', 'index'],
  list_length: ['列表', '长度', '数量', 'length', 'count', 'size'],
  // 字典操作
  dict_operation: ['字典', '对象', '添加', '删除', '修改', 'dict', 'object', 'set', 'key', 'value'],
  dict_get: ['字典', '取值', '获取', '值', 'dict', 'get', 'key'],
  dict_keys: ['字典', '键', '列表', '所有', 'keys', 'dict'],
  // 数据表格操作
  table_add_row: ['数据', '表格', '添加', '行', 'table', 'row', 'add', '新增', '插入'],
  table_add_column: ['数据', '表格', '添加', '列', 'table', 'column', 'add', '新增'],
  table_set_cell: ['数据', '表格', '设置', '单元格', 'table', 'cell', 'set', '修改', '更新'],
  table_get_cell: ['数据', '表格', '读取', '单元格', 'table', 'cell', 'get', '获取', '取值'],
  table_delete_row: ['数据', '表格', '删除', '行', 'table', 'row', 'delete', '移除'],
  table_clear: ['数据', '表格', '清空', 'table', 'clear', '清除', '重置'],
  table_export: ['数据', '表格', '导出', 'table', 'export', 'excel', 'csv', '下载', '保存'],
  api_request: ['http', '请求', 'api', 'get', 'post', 'request', '接口', '网络'],
  send_email: ['发送', '邮件', 'email', 'mail', 'qq'],
  ai_chat: ['ai', '对话', '智能', 'chat', 'gpt', '大模型', '智谱', 'deepseek'],
  ai_vision: ['图像', '识别', 'ai', '视觉', '图片', 'vision', '看图', 'glm', '理解'],
  ocr_captcha: ['ocr', '识别', '验证码', '文字', 'captcha'],
  slider_captcha: ['滑块', '验证', '验证码', 'slider', '拖动'],
  condition: ['条件', '判断', 'if', 'condition', '分支'],
  loop: ['循环', '重复', 'loop', 'for', '次数'],
  foreach: ['遍历', '列表', 'foreach', '数组', 'each'],
  break_loop: ['跳出', '循环', 'break', '退出'],
  continue_loop: ['跳过', '本次', '继续', 'continue', '下一次'],
  scheduled_task: ['定时', '执行', '计划', '任务', 'schedule', 'timer', 'cron', '时间', '延迟'],
  subflow: ['子流程', '复用', '调用', '函数', 'subflow', 'call', '引用', '嵌套', '模块化'],
  group: ['分组', '注释', '备注', 'group', 'comment', '框', '区域'],
  note: ['便签', '笔记', '备注', 'note', 'sticky', '文本', '说明'],
  // 数据库操作
  db_connect: ['数据库', '连接', 'mysql', 'database', 'connect', '登录', '链接'],
  db_query: ['数据库', '查询', 'select', 'query', '搜索', '读取', '获取'],
  db_execute: ['数据库', '执行', 'sql', 'execute', '语句', '命令'],
  db_insert: ['数据库', '插入', 'insert', '添加', '新增', '写入'],
  db_update: ['数据库', '更新', 'update', '修改', '编辑'],
  db_delete: ['数据库', '删除', 'delete', '移除', '清除'],
  db_close: ['数据库', '关闭', '断开', 'close', 'disconnect', '连接'],
}

// 模块分类 - 优化后更清晰的分类结构
const moduleCategories = [
  // ===== 浏览器操作 =====
  {
    name: '🌐 页面操作',
    color: 'bg-blue-500',
    modules: ['open_page', 'close_page', 'refresh_page', 'go_back', 'go_forward'] as ModuleType[],
  },
  {
    name: '🖱️ 元素交互',
    color: 'bg-indigo-500',
    modules: ['click_element', 'hover_element', 'input_text', 'select_dropdown', 'set_checkbox', 'drag_element', 'scroll_page', 'handle_dialog'] as ModuleType[],
  },
  {
    name: '📥 数据采集',
    color: 'bg-emerald-500',
    modules: ['get_element_info', 'screenshot', 'save_image', 'download_file', 'upload_file'] as ModuleType[],
  },
  {
    name: '⏱️ 等待控制',
    color: 'bg-cyan-500',
    modules: ['wait', 'wait_element'] as ModuleType[],
  },
  // ===== 数据处理 =====
  {
    name: '📝 变量操作',
    color: 'bg-violet-500',
    modules: ['set_variable', 'json_parse', 'base64', 'random_number', 'get_time'] as ModuleType[],
  },
  {
    name: '✂️ 文本处理',
    color: 'bg-lime-600',
    modules: ['string_concat', 'string_replace', 'string_split', 'string_join', 'string_trim', 'string_case', 'string_substring', 'regex_extract'] as ModuleType[],
  },
  {
    name: '📋 列表/字典',
    color: 'bg-teal-500',
    modules: ['list_operation', 'list_get', 'list_length', 'dict_operation', 'dict_get', 'dict_keys'] as ModuleType[],
  },
  {
    name: '📊 数据表格',
    color: 'bg-pink-500',
    modules: ['table_add_row', 'table_add_column', 'table_set_cell', 'table_get_cell', 'table_delete_row', 'table_clear', 'table_export', 'read_excel'] as ModuleType[],
  },
  {
    name: '🗄️ 数据库',
    color: 'bg-sky-600',
    modules: ['db_connect', 'db_query', 'db_execute', 'db_insert', 'db_update', 'db_delete', 'db_close'] as ModuleType[],
  },
  // ===== 流程控制 =====
  {
    name: '🔀 流程控制',
    color: 'bg-orange-500',
    modules: ['condition', 'loop', 'foreach', 'break_loop', 'continue_loop', 'scheduled_task', 'subflow'] as ModuleType[],
  },
  // ===== 外部服务 =====
  {
    name: '🌍 网络请求',
    color: 'bg-purple-500',
    modules: ['api_request', 'send_email'] as ModuleType[],
  },
  {
    name: '🤖 AI 能力',
    color: 'bg-fuchsia-500',
    modules: ['ai_chat', 'ai_vision'] as ModuleType[],
  },
  {
    name: '🔐 验证码',
    color: 'bg-rose-500',
    modules: ['ocr_captcha', 'slider_captcha'] as ModuleType[],
  },
  // ===== 辅助工具 =====
  {
    name: '🔔 消息提醒',
    color: 'bg-amber-500',
    modules: ['print_log', 'play_sound', 'play_music', 'text_to_speech', 'input_prompt'] as ModuleType[],
  },
  {
    name: '⌨️ 系统操作',
    color: 'bg-slate-500',
    modules: ['set_clipboard', 'get_clipboard', 'keyboard_action', 'real_mouse_scroll', 'js_script'] as ModuleType[],
  },
  {
    name: '📝 画布工具',
    color: 'bg-stone-400',
    modules: ['group', 'note'] as ModuleType[],
  },
]

interface ModuleItemProps {
  type: ModuleType
  highlight?: string
}

function ModuleItem({ type, highlight }: ModuleItemProps) {
  const Icon = moduleIcons[type]
  const label = moduleTypeLabels[type]

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  // 高亮匹配的文字
  const highlightText = (text: string, query: string) => {
    if (!query) return text
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
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-grab hover:bg-accent transition-colors"
      draggable
      onDragStart={onDragStart}
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{highlight ? highlightText(label, highlight) : label}</span>
    </div>
  )
}

export function ModuleSidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // 切换分类展开/收起
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }

  // 模糊搜索过滤
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return moduleCategories

    const query = searchQuery.toLowerCase().trim()
    
    return moduleCategories.map(category => ({
      ...category,
      modules: category.modules.filter(type => {
        const label = moduleTypeLabels[type].toLowerCase()
        const keywords = moduleKeywords[type] || []
        
        // 匹配标签名
        if (label.includes(query)) return true
        
        // 匹配关键词
        if (keywords.some(kw => kw.toLowerCase().includes(query))) return true
        
        // 匹配模块类型
        if (type.toLowerCase().includes(query)) return true
        
        return false
      })
    })).filter(category => category.modules.length > 0)
  }, [searchQuery])

  const totalModules = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0)

  // 搜索时自动展开所有分类
  const isExpanded = (categoryName: string) => {
    if (searchQuery.trim()) return true
    return expandedCategories.has(categoryName)
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div>
          <h2 className="text-sm font-medium">模块列表</h2>
          <p className="text-xs text-muted-foreground mt-1">拖拽模块到画布</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模块..."
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground">
            找到 {totalModules} 个模块
          </p>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">未找到匹配的模块</p>
            <p className="text-xs mt-1">试试其他关键词</p>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const expanded = isExpanded(category.name)
            return (
              <div key={category.name} className="mb-2">
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                  onClick={() => toggleCategory(category.name)}
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div className={`w-2 h-2 rounded-full ${category.color}`} />
                  <span className="text-xs font-medium flex-1 text-left">
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {category.modules.length}
                  </span>
                </button>
                {expanded && (
                  <div className="ml-4 space-y-0.5 mt-1">
                    {category.modules.map((type) => (
                      <ModuleItem key={type} type={type} highlight={searchQuery} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </ScrollArea>
    </aside>
  )
}
