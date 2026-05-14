import { useStore } from '../store'
import Select from './Select'

export default function SearchBar() {
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const filterStatus = useStore((s) => s.filterStatus)
  const setFilterStatus = useStore((s) => s.setFilterStatus)
  const filterFavorite = useStore((s) => s.filterFavorite)
  const setFilterFavorite = useStore((s) => s.setFilterFavorite)

  return (
    <div data-no-drag-select className='mt-6 mb-4 flex gap-3'>
      <div className='z-20 flex flex-shrink-0 gap-2'>
        <button
          onClick={() => setFilterFavorite(!filterFavorite)}
          className={`rounded-xl border p-2.5 transition-all ${
            filterFavorite
              ? 'border-yellow-400 bg-yellow-50 text-yellow-500 dark:bg-yellow-500/10'
              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:hover:bg-white/[0.06]'
          }`}
          title={filterFavorite ? '取消只看收藏' : '只看收藏'}
        >
          <svg
            className='h-5 w-5'
            fill={filterFavorite ? 'currentColor' : 'none'}
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            />
          </svg>
        </button>
        <div className='relative w-28'>
          <Select
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as any)}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '已完成', value: 'done' },
              { label: '生成中', value: 'running' },
              { label: '失败', value: 'error' },
            ]}
            className='rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm transition hover:bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-white/[0.08] dark:bg-gray-900 dark:hover:bg-white/[0.06]'
          />
        </div>
      </div>
      <div className='relative z-10 flex-1'>
        <svg
          className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
          />
        </svg>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type='text'
          placeholder='搜索提示词、参数...'
          className='w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-white/[0.08] dark:bg-gray-900'
        />
      </div>
    </div>
  )
}
