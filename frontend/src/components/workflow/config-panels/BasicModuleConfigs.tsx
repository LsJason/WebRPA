import type React from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { VariableInput } from '@/components/ui/variable-input'
import { UrlInput } from '@/components/ui/url-input'

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// 打开网页配置
export function OpenPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">网页地址</Label>
        <UrlInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
    </>
  )
}

// 点击元素配置
export function ClickElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '#button 或 .class')}
      <div className="space-y-2">
        <Label htmlFor="clickType">点击类型</Label>
        <Select
          id="clickType"
          value={(data.clickType as string) || 'single'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
          <option value="right">右键点击</option>
        </Select>
      </div>
    </>
  )
}

// 悬停元素配置
export function HoverElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '#element 或 .class')}
      <div className="space-y-2">
        <Label htmlFor="hoverDuration">悬停时长 (毫秒)</Label>
        <NumberInput
          id="hoverDuration"
          value={(data.hoverDuration as number) ?? 500}
          onChange={(v) => onChange('hoverDuration', v)}
          defaultValue={500}
          min={0}
          max={10000}
        />
        <p className="text-xs text-muted-foreground">鼠标悬停在元素上的时间</p>
      </div>
    </>
  )
}

// 输入文本配置
export function InputTextConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '#input 或 .class')}
      <div className="space-y-2">
        <Label htmlFor="text">输入内容</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要输入的文本，支持 {变量名}"
        />
      </div>
    </>
  )
}

// 获取元素信息配置
export function GetElementInfoConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '#element 或 .class')}
      <div className="space-y-2">
        <Label htmlFor="attribute">获取属性</Label>
        <Select
          id="attribute"
          value={(data.attribute as string) || 'text'}
          onChange={(e) => onChange('attribute', e.target.value)}
        >
          <option value="text">文本内容</option>
          <option value="innerHTML">HTML内容</option>
          <option value="value">值</option>
          <option value="href">链接地址</option>
          <option value="src">资源地址</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储变量名</Label>
        <Input
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="columnName">Excel列名</Label>
        <VariableInput
          value={(data.columnName as string) || ''}
          onChange={(v) => onChange('columnName', v)}
          placeholder="可选，用于数据导出，支持 {变量名}"
        />
      </div>
    </>
  )
}

// 等待配置
export function WaitConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitType">等待类型</Label>
        <Select
          id="waitType"
          value={(data.waitType as string) || 'time'}
          onChange={(e) => onChange('waitType', e.target.value)}
        >
          <option value="time">固定时间</option>
          <option value="selector">等待元素</option>
          <option value="navigation">等待导航</option>
        </Select>
      </div>
      {(data.waitType as string) === 'time' || !data.waitType ? (
        <div className="space-y-2">
          <Label htmlFor="duration">等待时间 (毫秒)</Label>
          <VariableInput
            value={String(data.duration ?? '')}
            onChange={(v) => {
              if (v === '' || v.includes('{')) {
                onChange('duration', v)
              } else {
                const num = parseInt(v)
                onChange('duration', isNaN(num) ? v : num)
              }
            }}
            placeholder="等待毫秒数，支持 {变量名}"
          />
        </div>
      ) : (data.waitType as string) === 'selector' ? (
        renderSelectorInput('selector', '元素选择器', '#element')
      ) : null}
    </>
  )
}

// 等待元素配置
export function WaitElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '#element 或 .class')}
      <div className="space-y-2">
        <Label htmlFor="waitCondition">等待条件</Label>
        <Select
          id="waitCondition"
          value={(data.waitCondition as string) || 'visible'}
          onChange={(e) => onChange('waitCondition', e.target.value)}
        >
          <option value="visible">元素可见</option>
          <option value="hidden">元素隐藏/消失</option>
          <option value="attached">元素存在于DOM</option>
          <option value="detached">元素从DOM移除</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">超时时间 (毫秒)</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 30000}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={30000}
          min={0}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        等待元素满足指定条件后继续执行后续流程
      </p>
    </>
  )
}

// 设置变量配置
export function SetVariableConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableName">变量名</Label>
        <Input
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="变量名称"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableValue">变量值/表达式</Label>
        <VariableInput
          value={(data.variableValue as string) || ''}
          onChange={(v) => onChange('variableValue', v)}
          placeholder="如: 123, {a}+1, {a}*2"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        支持表达式：<code className="bg-muted px-1 rounded">{'{a}+1'}</code>、<code className="bg-muted px-1 rounded">{'{a}*2'}</code>、<code className="bg-muted px-1 rounded">{'{a}+{b}'}</code>
      </p>
    </>
  )
}

// 打印日志配置
export function PrintLogConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="logMessage">日志内容</Label>
        <VariableInput
          value={(data.logMessage as string) || ''}
          onChange={(v) => onChange('logMessage', v)}
          placeholder="要打印的日志内容，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logLevel">日志级别</Label>
        <Select
          id="logLevel"
          value={(data.logLevel as string) || 'info'}
          onChange={(e) => onChange('logLevel', e.target.value)}
        >
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        日志将显示在底部的执行日志面板中
      </p>
    </>
  )
}

// 播放提示音配置
export function PlaySoundConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="beepCount">提示音次数</Label>
        <NumberInput
          id="beepCount"
          value={(data.beepCount as number) ?? 1}
          onChange={(v) => onChange('beepCount', v)}
          defaultValue={1}
          min={1}
          max={10}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="beepInterval">间隔时间 (毫秒)</Label>
        <NumberInput
          id="beepInterval"
          value={(data.beepInterval as number) ?? 300}
          onChange={(v) => onChange('beepInterval', v)}
          defaultValue={300}
          min={100}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        执行时会发出系统提示音
      </p>
    </>
  )
}

// 播放音乐配置
export function PlayMusicConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="audioUrl">音频URL</Label>
        <VariableInput
          value={(data.audioUrl as string) || ''}
          onChange={(v) => onChange('audioUrl', v)}
          placeholder="https://example.com/music.mp3，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitForEnd">等待播放完成</Label>
        <Select
          id="waitForEnd"
          value={String(data.waitForEnd ?? false)}
          onChange={(e) => onChange('waitForEnd', e.target.value === 'true')}
        >
          <option value="false">否（后台播放）</option>
          <option value="true">是（等待播放完成）</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        支持 MP3、WAV、OGG 等常见音频格式，URL可不带https://前缀
      </p>
    </>
  )
}

// 变量输入框配置
export function InputPromptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const inputMode = (data.inputMode as string) || 'single'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputMode">输入模式</Label>
        <Select
          id="inputMode"
          value={inputMode}
          onChange={(e) => onChange('inputMode', e.target.value)}
        >
          <option value="single">单行文本</option>
          <option value="multiline">多行文本</option>
          <option value="number">数字</option>
          <option value="integer">整数</option>
          <option value="password">密码</option>
          <option value="list">多行列表</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {inputMode === 'single' && '用户输入单行文本'}
          {inputMode === 'multiline' && '用户输入多行文本，保存为字符串'}
          {inputMode === 'number' && '用户输入数字（支持小数）'}
          {inputMode === 'integer' && '用户输入整数'}
          {inputMode === 'password' && '密码输入，内容不可见'}
          {inputMode === 'list' && '每行作为列表的一个元素'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">目标变量名</Label>
        <Input
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="要设置的变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptTitle">弹窗标题</Label>
        <VariableInput
          value={(data.promptTitle as string) || ''}
          onChange={(v) => onChange('promptTitle', v)}
          placeholder="请输入，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptMessage">提示信息</Label>
        <VariableInput
          value={(data.promptMessage as string) || ''}
          onChange={(v) => onChange('promptMessage', v)}
          placeholder="请输入内容，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="defaultValue">默认值</Label>
        <VariableInput
          value={(data.defaultValue as string) || ''}
          onChange={(v) => onChange('defaultValue', v)}
          placeholder="可选的默认值，支持 {变量名}"
          multiline={inputMode === 'multiline' || inputMode === 'list'}
          rows={3}
        />
      </div>
      {(inputMode === 'number' || inputMode === 'integer') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="minValue">最小值</Label>
              <Input
                id="minValue"
                type="number"
                value={(data.minValue as number) ?? ''}
                onChange={(e) => onChange('minValue', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxValue">最大值</Label>
              <Input
                id="maxValue"
                type="number"
                value={(data.maxValue as number) ?? ''}
                onChange={(e) => onChange('maxValue', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可选"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            设置数字范围限制（可选）
          </p>
        </>
      )}
      {inputMode === 'single' && (
        <div className="space-y-2">
          <Label htmlFor="maxLength">最大长度</Label>
          <Input
            id="maxLength"
            type="number"
            value={(data.maxLength as number) ?? ''}
            onChange={(e) => onChange('maxLength', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="可选，不限制留空"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="required"
          checked={(data.required as boolean) ?? true}
          onChange={(e) => onChange('required', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="required" className="cursor-pointer">必填（不允许空值）</Label>
      </div>
    </>
  )
}

// 文本朗读配置
export function TextToSpeechConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="text">朗读文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要朗读的文本内容，支持 {变量名}"
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lang">语言</Label>
        <Select
          id="lang"
          value={(data.lang as string) || 'zh-CN'}
          onChange={(e) => onChange('lang', e.target.value)}
        >
          <option value="zh-CN">中文（普通话）</option>
          <option value="zh-TW">中文（台湾）</option>
          <option value="zh-HK">中文（粤语）</option>
          <option value="en-US">英语（美国）</option>
          <option value="en-GB">英语（英国）</option>
          <option value="ja-JP">日语</option>
          <option value="ko-KR">韩语</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rate">语速 ({(data.rate as number) || 1}x)</Label>
        <input
          id="rate"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={(data.rate as number) || 1}
          onChange={(e) => onChange('rate', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitch">音调 ({(data.pitch as number) || 1})</Label>
        <input
          id="pitch"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={(data.pitch as number) || 1}
          onChange={(e) => onChange('pitch', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>低</span>
          <span>正常</span>
          <span>高</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="volume">音量 ({Math.round(((data.volume as number) || 1) * 100)}%)</Label>
        <input
          id="volume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={(data.volume as number) || 1}
          onChange={(e) => onChange('volume', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>静音</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          使用浏览器内置的语音合成功能朗读文本，需要在可视模式下运行才能听到声音。
        </p>
      </div>
    </>
  )
}

// JS脚本配置
import { useState } from 'react'
import { Code } from 'lucide-react'
import { JsEditorDialog } from '../JsEditorDialog'

const DEFAULT_JS_CODE = `// 自定义 JavaScript 脚本
// 可以使用 vars 对象访问工作流中的变量
// 例如: vars.myVar, vars.myList, vars.myDict

function main(vars) {
  // 在这里编写你的代码
  // 示例：处理字符串
  // const text = vars.inputText || '';
  // return text.toUpperCase();
  
  // 示例：处理列表
  // const list = vars.myList || [];
  // return list.filter(item => item > 10);
  
  // 示例：处理字典
  // const dict = vars.myDict || {};
  // return Object.keys(dict).length;
  
  return null;
}

// main 函数的返回值将存储到指定的变量中`

export function JsScriptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const code = (data.code as string) || DEFAULT_JS_CODE
  
  // 计算代码行数
  const lineCount = code.split('\n').length
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="code">JavaScript 代码</Label>
        <div className="relative">
          <textarea
            id="code"
            value={code}
            onChange={(e) => onChange('code', e.target.value)}
            placeholder="编写 JavaScript 代码..."
            rows={8}
            className="w-full px-3 py-2 text-xs font-mono rounded-md border border-input bg-background resize-none"
            spellCheck={false}
            readOnly
          />
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/10 transition-colors"
            onClick={() => setEditorOpen(true)}
          >
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="text-sm font-medium">打开代码编辑器</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lineCount} 行代码 · 点击上方打开完整编辑器
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <Input
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(e) => onChange('resultVariable', e.target.value)}
          placeholder="存储 main() 返回值的变量名"
        />
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-amber-800">使用说明：</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>通过 <code className="bg-amber-100 px-1 rounded">vars</code> 对象访问工作流变量</li>
          <li><code className="bg-amber-100 px-1 rounded">main(vars)</code> 函数的返回值会存入结果变量</li>
          <li>支持 ES6+ 语法（箭头函数、解构等）</li>
          <li>代码在浏览器环境中执行</li>
        </ul>
      </div>
      
      {/* 代码编辑器弹窗 */}
      <JsEditorDialog
        isOpen={editorOpen}
        code={code}
        onClose={() => setEditorOpen(false)}
        onSave={(newCode) => onChange('code', newCode)}
      />
    </>
  )
}

// 备注分组配置
const GROUP_COLORS = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '绿色', value: '#22c55e' },
  { name: '紫色', value: '#a855f7' },
  { name: '橙色', value: '#f97316' },
  { name: '红色', value: '#ef4444' },
  { name: '青色', value: '#06b6d4' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#6b7280' },
]

export function GroupConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const isSubflow = data.isSubflow === true
  
  return (
    <>
      {/* 子流程开关 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="isSubflow">设为子流程</Label>
          <button
            type="button"
            role="switch"
            aria-checked={isSubflow}
            onClick={() => {
              const newValue = !isSubflow
              onChange('isSubflow', newValue)
              // 如果开启子流程，自动设置 subflowName
              if (newValue && data.label) {
                onChange('subflowName', data.label)
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSubflow ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSubflow ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          开启后，此分组内的模块可被「调用子流程」模块复用
        </p>
      </div>

      {isSubflow ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="subflowName">子流程名称</Label>
            <Input
              id="subflowName"
              value={(data.subflowName as string) || (data.label as string) || ''}
              onChange={(e) => {
                onChange('subflowName', e.target.value)
                onChange('label', e.target.value)
              }}
              placeholder="输入子流程名称（必填）"
            />
            <p className="text-xs text-muted-foreground">
              此名称将显示在「调用子流程」模块的下拉列表中
            </p>
          </div>
          
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-800">
              <strong>📦 子流程说明：</strong><br />
              • 将模块放入此分组内即可定义子流程<br />
              • 使用「调用子流程」模块来复用此流程<br />
              • 子流程内的模块不会被主流程直接执行<br />
              • 子流程可以访问和修改主流程的变量
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="label">备注标题</Label>
            <Input
              id="label"
              value={(data.label as string) ?? ''}
              onChange={(e) => onChange('label', e.target.value)}
              placeholder="输入备注标题（可留空）"
            />
          </div>
          <div className="space-y-2">
            <Label>颜色</Label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    data.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onChange('color', color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            备注分组用于将多个模块组织在一起，方便管理和注释。双击标题可编辑。
          </p>
        </>
      )}
    </>
  )
}

// 刷新页面配置
export function RefreshPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        刷新当前页面，相当于按 F5 键
      </p>
    </>
  )
}

// 返回上一页配置
export function GoBackConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        返回浏览器历史记录中的上一页，相当于点击浏览器的后退按钮
      </p>
    </>
  )
}

// 前进下一页配置
export function GoForwardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        前进到浏览器历史记录中的下一页，相当于点击浏览器的前进按钮
      </p>
    </>
  )
}

// 处理弹窗配置
export function HandleDialogConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dialogAction">处理方式</Label>
        <Select
          id="dialogAction"
          value={(data.dialogAction as string) || 'accept'}
          onChange={(e) => onChange('dialogAction', e.target.value)}
        >
          <option value="accept">确认（点击确定）</option>
          <option value="dismiss">取消（点击取消）</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptText">输入内容（仅prompt弹窗）</Label>
        <VariableInput
          value={(data.promptText as string) || ''}
          onChange={(v) => onChange('promptText', v)}
          placeholder="如果是输入框弹窗，填写要输入的内容"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveMessage">保存弹窗消息到变量</Label>
        <Input
          id="saveMessage"
          value={(data.saveMessage as string) || ''}
          onChange={(e) => onChange('saveMessage', e.target.value)}
          placeholder="可选，保存弹窗显示的消息"
        />
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-blue-800">支持的弹窗类型：</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><code className="bg-blue-100 px-1 rounded">alert</code> - 提示框（只有确定按钮）</li>
          <li><code className="bg-blue-100 px-1 rounded">confirm</code> - 确认框（确定/取消按钮）</li>
          <li><code className="bg-blue-100 px-1 rounded">prompt</code> - 输入框（带输入框的弹窗）</li>
          <li><code className="bg-blue-100 px-1 rounded">beforeunload</code> - 离开页面确认</li>
        </ul>
      </div>
    </>
  )
}
