import { useState } from 'react'
import { useStore } from '../store'
import ViewportTooltip from './ViewportTooltip'

export default function Header() {
  const setShowSettings = useStore((s) => s.setShowSettings)
  const [settingsTooltipVisible, setSettingsTooltipVisible] = useState(false)

  return (
    <header
      data-no-drag-select
      className='safe-area-top sticky top-16 z-30 border-b border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-950'
    >
      <div className='safe-area-x mx-auto flex h-14 max-w-7xl items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='truncate text-[17px] font-semibold tracking-normal text-gray-900 sm:text-lg dark:text-gray-100'>
            图片生成
          </h1>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <div className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'>
            默认 TurboAPI
          </div>
          <span
            className='relative inline-flex'
            onMouseEnter={() => setSettingsTooltipVisible(true)}
            onMouseLeave={() => setSettingsTooltipVisible(false)}
            onFocus={() => setSettingsTooltipVisible(true)}
            onBlur={() => setSettingsTooltipVisible(false)}
          >
            <button
              type='button'
              onClick={() => setShowSettings(true)}
              className='flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-300 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10 dark:hover:text-sky-200'
              aria-label='连接设置'
            >
              <svg
                className='h-4.5 w-4.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2}
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M4 21v-7' />
                <path d='M4 10V3' />
                <path d='M12 21v-9' />
                <path d='M12 8V3' />
                <path d='M20 21v-5' />
                <path d='M20 12V3' />
                <path d='M2 14h4' />
                <path d='M10 8h4' />
                <path d='M18 16h4' />
              </svg>
            </button>
            <ViewportTooltip
              visible={settingsTooltipVisible}
              className='whitespace-nowrap'
            >
              连接设置
            </ViewportTooltip>
          </span>
        </div>
      </div>
    </header>
  )
}
