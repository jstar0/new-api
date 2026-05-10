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
import { Card, Table, Tag, Tabs, TabPane, Typography } from '@douyinfe/semi-ui';
import { Trophy } from 'lucide-react';
import { API, renderQuota } from '../../helpers';

const { Text } = Typography;
const USAGE_LEADERBOARD_REFRESH_INTERVAL = 15 * 60 * 1000;
const USAGE_LEADERBOARD_PERIODS = [
  { value: 'day', label: '日榜' },
  { value: 'week', label: '周榜' },
  { value: 'month', label: '月榜' },
];
const USAGE_LEADERBOARD_PODIUM_ORDER = [2, 1, 3];

const getPodiumMeta = (rank) => {
  if (rank === 1) {
    return {
      title: '额度王者',
      note: '本期额度消耗最高',
      tagColor: 'yellow',
      borderColor: '#f6c453',
      background: 'linear-gradient(180deg, #fff7d6 0%, #ffffff 100%)',
      badgeBackground: '#f59e0b',
      minHeight: 176,
      marginTop: 0,
    };
  }
  if (rank === 2) {
    return {
      title: '稳定高手',
      note: '稳定调用，持续上榜',
      tagColor: 'grey',
      borderColor: '#cbd5e1',
      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      badgeBackground: '#64748b',
      minHeight: 148,
      marginTop: 24,
    };
  }
  return {
    title: '冲榜新星',
    note: '保持节奏，继续冲榜',
    tagColor: 'orange',
    borderColor: '#fdba74',
    background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
    badgeBackground: '#f97316',
    minHeight: 148,
    marginTop: 24,
  };
};

const formatInteger = (value) => Number(value || 0).toLocaleString();

const getLeaderboardItemKey = (item) => {
  if (item?.user_id) {
    return `user:${item.user_id}`;
  }
  return `rank:${item?.rank}:${item?.display_name || ''}`;
};

const getUsageRewardRateText = (rank) => {
  if (rank === 1) return '5%';
  if (rank === 2) return '4%';
  if (rank === 3) return '3%';
  if (rank >= 4 && rank <= 10) return '1%';
  return '-';
};

const UsageLeaderboardPanel = ({ CARD_PROPS, t }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('day');

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const res = await API.get(
          `/api/user/usage/leaderboard?limit=10&period=${period}`,
          {
            skipErrorHandler: true,
          },
        );
        if (mounted && res?.data?.success) {
          setLeaderboard(res.data.data || []);
        }
      } catch (error) {
        if (mounted) {
          setLeaderboard([]);
        }
      } finally {
        if (mounted && showLoading) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();
    const timer = window.setInterval(
      () => loadLeaderboard(false),
      USAGE_LEADERBOARD_REFRESH_INTERVAL,
    );
    const handleFocus = () => loadLeaderboard(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [period]);

  const podiumItems = useMemo(
    () =>
      USAGE_LEADERBOARD_PODIUM_ORDER.map((rank) =>
        leaderboard.find((item) => item.rank === rank),
      ).filter(Boolean),
    [leaderboard],
  );
  const tableLeaderboard = useMemo(
    () => {
      const podiumKeys = new Set(podiumItems.map(getLeaderboardItemKey));
      return leaderboard.filter(
        (item) => item.rank > 3 && !podiumKeys.has(getLeaderboardItemKey(item)),
      );
    },
    [leaderboard, podiumItems],
  );

  const columns = useMemo(
    () => [
      {
        title: t('排名'),
        dataIndex: 'rank',
        width: 72,
        render: (rank) => (
          <Tag color={rank <= 3 ? 'yellow' : 'grey'} size='small'>
            #{rank}
          </Tag>
        ),
      },
      {
        title: t('用户'),
        dataIndex: 'display_name',
        render: (text) => (
          <Text ellipsis={{ showTooltip: true }} className='text-sm'>
            {text}
          </Text>
        ),
      },
      {
        title: t('消耗额度'),
        dataIndex: 'consume_quota',
        width: 140,
        render: (quota) => (
          <Text strong className='text-sm'>
            {renderQuota(quota || 0)}
          </Text>
        ),
      },
      {
        title: t('日榜奖励'),
        dataIndex: 'rank',
        width: 96,
        render: (rank) => (
          <Tag color='green' size='small'>
            {getUsageRewardRateText(rank)}
          </Tag>
        ),
      },
      {
        title: t('请求数'),
        dataIndex: 'request_count',
        width: 92,
        render: (count) => formatInteger(count),
      },
    ],
    [t],
  );

  return (
    <div className='mb-4'>
      <Card
        {...CARD_PROPS}
        className='shadow-sm !rounded-2xl'
        title={
          <div className='flex w-full flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Trophy size={16} />
              <span>{t('额度消耗排行榜')}</span>
              <Tag color='white' shape='circle'>
                {t('每15分钟更新')}
              </Tag>
              <Tag color='yellow' shape='circle'>
                {t('日榜奖励：1名5% · 2名4% · 3名3% · 4-10名1%')}
              </Tag>
            </div>
            <Tabs activeKey={period} onChange={setPeriod} type='button'>
              {USAGE_LEADERBOARD_PERIODS.map((item) => (
                <TabPane
                  key={item.value}
                  tab={<span>{t(item.label)}</span>}
                  itemKey={item.value}
                />
              ))}
            </Tabs>
          </div>
        }
      >
        <div className='mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          {t(
            '奖励机制：每日 00:00 按日榜结算，第1名5%、第2名4%、第3名3%、第4-10名1%，奖励发放到奖励额度并优先抵扣。',
          )}
        </div>
        {podiumItems.length > 0 && (
          <div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end'>
            {podiumItems.map((item) => {
              const meta = getPodiumMeta(item.rank);
              return (
                <div
                  key={`podium-${item.rank}-${item.display_name}`}
                  className='flex flex-col items-center rounded-xl border px-4 py-4 text-center shadow-sm'
                  style={{
                    minHeight: meta.minHeight,
                    marginTop: meta.marginTop,
                    borderColor: meta.borderColor,
                    background: meta.background,
                  }}
                >
                  <div
                    className='mb-2 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-md'
                    style={{ background: meta.badgeBackground }}
                  >
                    #{item.rank}
                  </div>
                  <Text
                    strong
                    ellipsis={{ showTooltip: true }}
                    style={{ maxWidth: 160 }}
                  >
                    {item.display_name}
                  </Text>
                  <Tag color={meta.tagColor} size='small' className='mt-2'>
                    {t(meta.title)}
                  </Tag>
                  <Tag color='green' size='small' className='mt-2'>
                    {t('日榜奖励')} {getUsageRewardRateText(item.rank)}
                  </Tag>
                  <Text type='tertiary' size='small' className='mt-2'>
                    {t(meta.note)}
                  </Text>
                  <div className='mt-3 text-xl font-semibold tabular-nums'>
                    {renderQuota(item.consume_quota || 0)}
                  </div>
                  <Text type='tertiary' size='small'>
                    {t('消耗额度')}
                  </Text>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Table
            size='small'
            columns={columns}
            dataSource={tableLeaderboard}
            rowKey='rank'
            loading={loading}
            pagination={false}
            empty={t('暂无排行数据')}
            scroll={{ x: 560 }}
          />
        </div>
      </Card>
    </div>
  );
};

export default UsageLeaderboardPanel;
