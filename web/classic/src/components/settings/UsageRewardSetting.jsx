/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  InputNumber,
  Select,
  Spin,
  Switch,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import {
  API,
  renderQuota,
  showError,
  showSuccess,
  showWarning,
} from '../../helpers';

const { Text } = Typography;
const OPTION_KEY = 'usage_reward_setting.config';
const DEFAULT_USAGE_REWARD_SETTINGS = {
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
};

const rewardTypeOptions = [
  { label: '按消耗百分比', value: 'percent' },
  { label: '固定额度', value: 'fixed_quota' },
];

const cloneDefaultSettings = () =>
  JSON.parse(JSON.stringify(DEFAULT_USAGE_REWARD_SETTINGS));

const normalizeInt = (value, fallback = 0) => {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }
  return Math.floor(next);
};

const parseSettings = (value) => {
  if (!value) {
    return cloneDefaultSettings();
  }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      enabled: parsed.enabled ?? DEFAULT_USAGE_REWARD_SETTINGS.enabled,
      rank_limit: normalizeInt(
        parsed.rank_limit,
        DEFAULT_USAGE_REWARD_SETTINGS.rank_limit,
      ),
      rules: Array.isArray(parsed.rules)
        ? parsed.rules.map((rule) => ({
            from_rank: normalizeInt(rule.from_rank, 1),
            to_rank: normalizeInt(rule.to_rank, 1),
            reward_type:
              rule.reward_type === 'fixed'
                ? 'fixed_quota'
                : rule.reward_type || 'percent',
            reward_rate: normalizeInt(rule.reward_rate, 0),
            fixed_quota: normalizeInt(rule.fixed_quota, 0),
          }))
        : cloneDefaultSettings().rules,
    };
  } catch (error) {
    return cloneDefaultSettings();
  }
};

const formatRuleRank = (rule) => {
  if (rule.from_rank === rule.to_rank) {
    return `第${rule.from_rank}名`;
  }
  return `第${rule.from_rank}-${rule.to_rank}名`;
};

const formatRuleReward = (rule) => {
  if (rule.reward_type === 'fixed_quota') {
    return renderQuota(rule.fixed_quota || 0);
  }
  return `${(rule.reward_rate || 0) / 100}%`;
};

const buildSummary = (settings) => {
  if (!settings.enabled) {
    return '日榜奖励已关闭';
  }
  if (!settings.rules.length) {
    return '暂无奖励规则';
  }
  return settings.rules
    .map((rule) => `${formatRuleRank(rule)} ${formatRuleReward(rule)}`)
    .join(' · ');
};

export default function UsageRewardSetting() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(() => cloneDefaultSettings());

  const summary = useMemo(() => buildSummary(settings), [settings]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      const option = data.find((item) => item.key === OPTION_KEY);
      setSettings(parseSettings(option?.value));
    } catch (error) {
      showError(t('刷新失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const updateRule = (index, patch) => {
    setSettings((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    }));
  };

  const addRule = () => {
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
    }));
  };

  const removeRule = (index) => {
    setSettings((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const validateSettings = () => {
    if (settings.rank_limit < 1 || settings.rank_limit > 50) {
      showWarning(t('奖励榜名次数量必须在 1-50 之间'));
      return false;
    }
    for (let index = 0; index < settings.rules.length; index += 1) {
      const rule = settings.rules[index];
      if (
        rule.from_rank < 1 ||
        rule.to_rank < rule.from_rank ||
        rule.to_rank > 50
      ) {
        showWarning(t(`第 ${index + 1} 条奖励规则的名次范围无效`));
        return false;
      }
      if (rule.reward_type === 'percent') {
        if (rule.reward_rate < 0 || rule.reward_rate > 10000) {
          showWarning(
            t(`第 ${index + 1} 条奖励规则的百分比必须在 0-100% 之间`),
          );
          return false;
        }
      } else if (rule.fixed_quota < 0) {
        showWarning(t(`第 ${index + 1} 条奖励规则的固定额度不能小于 0`));
        return false;
      }
    }
    return true;
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      return;
    }
    const payload = {
      enabled: Boolean(settings.enabled),
      rank_limit: normalizeInt(settings.rank_limit, 10),
      rules: settings.rules
        .map((rule) => ({
          from_rank: normalizeInt(rule.from_rank, 1),
          to_rank: normalizeInt(rule.to_rank, 1),
          reward_type:
            rule.reward_type === 'fixed_quota' ? 'fixed_quota' : 'percent',
          reward_rate:
            rule.reward_type === 'fixed_quota'
              ? 0
              : normalizeInt(rule.reward_rate, 0),
          fixed_quota:
            rule.reward_type === 'fixed_quota'
              ? normalizeInt(rule.fixed_quota, 0)
              : 0,
        }))
        .sort((a, b) => a.from_rank - b.from_rank || a.to_rank - b.to_rank),
    };

    setSaving(true);
    try {
      const res = await API.put('/api/option/', {
        key: OPTION_KEY,
        value: JSON.stringify(payload),
      });
      if (res.data.success) {
        showSuccess(t('保存成功'));
        setSettings(payload);
      } else {
        showError(res.data.message || t('保存失败，请重试'));
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Card style={{ marginTop: '10px' }}>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-base font-semibold'>
              {t('额度消耗榜奖励设置')}
            </div>
            <Text type='tertiary'>
              {t('每日 00:00 按日榜结算，奖励发放到奖励额度并优先抵扣。')}
            </Text>
          </div>
          <Switch
            checked={settings.enabled}
            checkedText={t('开启')}
            uncheckedText={t('关闭')}
            onChange={(enabled) =>
              setSettings((current) => ({ ...current, enabled }))
            }
          />
        </div>

        <div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <div className='mb-1 text-sm font-medium'>{t('奖励名次数量')}</div>
            <InputNumber
              value={settings.rank_limit}
              min={1}
              max={50}
              step={1}
              suffix={t('名')}
              style={{ width: '100%' }}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  rank_limit: normalizeInt(value, current.rank_limit),
                }))
              }
            />
          </div>
          <div className='md:col-span-2'>
            <div className='mb-1 text-sm font-medium'>{t('当前规则')}</div>
            <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
              {summary}
            </div>
          </div>
        </div>

        <div className='space-y-3'>
          {settings.rules.map((rule, index) => (
            <div
              key={`${index}-${rule.from_rank}-${rule.to_rank}`}
              className='grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-6 md:items-end'
            >
              <div>
                <div className='mb-1 text-sm font-medium'>{t('开始名次')}</div>
                <InputNumber
                  value={rule.from_rank}
                  min={1}
                  max={50}
                  step={1}
                  style={{ width: '100%' }}
                  onChange={(value) =>
                    updateRule(index, {
                      from_rank: normalizeInt(value, rule.from_rank),
                    })
                  }
                />
              </div>
              <div>
                <div className='mb-1 text-sm font-medium'>{t('结束名次')}</div>
                <InputNumber
                  value={rule.to_rank}
                  min={1}
                  max={50}
                  step={1}
                  style={{ width: '100%' }}
                  onChange={(value) =>
                    updateRule(index, {
                      to_rank: normalizeInt(value, rule.to_rank),
                    })
                  }
                />
              </div>
              <div>
                <div className='mb-1 text-sm font-medium'>{t('奖励类型')}</div>
                <Select
                  value={rule.reward_type}
                  optionList={rewardTypeOptions}
                  style={{ width: '100%' }}
                  onChange={(value) =>
                    updateRule(index, { reward_type: value })
                  }
                />
              </div>
              <div>
                <div className='mb-1 text-sm font-medium'>
                  {rule.reward_type === 'fixed_quota'
                    ? t('固定额度')
                    : t('奖励比例')}
                </div>
                <InputNumber
                  value={
                    rule.reward_type === 'fixed_quota'
                      ? rule.fixed_quota
                      : (rule.reward_rate || 0) / 100
                  }
                  min={0}
                  max={rule.reward_type === 'fixed_quota' ? undefined : 100}
                  step={rule.reward_type === 'fixed_quota' ? 1 : 0.1}
                  suffix={rule.reward_type === 'fixed_quota' ? 'Token' : '%'}
                  style={{ width: '100%' }}
                  onChange={(value) =>
                    updateRule(
                      index,
                      rule.reward_type === 'fixed_quota'
                        ? { fixed_quota: normalizeInt(value, rule.fixed_quota) }
                        : { reward_rate: Math.round(Number(value || 0) * 100) },
                    )
                  }
                />
              </div>
              <div>
                <Tag color='green' size='large'>
                  {formatRuleReward(rule)}
                </Tag>
              </div>
              <div className='flex justify-end'>
                <Button
                  type='danger'
                  theme='borderless'
                  onClick={() => removeRule(index)}
                >
                  {t('删除')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className='mt-4 flex flex-wrap gap-2'>
          <Button onClick={addRule}>{t('添加规则')}</Button>
          <Button type='primary' loading={saving} onClick={saveSettings}>
            {t('保存奖励设置')}
          </Button>
          <Button onClick={() => setSettings(cloneDefaultSettings())}>
            {t('恢复默认')}
          </Button>
        </div>
      </Card>
    </Spin>
  );
}
