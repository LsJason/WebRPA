import {
  Rocket,
  Zap,
  Database,
  Brain,
  Settings2,
  BookOpen,
  Target,
  Workflow,
  Globe,
  FileSpreadsheet,
  Variable,
  Bug,
  Bell,
  Server,
} from 'lucide-react'
import type { DocumentItem } from './types'

export const documents: DocumentItem[] = [
  {
    id: 'getting-started',
    title: '🚀 快速入门',
    icon: Rocket,
    description: '5分钟学会使用Web RPA',
  },
  {
    id: 'browser-guide',
    title: '🌐 自动化浏览器',
    icon: Globe,
    description: '浏览器原理与元素选择器',
  },
  {
    id: 'basic-modules',
    title: '⚡ 基础模块详解',
    icon: Zap,
    description: '浏览器操作、表单填写等',
  },
  {
    id: 'variables-guide',
    title: '📦 变量系统详解',
    icon: Variable,
    description: '变量类型、引用、列表字典',
  },
  {
    id: 'data-processing',
    title: '📊 数据处理指南',
    icon: Database,
    description: '变量、列表、字典操作',
  },
  {
    id: 'excel-guide',
    title: '📑 Excel与数据表格',
    icon: FileSpreadsheet,
    description: 'Excel读取与数据采集',
  },
  {
    id: 'database-guide',
    title: '🗄️ 数据库操作',
    icon: Server,
    description: 'MySQL数据库连接与增删改查',
  },
  {
    id: 'advanced-features',
    title: '🧠 高级功能',
    icon: Brain,
    description: 'AI、API请求、流程控制',
  },
  {
    id: 'selector-guide',
    title: '🎯 选择器完全指南',
    icon: Target,
    description: 'CSS选择器从入门到精通',
  },
  {
    id: 'notifications-guide',
    title: '🔔 消息通知与交互',
    icon: Bell,
    description: '日志、提示音、邮件通知',
  },
  {
    id: 'debug-guide',
    title: '🐛 调试与错误处理',
    icon: Bug,
    description: '调试技巧与性能优化',
  },
  {
    id: 'practical-cases',
    title: '📚 实战案例',
    icon: BookOpen,
    description: '常见场景的完整解决方案',
  },
  {
    id: 'workflow-patterns',
    title: '🔄 工作流模式',
    icon: Workflow,
    description: '常用设计模式和最佳实践',
  },
  {
    id: 'tips-tricks',
    title: '💡 技巧与窍门',
    icon: Settings2,
    description: '让你的工作流更高效',
  },
]
