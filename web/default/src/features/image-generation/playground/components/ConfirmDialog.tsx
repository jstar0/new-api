import { useEffect, useState } from 'react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'
import { useStore } from '../store'
import { CopyIcon } from './icons'

function renderMessage(message: string) {
  return message.split(/(`[^`]+`|「[^」]+」)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className='rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-700 dark:bg-white/[0.06] dark:text-gray-200'
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    if (part.startsWith('「') && part.endsWith('」')) {
      return (
        <strong
          key={index}
          className='font-semibold text-gray-700 dark:text-gray-200'
        >
          {part}
        </strong>
      )
    }

    return part
  })
}

export default function ConfirmDialog() {
  const confirmDialog = useStore((s) => s.confirmDialog)
  const setConfirmDialog = useStore((s) => s.setConfirmDialog)
  const [canConfirm, setCanConfirm] = useState(true)

  useEffect(() => {
    const delay = confirmDialog?.minConfirmDelayMs ?? 0
    if (!confirmDialog || delay <= 0) {
      setCanConfirm(true)
      return
    }

    setCanConfirm(false)
    const timer = window.setTimeout(() => setCanConfirm(true), delay)
    return () => window.clearTimeout(timer)
  }, [confirmDialog])

  const handleClose = () => {
    if (!canConfirm) return
    setConfirmDialog(null)
  }

  const handleCancel = () => {
    confirmDialog?.cancelAction?.()
    handleClose()
  }

  useCloseOnEscape(Boolean(confirmDialog) && canConfirm, handleClose)
  usePreventBackgroundScroll(Boolean(confirmDialog))

  if (!confirmDialog) return null
  const isDestructive =
    confirmDialog.title.includes('删除') || confirmDialog.title.includes('清空')
  const confirmTone =
    confirmDialog.tone ?? (isDestructive ? 'danger' : undefined)
  const confirmClassName =
    confirmTone === 'warning'
      ? 'bg-orange-500 hover:bg-orange-600'
      : confirmTone === 'danger'
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-blue-500 hover:bg-blue-600'
  const confirmText =
    confirmDialog.confirmText ?? (isDestructive ? '确认删除' : '确认')
  const cancelText = confirmDialog.cancelText ?? '取消'

  return (
    <div
      data-no-drag-select
      className='fixed inset-0 z-[110] flex items-center justify-center p-4'
      onClick={handleClose}
    >
      <div className='animate-overlay-in absolute inset-0 bg-black/20 backdrop-blur-md dark:bg-black/40' />
      <div
        className='animate-confirm-in relative z-10 w-full max-w-sm rounded-3xl border border-white/50 bg-white/90 p-6 shadow-[0_8px_40px_rgb(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-gray-900/90 dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] dark:ring-white/10'
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className='mb-2 flex items-center gap-2 text-base font-bold text-gray-800 dark:text-gray-100'>
          {confirmDialog.icon === 'info' && (
            <svg
              className='h-5 w-5 shrink-0 text-blue-500'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              viewBox='0 0 24 24'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4' />
              <path d='M12 8h.01' />
            </svg>
          )}
          {confirmDialog.icon === 'copy' && (
            <CopyIcon className='h-5 w-5 shrink-0 text-blue-500' />
          )}
          {confirmDialog.title}
        </h3>
        <p
          className={`mb-6 text-sm leading-relaxed whitespace-pre-line text-gray-500 dark:text-gray-400 ${confirmDialog.messageAlign === 'center' ? 'text-center' : ''}`}
        >
          {renderMessage(confirmDialog.message)}
        </p>
        <div className='flex gap-2'>
          {confirmDialog.showCancel !== false && (
            <button
              onClick={handleCancel}
              className='flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.06]'
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (!canConfirm) return
              confirmDialog.action()
              setConfirmDialog(null)
            }}
            disabled={!canConfirm}
            className={`flex-1 rounded-lg py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
