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

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  TextArea,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { API, processGroupsData, processModelsData } from '../../helpers';
import { UserContext } from '../../context/User';

const { Text, Title } = Typography;

const DEFAULT_GROUP = 'auto';
const SIZE_OPTIONS = ['1024x1024', '1024x1792', '1792x1024', '512x512'];
const QUALITY_OPTIONS = ['auto', 'standard', 'hd'];
const STYLE_OPTIONS = ['auto', 'vivid', 'natural'];

const isLikelyImageModel = (model) =>
  /image|imagen|dall|gpt-image|flux|jimeng|midjourney|mj|wanx|kolors/i.test(
    model,
  );

const toImageUrl = (item) => {
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return '';
};

const buildOptionList = (values) =>
  values.map((value) => ({
    label: value,
    value,
  }));

export default function ImageGeneration() {
  const { t } = useTranslation();
  const [userState] = useContext(UserContext);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [model, setModel] = useState('');
  const [group, setGroup] = useState(DEFAULT_GROUP);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('auto');
  const [style, setStyle] = useState('auto');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [results, setResults] = useState([]);

  const modelOptions = useMemo(() => {
    const imageModels = models.filter((item) => isLikelyImageModel(item.value));
    return imageModels.length > 0 ? imageModels : models;
  }, [models]);

  const groupOptions = useMemo(() => {
    const hasAuto = groups.some((item) => item.value === DEFAULT_GROUP);
    return hasAuto
      ? groups
      : [
          {
            label: 'Auto',
            value: DEFAULT_GROUP,
            ratio: 1,
            fullLabel: 'Circuit Breaker',
          },
          ...groups,
        ];
  }, [groups]);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [modelsRes, groupsRes] = await Promise.all([
        API.get('/api/user/models'),
        API.get('/api/user/self/groups'),
      ]);

      if (modelsRes.data.success) {
        const { modelOptions: nextModels, selectedModel } = processModelsData(
          modelsRes.data.data || [],
          model,
        );
        setModels(nextModels);
        if (!model && selectedModel) {
          setModel(selectedModel);
        }
      } else {
        Toast.error(t(modelsRes.data.message || '加载模型失败'));
      }

      if (groupsRes.data.success) {
        const userGroup =
          userState?.user?.group ||
          JSON.parse(localStorage.getItem('user') || '{}')?.group;
        const nextGroups = processGroupsData(
          groupsRes.data.data || {},
          userGroup,
        );
        setGroups(nextGroups);
        if (!nextGroups.some((item) => item.value === group)) {
          setGroup(nextGroups[0]?.value || DEFAULT_GROUP);
        }
      } else {
        Toast.error(t(groupsRes.data.message || '加载分组失败'));
      }
    } catch (error) {
      Toast.error(t('加载生图配置失败'));
    } finally {
      setLoadingOptions(false);
    }
  }, [group, model, t, userState?.user?.group]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (model || modelOptions.length === 0) return;
    setModel(modelOptions[0].value);
  }, [model, modelOptions]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!model) {
      Toast.error(t('请选择模型'));
      return;
    }
    if (!trimmedPrompt) {
      Toast.error(t('请输入提示词'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        model,
        group,
        prompt: trimmedPrompt,
        n: count,
        size,
      };
      if (quality !== 'auto') payload.quality = quality;
      if (style !== 'auto') payload.style = style;

      const res = await API.post('/pg/images/generations', payload, {
        skipErrorHandler: true,
      });

      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const nextResults = items
        .map((item, index) => ({
          id: `${Date.now()}-${index}`,
          url: toImageUrl(item),
          revisedPrompt: item.revised_prompt,
        }))
        .filter((item) => item.url);

      if (nextResults.length === 0) {
        throw new Error(res.data?.error?.message || t('未返回图片'));
      }

      setResults(nextResults);
      Toast.success(t('图片生成成功'));
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        t('生成失败');
      Toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      Toast.success(t('已复制'));
    } catch (error) {
      Toast.error(t('复制失败'));
    }
  };

  const downloadImage = (url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-generation-${index + 1}.png`;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className='mt-[60px] px-2 md:px-4'>
      <div className='mx-auto max-w-[1280px]'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <Title heading={3}>{t('图片生成')}</Title>
            <Text type='tertiary'>{t('通过 NewAPI 中转生成图片')}</Text>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <Sparkles size={16} />
                  <span>{t('生成设置')}</span>
                </Space>
              }
            >
              <Spin spinning={loadingOptions}>
                <div className='space-y-4'>
                  <div>
                    <Text strong className='mb-2 block'>
                      {t('模型')}
                    </Text>
                    <Select
                      value={model}
                      onChange={setModel}
                      optionList={modelOptions}
                      filter
                      disabled={loading}
                      className='w-full'
                    />
                  </div>

                  <div>
                    <Text strong className='mb-2 block'>
                      {t('分组')}
                    </Text>
                    <Select
                      value={group}
                      onChange={setGroup}
                      optionList={groupOptions}
                      filter
                      disabled={loading}
                      className='w-full'
                    />
                  </div>

                  <div>
                    <Text strong className='mb-2 block'>
                      {t('提示词')}
                    </Text>
                    <TextArea
                      value={prompt}
                      onChange={setPrompt}
                      autosize={{ minRows: 5, maxRows: 10 }}
                      disabled={loading}
                      placeholder={t('描述你想生成的图片')}
                    />
                  </div>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Text strong className='mb-2 block'>
                        {t('尺寸')}
                      </Text>
                      <Select
                        value={size}
                        onChange={setSize}
                        optionList={buildOptionList(SIZE_OPTIONS)}
                        disabled={loading}
                        className='w-full'
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong className='mb-2 block'>
                        {t('数量')}
                      </Text>
                      <InputNumber
                        value={count}
                        onChange={(value) =>
                          setCount(Math.max(1, Math.min(4, Number(value) || 1)))
                        }
                        min={1}
                        max={4}
                        precision={0}
                        disabled={loading}
                        className='w-full'
                      />
                    </Col>
                  </Row>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Text strong className='mb-2 block'>
                        {t('质量')}
                      </Text>
                      <Select
                        value={quality}
                        onChange={setQuality}
                        optionList={buildOptionList(QUALITY_OPTIONS)}
                        disabled={loading}
                        className='w-full'
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong className='mb-2 block'>
                        {t('风格')}
                      </Text>
                      <Select
                        value={style}
                        onChange={setStyle}
                        optionList={buildOptionList(STYLE_OPTIONS)}
                        disabled={loading}
                        className='w-full'
                      />
                    </Col>
                  </Row>

                  <Button
                    theme='solid'
                    type='primary'
                    block
                    disabled={loading}
                    onClick={handleGenerate}
                    icon={
                      loading ? (
                        <Loader2 size={16} className='animate-spin' />
                      ) : (
                        <ImageIcon size={16} />
                      )
                    }
                  >
                    {loading ? t('生成中...') : t('生成图片')}
                  </Button>
                </div>
              </Spin>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <div className='min-h-[520px] rounded-lg border border-solid border-[var(--semi-color-border)] bg-[var(--semi-color-fill-0)] p-4'>
              {results.length === 0 ? (
                <div className='flex min-h-[480px] flex-col items-center justify-center gap-3 text-center text-[var(--semi-color-text-2)]'>
                  <ImageIcon size={42} />
                  <Text type='tertiary'>{t('生成结果会显示在这里')}</Text>
                </div>
              ) : (
                <div className='grid gap-4 md:grid-cols-2'>
                  {results.map((item, index) => (
                    <div
                      key={item.id}
                      className='overflow-hidden rounded-lg border border-solid border-[var(--semi-color-border)] bg-[var(--semi-color-bg-2)]'
                    >
                      <div className='aspect-square bg-[var(--semi-color-fill-1)]'>
                        <img
                          src={item.url}
                          alt={`generated-${index + 1}`}
                          className='h-full w-full object-contain'
                        />
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-2 p-3'>
                        <Text
                          type='tertiary'
                          size='small'
                          ellipsis={{ showTooltip: true }}
                          className='max-w-[70%]'
                        >
                          {item.revisedPrompt || t('生成图片')}
                        </Text>
                        <Space spacing={4}>
                          <Button
                            theme='borderless'
                            icon={<Copy size={16} />}
                            onClick={() => copyUrl(item.url)}
                            aria-label={t('复制')}
                          />
                          <Button
                            theme='borderless'
                            icon={<Download size={16} />}
                            onClick={() => downloadImage(item.url, index)}
                            aria-label={t('下载')}
                          />
                          <Button
                            theme='borderless'
                            icon={<ExternalLink size={16} />}
                            onClick={() =>
                              window.open(
                                item.url,
                                '_blank',
                                'noopener,noreferrer',
                              )
                            }
                            aria-label={t('打开')}
                          />
                        </Space>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
