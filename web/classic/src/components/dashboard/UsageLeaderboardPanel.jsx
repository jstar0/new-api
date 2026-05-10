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
import { Card, Table, Tag, Typography } from '@douyinfe/semi-ui';
import { Activity } from 'lucide-react';
import { API, renderQuota } from '../../helpers';

const { Text } = Typography;
const USAGE_LEADERBOARD_REFRESH_INTERVAL = 15 * 60 * 1000;

const formatInteger = (value) => Number(value || 0).toLocaleString();

const UsageLeaderboardPanel = ({ CARD_PROPS, t }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const res = await API.get('/api/user/usage/leaderboard?limit=10', {
          skipErrorHandler: true,
        });
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
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

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
        title: t('消耗 Tokens'),
        dataIndex: 'consume_tokens',
        width: 140,
        render: (tokens) => (
          <Text strong className='text-sm'>
            {formatInteger(tokens)}
          </Text>
        ),
      },
      {
        title: t('消耗额度'),
        dataIndex: 'consume_quota',
        width: 120,
        render: (quota) => renderQuota(quota || 0),
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
          <div className='flex items-center gap-2'>
            <Activity size={16} />
            <span>{t('Token 消耗排行榜')}</span>
            <Tag color='white' shape='circle'>
              {t('每15分钟更新')}
            </Tag>
          </div>
        }
      >
        <Table
          size='small'
          columns={columns}
          dataSource={leaderboard}
          rowKey='rank'
          loading={loading}
          pagination={false}
          empty={t('暂无排行数据')}
          scroll={{ x: 560 }}
        />
      </Card>
    </div>
  );
};

export default UsageLeaderboardPanel;
