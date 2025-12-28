import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, ChevronRight, BookOpen, Rocket, Zap, Database, Brain, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentationDialogProps {
  isOpen: boolean
  onClose: () => void
}

const documents = [
  { id: 'getting-started', title: '🚀 快速入门', icon: Rocket, description: '5分钟学会使用明航WAF' },
  { id: 'basic-modules', title: '⚡ 基础模块详解', icon: Zap, description: '浏览器操作、表单填写等' },
  { id: 'data-processing', title: '📊 数据处理指南', icon: Database, description: '变量、列表、字典操作' },
  { id: 'advanced-features', title: '🧠 高级功能', icon: Brain, description: 'AI、API请求、流程控制' },
  { id: 'tips-tricks', title: '💡 技巧与窍门', icon: Settings2, description: '让你的工作流更高效' },
]

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let inCodeBlock = false
  let codeContent = ''
  let inTable = false
  let tableRows: string[][] = []
  let key = 0

  const processInlineStyles = (text: string): ReactNode => {
    const parts: (string | ReactNode)[] = []
    let remaining = text
    let partKey = 0
    while (remaining.length > 0) {
      const codeMatch = remaining.match(/`([^`]+)`/)
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
      const matches = [
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index)
      if (matches.length === 0) { parts.push(remaining); break }
      const first = matches[0]!
      if (first.index > 0) parts.push(remaining.slice(0, first.index))
      if (first.type === 'code') {
        parts.push(<code key={partKey++} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">{first.match![1]}</code>)
      } else if (first.type === 'bold') {
        parts.push(<strong key={partKey++} className="font-semibold">{first.match![1]}</strong>)
      }
      remaining = remaining.slice(first.index + first.match![0].length)
    }
    return <>{parts}</>
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (!inCodeBlock) { inCodeBlock = true; codeContent = '' }
      else {
        inCodeBlock = false
        elements.push(<pre key={key++} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code className="text-sm font-mono">{codeContent}</code></pre>)
      }
      continue
    }
    if (inCodeBlock) { codeContent += (codeContent ? '\n' : '') + line; continue }
    if (line.startsWith('|')) {
      if (!inTable) { inTable = true; tableRows = [] }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (!cells.every(c => c.match(/^-+$/))) tableRows.push(cells)
      continue
    } else if (inTable) {
      inTable = false
      elements.push(
        <table key={key++} className="w-full border-collapse my-4">
          <thead><tr className="bg-gray-100">{tableRows[0]?.map((cell, i) => <th key={i} className="border border-gray-300 px-4 py-2 text-left font-semibold">{cell}</th>)}</tr></thead>
          <tbody>{tableRows.slice(1).map((row, ri) => <tr key={ri} className="hover:bg-gray-50">{row.map((cell, ci) => <td key={ci} className="border border-gray-300 px-4 py-2">{processInlineStyles(cell)}</td>)}</tr>)}</tbody>
        </table>
      )
      tableRows = []
    }
    if (line.startsWith('# ')) { elements.push(<h1 key={key++} className="text-3xl font-bold mt-8 mb-4 text-gray-900">{processInlineStyles(line.slice(2))}</h1>); continue }
    if (line.startsWith('## ')) { elements.push(<h2 key={key++} className="text-2xl font-bold mt-6 mb-3 text-gray-800 border-b pb-2">{processInlineStyles(line.slice(3))}</h2>); continue }
    if (line.startsWith('### ')) { elements.push(<h3 key={key++} className="text-xl font-semibold mt-5 mb-2 text-gray-700">{processInlineStyles(line.slice(4))}</h3>); continue }
    if (line.match(/^- /)) { elements.push(<li key={key++} className="ml-6 list-disc my-1">{processInlineStyles(line.slice(2))}</li>); continue }
    if (line.match(/^\d+\. /)) { const m = line.match(/^(\d+)\. (.*)/); if (m) elements.push(<li key={key++} className="ml-6 list-decimal my-1">{processInlineStyles(m[2])}</li>); continue }
    if (line.match(/^---+$/)) { elements.push(<hr key={key++} className="my-6 border-gray-300" />); continue }
    if (line.trim() === '') continue
    elements.push(<p key={key++} className="my-3 text-gray-700 leading-relaxed">{processInlineStyles(line)}</p>)
  }
  if (inTable && tableRows.length > 0) {
    elements.push(
      <table key={key++} className="w-full border-collapse my-4">
        <thead><tr className="bg-gray-100">{tableRows[0]?.map((cell, i) => <th key={i} className="border border-gray-300 px-4 py-2 text-left font-semibold">{cell}</th>)}</tr></thead>
        <tbody>{tableRows.slice(1).map((row, ri) => <tr key={ri} className="hover:bg-gray-50">{row.map((cell, ci) => <td key={ci} className="border border-gray-300 px-4 py-2">{processInlineStyles(cell)}</td>)}</tr>)}</tbody>
      </table>
    )
  }
  return <>{elements}</>
}

const documentContents: Record<string, string> = {
  'getting-started': `# 🚀 快速入门：5分钟学会明航WAF

欢迎来到**明航WAF**！这是一个超级好用的网页自动化工具，让你可以像搭积木一样创建自动化流程。

## 🎯 明航WAF能做什么？

- 📝 每天自动登录网站签到领积分
- 🛒 监控商品价格，降价自动通知
- 📊 批量采集网页数据导出Excel
- 📧 自动发送邮件通知

## 🏃 第一个工作流

### 第1步：拖入"打开网页"模块
在左侧找到**打开网页**，拖到画布上，配置网址：\`https://www.baidu.com\`

### 第2步：添加"输入文本"模块
拖入**输入文本**模块并连接，配置选择器：\`#kw\`，输入内容：\`明航WAF\`

### 第3步：点击搜索
拖入**点击元素**模块，配置选择器：\`#su\`

点击**运行**按钮，看看效果！

## 📌 界面介绍

| 区域 | 作用 |
|------|------|
| 左侧模块列表 | 所有可用的功能模块 |
| 中间画布 | 搭建工作流的地方 |
| 右侧配置面板 | 配置选中模块的参数 |
| 底部日志面板 | 查看执行日志、数据、变量 |

## 🔥 小贴士

- **Ctrl+点击** 元素选择器按钮可以可视化选择网页元素
- 使用 \`{变量名}\` 可以在任何输入框引用变量
- 记得经常**导出**保存你的工作流！`,

  'basic-modules': `# ⚡ 基础模块详解

## 🌐 浏览器操作

### 打开网页
最常用的起始模块，配置网页地址和等待条件。

### 点击元素
模拟鼠标点击，支持单击、双击、右键点击。

**懒人福利**：点击选择器旁边的 🎯 按钮，可以直接在网页上点选元素！

### 输入文本
在输入框中填写内容，支持 \`{变量名}\` 引用。

### 获取元素信息
从网页元素中提取数据，配合"Excel列名"可以直接导出到表格！

## ⏰ 等待模块

### 等待（固定时间）
暂停执行指定的毫秒数。

### 等待元素
等待某个元素出现或消失，比固定等待更智能。

## 📝 表单操作

- **下拉框选择**：选择下拉菜单选项
- **设置复选框**：勾选或取消勾选
- **滚动页面**：上下左右滚动`,

  'data-processing': `# 📊 数据处理指南

## 📦 变量基础

变量就像一个盒子，可以存放数据。使用 \`{变量名}\` 来引用变量值。

### 变量类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 字符串 | 文本 | "Hello" |
| 数字 | 整数或小数 | 42 |
| 布尔 | 真/假 | true |
| 列表 | 有序集合 | ["苹果", "香蕉"] |
| 字典 | 键值对 | {"name": "小明"} |

## 📋 列表操作

| 操作 | 说明 |
|------|------|
| 追加元素 | 在末尾添加 |
| 插入元素 | 在指定位置插入 |
| 删除元素 | 按值删除 |
| 弹出元素 | 按索引删除并返回 |
| 清空列表 | 删除所有元素 |

索引从0开始，-1表示最后一个元素。

## 📖 字典操作

| 操作 | 说明 |
|------|------|
| 设置键值 | 添加或修改键值对 |
| 删除键 | 删除指定的键 |
| 获取值 | 根据键名获取值 |`,

  'advanced-features': `# 🧠 高级功能

## 🔀 流程控制

### 条件判断
根据条件执行不同的分支。运算符：== != > < contains

### 循环执行
重复执行一段流程，支持计数循环和条件循环。

### 遍历列表
对列表中的每个元素执行操作。

## 🤖 AI大脑

调用AI大模型处理文本，支持OpenAI、智谱AI、Deepseek等。

**实用场景**：
- 自动总结采集的文章
- 智能分类商品评论
- 生成营销文案

## 🌐 API请求

发送HTTP请求，支持GET、POST、PUT、DELETE、PATCH。

## 📧 发送邮件

自动发送邮件通知，使用QQ邮箱SMTP服务。`,

  'tips-tricks': `# 💡 技巧与窍门

## 🎯 元素选择技巧

- **Ctrl+点击**：选择单个元素
- **Shift+点击**：选择相似元素

### 选择器优先级
1. **ID选择器**：最稳定，如 \`#login-btn\`
2. **唯一类名**：如 \`.submit-button\`
3. **属性选择器**：如 \`[data-id="123"]\`

## ⏱️ 稳定性技巧

- 页面跳转后加"等待"模块
- 使用"等待元素"比固定等待更智能
- 每个模块都可以配置超时时间和重试次数

## 🔧 调试技巧

- 在关键位置添加"打印日志"模块
- 先测试单个模块，再测试完整流程

## 📁 工作流管理

- 给工作流起个好名字
- 使用"导出"功能定期备份

---

🎉 恭喜你看完了所有教程！祝你自动化愉快！ 🚀`
}

export function DocumentationDialog({ isOpen, onClose }: DocumentationDialogProps) {
  const [selectedDoc, setSelectedDoc] = useState('getting-started')
  if (!isOpen) return null
  const content = documentContents[selectedDoc] || ''
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white text-black rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">教学文档</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">文档目录</h3>
            <div className="space-y-1">
              {documents.map(doc => {
                const Icon = doc.icon
                return (
                  <button key={doc.id} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    selectedDoc === doc.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700')}
                    onClick={() => setSelectedDoc(doc.id)}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{doc.title}</div>
                      <div className="text-xs text-gray-500 truncate">{doc.description}</div>
                    </div>
                    {selectedDoc === doc.id && <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-8"><MarkdownRenderer content={content} /></div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
