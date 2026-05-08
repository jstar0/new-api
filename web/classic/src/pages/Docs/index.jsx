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

import React from 'react';
import { Button, Card, Divider, Tag, Typography } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconExternalOpen,
  IconKey,
  IconLink,
} from '@douyinfe/semi-icons';
import { copy, showSuccess } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

const siteBaseUrl = 'https://api.turbo2c.xyz';
const gatewayBaseUrl = `${siteBaseUrl}/v1`;
const windsurfBaseUrl = 'https://windsurf.turbo2c.xyz';

const quickLinks = [
  { label: 'OpenAI Base URL', value: gatewayBaseUrl },
  { label: '模型列表', value: `${gatewayBaseUrl}/models` },
  { label: '模型价格', value: `${siteBaseUrl}/pricing` },
  { label: 'WindsurfAPI Dashboard', value: `${windsurfBaseUrl}/dashboard` },
];

const clientConfigs = [
  {
    title: 'OpenAI 兼容客户端',
    items: [
      ['Base URL', gatewayBaseUrl],
      ['API Key', '在控制台创建令牌后填入'],
      ['Models', '通过 /v1/models 获取可用模型'],
    ],
  },
  {
    title: 'Cherry Studio / Chatbox',
    items: [
      ['Provider', 'OpenAI Compatible'],
      ['API Host', gatewayBaseUrl],
      ['API Key', 'YOUR_API_KEY'],
    ],
  },
  {
    title: 'WindsurfAPI OpenAI 兼容专线',
    items: [
      ['Base URL', `${windsurfBaseUrl}/v1`],
      ['API Key', 'YOUR_WINDSURF_API_KEY'],
      ['Dashboard', `${windsurfBaseUrl}/dashboard`],
    ],
  },
  {
    title: 'WindsurfAPI Anthropic 兼容专线',
    items: [
      ['Base URL', windsurfBaseUrl],
      ['API Key', 'YOUR_WINDSURF_API_KEY'],
      ['Endpoint', '/v1/messages'],
    ],
  },
];

const endpoints = [
  ['/v1/chat/completions', 'OpenAI Chat Completions，适合多数客户端'],
  ['/v1/responses', 'OpenAI Responses API，适合 Codex / 新版 SDK'],
  ['/v1/images/generations', '图片生成接口'],
  ['/v1/models', '模型列表与可用性检查'],
];

const examples = [
  {
    title: 'curl',
    code: `curl ${gatewayBaseUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.1",
    "messages": [{"role": "user", "content": "你好"}]
  }'`,
  },
  {
    title: 'JavaScript',
    code: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_API_KEY",
  baseURL: "${gatewayBaseUrl}",
});

const completion = await client.chat.completions.create({
  model: "gpt-5.1",
  messages: [{ role: "user", content: "你好" }],
});`,
  },
  {
    title: 'Python',
    code: `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${gatewayBaseUrl}",
)

resp = client.chat.completions.create(
    model="gpt-5.1",
    messages=[{"role": "user", "content": "你好"}],
)`,
  },
];

const copyText = async (value) => {
  const ok = await copy(value);
  if (ok) {
    showSuccess('已复制到剪切板');
  }
};

const ConfigRow = ({ label, value }) => (
  <div className='flex flex-col gap-2 rounded-lg border border-semi-color-border bg-semi-color-fill-0 p-4 md:flex-row md:items-center md:justify-between'>
    <div>
      <Text strong>{label}</Text>
      <div className='mt-1 font-mono text-sm text-semi-color-text-1 break-all'>
        {value}
      </div>
    </div>
    <Button
      icon={<IconCopy />}
      theme='borderless'
      type='tertiary'
      onClick={() => copyText(value)}
      aria-label={`复制 ${label}`}
    />
  </div>
);

const Docs = () => {
  return (
    <div className='min-h-screen bg-semi-color-bg-0 px-3 pb-12 pt-24 md:px-8'>
      <div className='mx-auto flex max-w-6xl flex-col gap-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <Tag color='blue' prefixIcon={<IconKey />}>
              统一接口接入配置
            </Tag>
            <Title heading={1} className='!mt-4 !mb-3'>
              API 配置文档
            </Title>
            <Paragraph className='max-w-3xl !text-semi-color-text-1'>
              这里汇总网站常用的 OpenAI 兼容接口、WindsurfAPI
              专线、模型价格与客户端配置方式。页面不展示真实密钥，请在控制台创建令牌后填入自己的
              API Key。
            </Paragraph>
          </div>
          <Button
            icon={<IconExternalOpen />}
            theme='solid'
            type='primary'
            onClick={() => window.open('/pricing', '_self')}
          >
            查看模型价格
          </Button>
        </div>

        <Card shadows='never' bordered className='!rounded-lg'>
          <div className='grid gap-3 md:grid-cols-2'>
            {quickLinks.map((item) => (
              <ConfigRow
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </Card>

        <div className='grid gap-4 md:grid-cols-2'>
          {clientConfigs.map((config) => (
            <Card
              key={config.title}
              shadows='never'
              bordered
              className='!rounded-lg'
            >
              <Title heading={4} className='!mb-4'>
                {config.title}
              </Title>
              <div className='flex flex-col gap-3'>
                {config.items.map(([label, value]) => (
                  <ConfigRow key={label} label={label} value={value} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Card shadows='never' bordered className='!rounded-lg'>
          <Title heading={3} className='!mb-4'>
            常用接口
          </Title>
          <div className='grid gap-3 md:grid-cols-2'>
            {endpoints.map(([path, desc]) => (
              <div
                key={path}
                className='rounded-lg border border-semi-color-border p-4'
              >
                <div className='flex items-center gap-2'>
                  <IconLink />
                  <Text strong className='font-mono'>
                    {path}
                  </Text>
                </div>
                <Paragraph className='!mb-0 !mt-2 !text-semi-color-text-1'>
                  {desc}
                </Paragraph>
              </div>
            ))}
          </div>
        </Card>

        <Card shadows='never' bordered className='!rounded-lg'>
          <Title heading={3} className='!mb-2'>
            三步接入
          </Title>
          <div className='grid gap-3 md:grid-cols-3'>
            {[
              ['创建令牌', '在控制台创建或复制可用令牌。'],
              ['设置 Base URL', `把客户端 API Host 指向 ${gatewayBaseUrl}。`],
              [
                '选择模型并发起请求',
                '从模型广场选择模型，按 OpenAI 兼容格式请求。',
              ],
            ].map(([step, text], index) => (
              <div key={step} className='rounded-lg bg-semi-color-fill-0 p-4'>
                <Tag color='light-blue'>Step {index + 1}</Tag>
                <Title heading={5} className='!mb-1 !mt-3'>
                  {step}
                </Title>
                <Text type='tertiary'>{text}</Text>
              </div>
            ))}
          </div>
        </Card>

        <div className='grid gap-4 lg:grid-cols-3'>
          {examples.map((example) => (
            <Card
              key={example.title}
              shadows='never'
              bordered
              className='!rounded-lg'
            >
              <div className='mb-3 flex items-center justify-between'>
                <Title heading={4} className='!mb-0'>
                  {example.title}
                </Title>
                <Button
                  icon={<IconCopy />}
                  theme='borderless'
                  onClick={() => copyText(example.code)}
                />
              </div>
              <pre className='overflow-x-auto rounded-lg bg-[#111827] p-4 text-xs leading-6 text-white'>
                <code>{example.code}</code>
              </pre>
            </Card>
          ))}
        </div>

        <Divider margin='12px' />
        <Text type='tertiary'>
          安全提示：不要把 API Key
          写进前端代码、公开仓库或截图。服务端调用时建议通过环境变量读取密钥。
        </Text>
      </div>
    </div>
  );
};

export default Docs;
