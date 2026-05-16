import { CreditCard, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  AffiliateLeaderboardItem,
  LeaderboardSettings,
  TopUpLeaderboardItem,
} from '../types'

type WalletLeaderboardsCardProps = {
  settings: LeaderboardSettings
  topUpItems: TopUpLeaderboardItem[]
  affiliateItems: AffiliateLeaderboardItem[]
}

function RankCell({ rank }: { rank: number }) {
  return (
    <span className='bg-muted inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold'>
      #{rank}
    </span>
  )
}

export function WalletLeaderboardsCard({
  settings,
  topUpItems,
  affiliateItems,
}: WalletLeaderboardsCardProps) {
  const { t } = useTranslation()
  if (!settings.topup_enabled && !settings.aff_enabled) {
    return null
  }

  return (
    <div className='grid gap-4 xl:grid-cols-2'>
      {settings.topup_enabled && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <CreditCard className='size-4' />
              {t('充值排行榜')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16'>{t('Rank')}</TableHead>
                  <TableHead>{t('User')}</TableHead>
                  <TableHead className='text-right'>{t('累计充值')}</TableHead>
                  <TableHead className='text-right'>{t('充值次数')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUpItems.map((item) => (
                  <TableRow key={`topup-${item.rank}-${item.display_name}`}>
                    <TableCell>
                      <RankCell rank={item.rank} />
                    </TableCell>
                    <TableCell className='max-w-40 truncate font-medium'>
                      {item.display_name}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatQuota(item.recharge_quota || 0)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {item.recharge_count || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {settings.aff_enabled && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Trophy className='size-4' />
              {t('邀请排行榜')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16'>{t('Rank')}</TableHead>
                  <TableHead>{t('User')}</TableHead>
                  <TableHead className='text-right'>{t('有效邀请')}</TableHead>
                  <TableHead className='text-right'>{t('累计收益')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliateItems.map((item) => (
                  <TableRow key={`aff-${item.rank}-${item.display_name}`}>
                    <TableCell>
                      <RankCell rank={item.rank} />
                    </TableCell>
                    <TableCell className='max-w-40 truncate font-medium'>
                      {item.display_name}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {item.effective_invite_count || 0}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatQuota(item.rebate_quota || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
