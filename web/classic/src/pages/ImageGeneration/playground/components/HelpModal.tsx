import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'

interface HelpModalProps {
  onClose: () => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const isMobile = useIsMobile()
  const modalRef = useRef<HTMLDivElement>(null)
  useCloseOnEscape(true, onClose)
  usePreventBackgroundScroll(true, modalRef)

  return createPortal(
    <div
      data-no-drag-select
      className='fixed inset-0 z-[100] flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div className='animate-overlay-in absolute inset-0 bg-black/30 backdrop-blur-sm' />
      <div
        ref={modalRef}
        className='animate-modal-in custom-scrollbar relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-white/50 bg-white/95 p-5 shadow-2xl ring-1 ring-black/5 dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-5 flex items-center justify-between gap-4'>
          <h3 className='flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100'>
            <svg
              className='h-5 w-5 text-blue-500'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              viewBox='0 0 24 24'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' />
              <path d='M12 17h.01' />
            </svg>
            操作指南
          </h3>
          <div className='flex items-center gap-3'>
            <button
              onClick={onClose}
              className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-200'
              aria-label='关闭'
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>

        <div className='custom-scrollbar mb-6 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 text-sm text-gray-600 dark:text-gray-300'>
          {isMobile ? (
            <>
              <section>
                <h4 className='mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200'>
                  <svg
                    className='h-4 w-4 text-gray-400 dark:text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 12h16M4 18h7'
                    />
                  </svg>
                  多选记录
                </h4>
                <div className='space-y-4'>
                  <p>
                    在历史记录卡片上
                    <strong className='font-medium text-blue-500 dark:text-blue-400'>
                      左右滑动
                    </strong>
                    即可选中或取消选中该卡片。
                  </p>
                </div>
              </section>
              <section>
                <h4 className='mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200'>
                  <svg
                    className='h-4 w-4 text-gray-400 dark:text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  批量操作
                </h4>
                <div className='space-y-4'>
                  <p>
                    选中一条或多条记录后，页面底部会出现操作栏，支持
                    <strong className='font-medium text-gray-500 dark:text-gray-400'>
                      取消选择
                    </strong>
                    、
                    <strong className='font-medium text-blue-500 dark:text-blue-400'>
                      全选当前可见记录
                    </strong>
                    、
                    <strong className='font-medium text-yellow-500 dark:text-yellow-400'>
                      批量收藏
                    </strong>
                    、
                    <strong className='font-medium text-green-500 dark:text-green-400'>
                      批量下载
                    </strong>
                    ，和
                    <strong className='font-medium text-red-500 dark:text-red-400'>
                      批量删除
                    </strong>
                    。
                  </p>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h4 className='mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200'>
                  <svg
                    className='h-4 w-4 text-gray-400 dark:text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 12h16M4 18h7'
                    />
                  </svg>
                  多选记录
                </h4>
                <div className='space-y-4'>
                  <ul className='list-disc space-y-2 pl-4'>
                    <li>
                      使用鼠标在空白处
                      <strong className='font-medium text-blue-500 dark:text-blue-400'>
                        拖拽框选
                      </strong>
                      。
                    </li>
                    <li>
                      按住{' '}
                      <kbd className='rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-sans text-xs dark:border-gray-700 dark:bg-gray-800'>
                        Ctrl
                      </kbd>{' '}
                      或{' '}
                      <kbd className='rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-sans text-xs dark:border-gray-700 dark:bg-gray-800'>
                        ⌘
                      </kbd>{' '}
                      并点击卡片，可添加或移除单项。
                    </li>
                    <li>再次框选已选中的卡片会将其取消选中。</li>
                    <li>点击卡片外任意空白处可取消所有选择。</li>
                  </ul>
                </div>
              </section>
              <section>
                <h4 className='mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200'>
                  <svg
                    className='h-4 w-4 text-gray-400 dark:text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  批量操作
                </h4>
                <div className='space-y-4'>
                  <p>
                    选中一条或多条记录后，页面底部会出现操作栏，支持
                    <strong className='font-medium text-gray-500 dark:text-gray-400'>
                      取消选择
                    </strong>
                    、
                    <strong className='font-medium text-blue-500 dark:text-blue-400'>
                      全选当前可见记录
                    </strong>
                    、
                    <strong className='font-medium text-yellow-500 dark:text-yellow-400'>
                      批量收藏
                    </strong>
                    、
                    <strong className='font-medium text-green-500 dark:text-green-400'>
                      批量下载
                    </strong>
                    ，和
                    <strong className='font-medium text-red-500 dark:text-red-400'>
                      批量删除
                    </strong>
                    。
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        <div className='flex justify-center border-t border-gray-200 pt-4 dark:border-white/[0.08]'>
          <div className='flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400'>
            <svg
              className='h-5 w-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 6v6l4 2'
              />
              <circle cx='12' cy='12' r='9' strokeWidth={2} />
            </svg>
            TurboAPI 图片生成
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
