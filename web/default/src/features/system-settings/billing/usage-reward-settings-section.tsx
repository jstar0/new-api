import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type UsageRewardType = 'percent' | 'fixed_quota'

type UsageRewardRule = {
  from_rank: number
  to_rank: number
  reward_type: UsageRewardType
  reward_rate: number
  fixed_quota: number
}

type UsageRewardSettings = {
  enabled: boolean
  rank_limit: number
  rules: UsageRewardRule[]
}

const OPTION_KEY = 'usage_reward_setting.config'
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

function cloneDefaultSettings(): UsageRewardSettings {
  return JSON.parse(JSON.stringify(DEFAULT_USAGE_REWARD_SETTINGS))
}

function normalizeInt(value: unknown, fallback: number): number {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.floor(next)
}

function parseSettings(value?: string): UsageRewardSettings {
  if (!value) return cloneDefaultSettings()
  try {
    const parsed = JSON.parse(value) as Partial<UsageRewardSettings>
    return {
      enabled: parsed.enabled ?? DEFAULT_USAGE_REWARD_SETTINGS.enabled,
      rank_limit: normalizeInt(
        parsed.rank_limit,
        DEFAULT_USAGE_REWARD_SETTINGS.rank_limit
      ),
      rules: Array.isArray(parsed.rules)
        ? parsed.rules.map((rule) => ({
            from_rank: normalizeInt(rule.from_rank, 1),
            to_rank: normalizeInt(rule.to_rank, 1),
            reward_type:
              rule.reward_type === 'fixed_quota' ? 'fixed_quota' : 'percent',
            reward_rate: normalizeInt(rule.reward_rate, 0),
            fixed_quota: normalizeInt(rule.fixed_quota, 0),
          }))
        : cloneDefaultSettings().rules,
    }
  } catch {
    return cloneDefaultSettings()
  }
}

function formatRuleRank(rule: UsageRewardRule): string {
  if (rule.from_rank === rule.to_rank) return `第${rule.from_rank}名`
  return `第${rule.from_rank}-${rule.to_rank}名`
}

function formatRuleReward(rule: UsageRewardRule): string {
  if (rule.reward_type === 'fixed_quota') return formatQuota(rule.fixed_quota)
  return `${(rule.reward_rate / 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

function buildSummary(settings: UsageRewardSettings): string {
  if (!settings.enabled) return '日榜奖励已关闭'
  if (settings.rules.length === 0) return '暂无奖励规则'
  return settings.rules
    .map((rule) => `${formatRuleRank(rule)} ${formatRuleReward(rule)}`)
    .join(' · ')
}

function validateSettings(settings: UsageRewardSettings): string | null {
  if (settings.rank_limit < 1 || settings.rank_limit > 50) {
    return '奖励榜名次数量必须在 1-50 之间'
  }
  for (const [index, rule] of settings.rules.entries()) {
    if (
      rule.from_rank < 1 ||
      rule.to_rank < rule.from_rank ||
      rule.to_rank > 50
    ) {
      return `第 ${index + 1} 条奖励规则的名次范围无效`
    }
    if (
      rule.reward_type === 'percent' &&
      (rule.reward_rate < 0 || rule.reward_rate > 10000)
    ) {
      return `第 ${index + 1} 条奖励规则的百分比必须在 0-100% 之间`
    }
    if (rule.reward_type === 'fixed_quota' && rule.fixed_quota < 0) {
      return `第 ${index + 1} 条奖励规则的固定额度不能小于 0`
    }
  }
  return null
}

function normalizePayload(settings: UsageRewardSettings): UsageRewardSettings {
  return {
    enabled: Boolean(settings.enabled),
    rank_limit: normalizeInt(settings.rank_limit, 10),
    rules: settings.rules
      .map((rule): UsageRewardRule => {
        const rewardType: UsageRewardType =
          rule.reward_type === 'fixed_quota' ? 'fixed_quota' : 'percent'

        return {
          from_rank: normalizeInt(rule.from_rank, 1),
          to_rank: normalizeInt(rule.to_rank, 1),
          reward_type: rewardType,
          reward_rate:
            rewardType === 'fixed_quota'
              ? 0
              : normalizeInt(rule.reward_rate, 0),
          fixed_quota:
            rewardType === 'fixed_quota'
              ? normalizeInt(rule.fixed_quota, 0)
              : 0,
        }
      })
      .sort((a, b) => a.from_rank - b.from_rank || a.to_rank - b.to_rank),
  }
}

export function UsageRewardSettingsSection({
  defaultValue,
}: {
  defaultValue?: string
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const initialSettings = useMemo(
    () => parseSettings(defaultValue),
    [defaultValue]
  )
  const [settings, setSettings] = useState(initialSettings)

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const summary = useMemo(() => buildSummary(settings), [settings])

  function updateRule(index: number, patch: Partial<UsageRewardRule>) {
    setSettings((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule
      ),
    }))
  }

  function addRule() {
    setSettings((current) => ({
      ...current,
      rules: [
        ...current.rules,
        {
          from_rank: Math.min(current.rank_limit || 10, 10),
          to_rank: Math.min(current.rank_limit || 10, 10),
          reward_type: 'percent',
          reward_rate: 100,
          fixed_quota: 0,
        },
      ],
    }))
  }

  function removeRule(index: number) {
    setSettings((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }))
  }

  async function saveSettings() {
    const payload = normalizePayload(settings)
    const validationMessage = validateSettings(payload)
    if (validationMessage) {
      toast.warning(t(validationMessage))
      return
    }
    const nextValue = JSON.stringify(payload)
    const currentValue = JSON.stringify(normalizePayload(initialSettings))
    if (nextValue === currentValue) {
      toast.info(t('No changes to save'))
      return
    }
    const result = await updateOption.mutateAsync({
      key: OPTION_KEY,
      value: nextValue,
    })
    if (result.success) {
      setSettings(payload)
    }
  }

  return (
    <SettingsSection
      title={t('额度消耗榜奖励设置')}
      description={t('每日 00:00 按日榜结算，奖励发放到奖励额度并优先抵扣。')}
    >
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4'>
          <div className='space-y-1'>
            <div className='text-sm font-medium'>{t('启用奖励结算')}</div>
            <div className='text-muted-foreground text-sm'>
              {settings.enabled
                ? t('当前开启，系统会在每日 00:00 自动结算。')
                : t('当前关闭，只展示排行榜，不发放奖励额度。')}
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) =>
              setSettings((current) => ({ ...current, enabled }))
            }
          />
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('奖励名次数量')}</label>
            <Input
              type='number'
              min={1}
              max={50}
              value={settings.rank_limit}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  rank_limit: normalizeInt(
                    event.target.value,
                    current.rank_limit
                  ),
                }))
              }
            />
          </div>
          <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100'>
            {summary}
          </div>
        </div>

        <div className='space-y-3'>
          {settings.rules.map((rule, index) => (
            <div
              key={`${index}-${rule.from_rank}-${rule.to_rank}`}
              className='grid gap-3 rounded-lg border p-3 md:grid-cols-6 md:items-end'
            >
              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('开始名次')}</label>
                <Input
                  type='number'
                  min={1}
                  max={50}
                  value={rule.from_rank}
                  onChange={(event) =>
                    updateRule(index, {
                      from_rank: normalizeInt(
                        event.target.value,
                        rule.from_rank
                      ),
                    })
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('结束名次')}</label>
                <Input
                  type='number'
                  min={1}
                  max={50}
                  value={rule.to_rank}
                  onChange={(event) =>
                    updateRule(index, {
                      to_rank: normalizeInt(event.target.value, rule.to_rank),
                    })
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('奖励类型')}</label>
                <NativeSelect
                  className='w-full'
                  value={rule.reward_type}
                  onChange={(event) =>
                    updateRule(index, {
                      reward_type: event.target.value as UsageRewardType,
                    })
                  }
                >
                  <NativeSelectOption value='percent'>
                    {t('按消耗百分比')}
                  </NativeSelectOption>
                  <NativeSelectOption value='fixed_quota'>
                    {t('固定额度')}
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>
                  {rule.reward_type === 'fixed_quota'
                    ? t('固定额度')
                    : t('奖励比例')}
                </label>
                <Input
                  type='number'
                  min={0}
                  max={rule.reward_type === 'percent' ? 100 : undefined}
                  step={rule.reward_type === 'percent' ? 0.1 : 1}
                  value={
                    rule.reward_type === 'fixed_quota'
                      ? rule.fixed_quota
                      : rule.reward_rate / 100
                  }
                  onChange={(event) =>
                    updateRule(
                      index,
                      rule.reward_type === 'fixed_quota'
                        ? {
                            fixed_quota: normalizeInt(
                              event.target.value,
                              rule.fixed_quota
                            ),
                          }
                        : {
                            reward_rate: Math.round(
                              Number(event.target.value || 0) * 100
                            ),
                          }
                    )
                  }
                />
              </div>
              <div className='text-sm font-semibold'>
                {formatRuleReward(rule)}
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={() => removeRule(index)}
                >
                  {t('删除')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={addRule}>
            {t('添加规则')}
          </Button>
          <Button
            type='button'
            onClick={saveSettings}
            disabled={updateOption.isPending}
          >
            {updateOption.isPending ? t('Saving...') : t('保存奖励设置')}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => setSettings(cloneDefaultSettings())}
          >
            {t('恢复默认')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
