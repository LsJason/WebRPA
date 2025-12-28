import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, BookOpen, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { documents } from './documents'
import { documentContents } from './contents'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { DocumentationDialogProps } from './types'

export function DocumentationDialog({ isOpen, onClose }: DocumentationDialogProps) {
  const [selectedDoc, setSelectedDoc] = useState('getting-started')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 切换文档时滚动到顶部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
      setShowScrollTop(false)
    }
  }, [selectedDoc])

  // 监听滚动显示返回顶部按钮
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setShowScrollTop(scrollContainerRef.current.scrollTop > 300)
    }
  }

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  if (!isOpen) return null
  
  const content = documentContents[selectedDoc] || ''
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white text-black rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">教学文档</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        
        <div className="flex-1 flex overflow-hidden rounded-b-lg">
          <div className="w-64 border-r bg-gray-50 flex flex-col rounded-bl-lg">
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-500 mb-3">文档目录</h3>
              <div className="space-y-1">
                {documents.map(doc => {
                  const Icon = doc.icon
                  return (
                    <button
                      key={doc.id}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border',
                        selectedDoc === doc.id 
                          ? 'bg-blue-100 text-blue-700 border-blue-200' 
                          : 'hover:bg-gray-100 text-gray-700 border-transparent hover:border-gray-200'
                      )}
                      onClick={() => setSelectedDoc(doc.id)}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{doc.title}</div>
                        <div className="text-xs text-gray-500 truncate">{doc.description}</div>
                      </div>
                      {selectedDoc === doc.id && <ChevronRight className="w-4 h-4 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t text-xs text-gray-400 text-center shrink-0">
              © 2026 青云制作_彭明航 版权所有
            </div>
          </div>
          
          <div className="flex-1 relative">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto"
            >
              <div className="p-8">
                <MarkdownRenderer content={content} />
              </div>
            </div>
            
            {/* 返回顶部按钮 */}
            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="absolute bottom-6 right-6 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                title="返回顶部"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
