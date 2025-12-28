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

// 条件判断配置
export function ConditionConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const conditionType = (data.conditionType as string) || 'variable'
  const isElementCondition = conditionType === 'element_exists' || conditionType === 'element_visible'
  const operator = (data.operator as string) || '=='
  const isUnaryOperator = operator === 'isEmpty' || operator === 'isNotEmpty'

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="conditionType">条件类型</Label>
        <Select
          id="conditionType"
          value={conditionType}
          onChange={(e) => onChange('conditionType', e.target.value)}
        >
          <option value="variable">变量比较</option>
          <option value="element_exists">元素存在</option>
          <option value="element_visible">元素可见</option>
        </Select>
      </div>
      {isElementCondition ? (
        renderSelectorInput('leftOperand', '元素选择器', '#element 或 .class')
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="leftOperand">左操作数</Label>
            <VariableInput
              value={(data.leftOperand as string) || ''}
              onChange={(v) => onChange('leftOperand', v)}
              placeholder="变量名或值，支持 {变量名}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="operator">运算符</Label>
            <Select
              id="operator"
              value={operator}
              onChange={(e) => onChange('operator', e.target.value)}
            >
              <option value="==">等于</option>
              <option value="!=">不等于</option>
              <option value=">">大于</option>
              <option value="<">小于</option>
              <option value="contains">包含</option>
              <option value="isEmpty">为空</option>
              <option value="isNotEmpty">不为空</option>
            </Select>
          </div>
          {!isUnaryOperator && (
            <div className="space-y-2">
              <Label htmlFor="rightOperand">右操作数</Label>
              <VariableInput
                value={(data.rightOperand as string) || ''}
                onChange={(v) => onChange('rightOperand', v)}
                placeholder="比较值，支持 {变量名}"
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

// 循环执行配置
export function LoopConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const loopType = (data.loopType as string) || 'count'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="loopType">循环类型</Label>
        <Select
          id="loopType"
          value={loopType}
          onChange={(e) => onChange('loopType', e.target.value)}
        >
          <option value="count">计数循环</option>
          <option value="range">范围循环</option>
          <option value="while">条件循环</option>
        </Select>
      </div>
      
      {loopType === 'count' && (
        <div className="space-y-2">
          <Label htmlFor="count">循环次数</Label>
          <VariableInput
            value={String(data.count ?? '')}
            onChange={(v) => {
              // 如果是空字符串或只包含变量引用，直接保存字符串
              if (v === '' || v.includes('{')) {
                onChange('count', v)
              } else {
                // 尝试解析为数字
                const num = parseInt(v)
                onChange('count', isNaN(num) ? v : num)
              }
            }}
            placeholder="循环次数，支持 {变量名}"
          />
        </div>
      )}
      
      {loopType === 'range' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="startValue">起始值</Label>
            <VariableInput
              value={String(data.startValue ?? '')}
              onChange={(v) => {
                if (v === '' || v.includes('{')) {
                  onChange('startValue', v)
                } else {
                  const num = parseInt(v)
                  onChange('startValue', isNaN(num) ? v : num)
                }
              }}
              placeholder="起始值，支持 {变量名}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endValue">结束值</Label>
            <VariableInput
              value={String(data.endValue ?? '')}
              onChange={(v) => {
                if (v === '' || v.includes('{')) {
                  onChange('endValue', v)
                } else {
                  const num = parseInt(v)
                  onChange('endValue', isNaN(num) ? v : num)
                }
              }}
              placeholder="结束值，支持 {变量名}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stepValue">步长</Label>
            <NumberInput
              id="stepValue"
              value={(data.stepValue as number) ?? 1}
              onChange={(v) => onChange('stepValue', v)}
              defaultValue={1}
            />
            <p className="text-xs text-muted-foreground">
              每次循环索引增加的值，默认为1
            </p>
          </div>
        </>
      )}
      
      {loopType === 'while' && (
        <div className="space-y-2">
          <Label htmlFor="condition">循环条件变量</Label>
          <VariableRefInput
            id="condition"
            value={(data.condition as string) || ''}
            onChange={(v) => onChange('condition', v)}
            placeholder="填写变量名，如: shouldContinue"
          />
          <p className="text-xs text-muted-foreground">
            直接填写变量名，变量值为真时继续循环
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="indexVariable">索引变量名</Label>
        <VariableNameInput
          id="indexVariable"
          value={(data.indexVariable as string) || 'loop_index'}
          onChange={(v) => onChange('indexVariable', v)}
          placeholder="如: loop_index"
        />
        <p className="text-xs text-muted-foreground">
          {loopType === 'range' 
            ? `循环时变量值从 ${(data.startValue as number) ?? 1} 到 ${(data.endValue as number) ?? 10}`
            : '循环时变量值从 0 开始递增'}
        </p>
      </div>
    </>
  )
}

// 遍历列表配置
export function ForeachConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dataSource">数据源变量</Label>
        <VariableRefInput
          id="dataSource"
          value={(data.dataSource as string) || ''}
          onChange={(v) => onChange('dataSource', v)}
          placeholder="填写变量名，如: myList"
        />
        <p className="text-xs text-muted-foreground">
          直接填写变量名，不需要加花括号
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="itemVariable">当前项变量名</Label>
        <VariableNameInput
          id="itemVariable"
          value={(data.itemVariable as string) || 'item'}
          onChange={(v) => onChange('itemVariable', v)}
          placeholder="如: item"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="indexVariable">索引变量名</Label>
        <VariableNameInput
          id="indexVariable"
          value={(data.indexVariable as string) || 'index'}
          onChange={(v) => onChange('indexVariable', v)}
          placeholder="如: index"
        />
      </div>
    </>
  )
}

// 定时执行配置
export function ScheduledTaskConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const scheduleType = (data.scheduleType as string) || 'datetime'

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="scheduleType">定时类型</Label>
        <Select
          id="scheduleType"
          value={scheduleType}
          onChange={(e) => onChange('scheduleType', e.target.value)}
        >
          <option value="datetime">指定时间</option>
          <option value="delay">延迟执行</option>
        </Select>
      </div>

      {scheduleType === 'datetime' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="targetDate">执行日期</Label>
            <Input
              id="targetDate"
              type="date"
              value={(data.targetDate as string) || ''}
              onChange={(e) => onChange('targetDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetTime">执行时间</Label>
            <Input
              id="targetTime"
              type="time"
              value={(data.targetTime as string) || ''}
              onChange={(e) => onChange('targetTime', e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            工作流将在指定的日期和时间开始执行后续模块
          </p>
        </>
      )}

      {scheduleType === 'delay' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="delayHours">延迟小时</Label>
            <NumberInput
              id="delayHours"
              value={(data.delayHours as number) ?? 0}
              onChange={(v) => onChange('delayHours', v)}
              defaultValue={0}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delayMinutes">延迟分钟</Label>
            <NumberInput
              id="delayMinutes"
              value={(data.delayMinutes as number) ?? 0}
              onChange={(v) => onChange('delayMinutes', v)}
              defaultValue={0}
              min={0}
              max={59}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delaySeconds">延迟秒数</Label>
            <NumberInput
              id="delaySeconds"
              value={(data.delaySeconds as number) ?? 0}
              onChange={(v) => onChange('delaySeconds', v)}
              defaultValue={0}
              min={0}
              max={59}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            从当前时间开始，延迟指定时间后执行后续模块
          </p>
        </>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
        <p className="text-xs text-blue-800">
          <strong>💡 使用说明：</strong><br />
          • 定时执行模块会阻塞工作流，直到指定时间到达<br />
          • 执行期间会显示倒计时<br />
          • 可以随时停止工作流取消等待
        </p>
      </div>
    </>
  )
}


// 子流程配置 - 从画布中选择子流程分组
import { useWorkflowStore } from '@/store/workflowStore'
import { Workflow, AlertCircle } from 'lucide-react'

export function SubflowConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  // 获取画布中所有的子流程分组
  const nodes = useWorkflowStore((state) => state.nodes)
  const subflowGroups = nodes.filter(
    (n) => n.type === 'groupNode' && n.data.isSubflow === true && n.data.subflowName
  )

  // 使用 subflowName 作为主要标识（而不是 ID，因为导入后 ID 会变）
  const selectedName = (data.subflowName as string) || ''
  const selectedGroup = subflowGroups.find((g) => g.data.subflowName === selectedName)

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="subflowName">选择子流程</Label>
        <Select
          id="subflowName"
          value={selectedName}
          onChange={(e) => {
            onChange('subflowName', e.target.value)
            // 同时保存 ID 用于当前会话的快速查找（但导入后会失效）
            const group = subflowGroups.find((g) => g.data.subflowName === e.target.value)
            onChange('subflowGroupId', group?.id || '')
          }}
        >
          <option value="">选择子流程...</option>
          {subflowGroups.map((group) => (
            <option key={group.id} value={group.data.subflowName as string}>
              📦 {(group.data.subflowName as string) || '未命名子流程'}
            </option>
          ))}
        </Select>
        {subflowGroups.length === 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            画布中没有子流程定义，请先创建
          </p>
        )}
      </div>

      {selectedGroup && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-800">
            <Workflow className="w-4 h-4" />
            <span className="text-sm font-medium">
              {(selectedGroup.data.subflowName as string) || '未命名子流程'}
            </span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">
            执行时将运行该子流程分组内的所有模块
          </p>
        </div>
      )}

      {!selectedGroup && selectedName && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            找不到名为「{selectedName}」的子流程，请检查是否已创建
          </p>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
        <p className="text-xs text-blue-800">
          <strong>💡 使用说明：</strong><br />
          • 子流程可以访问和修改主流程的变量<br />
          • 子流程内的模块按连线顺序执行<br />
          • 子流程执行完成后继续执行后续模块
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>📦 如何创建子流程：</strong><br />
          1. 从左侧拖入「分组」模块到画布<br />
          2. 在右侧配置面板开启「设为子流程」<br />
          3. 输入子流程名称<br />
          4. 将需要复用的模块放入分组内
        </p>
      </div>
    </>
  )
}
