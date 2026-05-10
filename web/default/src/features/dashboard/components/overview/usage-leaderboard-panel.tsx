import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getUsageLeaderboard } from '@/features/dashboard/api'
import type {
  UsageLeaderboardItem,
  UsageLeaderboardPeriod,
} from '@/features/dashboard/types'
import { PanelWrapper } from '../ui/panel-wrapper'

const USAGE_LEADERBOARD_REFRESH_INTERVAL = 15 * 60 * 1000

const USAGE_LEADERBOARD_PERIODS: Array<{
  value: UsageLeaderboardPeriod
  label: string
}> = [
  { value: 'day', label: 'Daily Ranking' },
  { value: 'week', label: 'Weekly Ranking' },
  { value: 'month', label: 'Monthly Ranking' },
]

const USAGE_LEADERBOARD_PODIUM_ORDER = [2, 1, 3] as const

function getRankClassName(rank: number): string {
  if (rank === 1) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (rank === 2) return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
  if (rank === 3) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
  return 'bg-muted text-muted-foreground'
}

function getPodiumMeta(rank: number) {
  if (rank === 1) {
    return {
      title: 'Quota Champion',
      note: 'Highest quota usage this period',
      className:
        'border-amber-200 bg-amber-50/80 dark:border-amber-400/30 dark:bg-amber-400/10 md:min-h-44',
      badgeClassName: 'bg-amber-500 text-white shadow-amber-500/25',
      valueClassName: 'text-amber-700 dark:text-amber-300',
    }
  }
  if (rank === 2) {
    return {
      title: 'Power Contributor',
      note: 'Steady high-value usage',
      className:
        'border-slate-200 bg-slate-50/80 dark:border-slate-400/30 dark:bg-slate-400/10 md:min-h-36',
      badgeClassName: 'bg-slate-500 text-white shadow-slate-500/20',
      valueClassName: 'text-slate-700 dark:text-slate-300',
    }
  }
  return {
    title: 'Rising Spender',
    note: 'Still climbing this period',
    className:
      'border-orange-200 bg-orange-50/80 dark:border-orange-400/30 dark:bg-orange-400/10 md:min-h-36',
    badgeClassName: 'bg-orange-500 text-white shadow-orange-500/20',
    valueClassName: 'text-orange-700 dark:text-orange-300',
  }
}

function getLeaderboardItemKey(item: UsageLeaderboardItem): string {
  return item.user_id != null && item.user_id > 0
    ? `user:${item.user_id}`
    : `rank:${item.rank}:${item.display_name}`
}

function getUsageRewardRateText(rank: number): string {
  if (rank === 1) return '5%'
  if (rank === 2) return '4%'
  if (rank === 3) return '3%'
  if (rank >= 4 && rank <= 10) return '1%'
  return '-'
}

export function UsageLeaderboardPanel() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<UsageLeaderboardPeriod>('day')
  const usageLeaderboardQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'usage-leaderboard', period],
    queryFn: () => getUsageLeaderboard(10, period),
    refetchInterval: USAGE_LEADERBOARD_REFRESH_INTERVAL,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const items = usageLeaderboardQuery.data?.data ?? []
  const podiumItems = USAGE_LEADERBOARD_PODIUM_ORDER.map((rank) =>
    items.find((item) => item.rank === rank)
  ).filter((item): item is UsageLeaderboardItem => Boolean(item))
  const podiumItemKeys = new Set(podiumItems.map(getLeaderboardItemKey))
  const tableItems = items.filter(
    (item) => item.rank > 3 && !podiumItemKeys.has(getLeaderboardItemKey(item))
  )

  return (
    <PanelWrapper
      title={
        <span className='inline-flex items-center gap-2'>
          <Trophy className='text-primary size-4' />
          {t('额度消耗排行榜')}
        </span>
      }
      description={t(
        '奖励机制：每日 00:00 按日榜结算，第1名5%、第2名4%、第3名3%、第4-10名1%，发放到奖励额度并优先抵扣'
      )}
      loading={usageLeaderboardQuery.isLoading}
      empty={!usageLeaderboardQuery.isLoading && items.length === 0}
      emptyMessage={t('No usage records yet')}
      headerActions={
        <Tabs
          value={period}
          onValueChange={(value) => setPeriod(value as UsageLeaderboardPeriod)}
        >
          <TabsList className='h-8'>
            {USAGE_LEADERBOARD_PERIODS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className='px-2.5 text-xs'
              >
                {t(item.label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {podiumItems.length > 0 && (
        <div className='mb-4 grid gap-3 md:grid-cols-3 md:items-end'>
          {podiumItems.map((item) => {
            const meta = getPodiumMeta(item.rank)
            return (
              <div
                key={`podium-${item.rank}-${item.display_name}`}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-3 py-4 text-center shadow-xs',
                  meta.className
                )}
              >
                <div
                  className={cn(
                    'mb-2 flex size-11 items-center justify-center rounded-full text-sm font-bold shadow-lg',
                    meta.badgeClassName
                  )}
                >
                  #{item.rank}
                </div>
                <div className='max-w-40 truncate text-sm font-semibold'>
                  {item.display_name}
                </div>
                <div
                  className={cn(
                    'mt-1 text-xs font-medium',
                    meta.valueClassName
                  )}
                >
                  {t(meta.title)}
                </div>
                <div className='mt-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium'>
                  {t('日榜奖励')} {getUsageRewardRateText(item.rank)}
                </div>
                <div className='text-muted-foreground mt-1 text-xs'>
                  {t(meta.note)}
                </div>
                <div
                  className={cn(
                    'mt-3 text-xl font-semibold tabular-nums',
                    meta.valueClassName
                  )}
                >
                  {formatQuota(item.consume_quota)}
                </div>
                <div className='text-muted-foreground text-xs'>
                  {t('Consumed Quota')}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className='mx-auto w-full max-w-3xl'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-16'>{t('Rank')}</TableHead>
              <TableHead>{t('User')}</TableHead>
              <TableHead className='text-right'>
                {t('Consumed Quota')}
              </TableHead>
              <TableHead className='text-right'>{t('日榜奖励')}</TableHead>
              <TableHead className='hidden text-right md:table-cell'>
                {t('Request Count')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableItems.map((item) => (
              <TableRow key={`${item.rank}-${item.display_name}`}>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold',
                      getRankClassName(item.rank)
                    )}
                  >
                    {item.rank}
                  </span>
                </TableCell>
                <TableCell>
                  <div className='max-w-56 truncate font-medium'>
                    {item.display_name}
                  </div>
                </TableCell>
                <TableCell className='text-right font-medium tabular-nums'>
                  {formatQuota(item.consume_quota)}
                </TableCell>
                <TableCell className='text-right font-medium'>
                  {getUsageRewardRateText(item.rank)}
                </TableCell>
                <TableCell className='text-muted-foreground hidden text-right tabular-nums md:table-cell'>
                  {formatNumber(item.request_count)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PanelWrapper>
  )
}
