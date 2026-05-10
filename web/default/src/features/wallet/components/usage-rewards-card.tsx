import { Gift, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { UsageRewardRecord } from '../types'

interface UsageRewardsCardProps {
  rewards: UsageRewardRecord[]
  loading?: boolean
}

function formatRewardRate(rate: number): string {
  return `${((rate || 0) / 100).toFixed(0)}%`
}

export function UsageRewardsCard(props: UsageRewardsCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className='border-b'>
        <CardTitle className='flex items-center gap-2'>
          <Gift className='text-primary size-4' />
          {t('Usage Reward Records')}
        </CardTitle>
        <CardDescription>
          {t(
            'Settled at 00:00 daily. Reward quota is used before wallet quota.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <div className='space-y-3'>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className='h-12 w-full' />
            ))}
          </div>
        ) : props.rewards.length === 0 ? (
          <div className='text-muted-foreground py-6 text-center text-sm'>
            {t('No usage reward records yet')}
          </div>
        ) : (
          <div className='divide-border divide-y'>
            {props.rewards.map((item) => (
              <div
                key={item.id}
                className='flex flex-wrap items-center gap-3 py-3'
              >
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <Trophy className='text-muted-foreground size-4 shrink-0' />
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-medium'>{item.period_date}</span>
                      <Badge variant='secondary'>#{item.rank}</Badge>
                      <Badge>{formatRewardRate(item.reward_rate)}</Badge>
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      {t('Consumed Quota')}: {formatQuota(item.consume_quota)}
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-mono text-sm font-semibold tabular-nums'>
                    +{formatQuota(item.reward_quota)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('Reward Quota')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
