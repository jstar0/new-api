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

import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Form, Row, Spin } from '@douyinfe/semi-ui';
import { API, showError, showSuccess, showWarning } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const OPTION_KEY = 'leaderboard_setting.config';

const DEFAULT_SETTINGS = {
  topup_enabled: true,
  aff_enabled: true,
  usage_enabled: true,
  usage_metric: 'quota',
};

function normalizeSettings(settings = {}) {
  return {
    topup_enabled:
      settings.topup_enabled ?? DEFAULT_SETTINGS.topup_enabled,
    aff_enabled: settings.aff_enabled ?? DEFAULT_SETTINGS.aff_enabled,
    usage_enabled:
      settings.usage_enabled ?? DEFAULT_SETTINGS.usage_enabled,
    usage_metric:
      settings.usage_metric === 'requests'
        ? 'requests'
        : DEFAULT_SETTINGS.usage_metric,
  };
}

function parseSettings(value) {
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(value));
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function SettingsLeaderboardDisplay(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({ ...DEFAULT_SETTINGS });
  const [originInputs, setOriginInputs] = useState({ ...DEFAULT_SETTINGS });
  const formApiRef = useRef(null);

  useEffect(() => {
    const nextInputs = parseSettings(props.options?.[OPTION_KEY]);
    setInputs(nextInputs);
    setOriginInputs(nextInputs);
    formApiRef.current?.setValues(nextInputs);
  }, [props.options]);

  const handleFieldChange = (field) => (value) => {
    setInputs((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submitSettings = async () => {
    const payload = normalizeSettings(inputs);
    if (
      JSON.stringify(payload) === JSON.stringify(normalizeSettings(originInputs))
    ) {
      showWarning(t('你似乎并没有修改什么'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.put('/api/option/', {
        key: OPTION_KEY,
        value: JSON.stringify(payload),
      });
      if (res.data.success) {
        showSuccess(t('保存成功'));
        setOriginInputs(payload);
        props.refresh && props.refresh();
      } else {
        showError(res.data.message || t('保存失败，请重试'));
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const resetDefault = () => {
    const nextInputs = { ...DEFAULT_SETTINGS };
    setInputs(nextInputs);
    formApiRef.current?.setValues(nextInputs);
  };

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(api) => (formApiRef.current = api)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('排行榜展示设置')}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='topup_enabled'
                label={t('充值排行榜')}
                extraText={t('控制钱包页充值排行榜是否展示')}
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('topup_enabled')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='aff_enabled'
                label={t('邀请排行榜')}
                extraText={t('控制钱包页邀请排行榜是否展示')}
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('aff_enabled')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='usage_enabled'
                label={t('额度消耗排行榜')}
                extraText={t('控制仪表盘额度消耗排行榜是否展示')}
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('usage_enabled')}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field='usage_metric'
                label={t('额度消耗榜统计口径')}
                extraText={t('后端会按该配置统计，用户不能通过接口参数绕过')}
                onChange={handleFieldChange('usage_metric')}
              >
                <Form.Select.Option value='quota'>
                  {t('按消耗额度')}
                </Form.Select.Option>
                <Form.Select.Option value='requests'>
                  {t('按请求次数')}
                </Form.Select.Option>
              </Form.Select>
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Button onClick={submitSettings} type='primary'>
              {t('保存排行榜设置')}
            </Button>
            <Button onClick={resetDefault} style={{ marginLeft: 8 }}>
              {t('恢复默认')}
            </Button>
          </div>
        </Form.Section>
      </Form>
    </Spin>
  );
}
