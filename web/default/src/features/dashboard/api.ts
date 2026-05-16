import { api } from '@/lib/api'
import type {
  QuotaDataItem,
  UptimeGroupResult,
  UsageLeaderboardItem,
  LeaderboardSettings,
  UsageLeaderboardPeriod,
  UsageLeaderboardMetric,
  UsageRewardSettings,
} from './types'

// ============================================================================
// Dashboard APIs
// ============================================================================

// ----------------------------------------------------------------------------
// Quota & Usage Data
// ----------------------------------------------------------------------------

// Get user quota data within a time range
// Admin users get all users' data by default (matching classic frontend behavior)
export async function getUserQuotaDates(
  params: {
    start_timestamp: number
    end_timestamp: number
    default_time?: string
    username?: string
  },
  isAdmin = false
) {
  const endpoint = isAdmin ? '/api/data' : '/api/data/self'
  const res = await api.get<{ success: boolean; data: QuotaDataItem[] }>(
    endpoint,
    { params }
  )
  return res.data
}

// ----------------------------------------------------------------------------
// System Monitoring
// ----------------------------------------------------------------------------

export async function getUserQuotaDataByUsers(params: {
  start_timestamp: number
  end_timestamp: number
}) {
  const res = await api.get<{ success: boolean; data: QuotaDataItem[] }>(
    '/api/data/users',
    { params }
  )
  return res.data
}

export async function getUsageLeaderboard(
  limit = 10,
  period: UsageLeaderboardPeriod = 'day',
  metric?: UsageLeaderboardMetric
) {
  const res = await api.get<{
    success: boolean
    data: UsageLeaderboardItem[]
  }>('/api/user/usage/leaderboard', {
    params: { limit, period, metric },
  })
  return res.data
}

export async function getLeaderboardSetting() {
  const res = await api.get<{
    success: boolean
    data: LeaderboardSettings
  }>('/api/user/leaderboard/setting')
  return res.data
}

export async function getUsageRewardSetting() {
  const res = await api.get<{
    success: boolean
    data: UsageRewardSettings
  }>('/api/user/usage/reward-setting')
  return res.data
}

// Get uptime monitoring status for all services
export async function getUptimeStatus() {
  const res = await api.get<{ success: boolean; data: UptimeGroupResult[] }>(
    '/api/uptime/status'
  )
  return res.data
}
