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

import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Typography,
  Card,
  Button,
  Input,
  Badge,
  Space,
  Table,
  Tag,
} from '@douyinfe/semi-ui';
import {
  Copy,
  Users,
  BarChart2,
  CreditCard,
  TrendingUp,
  Gift,
  Zap,
  Trophy,
} from 'lucide-react';
import { API } from '../../helpers';

const { Text } = Typography;

const InvitationCard = ({
  t,
  userState,
  renderQuota,
  setOpenTransfer,
  affLink,
  handleAffLinkClick,
}) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [topUpLeaderboard, setTopUpLeaderboard] = useState([]);
  const [topUpLeaderboardLoading, setTopUpLeaderboardLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const res = await API.get('/api/user/aff/leaderboard?limit=10', {
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
        if (mounted) {
          setLeaderboardLoading(false);
        }
      }
    };

    const loadTopUpLeaderboard = async () => {
      setTopUpLeaderboardLoading(true);
      try {
        const res = await API.get('/api/user/topup/leaderboard?limit=10', {
          skipErrorHandler: true,
        });
        if (mounted && res?.data?.success) {
          setTopUpLeaderboard(res.data.data || []);
        }
      } catch (error) {
        if (mounted) {
          setTopUpLeaderboard([]);
        }
      } finally {
        if (mounted) {
          setTopUpLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();
    loadTopUpLeaderboard();
    return () => {
      mounted = false;
    };
  }, []);

  const leaderboardColumns = [
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
      title: t('有效邀请'),
      dataIndex: 'effective_invite_count',
      width: 92,
      render: (count) => count || 0,
    },
    {
      title: t('邀请充值'),
      dataIndex: 'recharge_quota',
      width: 120,
      render: (quota) => renderQuota(quota || 0),
    },
    {
      title: t('累计收益'),
      dataIndex: 'rebate_quota',
      width: 120,
      render: (quota) => renderQuota(quota || 0),
    },
  ];

  const topUpLeaderboardColumns = [
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
      title: t('充值次数'),
      dataIndex: 'recharge_count',
      width: 92,
      render: (count) => count || 0,
    },
    {
      title: t('累计充值'),
      dataIndex: 'recharge_quota',
      width: 120,
      render: (quota) => renderQuota(quota || 0),
    },
  ];

  return (
    <Card className='!rounded-2xl shadow-sm border-0'>
      {/* 卡片头部 */}
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='green' className='mr-3 shadow-md'>
          <Gift size={16} />
        </Avatar>
        <div>
          <Typography.Text className='text-lg font-medium'>
            {t('邀请奖励')}
          </Typography.Text>
          <div className='text-xs'>{t('邀请好友获得额外奖励')}</div>
        </div>
      </div>

      {/* 收益展示区域 */}
      <Space vertical style={{ width: '100%' }}>
        {/* 统计数据统一卡片 */}
        <Card
          className='!rounded-xl w-full'
          cover={
            <div
              className='relative h-30'
              style={{
                '--palette-primary-darkerChannel': '0 75 80',
                backgroundImage: `linear-gradient(0deg, rgba(var(--palette-primary-darkerChannel) / 80%), rgba(var(--palette-primary-darkerChannel) / 80%)), url('/cover-4.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* 标题和按钮 */}
              <div className='relative z-10 h-full flex flex-col justify-between p-4'>
                <div className='flex justify-between items-center'>
                  <Text strong style={{ color: 'white', fontSize: '16px' }}>
                    {t('收益统计')}
                  </Text>
                  <Button
                    type='primary'
                    theme='solid'
                    size='small'
                    disabled={
                      !userState?.user?.aff_quota ||
                      userState?.user?.aff_quota <= 0
                    }
                    onClick={() => setOpenTransfer(true)}
                    className='!rounded-lg'
                  >
                    <Zap size={12} className='mr-1' />
                    {t('划转到余额')}
                  </Button>
                </div>

                {/* 统计数据 */}
                <div className='grid grid-cols-3 gap-6 mt-4'>
                  {/* 待使用收益 */}
                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {renderQuota(userState?.user?.aff_quota || 0)}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <TrendingUp
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('待使用收益')}
                      </Text>
                    </div>
                  </div>

                  {/* 总收益 */}
                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {renderQuota(userState?.user?.aff_history_quota || 0)}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <BarChart2
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('总收益')}
                      </Text>
                    </div>
                  </div>

                  {/* 邀请人数 */}
                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {userState?.user?.aff_count || 0}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <Users
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('邀请人数')}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          {/* 邀请链接部分 */}
          <Input
            value={affLink}
            readonly
            className='!rounded-lg'
            prefix={t('邀请链接')}
            suffix={
              <Button
                type='primary'
                theme='solid'
                onClick={handleAffLinkClick}
                icon={<Copy size={14} />}
                className='!rounded-lg'
              >
                {t('复制')}
              </Button>
            }
          />
        </Card>

        {/* 充值排行榜 */}
        <Card
          className='!rounded-xl w-full'
          title={
            <div className='flex items-center gap-2'>
              <CreditCard size={16} />
              <Text type='tertiary'>{t('充值排行榜')}</Text>
            </div>
          }
        >
          <Table
            size='small'
            columns={topUpLeaderboardColumns}
            dataSource={topUpLeaderboard}
            rowKey='rank'
            loading={topUpLeaderboardLoading}
            pagination={false}
            empty={t('暂无排行数据')}
            scroll={{ x: 420 }}
          />
        </Card>

        {/* 邀请排行榜 */}
        <Card
          className='!rounded-xl w-full'
          title={
            <div className='flex items-center gap-2'>
              <Trophy size={16} />
              <Text type='tertiary'>{t('邀请排行榜')}</Text>
            </div>
          }
        >
          <Table
            size='small'
            columns={leaderboardColumns}
            dataSource={leaderboard}
            rowKey='rank'
            loading={leaderboardLoading}
            pagination={false}
            empty={t('暂无排行数据')}
            scroll={{ x: 520 }}
          />
        </Card>

        {/* 奖励说明 */}
        <Card
          className='!rounded-xl w-full'
          title={<Text type='tertiary'>{t('奖励说明')}</Text>}
        >
          <div className='space-y-3'>
            <div className='flex items-start gap-2'>
              <Badge dot type='success' />
              <Text type='tertiary' className='text-sm'>
                {t('邀请好友注册，好友充值后您可获得相应奖励')}
              </Text>
            </div>

            <div className='flex items-start gap-2'>
              <Badge dot type='success' />
              <Text type='tertiary' className='text-sm'>
                {t('通过划转功能将奖励额度转入到您的账户余额中')}
              </Text>
            </div>

            <div className='flex items-start gap-2'>
              <Badge dot type='success' />
              <Text type='tertiary' className='text-sm'>
                {t('邀请的好友越多，获得的奖励越多')}
              </Text>
            </div>
          </div>
        </Card>
      </Space>
    </Card>
  );
};

export default InvitationCard;
