export default function Header() {
  return (
    <header
      data-no-drag-select
      className='safe-area-top sticky top-16 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/[0.08] dark:bg-gray-950/90'
    >
      <div className='safe-area-x mx-auto flex h-14 max-w-7xl items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='truncate text-[17px] font-semibold tracking-normal text-gray-900 sm:text-lg dark:text-gray-100'>
            图片生成
          </h1>
        </div>
        <div className='shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'>
          TurboAPI
        </div>
      </div>
    </header>
  )
}
