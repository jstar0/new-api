import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type UsageLeaderboardMetric = 'quota' | 'requests'

type LeaderboardSettings = {
  topup_enabled: boolean
  aff_enabled: boolean
  usage_enabled: boolean
  usage_metric: UsageLeaderboardMetric
}

const OPTION_KEY = 'leaderboard_setting.config'
const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  topup_enabled: true,
  aff_enabled: true,
  usage_enabled: true,
  usage_metric: 'quota',
}

function cloneDefaultSettings(): LeaderboardSettings {
  return { ...DEFAULT_LEADERBOARD_SETTINGS }
}

function parseSettings(value?: string): LeaderboardSettings {
  if (!value) return cloneDefaultSettings()
  try {
    const parsed = JSON.parse(value) as Partial<LeaderboardSettings>
    return {
      topup_enabled:
        parsed.topup_enabled ?? DEFAULT_LEADERBOARD_SETTINGS.topup_enabled,
      aff_enabled: parsed.aff_enabled ?? DEFAULT_LEADERBOARD_SETTINGS.aff_enabled,
      usage_enabled:
        parsed.usage_enabled ?? DEFAULT_LEADERBOARD_SETTINGS.usage_enabled,
      usage_metric:
        parsed.usage_metric === 'requests'
          ? 'requests'
          : DEFAULT_LEADERBOARD_SETTINGS.usage_metric,
    }
  } catch {
    return cloneDefaultSettings()
  }
}

function normalizePayload(settings: LeaderboardSettings): LeaderboardSettings {
  return {
    topup_enabled: Boolean(settings.topup_enabled),
    aff_enabled: Boolean(settings.aff_enabled),
    usage_enabled: Boolean(settings.usage_enabled),
    usage_metric: settings.usage_metric === 'requests' ? 'requests' : 'quota',
  }
}

export function LeaderboardDisplaySettingsSection({
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

  async function saveSettings() {
    const payload = normalizePayload(settings)
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
      title={t('排行榜展示设置')}
      description={t('控制钱包页和仪表盘中的排行榜是否对用户展示。')}
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-3'>
          {[
            {
              key: 'topup_enabled' as const,
              title: t('充值排行榜'),
              description: t('展示用户累计充值排行。'),
            },
            {
              key: 'aff_enabled' as const,
              title: t('邀请排行榜'),
              description: t('展示邀请有效充值排行。'),
            },
            {
              key: 'usage_enabled' as const,
              title: t('额度消耗排行榜'),
              description: t('展示用户消耗或请求排行。'),
            },
          ].map((item) => (
            <div
              key={item.key}
              className='flex items-center justify-between gap-3 rounded-lg border p-4'
            >
              <div className='space-y-1'>
                <div className='text-sm font-medium'>{item.title}</div>
                <div className='text-muted-foreground text-sm'>
                  {item.description}
                </div>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    [item.key]: checked,
                  }))
                }
              />
            </div>
          ))}
        </div>

        <div className='grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center'>
          <div className='space-y-1'>
            <div className='text-sm font-medium'>{t('额度消耗榜统计口径')}</div>
            <div className='text-muted-foreground text-sm'>
              {t('可按实际消耗额度排行，也可以按请求次数排行。')}
            </div>
          </div>
          <NativeSelect
            value={settings.usage_metric}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                usage_metric: event.target.value as UsageLeaderboardMetric,
              }))
            }
          >
            <NativeSelectOption value='quota'>
              {t('按消耗额度')}
            </NativeSelectOption>
            <NativeSelectOption value='requests'>
              {t('按请求次数')}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            onClick={saveSettings}
            disabled={updateOption.isPending}
          >
            {updateOption.isPending ? t('Saving...') : t('保存排行榜设置')}
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
