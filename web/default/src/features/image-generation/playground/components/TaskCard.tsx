import { useEffect, useState, useRef } from 'react'
import { DEFAULT_IMAGES_MODEL, DEFAULT_FAL_MODEL } from '../lib/apiProfiles'
import { getParamDisplay, ActualValueBadge } from '../lib/paramDisplay'
import { formatImageRatio } from '../lib/size'
import {
  useStore,
  ensureImageThumbnailCached,
  subscribeImageThumbnail,
  updateTaskInStore,
  retryTask,
} from '../store'
import type { TaskRecord } from '../types'
import { CodeIcon } from './icons'

interface Props {
  task: TaskRecord
  onReuse: () => void
  onEditOutputs: () => void
  onDelete: () => void
  onClick: (e: React.MouseEvent | React.TouchEvent) => void
  isSelected?: boolean
}

export default function TaskCard({
  task,
  onReuse,
  onEditOutputs,
  onDelete,
  onClick,
  isSelected,
}: Props) {
  const [thumbSrc, setThumbSrc] = useState<string>('')
  const [coverRatio, setCoverRatio] = useState<string>('')
  const [coverSize, setCoverSize] = useState<string>('')
  const [now, setNow] = useState(Date.now())
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeStartedSelected, setSwipeStartedSelected] = useState(false)
  const [swipeActionActive, setSwipeActionActive] = useState(false)
  const toggleTaskSelection = useStore((s) => s.toggleTaskSelection)
  const settings = useStore((s) => s.settings)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const swipeResetTimerRef = useRef<number | null>(null)
  const suppressClickUntilRef = useRef(0)
  const horizontalSwipeRef = useRef(false)

  const isTagScrollTarget = (target: EventTarget | null) => {
    return (
      target instanceof Element &&
      Boolean(target.closest('[data-tag-scroll-area]'))
    )
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTagScrollTarget(e.target)) {
      touchStartRef.current = null
      horizontalSwipeRef.current = false
      setIsSwiping(false)
      setSwipeOffset(0)
      setSwipeActionActive(false)
      return
    }

    if (swipeResetTimerRef.current != null) {
      window.clearTimeout(swipeResetTimerRef.current)
      swipeResetTimerRef.current = null
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    horizontalSwipeRef.current = false
    setSwipeStartedSelected(Boolean(isSelected))
    setSwipeActionActive(false)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTagScrollTarget(e.target)) return
    if (!touchStartRef.current) return
    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    const deltaY = e.touches[0].clientY - touchStartRef.current.y

    // 如果主要是水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      horizontalSwipeRef.current = true
      e.preventDefault()
      // 限制滑动距离，例如最大 60px
      const boundedOffset = Math.max(-60, Math.min(60, deltaX))
      setSwipeOffset(boundedOffset)
      setSwipeActionActive(Math.abs(deltaX) >= 40)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTagScrollTarget(e.target)) {
      touchStartRef.current = null
      horizontalSwipeRef.current = false
      setIsSwiping(false)
      setSwipeOffset(0)
      setSwipeActionActive(false)
      return
    }

    setIsSwiping(false)
    setSwipeOffset(0)

    if (!touchStartRef.current) return
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
    touchStartRef.current = null
    const isSwipeAction = horizontalSwipeRef.current && Math.abs(deltaX) > 40
    horizontalSwipeRef.current = false
    setSwipeActionActive(isSwipeAction)
    swipeResetTimerRef.current = window.setTimeout(() => {
      setSwipeActionActive(false)
      swipeResetTimerRef.current = null
    }, 220)

    // 如果是水平滑动，且垂直偏移较小，认为是滑动选择
    if (isSwipeAction) {
      suppressClickUntilRef.current = Date.now() + 350
      e.preventDefault()
      e.stopPropagation()
      toggleTaskSelection(task.id)
    }
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    horizontalSwipeRef.current = false
    setIsSwiping(false)
    setSwipeOffset(0)
    setSwipeActionActive(false)
  }

  useEffect(
    () => () => {
      if (swipeResetTimerRef.current != null) {
        window.clearTimeout(swipeResetTimerRef.current)
      }
    },
    []
  )

  // 定时更新运行中任务的计时
  useEffect(() => {
    if (
      task.status !== 'running' &&
      !(
        task.status === 'error' &&
        (task.falRecoverable || task.customRecoverable)
      )
    )
      return
    const id = setInterval(() => setNow(Date.now()), 1000)
    setNow(Date.now())
    return () => clearInterval(id)
  }, [task.customRecoverable, task.falRecoverable, task.status])

  // 加载缩略图
  useEffect(() => {
    setCoverRatio('')
    setCoverSize('')
    setThumbSrc('')

    let cancelled = false
    const imageId = task.outputImages?.[0]
    let unsubscribe: (() => void) | undefined

    const applyThumbnail = (thumbnail: {
      dataUrl: string
      width?: number
      height?: number
    }) => {
      if (cancelled) return
      setThumbSrc(thumbnail.dataUrl)
      if (thumbnail.width && thumbnail.height) {
        setCoverRatio(formatImageRatio(thumbnail.width, thumbnail.height))
        setCoverSize(`${thumbnail.width}×${thumbnail.height}`)
      }
    }

    if (imageId) {
      unsubscribe = subscribeImageThumbnail(imageId, applyThumbnail)
      ensureImageThumbnailCached(imageId)
        .then((thumbnail) => {
          if (cancelled || !thumbnail) return
          applyThumbnail(thumbnail)
        })
        .catch(() => {
          if (!cancelled) setThumbSrc('')
        })
    }

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [task.outputImages])

  const duration = (() => {
    let seconds: number
    if (
      task.status === 'running' ||
      task.falRecoverable ||
      task.customRecoverable
    ) {
      seconds = Math.floor((now - task.createdAt) / 1000)
    } else if (task.elapsed != null) {
      seconds = Math.floor(task.elapsed / 1000)
    } else {
      return '00:00'
    }
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
    const ss = String(seconds % 60).padStart(2, '0')
    return `${mm}:${ss}`
  })()
  const isSwipeReady = Math.abs(swipeOffset) >= 40
  const showSwipeAction = isSwipeReady || swipeActionActive
  const isFalReconnecting = task.status === 'error' && task.falRecoverable
  const isCustomReconnecting = task.status === 'error' && task.customRecoverable
  const showRunningTimer =
    task.status === 'running' || isFalReconnecting || isCustomReconnecting
  const swipeBgClass = showSwipeAction
    ? swipeStartedSelected
      ? 'bg-gray-500 dark:bg-gray-600'
      : 'bg-blue-500'
    : 'bg-gray-200 dark:bg-gray-700'

  const qualityDisplay = getParamDisplay(task, 'quality')
  const showQuality =
    task.params.quality !== 'auto' || qualityDisplay.isMismatch

  const sizeDisplay = getParamDisplay(task, 'size')
  const showSize = task.params.size !== 'auto' || sizeDisplay.isMismatch

  const formatDisplay = getParamDisplay(task, 'output_format')
  const showFormat =
    task.params.output_format !== 'png' || formatDisplay.isMismatch

  const nDisplay = getParamDisplay(task, 'n')
  const showN = task.params.n > 1 || nDisplay.isMismatch

  const defaultModelForProvider =
    task.apiProvider === 'fal' ? DEFAULT_FAL_MODEL : DEFAULT_IMAGES_MODEL
  const showModel = task.apiModel && task.apiModel !== defaultModelForProvider

  return (
    <div className='relative rounded-xl'>
      {/* 侧滑底图 */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center rounded-xl transition-opacity duration-200 ${
          isSwiping || swipeOffset || swipeActionActive
            ? 'opacity-100'
            : 'opacity-0'
        } ${swipeBgClass} ${
          swipeOffset > 0 ? 'justify-start pl-6' : 'justify-end pr-6'
        }`}
      >
        <svg
          className={`h-8 w-8 transition-transform duration-150 ${showSwipeAction ? 'scale-110 text-white' : 'scale-90 text-white/60'}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          {swipeStartedSelected && showSwipeAction ? (
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          ) : (
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={3}
              d='M5 13l4 4L19 7'
            />
          )}
        </svg>
      </div>

      <div
        className={`relative cursor-pointer overflow-hidden rounded-xl border bg-white duration-200 hover:shadow-lg dark:bg-gray-900 dark:hover:bg-gray-800/80 ${
          !isSwiping
            ? 'transition-[box-shadow,border-color,background-color,transform]'
            : 'transition-[box-shadow,border-color,background-color]'
        } ${
          task.status === 'running'
            ? 'generating border-blue-400'
            : isSelected
              ? 'border-blue-500 shadow-md ring-2 ring-blue-500/50'
              : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08] dark:hover:border-white/[0.18]'
        }`}
        style={{
          transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
        }}
        onClick={(e) => {
          if (Date.now() < suppressClickUntilRef.current) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          onClick(e)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {/* 选中时的角标 */}
        {isSelected && (
          <div className='absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-sm'>
            <svg
              className='h-3 w-3 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={3}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
        )}
        <div className='flex h-40'>
          {/* 左侧图片区域 */}
          <div className='relative flex h-full w-40 min-w-[10rem] flex-shrink-0 items-center justify-center overflow-hidden bg-gray-100 dark:bg-black/20'>
            {task.status === 'running' && (
              <div className='flex flex-col items-center gap-2'>
                <svg
                  className='h-8 w-8 animate-spin text-blue-400'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                  />
                </svg>
                <span className='text-xs text-gray-400 dark:text-gray-500'>
                  生成中...
                </span>
              </div>
            )}
            {task.status === 'error' && isFalReconnecting && (
              <div className='flex flex-col items-center gap-1 px-2'>
                <svg
                  className='h-7 w-7 text-yellow-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
                <span className='text-center text-xs leading-tight text-yellow-500'>
                  重连中
                </span>
              </div>
            )}
            {task.status === 'error' && !isFalReconnecting && (
              <div className='flex flex-col items-center gap-1 px-2'>
                <svg
                  className='h-7 w-7 text-red-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                <span className='text-center text-xs leading-tight text-red-400'>
                  失败
                </span>
              </div>
            )}
            {task.status === 'done' && thumbSrc && (
              <>
                <img
                  src={thumbSrc}
                  data-image-id={task.outputImages[0]}
                  className='saveable-image h-full w-full object-cover'
                  loading='lazy'
                  alt=''
                />
                {task.outputImages.length > 1 && (
                  <span className='absolute right-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white'>
                    {task.outputImages.length}
                  </span>
                )}
              </>
            )}
            {task.status === 'done' && !thumbSrc && (
              <svg
                className='h-8 w-8 text-gray-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
            )}
            {/* 运行中显示耗时，完成后显示封面图比例与分辨率标签 */}
            <div className='absolute top-1.5 left-1.5 flex items-center gap-1'>
              {showRunningTimer ||
              task.status !== 'done' ||
              !coverRatio ||
              !coverSize ? (
                <span className='flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm sm:text-xs'>
                  <svg
                    className='h-3 w-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  {duration}
                </span>
              ) : (
                <>
                  <span className='rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm sm:text-xs'>
                    {coverRatio}
                  </span>
                  <span className='rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm sm:text-xs'>
                    {coverSize}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 右侧信息区域 */}
          <div className='flex min-w-0 flex-1 flex-col p-3'>
            <div className='mb-2 min-h-0 flex-1 overflow-hidden'>
              <p className='line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300'>
                {task.prompt || '(无提示词)'}
              </p>
            </div>
            <div className='mt-auto flex flex-col gap-1.5'>
              {/* 参数与信息：横向滚动 */}
              <div
                data-tag-scroll-area
                className='hide-scrollbar mask-edge-r flex min-w-0 gap-1.5 overflow-x-auto pt-0.5 pr-2 whitespace-nowrap'
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onTouchCancel={(e) => e.stopPropagation()}
              >
                {/* API Name */}
                {(task.apiProfileName || task.apiProvider) && (
                  <span
                    className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300'
                    title={task.apiProfileName || task.apiProvider}
                  >
                    <CodeIcon className='h-3 w-3 flex-shrink-0 text-gray-400' />
                    <span className='max-w-[8rem] truncate'>
                      {task.apiProfileName || task.apiProvider}
                    </span>
                  </span>
                )}
                {/* Model */}
                {showModel && (
                  <span
                    className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300'
                    title={task.apiModel}
                  >
                    <svg
                      className='h-3 w-3 flex-shrink-0 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
                      />
                    </svg>
                    <span className='max-w-[8rem] truncate'>
                      {task.apiModel}
                    </span>
                  </span>
                )}
                {/* Mask */}
                {task.maskImageId && (
                  <span className='flex flex-shrink-0 items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'>
                    <svg
                      className='h-3 w-3'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                      />
                    </svg>
                    局部重绘
                  </span>
                )}
                {/* Params: only show if not default or mismatch */}
                {showQuality && (
                  <span className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/[0.04]'>
                    <span className='text-gray-400 dark:text-gray-500'>
                      质量
                    </span>
                    {qualityDisplay.isMismatch ? (
                      <ActualValueBadge
                        value={qualityDisplay.displayValue}
                        className='rounded-sm px-1'
                      />
                    ) : (
                      <span className='text-gray-600 dark:text-gray-300'>
                        {qualityDisplay.displayValue}
                      </span>
                    )}
                  </span>
                )}
                {showSize && (
                  <span className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/[0.04]'>
                    <span className='text-gray-400 dark:text-gray-500'>
                      尺寸
                    </span>
                    {sizeDisplay.isMismatch ? (
                      <ActualValueBadge
                        value={sizeDisplay.displayValue}
                        className='rounded-sm px-1'
                      />
                    ) : (
                      <span className='text-gray-600 dark:text-gray-300'>
                        {sizeDisplay.displayValue}
                      </span>
                    )}
                  </span>
                )}
                {showFormat && (
                  <span className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/[0.04]'>
                    <span className='text-gray-400 dark:text-gray-500'>
                      格式
                    </span>
                    {formatDisplay.isMismatch ? (
                      <ActualValueBadge
                        value={formatDisplay.displayValue}
                        className='rounded-sm px-1'
                      />
                    ) : (
                      <span className='text-gray-600 dark:text-gray-300'>
                        {formatDisplay.displayValue}
                      </span>
                    )}
                  </span>
                )}
                {showN && (
                  <span className='flex flex-shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/[0.04]'>
                    <span className='text-gray-400 dark:text-gray-500'>
                      数量
                    </span>
                    {nDisplay.isMismatch ? (
                      <ActualValueBadge
                        value={nDisplay.displayValue}
                        className='rounded-sm px-1'
                      />
                    ) : (
                      <span className='text-gray-600 dark:text-gray-300'>
                        {nDisplay.displayValue}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* 操作按钮 */}
              <div
                className='mt-0.5 flex w-full flex-shrink-0 items-center justify-between sm:w-auto sm:justify-end sm:gap-1'
                onClick={(e) => e.stopPropagation()}
              >
                {((task.status === 'error' && !isFalReconnecting) ||
                  settings.alwaysShowRetryButton) && (
                  <button
                    onClick={() => retryTask(task)}
                    className='rounded-md p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/30'
                    title='重试任务'
                  >
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() =>
                    updateTaskInStore(task.id, { isFavorite: !task.isFavorite })
                  }
                  className={`rounded-md p-1.5 transition ${
                    task.isFavorite
                      ? 'text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'
                      : 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-400 dark:hover:bg-yellow-500/10'
                  }`}
                  title={task.isFavorite ? '取消收藏' : '收藏记录'}
                >
                  <svg
                    className='h-4 w-4'
                    fill={task.isFavorite ? 'currentColor' : 'none'}
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
                <button
                  onClick={onReuse}
                  className='rounded-md p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/30'
                  title='复用配置'
                >
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
                    />
                  </svg>
                </button>
                <button
                  onClick={onEditOutputs}
                  className='rounded-md p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-500 disabled:opacity-30 dark:hover:bg-green-950/30'
                  title='编辑输出'
                  disabled={!task.outputImages?.length}
                >
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                    />
                  </svg>
                </button>
                <button
                  onClick={onDelete}
                  className='rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30'
                  title='删除记录'
                >
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
