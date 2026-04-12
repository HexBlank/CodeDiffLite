import { formatDistanceToNow } from '@/lib/date'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, GitBranch, MessageSquare } from 'lucide-react'
import type { SnippetListItem, Snippet } from '@/lib/api'
import { cn } from '@/lib/utils'

interface VersionPanelProps {
  root: Snippet | null
  descendants: SnippetListItem[]
  currentId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

export function VersionPanel({
  root,
  descendants,
  currentId,
  onSelect,
  isLoading = false,
}: VersionPanelProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        加载版本信息中...
      </div>
    )
  }

  if (!root) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        暂无版本信息
      </div>
    )
  }

  const hasDescendants = descendants.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">版本树</span>
        </div>
        {hasDescendants && (
          <Badge variant="secondary" className="text-xs">
            {descendants.length} 个修改
          </Badge>
        )}
      </div>

      {/* 版本列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* 根节点 (原始版本) */}
          <VersionItem
            id={root.id}
            depth={0}
            message={root.message || '原始版本'}
            createdAt={root.created_at}
            isActive={currentId === root.id}
            isRoot
            onClick={() => onSelect(root.id)}
          />

          {/* 衍生版本 */}
          {descendants.map((item) => (
            <VersionItem
              key={item.id}
              id={item.id}
              depth={item.depth}
              message={item.message}
              createdAt={item.created_at}
              codePreview={item.code_preview}
              isActive={currentId === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 底部提示 */}
      {!hasDescendants && (
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
          暂无其他人的修改，分享链接邀请他人协作
        </div>
      )}
    </div>
  )
}

interface VersionItemProps {
  id: string
  depth: number
  message: string | null
  createdAt: string
  codePreview?: string
  isActive?: boolean
  isRoot?: boolean
  onClick: () => void
}

function VersionItem({
  id,
  depth,
  message,
  createdAt,
  codePreview,
  isActive = false,
  isRoot = false,
  onClick,
}: VersionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md transition-colors',
        'hover:bg-accent/50',
        isActive && 'bg-accent border border-primary/30',
        !isActive && 'border border-transparent'
      )}
      style={{ paddingLeft: `${(depth * 12) + 12}px` }}
    >
      <div className="flex items-start gap-2">
        {/* 指示器 */}
        <div className="mt-1 shrink-0">
          {isRoot ? (
            <div className="w-2 h-2 rounded-full bg-primary" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {id.substring(0, 6)}
            </span>
            {isRoot && (
              <Badge variant="outline" className="text-[10px] py-0">
                原始
              </Badge>
            )}
          </div>

          {message && (
            <div className="flex items-center gap-1 mt-1 text-xs text-foreground">
              <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">{message}</span>
            </div>
          )}

          {codePreview && !message && (
            <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
              {codePreview}
            </div>
          )}

          <div className="mt-1 text-[10px] text-muted-foreground">
            {formatDistanceToNow(createdAt)}
          </div>
        </div>
      </div>
    </button>
  )
}
