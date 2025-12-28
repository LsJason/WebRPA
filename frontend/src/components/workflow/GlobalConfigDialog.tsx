import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { X, Settings, Brain, Mail, RotateCcw, Folder, Loader2, Database } from 'lucide-react'
import { systemApi } from '@/services/api'

interface GlobalConfigDialogProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'ai' | 'email' | 'workflow' | 'database'

const API_BASE = 'http://localhost:8000'

export function GlobalConfigDialog({ isOpen, onClose }: GlobalConfigDialogProps) {
  const { config, updateAIConfig, updateEmailConfig, updateWorkflowConfig, updateDatabaseConfig, resetConfig } = useGlobalConfigStore()
  const [activeTab, setActiveTab] = useState<TabType>('ai')
  const [defaultFolder, setDefaultFolder] = useState<string>('')
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  // 获取默认文件夹路径
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/local-workflows/default-folder`)
        .then(res => res.json())
        .then(data => {
          if (data.folder) {
            setDefaultFolder(data.folder)
          }
        })
        .catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleReset = async () => {
    const confirmed = await confirm('确定要重置所有全局配置吗？', { type: 'warning', title: '重置配置' })
    if (confirmed) {
      resetConfig()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white text-black border border-gray-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">全局默认配置</h3>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            <Brain className="w-4 h-4" />
            AI大脑
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('email')}
          >
            <Mail className="w-4 h-4" />
            发送邮件
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'workflow'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('workflow')}
          >
            <Folder className="w-4 h-4" />
            工作流存储
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'database'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('database')}
          >
            <Database className="w-4 h-4" />
            数据库
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'ai' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置AI大脑模块的默认值，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认API地址</Label>
                  <Input
                    value={config.ai.apiUrl}
                    onChange={(e) => updateAIConfig({ apiUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    智谱: https://open.bigmodel.cn/api/paas/v4/chat/completions<br/>
                    Deepseek: https://api.deepseek.com/chat/completions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认API密钥</Label>
                  <Input
                    type="password"
                    value={config.ai.apiKey}
                    onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                    placeholder="sk-xxx"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认模型名称</Label>
                  <Input
                    value={config.ai.model}
                    onChange={(e) => updateAIConfig({ model: e.target.value })}
                    placeholder="gpt-3.5-turbo / glm-4 / deepseek-chat"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认温度</Label>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={config.ai.temperature}
                      onChange={(e) => updateAIConfig({ temperature: parseFloat(e.target.value) || 0.7 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认最大Token</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.ai.maxTokens}
                      onChange={(e) => updateAIConfig({ maxTokens: parseInt(e.target.value) || 2000 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认系统提示词</Label>
                  <textarea
                    value={config.ai.systemPrompt}
                    onChange={(e) => updateAIConfig({ systemPrompt: e.target.value })}
                    placeholder="设定AI的角色和行为..."
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'email' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置发送邮件模块的默认值，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认发件人邮箱</Label>
                  <Input
                    value={config.email.senderEmail}
                    onChange={(e) => updateEmailConfig({ senderEmail: e.target.value })}
                    placeholder="your_qq@qq.com"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认授权码</Label>
                  <Input
                    type="password"
                    value={config.email.authCode}
                    onChange={(e) => updateEmailConfig({ authCode: e.target.value })}
                    placeholder="QQ邮箱授权码"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">SMTP服务器</Label>
                    <Input
                      value={config.email.smtpServer}
                      onChange={(e) => updateEmailConfig({ smtpServer: e.target.value })}
                      placeholder="smtp.qq.com"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">SMTP端口</Label>
                    <Input
                      type="number"
                      value={config.email.smtpPort}
                      onChange={(e) => updateEmailConfig({ smtpPort: parseInt(e.target.value) || 465 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'workflow' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置本地工作流文件的保存位置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">工作流保存文件夹</Label>
                  <div className="flex gap-1">
                    <Input
                      value={config.workflow?.localFolder || ''}
                      onChange={(e) => updateWorkflowConfig({ localFolder: e.target.value })}
                      placeholder={defaultFolder || '使用默认路径'}
                      className="bg-white text-black border-gray-300 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSelectingFolder}
                      className="shrink-0 border-gray-300"
                      onClick={async () => {
                        setIsSelectingFolder(true)
                        try {
                          const result = await systemApi.selectFolder('选择工作流保存文件夹')
                          if (result.data?.success && result.data.path) {
                            updateWorkflowConfig({ localFolder: result.data.path })
                          }
                        } catch (error) {
                          console.error('选择文件夹失败:', error)
                        } finally {
                          setIsSelectingFolder(false)
                        }
                      }}
                    >
                      {isSelectingFolder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    留空则使用默认路径: {defaultFolder || '加载中...'}
                  </p>
                </div>
                {config.workflow?.localFolder && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => updateWorkflowConfig({ localFolder: '' })}
                  >
                    恢复默认路径
                  </Button>
                )}
              </div>
            </>
          )}

          {activeTab === 'database' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置数据库模块的默认连接信息，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">主机地址</Label>
                    <Input
                      value={config.database?.host || 'localhost'}
                      onChange={(e) => updateDatabaseConfig({ host: e.target.value })}
                      placeholder="localhost"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">端口</Label>
                    <Input
                      type="number"
                      value={config.database?.port || 3306}
                      onChange={(e) => updateDatabaseConfig({ port: parseInt(e.target.value) || 3306 })}
                      placeholder="3306"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">用户名</Label>
                  <Input
                    value={config.database?.user || ''}
                    onChange={(e) => updateDatabaseConfig({ user: e.target.value })}
                    placeholder="root"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">密码</Label>
                  <Input
                    type="password"
                    value={config.database?.password || ''}
                    onChange={(e) => updateDatabaseConfig({ password: e.target.value })}
                    placeholder="数据库密码"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">数据库名</Label>
                  <Input
                    value={config.database?.database || ''}
                    onChange={(e) => updateDatabaseConfig({ database: e.target.value })}
                    placeholder="默认数据库名（可选）"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">字符集</Label>
                  <Input
                    value={config.database?.charset || 'utf8mb4'}
                    onChange={(e) => updateDatabaseConfig({ charset: e.target.value })}
                    placeholder="utf8mb4"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            重置全部
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onClose}
          >
            完成
          </Button>
        </div>
      </div>
      
      {/* 确认对话框 */}
      {ConfirmDialog}
    </div>
  )
}
