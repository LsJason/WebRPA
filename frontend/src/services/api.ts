const API_BASE = 'http://localhost:8000/api'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '请求失败' }))
      return { error: error.detail || '请求失败' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '网络错误' }
  }
}

export const workflowApi = {
  // 创建工作流
  create: (workflow: {
    name: string
    nodes: unknown[]
    edges: unknown[]
    variables?: unknown[]
  }) => request<{ id: string }>('/workflows', {
    method: 'POST',
    body: JSON.stringify(workflow),
  }),

  // 获取工作流列表
  list: () => request<Array<{
    id: string
    name: string
    nodeCount: number
    createdAt: string
    updatedAt: string
  }>>('/workflows'),

  // 获取单个工作流
  get: (id: string) => request<{
    id: string
    name: string
    nodes: unknown[]
    edges: unknown[]
    variables: unknown[]
  }>(`/workflows/${id}`),

  // 更新工作流
  update: (id: string, data: {
    name?: string
    nodes?: unknown[]
    edges?: unknown[]
    variables?: unknown[]
  }) => request(`/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // 删除工作流
  delete: (id: string) => request(`/workflows/${id}`, {
    method: 'DELETE',
  }),

  // 执行工作流
  execute: (id: string, options?: { headless?: boolean }) => request(`/workflows/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),

  // 停止执行
  stop: (id: string) => request(`/workflows/${id}/stop`, {
    method: 'POST',
  }),

  // 获取执行状态
  getStatus: (id: string) => request<{
    status: string
    executedNodes: number
    failedNodes: number
    dataFile?: string
  }>(`/workflows/${id}/status`),

  // 导入工作流
  import: (data: unknown) => request<{ id: string }>('/workflows/import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 导出工作流
  export: (id: string) => request(`/workflows/${id}/export`),

  // 下载数据
  downloadData: (id: string) => {
    window.open(`${API_BASE}/workflows/${id}/data`, '_blank')
  },
}

// 元素选择器API
export const elementPickerApi = {
  // 启动元素选择器（URL可选，为空时使用当前页面）
  start: (url?: string) => request<{ message: string; status: string }>('/element-picker/start', {
    method: 'POST',
    body: JSON.stringify({ url: url || null }),
  }),

  // 停止元素选择器
  stop: () => request<{ message: string; status: string }>('/element-picker/stop', {
    method: 'POST',
  }),

  // 获取选中的元素（单选模式）
  getSelected: () => request<{
    selected: boolean
    active: boolean
    element?: {
      selector: string
      originalSelector: string
      tagName: string
      text: string
      attributes: Record<string, string>
      rect: { x: number; y: number; width: number; height: number }
    }
  }>('/element-picker/selected'),

  // 获取相似元素选择结果
  getSimilar: () => request<{
    selected: boolean
    active: boolean
    similar?: {
      pattern: string
      count: number
      indices: number[]
      minIndex: number
      maxIndex: number
      selector1: string
      selector2: string
    }
  }>('/element-picker/similar'),

  // 获取状态
  getStatus: () => request<{ status: string }>('/element-picker/status'),
}

// Excel文件资源API
export const dataAssetApi = {
  // 上传Excel文件
  upload: async (file: File): Promise<ApiResponse<{
    id: string
    name: string
    originalName: string
    size: number
    uploadedAt: string
    sheetNames: string[]
  }>> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API_BASE}/data-assets/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '上传失败' }))
        return { error: error.detail || '上传失败' }
      }
      
      const data = await response.json()
      return { data }
    } catch (error) {
      return { error: error instanceof Error ? error.message : '网络错误' }
    }
  },

  // 获取所有Excel文件资源
  list: () => request<Array<{
    id: string
    name: string
    originalName: string
    size: number
    uploadedAt: string
    sheetNames: string[]
  }>>('/data-assets'),

  // 删除Excel文件资源
  delete: (id: string) => request(`/data-assets/${id}`, {
    method: 'DELETE',
  }),

  // 读取Excel数据
  read: (params: {
    fileId: string
    sheetName?: string
    readMode: 'cell' | 'row' | 'column' | 'range'
    cellAddress?: string
    rowIndex?: number
    columnIndex?: number
    startCell?: string
    endCell?: string
  }) => request<{
    data: unknown
    type: string
  }>('/data-assets/read', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 预览Excel数据
  preview: (fileId: string, sheet?: string) => request<{
    data: string[][]
    totalRows: number
    totalCols: number
    previewRows: number
    previewCols: number
  }>(`/data-assets/${fileId}/preview${sheet ? `?sheet=${encodeURIComponent(sheet)}` : ''}`),
}

// 自动化浏览器API
export const browserApi = {
  // 打开浏览器
  open: (url?: string) => request<{ message: string; status: string }>('/browser/open', {
    method: 'POST',
    body: JSON.stringify({ url: url || 'about:blank' }),
  }),

  // 关闭浏览器
  close: () => request<{ message: string; status: string }>('/browser/close', {
    method: 'POST',
  }),

  // 获取状态
  getStatus: () => request<{ status: string; isOpen: boolean; pickerActive: boolean }>('/browser/status'),

  // 导航到URL
  navigate: (url: string) => request<{ message: string; url: string }>('/browser/navigate', {
    method: 'POST',
    body: JSON.stringify({ url }),
  }),

  // 启动元素选择器
  startPicker: () => request<{ message: string; status: string; hint: string }>('/browser/picker/start', {
    method: 'POST',
  }),

  // 停止元素选择器
  stopPicker: () => request<{ message: string; status: string }>('/browser/picker/stop', {
    method: 'POST',
  }),

  // 获取选中的单个元素
  getSelectedElement: () => request<{
    selected: boolean
    element?: {
      selector: string
      tagName: string
      text: string
      attributes: Record<string, string>
      rect: { x: number; y: number; width: number; height: number }
    }
  }>('/browser/picker/selected'),

  // 获取选中的相似元素
  getSimilarElements: () => request<{
    selected: boolean
    similar?: {
      pattern: string
      count: number
      indices: number[]
      minIndex: number
      maxIndex: number
    }
  }>('/browser/picker/similar'),
}

// 系统API
export const systemApi = {
  // 选择文件夹
  selectFolder: (title?: string, initialDir?: string) => 
    request<{ success: boolean; path: string | null; message?: string; error?: string }>('/system/select-folder', {
      method: 'POST',
      body: JSON.stringify({ title, initialDir }),
    }),

  // 选择文件
  selectFile: (title?: string, initialDir?: string, fileTypes?: Array<[string, string]>) => 
    request<{ success: boolean; path: string | null; message?: string; error?: string }>('/system/select-file', {
      method: 'POST',
      body: JSON.stringify({ title, initialDir, fileTypes }),
    }),
}
