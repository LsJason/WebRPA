import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 全局默认配置
export interface GlobalConfig {
  // AI大脑模块默认配置
  ai: {
    apiUrl: string
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
  }
  // 发送邮件模块默认配置
  email: {
    senderEmail: string
    authCode: string
    smtpServer: string
    smtpPort: number
  }
  // 本地工作流文件夹配置
  workflow: {
    localFolder: string
  }
  // 数据库默认配置
  database: {
    host: string
    port: number
    user: string
    password: string
    database: string
    charset: string
  }
}

interface GlobalConfigState {
  config: GlobalConfig
  updateAIConfig: (config: Partial<GlobalConfig['ai']>) => void
  updateEmailConfig: (config: Partial<GlobalConfig['email']>) => void
  updateWorkflowConfig: (config: Partial<GlobalConfig['workflow']>) => void
  updateDatabaseConfig: (config: Partial<GlobalConfig['database']>) => void
  resetConfig: () => void
}

const defaultConfig: GlobalConfig = {
  ai: {
    apiUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
  },
  email: {
    senderEmail: '',
    authCode: '',
    smtpServer: 'smtp.qq.com',
    smtpPort: 465,
  },
  workflow: {
    localFolder: '',  // 空字符串表示使用默认路径
  },
  database: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
    charset: 'utf8mb4',
  },
}

export const useGlobalConfigStore = create<GlobalConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      updateAIConfig: (aiConfig) => {
        set({
          config: {
            ...get().config,
            ai: { ...get().config.ai, ...aiConfig },
          },
        })
      },

      updateEmailConfig: (emailConfig) => {
        set({
          config: {
            ...get().config,
            email: { ...get().config.email, ...emailConfig },
          },
        })
      },

      updateWorkflowConfig: (workflowConfig) => {
        set({
          config: {
            ...get().config,
            workflow: { ...(get().config.workflow || defaultConfig.workflow), ...workflowConfig },
          },
        })
      },

      updateDatabaseConfig: (databaseConfig) => {
        set({
          config: {
            ...get().config,
            database: { ...(get().config.database || defaultConfig.database), ...databaseConfig },
          },
        })
      },

      resetConfig: () => {
        set({ config: defaultConfig })
      },
    }),
    {
      name: 'minghang-waf-global-config',
      // 数据迁移：确保旧数据兼容新结构
      merge: (persistedState, currentState) => {
        const persisted = persistedState as GlobalConfigState
        return {
          ...currentState,
          config: {
            ...defaultConfig,
            ...persisted?.config,
            workflow: persisted?.config?.workflow || defaultConfig.workflow,
            database: persisted?.config?.database || defaultConfig.database,
          },
        }
      },
    }
  )
)
