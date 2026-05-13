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
import {
  getUsageLeaderboard,
  getUsageRewardSetting,
} from '@/features/dashboard/api'
import type {
  UsageLeaderboardItem,
  UsageLeaderboardPeriod,
  UsageRewardRule,
  UsageRewardSettings,
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
const DEFAULT_USAGE_REWARD_SETTINGS: UsageRewardSettings = {
  enabled: true,
  rank_limit: 10,
  rules: [
    {
      from_rank: 1,
      to_rank: 1,
      reward_type: 'percent',
      reward_rate: 500,
      fixed_quota: 0,
    },
    {
      from_rank: 2,
      to_rank: 2,
      reward_type: 'percent',
      reward_rate: 400,
      fixed_quota: 0,
    },
    {
      from_rank: 3,
      to_rank: 3,
      reward_type: 'percent',
      reward_rate: 300,
      fixed_quota: 0,
    },
    {
      from_rank: 4,
      to_rank: 10,
      reward_type: 'percent',
      reward_rate: 100,
      fixed_quota: 0,
    },
  ],
}

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
        'border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/35 md:min-h-44',
      badgeClassName: 'bg-amber-500 text-white shadow-amber-500/25',
      valueClassName: 'text-amber-700 dark:text-amber-300',
    }
  }
  if (rank === 2) {
    return {
      title: 'Power Contributor',
      note: 'Steady high-value usage',
      className:
        'border-slate-200 bg-slate-50/80 dark:border-slate-500/30 dark:bg-slate-950/35 md:min-h-36',
      badgeClassName: 'bg-slate-500 text-white shadow-slate-500/20',
      valueClassName: 'text-slate-700 dark:text-slate-300',
    }
  }
  return {
    title: 'Rising Spender',
    note: 'Still climbing this period',
    className:
      'border-orange-200 bg-orange-50/80 dark:border-orange-500/30 dark:bg-orange-950/35 md:min-h-36',
    badgeClassName: 'bg-orange-500 text-white shadow-orange-500/20',
    valueClassName: 'text-orange-700 dark:text-orange-300',
  }
}

function getLeaderboardItemKey(item: UsageLeaderboardItem): string {
  return item.user_id != null && item.user_id > 0
    ? `user:${item.user_id}`
    : `rank:${item.rank}:${item.display_name}`
}

function normalizeUsageRewardSettings(
  settings?: UsageRewardSettings
): UsageRewardSettings {
  if (!settings) return DEFAULT_USAGE_REWARD_SETTINGS
  return {
    enabled: settings.enabled ?? DEFAULT_USAGE_REWARD_SETTINGS.enabled,
    rank_limit: Math.max(1, Math.min(50, Number(settings.rank_limit || 10))),
    rules: Array.isArray(settings.rules)
      ? settings.rules.map((rule) => ({
          from_rank: Number(rule.from_rank || 1),
          to_rank: Number(rule.to_rank || 1),
          reward_type:
            rule.reward_type === 'fixed_quota' ? 'fixed_quota' : 'percent',
          reward_rate: Number(rule.reward_rate || 0),
          fixed_quota: Number(rule.fixed_quota || 0),
        }))
      : DEFAULT_USAGE_REWARD_SETTINGS.rules,
  }
}

function getUsageRewardRule(
  rank: number,
  settings: UsageRewardSettings
): UsageRewardRule | undefined {
  return settings.rules.find(
    (rule) => rank >= rule.from_rank && rank <= rule.to_rank
  )
}

function formatRuleRank(rule: UsageRewardRule): string {
  if (rule.from_rank === rule.to_rank) {
    return `第${rule.from_rank}名`
  }
  return `第${rule.from_rank}-${rule.to_rank}名`
}

function formatUsageReward(rule?: UsageRewardRule): string {
  if (!rule) return '-'
  if (rule.reward_type === 'fixed_quota') {
    return formatQuota(rule.fixed_quota || 0)
  }
  return `${(Number(rule.reward_rate || 0) / 100)
    .toFixed(2)
    .replace(/\.?0+$/, '')}%`
}

function getUsageRewardText(
  rank: number,
  period: UsageLeaderboardPeriod,
  settings: UsageRewardSettings
): string {
  if (period !== 'day' || !settings.enabled) return '-'
  return formatUsageReward(getUsageRewardRule(rank, settings))
}

function getUsageRewardDescription(settings: UsageRewardSettings): string {
  if (!settings.enabled) {
    return '奖励机制：当前已关闭，排行榜仅展示额度消耗情况。'
  }
  const rules = settings.rules
    .map((rule) => `${formatRuleRank(rule)} ${formatUsageReward(rule)}`)
    .join('，')
  return `奖励机制：每日 00:00 按日榜结算，${rules}，发放到奖励额度并优先抵扣`
}

export function UsageLeaderboardPanel() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<UsageLeaderboardPeriod>('day')
  const usageRewardSettingQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'usage-reward-setting'],
    queryFn: getUsageRewardSetting,
    refetchInterval: USAGE_LEADERBOARD_REFRESH_INTERVAL,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: USAGE_LEADERBOARD_REFRESH_INTERVAL,
  })
  const rewardSettings = normalizeUsageRewardSettings(
    usageRewardSettingQuery.data?.data
  )
  const leaderboardLimit = Math.max(
    3,
    Math.min(50, Number(rewardSettings.rank_limit || 10))
  )
  const usageLeaderboardQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'usage-leaderboard',
      period,
      leaderboardLimit,
    ],
    queryFn: () => getUsageLeaderboard(leaderboardLimit, period),
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
      description={t(getUsageRewardDescription(rewardSettings))}
      loading={
        usageLeaderboardQuery.isLoading || usageRewardSettingQuery.isLoading
      }
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
                <div className='bg-background/80 dark:bg-card/80 border-border/50 mt-1 rounded-full border px-2 py-0.5 text-xs font-medium'>
                  {t('日榜奖励')}{' '}
                  {getUsageRewardText(item.rank, period, rewardSettings)}
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
                  {getUsageRewardText(item.rank, period, rewardSettings)}
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
