import type React from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// 下拉框选择配置
export function SelectDropdownConfig({ 
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
      {renderSelectorInput('selector', '元素选择器', 'select#dropdown')}
      <div className="space-y-2">
        <Label htmlFor="selectBy">选择方式</Label>
        <Select
          id="selectBy"
          value={(data.selectBy as string) || 'value'}
          onChange={(e) => onChange('selectBy', e.target.value)}
        >
          <option value="value">按值</option>
          <option value="label">按文本</option>
          <option value="index">按索引</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">选择值</Label>
        <VariableInput
          value={(data.value as string) || ''}
          onChange={(v) => onChange('value', v)}
          placeholder="要选择的值，支持 {变量名}"
        />
      </div>
    </>
  )
}

// 设置复选框配置
export function SetCheckboxConfig({ 
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
      {renderSelectorInput('selector', '元素选择器', 'input[type="checkbox"]')}
      <div className="space-y-2">
        <Label htmlFor="checked">勾选状态</Label>
        <Select
          id="checked"
          value={String(data.checked ?? true)}
          onChange={(e) => onChange('checked', e.target.value === 'true')}
        >
          <option value="true">勾选</option>
          <option value="false">取消勾选</option>
        </Select>
      </div>
    </>
  )
}

// 拖拽元素配置
export function DragElementConfig({ 
  renderSelectorInput 
}: { 
  data?: NodeData
  onChange?: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('sourceSelector', '源元素选择器', '.draggable')}
      {renderSelectorInput('targetSelector', '目标元素选择器', '.drop-zone')}
    </>
  )
}

// 滚动页面配置
export function ScrollPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
          id="direction"
          value={(data.direction as string) || 'down'}
          onChange={(e) => onChange('direction', e.target.value)}
        >
          <option value="down">向下</option>
          <option value="up">向上</option>
          <option value="left">向左</option>
          <option value="right">向右</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="distance">滚动距离 (像素)</Label>
        <VariableInput
          value={String(data.distance ?? '')}
          onChange={(v) => {
            if (v === '' || v.includes('{')) {
              onChange('distance', v)
            } else {
              const num = parseInt(v)
              onChange('distance', isNaN(num) ? v : num)
            }
          }}
          placeholder="滚动像素数，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollMode">滚动方式</Label>
        <Select
          id="scrollMode"
          value={(data.scrollMode as string) || 'auto'}
          onChange={(e) => onChange('scrollMode', e.target.value)}
        >
          <option value="auto">自动 (推荐)</option>
          <option value="wheel">鼠标滚轮</option>
          <option value="script">脚本滚动</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          绝大多数情况下使用默认的"自动"模式即可！
        </p>
      </div>
    </>
  )
}

// 上传文件配置
export function UploadFileConfig({ 
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
      {renderSelectorInput('selector', '文件输入框选择器', 'input[type="file"]')}
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          type="file"
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\path\to\file.txt，支持 {变量名}"
          title="选择要上传的文件"
        />
      </div>
    </>
  )
}

// 下载文件配置
export function DownloadFileConfig({
  data,
  onChange,
  renderSelectorInput,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="downloadMode">下载方式</Label>
        <Select
          id="downloadMode"
          value={(data.downloadMode as string) || 'click'}
          onChange={(e) => onChange('downloadMode', e.target.value)}
        >
          <option value="click">点击元素触发下载</option>
          <option value="url">URL直接下载</option>
        </Select>
      </div>
      {(data.downloadMode as string) === 'url' ? (
        <div className="space-y-2">
          <Label htmlFor="downloadUrl">下载URL</Label>
          <VariableInput
            value={(data.downloadUrl as string) || ''}
            onChange={(v) => onChange('downloadUrl', v)}
            placeholder="https://example.com/file.pdf，支持 {变量名}"
          />
        </div>
      ) : (
        renderSelectorInput('triggerSelector', '触发下载的元素', 'a.download-btn')
      )}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存目录 (可选)</Label>
        <PathInput
          type="folder"
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="C:\downloads，支持 {变量名}"
          title="选择下载保存目录"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fileName">文件名 (可选)</Label>
        <VariableInput
          value={(data.fileName as string) || ''}
          onChange={(v) => onChange('fileName', v)}
          placeholder="留空则自动获取，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
    </>
  )
}

// 保存图片配置
export function SaveImageConfig({ 
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
      {renderSelectorInput('selector', '图片元素选择器', 'img.product-image')}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径 (可选)</Label>
        <PathInput
          type="folder"
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="C:\images，支持 {变量名}"
          title="选择图片保存目录"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
    </>
  )
}

// 截图配置
export function ScreenshotConfig({ 
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
        <Label htmlFor="screenshotType">截图类型</Label>
        <Select
          id="screenshotType"
          value={(data.screenshotType as string) || 'fullpage'}
          onChange={(e) => onChange('screenshotType', e.target.value)}
        >
          <option value="fullpage">整页截图</option>
          <option value="viewport">可视区域</option>
          <option value="element">指定元素</option>
        </Select>
      </div>
      {(data.screenshotType as string) === 'element' && (
        renderSelectorInput('selector', '元素选择器', '#content 或 .main')
      )}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径 (可选)</Label>
        <PathInput
          type="folder"
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="C:\screenshots，支持 {变量名}"
          title="选择截图保存目录"
        />
        <p className="text-xs text-muted-foreground">
          留空则自动保存到 screenshots 目录
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fileNamePattern">文件名模式</Label>
        <VariableInput
          value={(data.fileNamePattern as string) || ''}
          onChange={(v) => onChange('fileNamePattern', v)}
          placeholder="screenshot_{时间戳}，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        截取当前网页并保存为PNG图片
      </p>
    </>
  )
}

// 验证码配置
export function OCRCaptchaConfig({ 
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
      {renderSelectorInput('imageSelector', '验证码图片选择器', 'img.captcha')}
      {renderSelectorInput('inputSelector', '输入框选择器', 'input#captcha')}
      <div className="space-y-2">
        <Label htmlFor="variableName">存储识别结果到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="autoSubmit">自动提交</Label>
        <Select
          id="autoSubmit"
          value={String(data.autoSubmit ?? false)}
          onChange={(e) => onChange('autoSubmit', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      {data.autoSubmit && renderSelectorInput('submitSelector', '提交按钮选择器', 'button[type="submit"]')}
    </>
  )
}

// 滑块验证码配置
export function SliderCaptchaConfig({ 
  renderSelectorInput 
}: { 
  data?: NodeData
  onChange?: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('sliderSelector', '滑块选择器', '.slider-btn')}
      {renderSelectorInput('backgroundSelector', '背景图选择器 (可选)', '.slider-bg')}
      {renderSelectorInput('gapSelector', '缺口图选择器 (可选)', '.slider-gap')}
    </>
  )
}

// 发送邮件配置
export function SendEmailConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="senderEmail">发件人邮箱</Label>
        <VariableInput
          value={(data.senderEmail as string) || ''}
          onChange={(v) => onChange('senderEmail', v)}
          placeholder="your_qq@qq.com，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authCode">授权码</Label>
        <Input
          id="authCode"
          type="password"
          value={(data.authCode as string) || ''}
          onChange={(e) => onChange('authCode', e.target.value)}
          placeholder="QQ邮箱授权码"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientEmail">收件人邮箱</Label>
        <VariableInput
          value={(data.recipientEmail as string) || ''}
          onChange={(v) => onChange('recipientEmail', v)}
          placeholder="recipient@example.com，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSubject">邮件标题</Label>
        <VariableInput
          value={(data.emailSubject as string) || ''}
          onChange={(v) => onChange('emailSubject', v)}
          placeholder="邮件标题，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailContent">邮件内容</Label>
        <VariableInput
          value={(data.emailContent as string) || ''}
          onChange={(v) => onChange('emailContent', v)}
          placeholder="邮件正文内容，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        默认使用 QQ 邮箱 SMTP 服务器 (smtp.qq.com:465)
      </p>
    </>
  )
}

// 设置剪贴板配置
export function SetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="contentType">内容类型</Label>
        <Select
          id="contentType"
          value={(data.contentType as string) || 'text'}
          onChange={(e) => onChange('contentType', e.target.value)}
        >
          <option value="text">文本</option>
          <option value="image">图片</option>
        </Select>
      </div>
      {(data.contentType as string) === 'image' ? (
        <div className="space-y-2">
          <Label htmlFor="imagePath">图片路径</Label>
          <PathInput
            type="file"
            value={(data.imagePath as string) || ''}
            onChange={(v) => onChange('imagePath', v)}
            placeholder="C:\image.png，支持 {变量名}"
            title="选择图片文件"
          />
          <p className="text-xs text-muted-foreground">
            支持 PNG、JPG、BMP 格式图片
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="textContent">文本内容</Label>
          <VariableInput
            value={(data.textContent as string) || ''}
            onChange={(v) => onChange('textContent', v)}
            placeholder="要复制到剪贴板的文本，支持 {变量名}"
            multiline
            rows={3}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        设置系统剪贴板内容，可配合键盘操作 Ctrl+V 粘贴
      </p>
    </>
  )
}

// 获取剪贴板配置
export function GetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储变量名</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="clipboard_content"
        />
        <p className="text-xs text-muted-foreground">
          剪贴板内容将存储到此变量中
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        读取系统剪贴板中的文本内容
      </p>
    </>
  )
}

// 键盘操作配置
export function KeyboardActionConfig({ 
  data, 
  onChange,
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const presetKeys = [
    { value: 'custom', label: '自定义按键' },
    { value: 'Control+v', label: 'Ctrl+V (粘贴)' },
    { value: 'Control+c', label: 'Ctrl+C (复制)' },
    { value: 'Control+x', label: 'Ctrl+X (剪切)' },
    { value: 'Control+a', label: 'Ctrl+A (全选)' },
    { value: 'Control+z', label: 'Ctrl+Z (撤销)' },
    { value: 'Control+s', label: 'Ctrl+S (保存)' },
    { value: 'Enter', label: 'Enter (回车)' },
    { value: 'Escape', label: 'Escape (取消)' },
    { value: 'Tab', label: 'Tab (切换)' },
    { value: 'Backspace', label: 'Backspace (退格)' },
    { value: 'Delete', label: 'Delete (删除)' },
    { value: 'ArrowUp', label: '↑ (上)' },
    { value: 'ArrowDown', label: '↓ (下)' },
    { value: 'ArrowLeft', label: '← (左)' },
    { value: 'ArrowRight', label: '→ (右)' },
    { value: 'Home', label: 'Home' },
    { value: 'End', label: 'End' },
    { value: 'PageUp', label: 'PageUp' },
    { value: 'PageDown', label: 'PageDown' },
    { value: 'F1', label: 'F1' },
    { value: 'F5', label: 'F5 (刷新)' },
    { value: 'F11', label: 'F11 (全屏)' },
    { value: 'F12', label: 'F12 (开发者工具)' },
  ]

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="targetType">目标类型</Label>
        <Select
          id="targetType"
          value={(data.targetType as string) || 'page'}
          onChange={(e) => onChange('targetType', e.target.value)}
        >
          <option value="page">当前页面</option>
          <option value="element">指定元素</option>
        </Select>
      </div>
      {(data.targetType as string) === 'element' && (
        renderSelectorInput('selector', '目标元素选择器', 'input#search')
      )}
      <div className="space-y-2">
        <Label htmlFor="presetKey">快捷键</Label>
        <Select
          id="presetKey"
          value={(data.presetKey as string) || 'custom'}
          onChange={(e) => {
            onChange('presetKey', e.target.value)
            if (e.target.value !== 'custom') {
              onChange('keySequence', e.target.value)
            }
          }}
        >
          {presetKeys.map(key => (
            <option key={key.value} value={key.value}>{key.label}</option>
          ))}
        </Select>
      </div>
      {((data.presetKey as string) || 'custom') === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="keySequence">按键序列</Label>
          <Input
            id="keySequence"
            value={(data.keySequence as string) || ''}
            onChange={(e) => onChange('keySequence', e.target.value)}
            placeholder="Control+Shift+a 或 Enter"
          />
          <p className="text-xs text-muted-foreground">
            组合键用 + 连接，如: Control+v, Alt+Tab, Shift+Enter
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="delay">按键间隔 (毫秒)</Label>
        <NumberInput
          id="delay"
          value={(data.delay as number) ?? 0}
          onChange={(v) => onChange('delay', v)}
          defaultValue={0}
          min={0}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        模拟键盘按键操作，支持组合键和特殊键
      </p>
    </>
  )
}


// 真实鼠标滚动配置
export function RealMouseScrollConfig({ 
  data, 
  onChange 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
          id="direction"
          value={(data.direction as string) || 'down'}
          onChange={(e) => onChange('direction', e.target.value)}
        >
          <option value="down">向下滚动</option>
          <option value="up">向上滚动</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollAmount">滚动量</Label>
        <NumberInput
          id="scrollAmount"
          value={(data.scrollAmount as number) ?? 3}
          onChange={(v) => onChange('scrollAmount', v)}
          defaultValue={3}
          min={1}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          滚轮滚动的格数（1格约等于120像素）
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollCount">滚动次数</Label>
        <NumberInput
          id="scrollCount"
          value={(data.scrollCount as number) ?? 1}
          onChange={(v) => onChange('scrollCount', v)}
          defaultValue={1}
          min={1}
          max={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollInterval">滚动间隔 (毫秒)</Label>
        <NumberInput
          id="scrollInterval"
          value={(data.scrollInterval as number) ?? 100}
          onChange={(v) => onChange('scrollInterval', v)}
          defaultValue={100}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          多次滚动之间的间隔时间
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
        <p className="text-xs text-amber-800">
          <strong>⚠️ 使用须知：</strong><br />
          • 此模块使用系统级鼠标滚轮模拟<br />
          • 执行时鼠标必须位于目标页面/区域内<br />
          • 可绕过所有网页的防滚动措施<br />
          • 执行期间请勿移动鼠标
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 使用场景：</strong><br />
          • 有防滚动检测的网站<br />
          • 需要真实用户行为的场景
        </p>
      </div>
    </>
  )
}
