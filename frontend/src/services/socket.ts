import { io, Socket } from 'socket.io-client'
import { useWorkflowStore } from '@/store/workflowStore'
import type { LogLevel } from '@/types'

const SOCKET_URL = 'http://localhost:8000'

// 输入弹窗回调
type InputPromptCallback = (data: {
  requestId: string
  variableName: string
  title: string
  message: string
  defaultValue: string
  inputMode: 'single' | 'list'
}) => void

// 全局音频播放器（用于管理播放状态）
let currentAudio: HTMLAudioElement | null = null

// 数据行批量处理缓冲区
let dataRowBuffer: Record<string, unknown>[] = []
let dataRowFlushTimer: ReturnType<typeof setTimeout> | null = null
const DATA_ROW_FLUSH_INTERVAL = 100 // 100ms 批量刷新间隔

// 是否正在执行中（用于控制是否接收实时数据行）
let isExecuting = false

// 刷新数据行缓冲区
function flushDataRowBuffer() {
  if (dataRowBuffer.length > 0 && isExecuting) {
    const rows = dataRowBuffer
    dataRowBuffer = []
    useWorkflowStore.getState().addDataRows(rows)
  } else {
    dataRowBuffer = []
  }
  dataRowFlushTimer = null
}

class SocketService {
  private socket: Socket | null = null
  private connected = false
  private inputPromptCallback: InputPromptCallback | null = null

  // 设置输入弹窗回调
  setInputPromptCallback(callback: InputPromptCallback | null) {
    this.inputPromptCallback = callback
  }

  // 发送输入结果
  sendInputResult(requestId: string, value: string | null) {
    if (this.socket?.connected) {
      this.socket.emit('input_prompt_result', { requestId, value })
    }
  }

  // 发送语音合成结果
  sendTTSResult(requestId: string, success: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('tts_result', { requestId, success })
    }
  }

  // 发送JS脚本执行结果
  sendJsScriptResult(requestId: string, success: boolean, result?: unknown, error?: string) {
    if (this.socket?.connected) {
      this.socket.emit('js_script_result', { requestId, success, result, error })
    }
  }

  // 发送音乐播放结果
  sendPlayMusicResult(requestId: string, success: boolean, error?: string) {
    if (this.socket?.connected) {
      this.socket.emit('play_music_result', { requestId, success, error })
    }
  }

  // 播放音乐
  private playMusic(data: {
    requestId: string
    audioUrl: string
    waitForEnd: boolean
  }) {
    try {
      // 停止之前的音频
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }

      const audio = new Audio(data.audioUrl)
      currentAudio = audio

      if (data.waitForEnd) {
        // 等待播放完成
        audio.onended = () => {
          this.sendPlayMusicResult(data.requestId, true)
          currentAudio = null
        }
        audio.onerror = () => {
          this.sendPlayMusicResult(data.requestId, false, '音频加载或播放失败')
          currentAudio = null
        }
        audio.play().catch((err) => {
          this.sendPlayMusicResult(data.requestId, false, err.message)
          currentAudio = null
        })
      } else {
        // 不等待，立即返回成功
        audio.play().catch((err) => {
          console.error('播放音乐失败:', err)
        })
        this.sendPlayMusicResult(data.requestId, true)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.sendPlayMusicResult(data.requestId, false, errorMsg)
    }
  }

  // 执行语音合成
  private executeTTS(data: {
    requestId: string
    text: string
    lang: string
    rate: number
    pitch: number
    volume: number
  }) {
    try {
      const utterance = new SpeechSynthesisUtterance(data.text)
      utterance.lang = data.lang
      utterance.rate = data.rate
      utterance.pitch = data.pitch
      utterance.volume = data.volume

      utterance.onend = () => {
        this.sendTTSResult(data.requestId, true)
      }

      utterance.onerror = () => {
        this.sendTTSResult(data.requestId, false)
      }

      // 取消之前的语音
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      this.sendTTSResult(data.requestId, false)
    }
  }

  // 执行JS脚本
  private executeJsScript(data: {
    requestId: string
    code: string
    variables: Record<string, unknown>
  }) {
    try {
      // 创建一个包含用户代码的函数
      // 用户代码中应该定义 main(vars) 函数
      const wrappedCode = `
        ${data.code}
        
        // 调用 main 函数并返回结果
        if (typeof main === 'function') {
          return main(vars);
        } else {
          throw new Error('未找到 main 函数，请确保代码中定义了 main(vars) 函数');
        }
      `
      
      // 使用 Function 构造器创建函数，传入 vars 参数
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('vars', wrappedCode)
      const result = fn(data.variables)
      
      this.sendJsScriptResult(data.requestId, true, result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.sendJsScriptResult(data.requestId, false, undefined, errorMessage)
    }
  }

  connect() {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 120000,  // 连接超时 120秒
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.connected = true
      
      // 连接后同步 verboseLog 状态到后端
      const verboseLog = useWorkflowStore.getState().verboseLog
      this.socket?.emit('set_verbose_log', { enabled: verboseLog })
      
      // 重连后，如果之前是 running 状态，重置为 pending
      // 因为可能错过了 completed 事件
      const currentStatus = useWorkflowStore.getState().executionStatus
      if (currentStatus === 'running') {
        console.log('[Socket] 重连后检测到 running 状态，重置为 completed')
        useWorkflowStore.getState().setExecutionStatus('completed')
        useWorkflowStore.getState().setCurrentExecutingNode(null)
        isExecuting = false
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason)
      this.connected = false
      
      // 如果是执行中断开，标记需要在重连后检查状态
      if (isExecuting) {
        console.log('[Socket] 执行中断开连接，将在重连后重置状态')
      }
    })

    // 执行开始
    this.socket.on('execution:started', (data: { workflowId: string }) => {
      console.log('Execution started:', data.workflowId)
      isExecuting = true  // 开始执行，允许接收实时数据行
      useWorkflowStore.getState().setExecutionStatus('running')
      // 清空之前的数据
      useWorkflowStore.getState().clearCollectedData()
    })

    // 节点开始执行 - 已禁用以提升性能
    // this.socket.on('execution:node_start', (data: { workflowId: string; nodeId: string }) => {
    //   useWorkflowStore.getState().setCurrentExecutingNode(data.nodeId)
    // })

    // 节点执行完成
    this.socket.on('execution:node_complete', (_data: { 
      workflowId: string
      nodeId: string
      success: boolean 
    }) => {
      // 可以在这里更新节点状态
    })

    // 日志消息
    this.socket.on('execution:log', (data: {
      workflowId: string
      log: {
        id: string
        timestamp: string
        level: LogLevel
        nodeId?: string
        message: string
        duration?: number
        isUserLog?: boolean  // 是否是用户打印的日志（打印日志模块）
        isSystemLog?: boolean  // 是否是系统日志（流程开始/结束等）
      }
    }) => {
      const verboseLog = useWorkflowStore.getState().verboseLog
      const log = data.log
      
      // 简洁日志模式下，显示：用户日志、系统日志、错误日志
      if (!verboseLog && !log.isUserLog && !log.isSystemLog && log.level !== 'error') {
        return
      }
      
      useWorkflowStore.getState().addLog({
        level: log.level,
        message: log.message,
        nodeId: log.nodeId,
        duration: log.duration,
      })
    })

    // 变量更新
    this.socket.on('execution:variable_update', (data: {
      workflowId: string
      name: string
      value: unknown
    }) => {
      useWorkflowStore.getState().updateVariable(data.name, data.value)
    })

    // 输入弹窗请求
    this.socket.on('execution:input_prompt', (data: {
      requestId: string
      variableName: string
      title: string
      message: string
      defaultValue: string
      inputMode?: 'single' | 'list'
    }) => {
      if (this.inputPromptCallback) {
        this.inputPromptCallback({
          ...data,
          inputMode: data.inputMode || 'single'
        })
      }
    })

    // 语音合成请求
    this.socket.on('execution:tts_request', (data: {
      requestId: string
      text: string
      lang: string
      rate: number
      pitch: number
      volume: number
    }) => {
      this.executeTTS(data)
    })

    // JS脚本执行请求
    this.socket.on('execution:js_script', (data: {
      requestId: string
      code: string
      variables: Record<string, unknown>
    }) => {
      this.executeJsScript(data)
    })

    // 播放音乐请求
    this.socket.on('execution:play_music', (data: {
      requestId: string
      audioUrl: string
      waitForEnd: boolean
    }) => {
      this.playMusic(data)
    })

    // 执行完成
    this.socket.on('execution:completed', (data: {
      workflowId: string
      result: {
        status: string
        executedNodes: number
        failedNodes: number
        dataFile?: string
      }
      collectedData?: Record<string, unknown>[]
    }) => {
      console.log('[Socket] 收到 execution:completed 事件', data)
      
      // 先刷新缓冲区中的数据行（在设置 isExecuting = false 之前）
      if (dataRowBuffer.length > 0) {
        const rows = dataRowBuffer
        dataRowBuffer = []
        useWorkflowStore.getState().addDataRows(rows)
      }
      if (dataRowFlushTimer) {
        clearTimeout(dataRowFlushTimer)
        dataRowFlushTimer = null
      }
      
      // 停止接收实时数据行
      isExecuting = false
      
      const status = data.result.status as 'completed' | 'failed' | 'stopped'
      console.log('[Socket] 设置执行状态为:', status)
      useWorkflowStore.getState().setExecutionStatus(status)
      useWorkflowStore.getState().setCurrentExecutingNode(null)
      
      // 停止所有音频播放
      this.stopAllAudio()
      
      // 不再用完整数据覆盖，保持预览的20条数据即可
      // 完整数据通过"导出数据表"模块导出
      
      // 添加完成日志
      useWorkflowStore.getState().addLog({
        level: status === 'completed' ? 'success' : 'error',
        message: `执行${status === 'completed' ? '完成' : '失败'}，共执行 ${data.result.executedNodes} 个节点，失败 ${data.result.failedNodes} 个`,
      })
    })

    // 数据行收集 - 使用批量处理提升性能
    this.socket.on('execution:data_row', (data: {
      workflowId: string
      row: Record<string, unknown>
    }) => {
      // 只在执行中才接收实时数据行
      if (!isExecuting) return
      
      // 将数据行加入缓冲区
      dataRowBuffer.push(data.row)
      
      // 如果没有定时器，启动一个
      if (!dataRowFlushTimer) {
        dataRowFlushTimer = setTimeout(flushDataRowBuffer, DATA_ROW_FLUSH_INTERVAL)
      }
    })

    // 执行停止
    this.socket.on('execution:stopped', (_data: { workflowId: string }) => {
      isExecuting = false  // 停止接收实时数据行
      // 停止所有音频播放
      this.stopAllAudio()
      useWorkflowStore.getState().setExecutionStatus('stopped')
      useWorkflowStore.getState().setCurrentExecutingNode(null)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  isConnected() {
    return this.connected
  }

  // 停止所有音频播放
  private stopAllAudio() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    // 同时停止语音合成
    window.speechSynthesis.cancel()
  }

  // 发送停止执行请求
  stopExecution(workflowId: string) {
    // 停止所有音频
    this.stopAllAudio()
    if (this.socket?.connected) {
      this.socket.emit('execution_stop', { workflowId })
    }
  }

  // 设置详细日志开关状态（同步到后端）
  setVerboseLog(enabled: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('set_verbose_log', { enabled })
    }
  }
}

export const socketService = new SocketService()
