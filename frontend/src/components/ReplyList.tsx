import { ChevronRight } from 'lucide-react'
import type { SnippetListItem } from '@/lib/api'
import { formatDistanceToNow } from '@/lib/date'

/** 原作者收到的修改版本列表 */
export function ReplyList({ replies, onSelect }: { replies: SnippetListItem[]; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {replies.map((reply) => (
        <ReplyCard key={reply.id} reply={reply} onClick={() => onSelect(reply.id)} />
      ))}
    </div>
  )
}

// 回复卡片组件
function ReplyCard({ reply, onClick }: { reply: SnippetListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-secondary/50 hover:border-primary/30 transition-all group card-interactive"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{reply.id.substring(0, 6)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(reply.created_at)}
        </span>
      </div>

      {reply.message ? (
        <p className="text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {reply.message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground font-mono line-clamp-2">
          {reply.code_preview}
        </p>
      )}

      <div className="flex items-center gap-1 mt-2 text-xs text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        查看修改
        <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  )
}
