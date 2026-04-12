import { useRef, useState } from 'react'
import { Download, Palette, X, Check, Loader2, Eye, QrCode, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface CodeShareImageProps {
  code: string
  language: string
  message?: string | null
  currentUrl?: string
  isOpen: boolean
  onClose: () => void
}

const THEMES = [
  {
    id: 'dark',
    name: '深色',
    bg: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
    codeBg: '#1e1e2e',
    textColor: '#cdd6f4',
    commentColor: '#6c7086',
    keywordColor: '#cba6f7',
    stringColor: '#a6e3a1',
    numberColor: '#fab387',
    functionColor: '#89b4fa',
    accentColor: '#f38ba8',
    isDark: true,
  },
  {
    id: 'light',
    name: '浅色',
    bg: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
    codeBg: '#ffffff',
    textColor: '#1f2937',
    commentColor: '#6b7280',
    keywordColor: '#7c3aed',
    stringColor: '#059669',
    numberColor: '#d97706',
    functionColor: '#2563eb',
    accentColor: '#dc2626',
    isDark: false,
  },
  {
    id: 'ocean',
    name: '海洋',
    bg: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    codeBg: '#082f49',
    textColor: '#e0f2fe',
    commentColor: '#7dd3fc',
    keywordColor: '#38bdf8',
    stringColor: '#4ade80',
    numberColor: '#fbbf24',
    functionColor: '#60a5fa',
    accentColor: '#f472b6',
    isDark: true,
  },
  {
    id: 'sunset',
    name: '日落',
    bg: 'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
    codeBg: '#431407',
    textColor: '#ffedd5',
    commentColor: '#fdba74',
    keywordColor: '#fca5a5',
    stringColor: '#86efac',
    numberColor: '#fcd34d',
    functionColor: '#93c5fd',
    accentColor: '#f9a8d4',
    isDark: true,
  },
  {
    id: 'forest',
    name: '森林',
    bg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
    codeBg: '#052e16',
    textColor: '#dcfce7',
    commentColor: '#86efac',
    keywordColor: '#a7f3d0',
    stringColor: '#fde047',
    numberColor: '#fdba74',
    functionColor: '#6ee7b7',
    accentColor: '#fca5a5',
    isDark: true,
  },
  {
    id: 'purple',
    name: '紫霞',
    bg: 'linear-gradient(135deg, #581c87 0%, #7e22ce 100%)',
    codeBg: '#3b0764',
    textColor: '#f3e8ff',
    commentColor: '#c4b5fd',
    keywordColor: '#ddd6fe',
    stringColor: '#86efac',
    numberColor: '#fcd34d',
    functionColor: '#a78bfa',
    accentColor: '#f9a8d4',
    isDark: true,
  },
]

// 简单的代码高亮 (二阶段渲染机制，避免正则冲突)
function highlightCode(code: string, _language: string, theme: typeof THEMES[0]) {
  // 转义 HTML
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const placeholders: Record<string, string> = {}
  let counter = 0

  const store = (value: string) => {
    const key = `__MARKER_${counter++}__`
    placeholders[key] = value
    return key
  }

  // 1. Strings
  highlighted = highlighted.replace(/(".*?"|'.*?'|`.*?`)/g, (match) => {
    return store(`<span style="color: ${theme.stringColor}">${match}</span>`)
  })

  // 2. Comments
  highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, (match) => {
    return store(`<span style="color: ${theme.commentColor}; font-style: italic">${match}</span>`)
  })

  // 3. Keywords
  const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'class', 'def', 'print', 'from', 'as', 'try', 'except', 'async', 'await', 'lambda']
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  highlighted = highlighted.replace(keywordRegex, (match) => {
    return store(`<span style="color: ${theme.keywordColor}; font-weight: 600">${match}</span>`)
  })

  // 4. Numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, (match) => {
    return store(`<span style="color: ${theme.numberColor}">${match}</span>`)
  })

  // 5. Functions
  highlighted = highlighted.replace(/([a-zA-Z_$][\w$]*)(?=\()/g, (match) => {
    return store(`<span style="color: ${theme.functionColor}">${match}</span>`)
  })

  // 还原所有占位符
  let previous = ''
  while (previous !== highlighted) {
    previous = highlighted
    for (const [key, value] of Object.entries(placeholders)) {
      highlighted = highlighted.replace(key, value)
    }
  }

  return highlighted
}

export function CodeShareImage({ code, language, message, currentUrl, isOpen, onClose }: CodeShareImageProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [showQR, setShowQR] = useState(true)
  const [showLink, setShowLink] = useState(true)
  const [customMessage, setCustomMessage] = useState(message || '代码片段')

  if (!isOpen) return null

  // 限制代码行数
  const maxLines = 30
  const lines = code.split('\n')
  const displayCode = lines.slice(0, maxLines).join('\n')
  const hasMore = lines.length > maxLines

  const handleDownload = async () => {
    if (!cardRef.current) return
    
    setIsGenerating(true)
    try {
      // html-to-image supports modern css like oklch natively through browser rendering
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        skipFonts: false,
      })
      
      const link = document.createElement('a')
      link.download = `codediff-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      
      toast.success('图片已下载')
    } catch (error) {
      toast.error('生成图片失败')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const highlightedCode = highlightCode(displayCode, language, selectedTheme)
  
  // 根据主题确定文字颜色
  const headerTextColor = selectedTheme.isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'
  const footerTextColor = selectedTheme.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  const headerBadgeBg = selectedTheme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const headerBadgeText = selectedTheme.isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
  const logoBg = selectedTheme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const logoText = selectedTheme.isDark ? '#fff' : '#000'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">生成分享图</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 主题选择和选项 */}
        <div className="border-b px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
            <Palette className="h-4 w-4 shrink-0 text-gray-400" />
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                  selectedTheme.id === theme.id
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-gray-300"
                  style={{ background: theme.codeBg }}
                />
                {theme.name}
                {selectedTheme.id === theme.id && (
                  <Check className="ml-1 h-3 w-3" />
                )}
              </button>
            ))}
          </div>
          
          {/* 显示选项 */}
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showHeader" 
                  checked={showHeader}
                  onCheckedChange={(checked) => setShowHeader(checked as boolean)}
                />
                <Label htmlFor="showHeader" className="text-sm cursor-pointer flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  显示顶部信息
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showFooter" 
                  checked={showFooter}
                  onCheckedChange={(checked) => setShowFooter(checked as boolean)}
                />
                <Label htmlFor="showFooter" className="text-sm cursor-pointer flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  显示底部信息
                </Label>
              </div>
              {currentUrl && showFooter && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showQR" 
                      checked={showQR}
                      onCheckedChange={(checked) => setShowQR(checked as boolean)}
                    />
                    <Label htmlFor="showQR" className="text-sm cursor-pointer flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5" />
                      携带二维码
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showLink" 
                      checked={showLink}
                      onCheckedChange={(checked) => setShowLink(checked as boolean)}
                    />
                    <Label htmlFor="showLink" className="text-sm cursor-pointer flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      携带链接
                    </Label>
                  </div>
                </>
              )}
            </div>
            
            {/* 底部文案修改 */}
            {showFooter && (
              <div className="flex items-center gap-2 max-w-sm">
                <Label htmlFor="customMessage" className="text-sm border-r pr-2 shrink-0 border-gray-200">
                  底部文案
                </Label>
                <Input 
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="h-7 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  placeholder="可输入底部说明文字..."
                />
              </div>
            )}
          </div>
        </div>

        {/* 预览区域 */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-gray-950">
          <div className="mx-auto max-w-2xl">
            {/* 分享卡片 */}
            <div
              ref={cardRef}
              className="overflow-hidden rounded-xl shadow-2xl"
              style={{ background: selectedTheme.bg }}
            >
              {/* 卡片头部 */}
              {showHeader && (
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur"
                      style={{ backgroundColor: logoBg }}
                    >
                      <span className="text-lg font-bold" style={{ color: logoText }}>C</span>
                    </div>
                    <span className="font-semibold" style={{ color: headerTextColor }}>CodeDiff</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="backdrop-blur hover:opacity-80"
                    style={{ backgroundColor: headerBadgeBg, color: headerBadgeText }}
                  >
                    {language}
                  </Badge>
                </div>
              )}

              {/* 代码区域 */}
              <div className={`px-6 ${showHeader ? 'pb-4' : 'py-4'}`}>
                <div
                  className="rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
                  style={{ 
                    backgroundColor: selectedTheme.codeBg,
                    color: selectedTheme.textColor,
                  }}
                >
                  <pre 
                    className="m-0"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                  {hasMore && (
                    <div 
                      className="mt-2 text-center text-xs italic opacity-60"
                      style={{ color: selectedTheme.commentColor }}
                    >
                      ... 还有 {lines.length - maxLines} 行代码 ...
                    </div>
                  )}
                </div>
              </div>

              {/* 底部信息 / 二维码 */}
              {showFooter && (
                <div 
                  className="flex items-center justify-between border-t border-white/10 px-6 py-4"
                  style={{ borderColor: selectedTheme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <div className="flex-1 pr-4">
                    {customMessage && (
                      <div className="text-sm font-medium mb-1" style={{ color: footerTextColor }}>
                        {customMessage}
                      </div>
                    )}
                    {currentUrl && showLink && (
                      <div className="text-xs font-mono opacity-60" style={{ color: footerTextColor }}>
                        {currentUrl}
                      </div>
                    )}
                  </div>
                  {currentUrl && showQR && (
                    <div className="shrink-0 p-1.5 rounded-lg bg-white/10 backdrop-blur" style={{ backgroundColor: selectedTheme.isDark ? 'rgba(255,255,255,0.95)' : 'transparent' }}>
                      <QRCodeSVG 
                        value={currentUrl} 
                        size={48} 
                        level="M" 
                        includeMargin={false}
                        fgColor={selectedTheme.isDark ? '#000000' : selectedTheme.textColor}
                        bgColor="transparent"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 shrink-0">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            下载图片
          </Button>
        </div>
      </div>
    </div>
  )
}
