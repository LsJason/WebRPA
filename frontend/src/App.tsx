import { useEffect } from 'react'
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor'
import { InputPromptDialog } from '@/components/workflow/InputPromptDialog'
import { socketService } from '@/services/socket'

function App() {
  useEffect(() => {
    // 连接WebSocket
    socketService.connect()
    
    return () => {
      socketService.disconnect()
    }
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <WorkflowEditor />
      <InputPromptDialog />
    </div>
  )
}

export default App
