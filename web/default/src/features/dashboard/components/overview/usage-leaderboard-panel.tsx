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
import type { UsageLeaderboardPeriod } from '@/features/dashboard/types'
import { PanelWrapper } from '../ui/panel-wrapper'

const USAGE_LEADERBOARD_REFRESH_INTERVAL = 15 * 60 * 1000

const USAGE_LEADERBOARD_PERIODS: Array<{
  value: UsageLeaderboardPeriod
  label: string
}> = [
  { value: 'day', label: 'Daily Ranking' },
  { value: 'week', label: 'Weekly Ranking' },
  { value: 'all', label: 'All-time Ranking' },
]

function getRankClassName(rank: number): string {
  if (rank === 1) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (rank === 2) return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
  if (rank === 3) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
  return 'bg-muted text-muted-foreground'
}

export function UsageLeaderboardPanel() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<UsageLeaderboardPeriod>('day')
  const usageLeaderboardQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'usage-leaderboard', period],
    queryFn: () => getUsageLeaderboard(10, period),
    refetchInterval: USAGE_LEADERBOARD_REFRESH_INTERVAL,
    staleTime: USAGE_LEADERBOARD_REFRESH_INTERVAL,
  })

  const items = usageLeaderboardQuery.data?.data ?? []

  return (
    <PanelWrapper
      title={
        <span className='inline-flex items-center gap-2'>
          <Trophy className='text-primary size-4' />
          {t('Token Usage Leaderboard')}
        </span>
      }
      description={t(
        'Top users by token consumption, refreshed every 15 minutes'
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-16'>{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead className='text-right'>{t('Consumed Tokens')}</TableHead>
            <TableHead className='hidden text-right sm:table-cell'>
              {t('Consumed Quota')}
            </TableHead>
            <TableHead className='hidden text-right md:table-cell'>
              {t('Request Count')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
                {formatNumber(item.consume_tokens)}
              </TableCell>
              <TableCell className='text-muted-foreground hidden text-right tabular-nums sm:table-cell'>
                {formatQuota(item.consume_quota)}
              </TableCell>
              <TableCell className='text-muted-foreground hidden text-right tabular-nums md:table-cell'>
                {formatNumber(item.request_count)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PanelWrapper>
  )
}
