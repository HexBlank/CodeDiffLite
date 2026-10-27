import { useState, useCallback, lazy, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Share2, Loader2, Code2, Lock } from "lucide-react";

import { LazyCodeEditor } from "@/components/editor/LazyEditor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RestrictedShareDialog, ShareLinkDialog } from "@/components/ShareDialogs";
import { api, LANGUAGES, type LanguageValue } from "@/lib/api";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useEditorFocused } from "@/hooks/use-editor-focus";
import { useIsTouch } from "@/hooks/use-mobile";

const EditorKeyboardBar = lazy(() =>
  import("@/components/editor/EditorKeyboardBar").then((m) => ({ default: m.EditorKeyboardBar }))
);

const DEFAULT_CODE = `// 👋 欢迎使用 CodeDiff

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
`;

export function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const editorFocused = useEditorFocused();
  const isTouch = useIsTouch();

  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<LanguageValue>("javascript");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [restrictedShareOpen, setRestrictedShareOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const shareMutation = useMutation({
    mutationFn: () => api.share({ code, language }),
    onSuccess: (data) => {
      setSavedId(data.id);
      setShareDialogOpen(true);
    },
    onError: (error) => {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    },
  });

  const ensureCode = useCallback(() => {
    if (!code.trim()) {
      toast.error("代码不能为空", {
        description: "请输入一些代码后再分享",
      });
      return false;
    }
    return true;
  }, [code]);

  const handleShare = useCallback(() => {
    if (ensureCode()) {
      shareMutation.mutate();
    }
  }, [ensureCode, shareMutation]);

  const handleRestrictedShare = useCallback(() => {
    if (ensureCode()) {
      setRestrictedShareOpen(true);
    }
  }, [ensureCode]);

  const shareUrl = savedId ? `${window.location.origin}/${savedId}` : "";

  const handleGoToSnippet = () => {
    if (savedId) {
      setShareDialogOpen(false);
      // 延迟导航，确保对话框先关闭
      setTimeout(() => {
        navigate(`/${savedId}`);
      }, 100);
    }
  };

  const shareButtonContent = shareMutation.isPending ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      生成中...
    </>
  ) : (
    <>
      <Share2 className="w-4 h-4 mr-2" />
      分享代码
    </>
  );

  return (
    <div className="h-[var(--app-height,100dvh)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass border-b border-border/50 z-40 shrink-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-3 md:px-4 h-12 md:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Code2 className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <h1 className="font-semibold text-base md:text-lg tracking-tight">CodeDiff</h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* 语言选择器 */}
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as LanguageValue)}
            >
              <SelectTrigger
                aria-label="代码语言"
                className="w-[112px] md:w-[140px] h-9 md:h-10 text-xs md:text-sm font-medium hover:bg-accent transition-colors"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 私密分享（桌面端；登录用户可用） */}
            {isLoggedIn && (
              <Button
                variant="outline"
                onClick={handleRestrictedShare}
                className="hidden md:inline-flex h-10 px-4 font-medium"
              >
                <Lock className="w-4 h-4 mr-2" />
                私密分享
              </Button>
            )}

            {/* 分享按钮（桌面端） */}
            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="hidden md:inline-flex h-10 px-5 shadow-sm font-medium"
            >
              {shareButtonContent}
            </Button>

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-2 md:px-4 md:py-6 overflow-hidden animate-fade-up">
        <div className="editor-wrapper flex-1 min-h-0 bg-card/50 glow">
          <LazyCodeEditor
            value={code}
            onChange={setCode}
            language={language}
          />
        </div>
      </main>

      {/* 触摸设备编辑代码时：软键盘上方显示辅助按键栏 */}
      {isTouch && editorFocused && (
        <Suspense fallback={null}>
          <EditorKeyboardBar />
        </Suspense>
      )}

      {/* 移动端底部操作栏：编辑代码（软键盘弹出）时隐藏 */}
      {!editorFocused && (
        <div className="md:hidden shrink-0 border-t border-border/50 bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex gap-2">
          {isLoggedIn && (
            <Button variant="outline" className="h-11 gap-2" onClick={handleRestrictedShare}>
              <Lock className="w-4 h-4" />
              私密分享
            </Button>
          )}
          <Button className="h-11 flex-1" onClick={handleShare} disabled={shareMutation.isPending}>
            {shareButtonContent}
          </Button>
        </div>
      )}

      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={shareUrl}
        title="分享链接已生成"
        description="复制链接发送给同学或老师，他们可以查看并修改你的代码"
        viewLabel="查看页面"
        onView={handleGoToSnippet}
      />

      <RestrictedShareDialog
        open={restrictedShareOpen}
        onOpenChange={setRestrictedShareOpen}
        getSnippetId={async () => (await api.share({ code, language })).id}
      />
    </div>
  );
}
