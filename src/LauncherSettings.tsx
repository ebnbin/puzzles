import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHead } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { forgetEverything } from './engine/saves'
import { openManual } from './DocViewer'
import { docHref, useLang, useStrings } from './i18n'
import { setArrows, useArrows } from './useArrows'

const ARMED_MS = 3000

const ROW = 'flex items-center gap-4 py-[0.85rem]'

function SettingText({
  title,
  hint,
  danger,
  hintRole,
  className,
}: {
  title: string
  hint: string
  danger?: boolean
  hintRole?: 'status'
  className?: string
}) {
  return (
    <span className={cn('min-w-0 flex-1', className)}>
      <span
        className={cn(
          'block text-base font-medium',
          danger && 'text-destructive',
        )}
      >
        {title}
      </span>
      <span
        role={hintRole}
        className="mt-0.5 block text-xs font-normal text-muted-foreground"
      >
        {hint}
      </span>
    </span>
  )
}

export default function LauncherSettings({ onClose }: { onClose: () => void }) {
  const t = useStrings()
  const [lang] = useLang()
  const arrows = useArrows()

  const [asking, setAsking] = useState(false)
  const timer = useRef(0)
  const byKeyboard = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = (event: React.MouseEvent) => {
    window.clearTimeout(timer.current)
    // click 的 detail===0 即键盘触发(Enter/Space 合成的 click):键盘用户不设
    // 3 秒 disarm 倒计时并把焦点移给确认键——键盘追不上一个会自己消失的目标。
    byKeyboard.current = event.detail === 0
    setAsking(true)
    if (byKeyboard.current) return
    timer.current = window.setTimeout(() => setAsking(false), ARMED_MS)
  }

  const erase = () => {
    window.clearTimeout(timer.current)
    forgetEverything()
    window.location.reload()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-[30rem]">
        <DialogHead title={t.settings.title} close={t.play.close} />

        <div className="divide-y divide-border">
          <label className={ROW}>
            <SettingText title={t.settings.arrows} hint={t.settings.arrowsHint} />
            <Switch
              checked={arrows}
              onCheckedChange={(checked) => setArrows(checked)}
            />
          </label>

          <a
            className={cn(ROW, 'group text-foreground no-underline')}
            href={docHref(lang)}
            onClick={(e) => {
              e.preventDefault()
              onClose()
              openManual()
            }}
          >
            <SettingText
              title={t.settings.manual}
              hint={t.settings.manualHint}
              className="[@media(hover:hover)]:group-hover:text-primary"
            />
            <Icon name="caret" size={18} className="shrink-0 text-faint" />
          </a>

          {asking ? (
            <div className={ROW}>
              <SettingText
                title={t.settings.erase}
                hint={t.settings.eraseWhat}
                hintRole="status"
                danger
              />
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={erase}
                autoFocus={byKeyboard.current}
              >
                {t.settings.eraseConfirm}
              </Button>
            </div>
          ) : (
            <button type="button" className={cn(ROW, 'w-full text-left')} onClick={arm}>
              <SettingText
                title={t.settings.erase}
                hint={t.settings.eraseHint}
                danger
              />
              <Icon name="trash" size={18} className="shrink-0 text-destructive" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
