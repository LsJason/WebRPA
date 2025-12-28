import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { VariableInput } from '@/components/ui/variable-input'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useEffect } from 'react'
import type { NodeData } from '@/store/workflowStore'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

// 连接数据库配置
export function DbConnectConfig({ data, onChange }: ConfigProps) {
  const { config } = useGlobalConfigStore()
  
  // 首次加载时填充全局默认配置
  useEffect(() => {
    if (!data.host && config.database?.host) {
      onChange('host', config.database.host)
    }
    if (!data.port && config.database?.port) {
      onChange('port', config.database.port)
    }
    if (!data.user && config.database?.user) {
      onChange('user', config.database.user)
    }
    if (!data.password && config.database?.password) {
      onChange('password', config.database.password)
    }
    if (!data.database && config.database?.database) {
      onChange('database', config.database.database)
    }
    if (!data.charset && config.database?.charset) {
      onChange('charset', config.database.charset)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>主机地址</Label>
          <VariableInput
            value={(data.host as string) || 'localhost'}
            onChange={(v) => onChange('host', v)}
            placeholder="localhost"
          />
        </div>
        <div className="space-y-2">
          <Label>端口</Label>
          <NumberInput
            value={(data.port as number) || 3306}
            onChange={(v) => onChange('port', v)}
            defaultValue={3306}
            min={1}
            max={65535}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>用户名</Label>
        <VariableInput
          value={(data.user as string) || ''}
          onChange={(v) => onChange('user', v)}
          placeholder="root"
        />
      </div>
      
      <div className="space-y-2">
        <Label>密码</Label>
        <VariableInput
          value={(data.password as string) || ''}
          onChange={(v) => onChange('password', v)}
          placeholder="数据库密码"
        />
      </div>
      
      <div className="space-y-2">
        <Label>数据库名</Label>
        <VariableInput
          value={(data.database as string) || ''}
          onChange={(v) => onChange('database', v)}
          placeholder="要连接的数据库名"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>字符集</Label>
          <Input
            value={(data.charset as string) || 'utf8mb4'}
            onChange={(e) => onChange('charset', e.target.value)}
            placeholder="utf8mb4"
          />
        </div>
        <div className="space-y-2">
          <Label>连接名称</Label>
          <Input
            value={(data.connectionName as string) || 'default'}
            onChange={(e) => onChange('connectionName', e.target.value)}
            placeholder="default"
          />
          <p className="text-xs text-muted-foreground">用于区分多个数据库连接</p>
        </div>
      </div>
    </div>
  )
}

// 查询数据配置
export function DbQueryConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>SQL语句</Label>
        <textarea
          value={(data.sql as string) || ''}
          onChange={(e) => onChange('sql', e.target.value)}
          placeholder="SELECT * FROM users WHERE id = 1"
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background font-mono"
        />
        <p className="text-xs text-muted-foreground">支持使用 {'{变量名}'} 引用变量</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果保存到变量</Label>
        <Input
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="queryResult"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="singleRow"
          checked={(data.singleRow as boolean) || false}
          onChange={(e) => onChange('singleRow', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="singleRow" className="cursor-pointer">只返回第一行</Label>
      </div>
    </div>
  )
}

// 执行SQL配置
export function DbExecuteConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>SQL语句</Label>
        <textarea
          value={(data.sql as string) || ''}
          onChange={(e) => onChange('sql', e.target.value)}
          placeholder="CREATE TABLE / ALTER TABLE / DROP TABLE ..."
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background font-mono"
        />
        <p className="text-xs text-muted-foreground">可执行任意SQL语句，支持 {'{变量名}'}</p>
      </div>
      
      <div className="space-y-2">
        <Label>影响行数保存到变量</Label>
        <Input
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="affectedRows"
        />
      </div>
    </div>
  )
}

// 插入数据配置
export function DbInsertConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>插入数据 (JSON格式)</Label>
        <textarea
          value={typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('data', parsed)
            } catch {
              onChange('data', e.target.value)
            }
          }}
          placeholder={'{\n  "name": "{用户名}",\n  "email": "test@example.com"\n}'}
          className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border bg-background font-mono"
        />
        <p className="text-xs text-muted-foreground">键值对格式，值支持 {'{变量名}'}</p>
      </div>
      
      <div className="space-y-2">
        <Label>插入ID保存到变量</Label>
        <Input
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="lastInsertId"
        />
      </div>
    </div>
  )
}

// 更新数据配置
export function DbUpdateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>更新数据 (JSON格式)</Label>
        <textarea
          value={typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('data', parsed)
            } catch {
              onChange('data', e.target.value)
            }
          }}
          placeholder={'{\n  "name": "新名称",\n  "status": 1\n}'}
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background font-mono"
        />
      </div>
      
      <div className="space-y-2">
        <Label>WHERE条件</Label>
        <VariableInput
          value={(data.where as string) || ''}
          onChange={(v) => onChange('where', v)}
          placeholder="id = 1"
        />
        <p className="text-xs text-muted-foreground">不含WHERE关键字，支持 {'{变量名}'}</p>
      </div>
      
      <div className="space-y-2">
        <Label>影响行数保存到变量</Label>
        <Input
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="affectedRows"
        />
      </div>
    </div>
  )
}

// 删除数据配置
export function DbDeleteConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>WHERE条件 (必填)</Label>
        <VariableInput
          value={(data.where as string) || ''}
          onChange={(v) => onChange('where', v)}
          placeholder="id = {userId}"
        />
        <p className="text-xs text-amber-600">⚠️ 必须指定条件，防止误删全表数据</p>
      </div>
      
      <div className="space-y-2">
        <Label>影响行数保存到变量</Label>
        <Input
          value={(data.variableName as string) || ''}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="deletedRows"
        />
      </div>
    </div>
  )
}

// 关闭连接配置
export function DbCloseConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <Input
          value={(data.connectionName as string) || 'default'}
          onChange={(e) => onChange('connectionName', e.target.value)}
          placeholder="default"
        />
        <p className="text-xs text-muted-foreground">关闭指定名称的数据库连接</p>
      </div>
    </div>
  )
}
