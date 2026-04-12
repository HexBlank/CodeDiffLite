import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Share2,
  Loader2,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Lock,
} from "lucide-react";

import { LazyCodeEditor } from "@/components/editor/LazyEditor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, LANGUAGES, type LanguageValue } from "@/lib/api";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

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

  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<LanguageValue>("javascript");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 限制性分享状态
  const [restrictedShareDialogOpen, setRestrictedShareDialogOpen] = useState(false);
  const [restrictedSharePassword, setRestrictedSharePassword] = useState("");
  const [restrictedShareExpires, setRestrictedShareExpires] = useState("7");
  const [restrictedShareCreating, setRestrictedShareCreating] = useState(false);
  const [restrictedShareResult, setRestrictedShareResult] = useState<{
    share_token: string;
    share_url: string;
    has_password: boolean;
    expires_at: string | null;
  } | null>(null);
  const [restrictedShareCopied, setRestrictedShareCopied] = useState(false);

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

  const handleRestrictedShare = useCallback(() => {
    if (!code.trim()) {
      toast.error("代码不能为空", {
        description: "请输入一些代码后再分享",
      });
      return;
    }
    setRestrictedShareDialogOpen(true);
  }, [code]);

  const handleCreateRestrictedShare = async () => {
    setRestrictedShareCreating(true);
    try {
      // 先保存代码
      const saved = await api.share({ code, language });
      // 创建限制性分享
      const result = await api.createShare({
        snippet_id: saved.id,
        password: restrictedSharePassword || undefined,
        expires_days: restrictedShareExpires !== "never" ? parseInt(restrictedShareExpires) : undefined,
      });
      setRestrictedShareResult(result);
      toast.success("分享链接已创建");
    } catch (error: any) {
      toast.error("创建分享链接失败", {
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setRestrictedShareCreating(false);
    }
  };

  const handleCopyRestrictedShare = async () => {
    if (!restrictedShareResult) return;
    try {
      const fullUrl = `${window.location.origin}${restrictedShareResult.share_url}`;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fullUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setRestrictedShareCopied(true);
      toast.success("链接已复制");
      setTimeout(() => setRestrictedShareCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const handleCloseRestrictedShare = () => {
    setRestrictedSharePassword("");
    setRestrictedShareExpires("7");
    setRestrictedShareResult(null);
    setRestrictedShareDialogOpen(false);
  };

  const handleShare = useCallback(() => {
    if (!code.trim()) {
      toast.error("代码不能为空", {
        description: "请输入一些代码后再分享",
      });
      return;
    }
    shareMutation.mutate();
  }, [code, shareMutation]);

  const shareUrl = savedId ? `${window.location.origin}/${savedId}` : "";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for non-HTTPS
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const handleGoToSnippet = () => {
    if (savedId) {
      setShareDialogOpen(false);
      // 延迟导航，确保对话框先关闭
      setTimeout(() => {
        navigate(`/${savedId}`);
      }, 100);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-50 shrink-0 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="group w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <Code2 className="w-5 h-5 text-primary-foreground group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">CodeDiff</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 登录注册 */}
            <UserMenu />

            {/* 语言选择器 */}
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as LanguageValue)}
            >
              <SelectTrigger className="w-[140px] h-10 text-sm font-medium hover:bg-accent transition-colors">
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

            {/* 分享按钮 */}
            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="h-10 px-5 shadow-sm font-medium hover:bg-primary hover:shadow-md hover:-translate-y-px transition-all duration-300"
            >
              {shareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享代码
                </>
              )}
            </Button>

            {/* 限制性分享按钮 — 登录用户可用 */}
            {isLoggedIn && (
              <Button
                variant="outline"
                onClick={handleRestrictedShare}
                className="h-10 px-5 shadow-sm font-medium backdrop-blur-sm hover:bg-transparent hover:shadow-md hover:-translate-y-px transition-all duration-300"
              >
                <Lock className="w-4 h-4 mr-2" />
                私密分享
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-6 overflow-hidden animate-fade-up">
        {/* Editor */}
        <div className="flex-1 min-h-0 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl blur"></div>
          <div className="editor-wrapper relative h-full bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden glow shadow-sm transition-all duration-300 hover:shadow-md">
            <LazyCodeEditor
              value={code}
              onChange={setCode}
              language={language}
            />
          </div>
        </div>
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-foreground" />
              分享链接已生成
            </DialogTitle>
            <DialogDescription>
              复制链接发送给同学或老师，他们可以查看并修改你的代码
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* URL Input */}
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center bg-muted/50 rounded-lg px-3 py-2 border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={handleCopy}
                title="点击复制"
              >
                <span
                  className="flex-1 text-sm font-mono truncate"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                >
                  {shareUrl}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShareDialogOpen(false)}
              >
                继续编辑
              </Button>
              <Button className="flex-1" onClick={handleGoToSnippet}>
                查看页面
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restricted Share Dialog — 带配置选项的分享 */}
      <Dialog
        open={restrictedShareDialogOpen}
        onOpenChange={handleCloseRestrictedShare}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-foreground" />
              创建限制性分享
            </DialogTitle>
            <DialogDescription>
              创建独立链接，可设置密码保护和过期时间
            </DialogDescription>
          </DialogHeader>

          {restrictedShareResult ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  链接已生成！
                  {restrictedShareResult.has_password && " 🔒 受密码保护"}
                  {restrictedShareResult.expires_at &&
                    ` · 有效期至 ${new Date(restrictedShareResult.expires_at).toLocaleString("zh-CN")}`}
                  {!restrictedShareResult.has_password && !restrictedShareResult.expires_at && " 无访问限制"}
                </p>
              </div>

              {/* URL Input */}
              <div className="flex gap-2">
                <div
                  className="flex-1 flex items-center bg-muted/50 rounded-lg px-3 py-2 border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={handleCopyRestrictedShare}
                  title="点击复制"
                >
                  <span
                    className="flex-1 text-sm font-mono truncate"
                    style={{ userSelect: "none", WebkitUserSelect: "none" }}
                  >
                    {`${window.location.origin}${restrictedShareResult.share_url}`}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyRestrictedShare}
                  className="shrink-0"
                >
                  {restrictedShareCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={handleCloseRestrictedShare}
              >
                完成
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>访问密码（可选）</Label>
                <Input
                  type="password"
                  placeholder="留空则无需密码"
                  value={restrictedSharePassword}
                  onChange={(e) => setRestrictedSharePassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  设置密码后，访问者需要输入密码才能查看代码
                </p>
              </div>

              <div className="space-y-2">
                <Label>过期时间</Label>
                <Select value={restrictedShareExpires} onValueChange={setRestrictedShareExpires}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1天后过期</SelectItem>
                    <SelectItem value="7">7天后过期</SelectItem>
                    <SelectItem value="30">30天后过期</SelectItem>
                    <SelectItem value="never">永不过期</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseRestrictedShare}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handleCreateRestrictedShare} disabled={restrictedShareCreating}>
                  {restrictedShareCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建链接"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
