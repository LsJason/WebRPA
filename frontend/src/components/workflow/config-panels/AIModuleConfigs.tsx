import type React from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { VariableRefInput } from '@/components/ui/variable-ref-input'

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// AI大脑配置
export function AIChatConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <Input
          id="apiUrl"
          value={(data.apiUrl as string) || ''}
          onChange={(e) => onChange('apiUrl', e.target.value)}
          placeholder="https://api.openai.com/v1/chat/completions"
        />
        <p className="text-xs text-muted-foreground">
          支持 OpenAI、智谱、Deepseek 等兼容接口
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <Input
          id="apiKey"
          type="password"
          value={(data.apiKey as string) || ''}
          onChange={(e) => onChange('apiKey', e.target.value)}
          placeholder="sk-xxx 或其他API密钥"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <Input
          id="model"
          value={(data.model as string) || ''}
          onChange={(e) => onChange('model', e.target.value)}
          placeholder="gpt-3.5-turbo / glm-4 / deepseek-chat"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">系统提示词 (可选)</Label>
        <VariableInput
          value={(data.systemPrompt as string) || ''}
          onChange={(v) => onChange('systemPrompt', v)}
          placeholder="设定AI的角色和行为，支持 {变量名}"
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="userPrompt">用户提示词</Label>
        <VariableInput
          value={(data.userPrompt as string) || ''}
          onChange={(v) => onChange('userPrompt', v)}
          placeholder="发送给AI的内容，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储回复到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="temperature">温度 (0-2)</Label>
        <NumberInput
          id="temperature"
          value={(data.temperature as number) ?? 0.7}
          onChange={(v) => onChange('temperature', v)}
          defaultValue={0.7}
          min={0}
          max={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxTokens">最大Token数</Label>
        <NumberInput
          id="maxTokens"
          value={(data.maxTokens as number) ?? 2000}
          onChange={(v) => onChange('maxTokens', v)}
          defaultValue={2000}
          min={1}
        />
      </div>
    </>
  )
}

// AI视觉配置
export function AIVisionConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const imageSource = (data.imageSource as string) || 'element'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <Input
          id="apiUrl"
          value={(data.apiUrl as string) || ''}
          onChange={(e) => onChange('apiUrl', e.target.value)}
          placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions"
        />
        <p className="text-xs text-muted-foreground">
          支持 OpenAI、智谱GLM-4V 等视觉模型接口
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <Input
          id="apiKey"
          type="password"
          value={(data.apiKey as string) || ''}
          onChange={(e) => onChange('apiKey', e.target.value)}
          placeholder="API密钥"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <Input
          id="model"
          value={(data.model as string) || ''}
          onChange={(e) => onChange('model', e.target.value)}
          placeholder="glm-4v / gpt-4-vision-preview"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="imageSource">图片来源</Label>
        <Select
          id="imageSource"
          value={imageSource}
          onChange={(e) => onChange('imageSource', e.target.value)}
        >
          <option value="element">页面元素截图</option>
          <option value="screenshot">当前页面截图</option>
          <option value="url">图片URL</option>
          <option value="variable">变量 (Base64/路径)</option>
        </Select>
      </div>
      
      {imageSource === 'element' && (
        renderSelectorInput('imageSelector', '图片元素选择器', 'img.target 或 #image')
      )}
      
      {imageSource === 'url' && (
        <div className="space-y-2">
          <Label htmlFor="imageUrl">图片URL</Label>
          <VariableInput
            value={(data.imageUrl as string) || ''}
            onChange={(v) => onChange('imageUrl', v)}
            placeholder="https://example.com/image.jpg，支持 {变量名}"
          />
        </div>
      )}
      
      {imageSource === 'variable' && (
        <div className="space-y-2">
          <Label htmlFor="imageVariable">图片变量名</Label>
          <VariableRefInput
            id="imageVariable"
            value={(data.imageVariable as string) || ''}
            onChange={(v) => onChange('imageVariable', v)}
            placeholder="填写变量名，如: imageData"
          />
          <p className="text-xs text-muted-foreground">
            直接填写包含Base64或文件路径的变量名
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="userPrompt">提问内容</Label>
        <VariableInput
          value={(data.userPrompt as string) || ''}
          onChange={(v) => onChange('userPrompt', v)}
          placeholder="请描述这张图片中的内容，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储回复到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxTokens">最大Token数</Label>
        <NumberInput
          id="maxTokens"
          value={(data.maxTokens as number) ?? 1000}
          onChange={(v) => onChange('maxTokens', v)}
          defaultValue={1000}
          min={1}
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>AI视觉模块</strong>可以让AI"看"图片并回答问题。<br/>
          • 支持识别图片内容、提取文字、分析图表等<br/>
          • 推荐使用智谱GLM-4V或OpenAI GPT-4V模型
        </p>
      </div>
    </>
  )
}

// API请求配置
export function ApiRequestConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="requestUrl">请求地址</Label>
        <VariableInput
          value={(data.requestUrl as string) || ''}
          onChange={(v) => onChange('requestUrl', v)}
          placeholder="https://api.example.com/data，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestMethod">请求方法</Label>
        <Select
          id="requestMethod"
          value={(data.requestMethod as string) || 'GET'}
          onChange={(e) => onChange('requestMethod', e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestHeaders">请求头 (JSON格式，可选)</Label>
        <textarea
          id="requestHeaders"
          className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono text-xs"
          value={(data.requestHeaders as string) || ''}
          onChange={(e) => onChange('requestHeaders', e.target.value)}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {token}"}'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestBody">请求体 (可选)</Label>
        <textarea
          id="requestBody"
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono text-xs"
          value={(data.requestBody as string) || ''}
          onChange={(e) => onChange('requestBody', e.target.value)}
          placeholder='{"key": "value", "name": "{变量名}"}'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储响应到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名（存储完整响应JSON）"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestTimeout">超时时间 (秒)</Label>
        <NumberInput
          id="requestTimeout"
          value={(data.requestTimeout as number) ?? 30}
          onChange={(v) => onChange('requestTimeout', v)}
          defaultValue={30}
          min={1}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        发送HTTP请求并将响应存储到变量，可配合JSON解析模块提取数据
      </p>
    </>
  )
}
