import { useWorkflowStore, moduleTypeLabels, type NodeData } from '@/store/workflowStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2, Crosshair, Loader2, Ban } from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { elementPickerApi } from '@/services/api'

// 导入拆分的配置组件
import { ReadExcelConfig } from './config-panels/ReadExcelConfig'
import { SimilarSelectorDialog } from './config-panels/SimilarSelectorDialog'
import { UrlInputDialog } from './config-panels/UrlInputDialog'
import {
  OpenPageConfig,
  ClickElementConfig,
  HoverElementConfig,
  InputTextConfig,
  GetElementInfoConfig,
  WaitConfig,
  WaitElementConfig,
  SetVariableConfig,
  PrintLogConfig,
  PlaySoundConfig,
  PlayMusicConfig,
  InputPromptConfig,
  TextToSpeechConfig,
  JsScriptConfig,
  GroupConfig,
  RefreshPageConfig,
  GoBackConfig,
  GoForwardConfig,
  HandleDialogConfig,
} from './config-panels/BasicModuleConfigs'
import {
  SelectDropdownConfig,
  SetCheckboxConfig,
  DragElementConfig,
  ScrollPageConfig,
  UploadFileConfig,
  DownloadFileConfig,
  SaveImageConfig,
  ScreenshotConfig,
  OCRCaptchaConfig,
  SliderCaptchaConfig,
  SendEmailConfig,
  SetClipboardConfig,
  GetClipboardConfig,
  KeyboardActionConfig,
  RealMouseScrollConfig,
} from './config-panels/AdvancedModuleConfigs'
import {
  AIChatConfig,
  AIVisionConfig,
  ApiRequestConfig,
} from './config-panels/AIModuleConfigs'
import {
  ConditionConfig,
  LoopConfig,
  ForeachConfig,
  ScheduledTaskConfig,
  SubflowConfig,
} from './config-panels/ControlModuleConfigs'
import {
  RegexExtractConfig,
  StringReplaceConfig,
  StringSplitConfig,
  StringJoinConfig,
  StringConcatConfig,
  StringTrimConfig,
  StringCaseConfig,
  StringSubstringConfig,
  JsonParseConfig,
  Base64Config,
  RandomNumberConfig,
  GetTimeConfig,
  ListOperationConfig,
  ListGetConfig,
  ListLengthConfig,
  DictOperationConfig,
  DictGetConfig,
  DictKeysConfig,
  TableAddRowConfig,
  TableAddColumnConfig,
  TableSetCellConfig,
  TableGetCellConfig,
  TableDeleteRowConfig,
  TableClearConfig,
  TableExportConfig,
} from './config-panels/DataModuleConfigs'
import {
  DbConnectConfig,
  DbQueryConfig,
  DbExecuteConfig,
  DbInsertConfig,
  DbUpdateConfig,
  DbDeleteConfig,
  DbCloseConfig,
} from './config-panels/DatabaseModuleConfigs'

interface ConfigPanelProps {
  selectedNodeId?: string | null  // 改为可选，优先使用 store 中的值
}

export function ConfigPanel({ selectedNodeId: propSelectedNodeId }: ConfigPanelProps) {
  // 直接从 store 订阅 selectedNodeId，确保实时更新
  const storeSelectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const selectedNodeId = propSelectedNodeId ?? storeSelectedNodeId
  
  const nodes = useWorkflowStore((state) => state.nodes)
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData)
  const deleteNode = useWorkflowStore((state) => state.deleteNode)
  const addLog = useWorkflowStore((state) => state.addLog)
  const addVariable = useWorkflowStore((state) => state.addVariable)
  const toggleNodesDisabled = useWorkflowStore((state) => state.toggleNodesDisabled)

  const [isPicking, setIsPicking] = useState(false)
  const [pickingField, setPickingField] = useState<string | null>(null)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [pickerUrl, setPickerUrl] = useState('')
  const [pendingField, setPendingField] = useState<string | null>(null)
  const pollingRef = useRef<number | null>(null)
  
  // 相似元素选择状态
  const [showSimilarDialog, setShowSimilarDialog] = useState(false)
  const [similarResult, setSimilarResult] = useState<{
    pattern: string
    count: number
    minIndex: number
    maxIndex: number
  } | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const nodeData = selectedNode?.data as NodeData | undefined

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const handleChange = useCallback((key: string, value: unknown) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, { [key]: value })
    }
  }, [selectedNodeId, updateNodeData])

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId)
    }
  }

  // 打开URL输入对话框
  const openUrlDialog = useCallback((fieldName: string) => {
    const openPageNode = nodes.find(n => (n.data as NodeData).moduleType === 'open_page')
    const defaultUrl = (openPageNode?.data as NodeData)?.url as string || ''
    setPickerUrl(defaultUrl)
    setPendingField(fieldName)
    setShowUrlDialog(true)
  }, [nodes])

  // 解析URL中的变量引用
  const resolveVariables = useCallback((value: string): string => {
    const variables = useWorkflowStore.getState().variables
    return value.replace(/\{([^}]+)\}/g, (match, varName) => {
      const variable = variables.find(v => v.name === varName.trim())
      return variable ? String(variable.value ?? '') : match
    })
  }, [])

  // 启动元素选择器
  const startElementPicker = useCallback(async (fieldName: string, url: string) => {
    const resolvedUrl = url ? resolveVariables(url) : ''
    setIsPicking(true)
    setPickingField(fieldName)
    setShowUrlDialog(false)
    
    if (resolvedUrl) {
      addLog({ level: 'info', message: `正在启动元素选择器，URL: ${resolvedUrl}` })
    } else {
      addLog({ level: 'info', message: '正在启动元素选择器（使用当前页面）' })
    }

    try {
      const result = await elementPickerApi.start(resolvedUrl || undefined)
      if (result.error) {
        addLog({ level: 'error', message: `启动失败: ${result.error}` })
        setIsPicking(false)
        setPickingField(null)
        return
      }

      addLog({ level: 'success', message: '元素选择器已启动：Ctrl+点击单选，Shift+点击选择相似元素' })

      pollingRef.current = window.setInterval(async () => {
        const selectedResult = await elementPickerApi.getSelected()
        
        if (selectedResult.data?.active === false) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          setIsPicking(false)
          setPickingField(null)
          return
        }
        
        if (selectedResult.data?.selected && selectedResult.data.element) {
          const selector = selectedResult.data.element.selector
          handleChange(fieldName, selector)
          addLog({ level: 'success', message: `已选择元素: ${selector}` })
          
          await elementPickerApi.stop()
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          setIsPicking(false)
          setPickingField(null)
          return
        }
        
        const similarRes = await elementPickerApi.getSimilar()
        if (similarRes.data?.selected && similarRes.data.similar) {
          const similar = similarRes.data.similar
          addLog({ level: 'success', message: `找到 ${similar.count} 个相似元素` })
          
          setSimilarResult({
            pattern: similar.pattern,
            count: similar.count,
            minIndex: similar.minIndex,
            maxIndex: similar.maxIndex,
          })
          setShowSimilarDialog(true)
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }
      }, 500)

    } catch (error) {
      addLog({ level: 'error', message: `启动元素选择器失败: ${error}` })
      setIsPicking(false)
      setPickingField(null)
    }
  }, [addLog, handleChange, resolveVariables])

  // 确认相似元素选择
  const handleSimilarConfirm = useCallback(async (variableName: string) => {
    if (!similarResult || !pickingField) return
    
    const finalSelector = similarResult.pattern.replace('{index}', `{${variableName}}`)
    handleChange(pickingField, finalSelector)
    
    addVariable({
      name: variableName,
      value: similarResult.minIndex,
      type: 'number',
      scope: 'global'
    })
    
    addLog({ 
      level: 'success', 
      message: `已设置相似元素选择器，变量 ${variableName} 范围: ${similarResult.minIndex}-${similarResult.maxIndex}` 
    })
    
    setShowSimilarDialog(false)
    setSimilarResult(null)
    await elementPickerApi.stop()
    setIsPicking(false)
    setPickingField(null)
  }, [similarResult, pickingField, handleChange, addVariable, addLog])

  // 停止元素选择器
  const stopElementPicker = useCallback(async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    await elementPickerApi.stop()
    setIsPicking(false)
    setPickingField(null)
    setShowSimilarDialog(false)
    setSimilarResult(null)
    addLog({ level: 'info', message: '元素选择器已停止' })
  }, [addLog])

  if (!selectedNode || !nodeData) {
    return (
      <aside className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-sm font-medium">配置面板</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            选择一个节点查看配置
          </p>
        </div>
      </aside>
    )
  }

  // 渲染带选择器按钮的输入框
  const renderSelectorInput = (id: string, label: string, placeholder: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={(nodeData[id] as string) || ''}
          onChange={(e) => handleChange(id, e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => isPicking && pickingField === id ? stopElementPicker() : openUrlDialog(id)}
          title={isPicking && pickingField === id ? '停止选择' : '可视化选择元素'}
          disabled={isPicking && pickingField !== id}
        >
          {isPicking && pickingField === id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4" />
          )}
        </Button>
      </div>
      {isPicking && pickingField === id && (
        <p className="text-xs text-blue-500">Ctrl+点击单选，Shift+点击选择相似元素</p>
      )}
    </div>
  )

  // 渲染模块配置
  const renderModuleConfig = () => {
    const props = { data: nodeData, onChange: handleChange, renderSelectorInput }
    
    switch (nodeData.moduleType) {
      case 'open_page':
        return <OpenPageConfig data={nodeData} onChange={handleChange} />
      case 'click_element':
        return <ClickElementConfig {...props} />
      case 'hover_element':
        return <HoverElementConfig {...props} />
      case 'input_text':
        return <InputTextConfig {...props} />
      case 'get_element_info':
        return <GetElementInfoConfig {...props} />
      case 'wait':
        return <WaitConfig {...props} />
      case 'wait_element':
        return <WaitElementConfig {...props} />
      case 'refresh_page':
        return <RefreshPageConfig data={nodeData} onChange={handleChange} />
      case 'go_back':
        return <GoBackConfig data={nodeData} onChange={handleChange} />
      case 'go_forward':
        return <GoForwardConfig data={nodeData} onChange={handleChange} />
      case 'handle_dialog':
        return <HandleDialogConfig data={nodeData} onChange={handleChange} />
      case 'set_variable':
        return <SetVariableConfig data={nodeData} onChange={handleChange} />
      case 'print_log':
        return <PrintLogConfig data={nodeData} onChange={handleChange} />
      case 'play_sound':
        return <PlaySoundConfig data={nodeData} onChange={handleChange} />
      case 'play_music':
        return <PlayMusicConfig data={nodeData} onChange={handleChange} />
      case 'input_prompt':
        return <InputPromptConfig data={nodeData} onChange={handleChange} />
      case 'text_to_speech':
        return <TextToSpeechConfig data={nodeData} onChange={handleChange} />
      case 'js_script':
        return <JsScriptConfig data={nodeData} onChange={handleChange} />
      case 'select_dropdown':
        return <SelectDropdownConfig {...props} />
      case 'set_checkbox':
        return <SetCheckboxConfig {...props} />
      case 'drag_element':
        return <DragElementConfig {...props} />
      case 'scroll_page':
        return <ScrollPageConfig data={nodeData} onChange={handleChange} />
      case 'upload_file':
        return <UploadFileConfig {...props} />
      case 'download_file':
        return <DownloadFileConfig {...props} />
      case 'save_image':
        return <SaveImageConfig {...props} />
      case 'screenshot':
        return <ScreenshotConfig {...props} />
      case 'ocr_captcha':
        return <OCRCaptchaConfig {...props} />
      case 'slider_captcha':
        return <SliderCaptchaConfig {...props} />
      case 'send_email':
        return <SendEmailConfig data={nodeData} onChange={handleChange} />
      case 'set_clipboard':
        return <SetClipboardConfig data={nodeData} onChange={handleChange} />
      case 'get_clipboard':
        return <GetClipboardConfig data={nodeData} onChange={handleChange} />
      case 'keyboard_action':
        return <KeyboardActionConfig {...props} />
      case 'real_mouse_scroll':
        return <RealMouseScrollConfig data={nodeData} onChange={handleChange} />
      case 'ai_chat':
        return <AIChatConfig data={nodeData} onChange={handleChange} />
      case 'ai_vision':
        return <AIVisionConfig {...props} />
      case 'api_request':
        return <ApiRequestConfig data={nodeData} onChange={handleChange} />
      case 'condition':
        return <ConditionConfig {...props} />
      case 'loop':
        return <LoopConfig data={nodeData} onChange={handleChange} />
      case 'foreach':
        return <ForeachConfig data={nodeData} onChange={handleChange} />
      case 'scheduled_task':
        return <ScheduledTaskConfig data={nodeData} onChange={handleChange} />
      case 'subflow':
        return <SubflowConfig data={nodeData} onChange={handleChange} />
      case 'regex_extract':
        return <RegexExtractConfig data={nodeData} onChange={handleChange} />
      case 'string_replace':
        return <StringReplaceConfig data={nodeData} onChange={handleChange} />
      case 'string_split':
        return <StringSplitConfig data={nodeData} onChange={handleChange} />
      case 'string_join':
        return <StringJoinConfig data={nodeData} onChange={handleChange} />
      case 'string_concat':
        return <StringConcatConfig data={nodeData} onChange={handleChange} />
      case 'string_trim':
        return <StringTrimConfig data={nodeData} onChange={handleChange} />
      case 'string_case':
        return <StringCaseConfig data={nodeData} onChange={handleChange} />
      case 'string_substring':
        return <StringSubstringConfig data={nodeData} onChange={handleChange} />
      case 'json_parse':
        return <JsonParseConfig data={nodeData} onChange={handleChange} />
      case 'base64':
        return <Base64Config data={nodeData} onChange={handleChange} />
      case 'random_number':
        return <RandomNumberConfig data={nodeData} onChange={handleChange} />
      case 'get_time':
        return <GetTimeConfig data={nodeData} onChange={handleChange} />
      case 'read_excel':
        return <ReadExcelConfig data={nodeData} onChange={handleChange} />
      case 'list_operation':
        return <ListOperationConfig data={nodeData} onChange={handleChange} />
      case 'list_get':
        return <ListGetConfig data={nodeData} onChange={handleChange} />
      case 'list_length':
        return <ListLengthConfig data={nodeData} onChange={handleChange} />
      case 'dict_operation':
        return <DictOperationConfig data={nodeData} onChange={handleChange} />
      case 'dict_get':
        return <DictGetConfig data={nodeData} onChange={handleChange} />
      case 'dict_keys':
        return <DictKeysConfig data={nodeData} onChange={handleChange} />
      case 'table_add_row':
        return <TableAddRowConfig data={nodeData} onChange={handleChange} />
      case 'table_add_column':
        return <TableAddColumnConfig data={nodeData} onChange={handleChange} />
      case 'table_set_cell':
        return <TableSetCellConfig data={nodeData} onChange={handleChange} />
      case 'table_get_cell':
        return <TableGetCellConfig data={nodeData} onChange={handleChange} />
      case 'table_delete_row':
        return <TableDeleteRowConfig data={nodeData} onChange={handleChange} />
      case 'table_clear':
        return <TableClearConfig />
      case 'table_export':
        return <TableExportConfig data={nodeData} onChange={handleChange} />
      case 'db_connect':
        return <DbConnectConfig data={nodeData} onChange={handleChange} />
      case 'db_query':
        return <DbQueryConfig data={nodeData} onChange={handleChange} />
      case 'db_execute':
        return <DbExecuteConfig data={nodeData} onChange={handleChange} />
      case 'db_insert':
        return <DbInsertConfig data={nodeData} onChange={handleChange} />
      case 'db_update':
        return <DbUpdateConfig data={nodeData} onChange={handleChange} />
      case 'db_delete':
        return <DbDeleteConfig data={nodeData} onChange={handleChange} />
      case 'db_close':
        return <DbCloseConfig data={nodeData} onChange={handleChange} />
      case 'group':
        return <GroupConfig data={nodeData} onChange={handleChange} />
      default:
        return (
          <p className="text-sm text-muted-foreground">
            该模块暂无额外配置
          </p>
        )
    }
  }

  return (
    <>
      {/* URL输入对话框 */}
      <UrlInputDialog
        isOpen={showUrlDialog}
        url={pickerUrl}
        onUrlChange={setPickerUrl}
        onClose={() => setShowUrlDialog(false)}
        onConfirm={() => pendingField && startElementPicker(pendingField, pickerUrl)}
      />
      
      {/* 相似元素选择对话框 */}
      {similarResult && (
        <SimilarSelectorDialog
          isOpen={showSimilarDialog}
          onClose={() => {
            setShowSimilarDialog(false)
            setSimilarResult(null)
            stopElementPicker()
          }}
          onConfirm={handleSimilarConfirm}
          pattern={similarResult.pattern}
          count={similarResult.count}
          minIndex={similarResult.minIndex}
          maxIndex={similarResult.maxIndex}
        />
      )}
      
      <aside className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{moduleTypeLabels[nodeData.moduleType]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">节点配置</p>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                toggleNodesDisabled([selectedNode.id])
                addLog({ level: 'info', message: nodeData.disabled ? '已启用模块' : '已禁用模块' })
              }}
              title={nodeData.disabled ? '启用模块 (Ctrl+D)' : '禁用模块 (Ctrl+D)'}
            >
              <Ban className={`w-4 h-4 ${nodeData.disabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} title="删除模块">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* 通用配置 */}
            <div className="space-y-2">
              <Label htmlFor="name">节点名称</Label>
              <Input
                id="name"
                value={(nodeData.name as string) || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="可选的节点名称"
              />
            </div>

            {/* 模块特定配置 */}
            {renderModuleConfig()}

            {/* 高级配置 */}
            <div className="pt-4 border-t space-y-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                高级配置
              </h3>
              <div className="space-y-2">
                <Label htmlFor="timeout">超时时间 (毫秒)</Label>
                <NumberInput
                  id="timeout"
                  value={(nodeData.timeout as number) ?? 30000}
                  onChange={(v) => handleChange('timeout', v)}
                  defaultValue={30000}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeoutAction">运行超时后</Label>
                <Select
                  id="timeoutAction"
                  value={(nodeData.timeoutAction as string) || 'retry'}
                  onChange={(e) => handleChange('timeoutAction', e.target.value)}
                >
                  <option value="retry">重试</option>
                  <option value="skip">跳过该模块，继续执行</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {(nodeData.timeoutAction as string) === 'skip' 
                    ? '超时后跳过此模块，直接执行后续流程' 
                    : '超时后按重试次数进行重试'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryCount">重试次数</Label>
                <NumberInput
                  id="retryCount"
                  value={(nodeData.retryCount as number) ?? 0}
                  onChange={(v) => handleChange('retryCount', v)}
                  defaultValue={0}
                  min={0}
                  max={10}
                />
              </div>
            </div>

            {/* 变量使用提示 */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                💡 提示：在任意输入框中使用 <code className="bg-muted px-1 rounded">{'{变量名}'}</code> 来引用变量值
              </p>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}
