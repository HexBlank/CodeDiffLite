import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

function ThemeOptions() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuRadioItem key={value} value={value} className="py-2 md:py-1.5">
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/** 主题切换按钮：浅色 / 深色 / 跟随系统 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('h-9 w-9 shrink-0', className)} aria-label="切换主题">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** 放进已有下拉菜单里的"主题"子菜单 */
export function ThemeSubMenu({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn('py-2.5 md:py-1.5', className)}>
        <Icon className="mr-2 h-4 w-4" />
        主题
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <ThemeOptions />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
