import { Link } from '@tanstack/react-router'
import { Check, Copy, ExternalLink, KeyRound, LinkIcon } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicLayout } from '@/components/layout'

const siteBaseUrl = 'https://api.turbo2c.xyz'
const gatewayBaseUrl = `${siteBaseUrl}/v1`
const windsurfBaseUrl = 'https://windsurf.turbo2c.xyz'

const quickLinks = [
  { label: 'OpenAI Base URL', value: gatewayBaseUrl },
  { label: '模型列表', value: `${gatewayBaseUrl}/models` },
  { label: '模型价格', value: `${siteBaseUrl}/pricing` },
  { label: 'WindsurfAPI Dashboard', value: `${windsurfBaseUrl}/dashboard` },
]

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
]

const endpoints = [
  ['/v1/chat/completions', 'OpenAI Chat Completions，适合多数客户端'],
  ['/v1/responses', 'OpenAI Responses API，适合 Codex / 新版 SDK'],
  ['/v1/images/generations', '图片生成接口'],
  ['/v1/models', '模型列表与可用性检查'],
]

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
]

function ConfigRow(props: { label: string; value: string }) {
  const { copiedText, copyToClipboard } = useCopyToClipboard()
  const copied = copiedText === props.value

  return (
    <div className='border-border bg-muted/25 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <div className='text-sm font-medium'>{props.label}</div>
        <div className='text-muted-foreground mt-1 font-mono text-sm break-all'>
          {props.value}
        </div>
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon'
        aria-label={`复制 ${props.label}`}
        onClick={() => copyToClipboard(props.value)}
      >
        {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
      </Button>
    </div>
  )
}

export function Docs() {
  const { copyToClipboard } = useCopyToClipboard()

  return (
    <PublicLayout>
      <div className='mx-auto flex max-w-6xl flex-col gap-6 py-8'>
        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div className='space-y-4'>
            <Badge variant='secondary' className='gap-1.5'>
              <KeyRound className='h-3.5 w-3.5' />
              统一接口接入配置
            </Badge>
            <div className='space-y-3'>
              <h1 className='text-3xl font-semibold tracking-normal md:text-4xl'>
                API 配置文档
              </h1>
              <p className='text-muted-foreground max-w-3xl text-base leading-7'>
                这里汇总网站常用的 OpenAI 兼容接口、WindsurfAPI
                专线、模型价格与客户端配置方式。页面不展示真实密钥，请在控制台创建令牌后填入自己的
                API Key。
              </p>
            </div>
          </div>
          <Button render={<Link to='/pricing' />}>
            查看模型价格
            <ExternalLink className='h-4 w-4' />
          </Button>
        </div>

        <Card>
          <CardContent className='grid gap-3 md:grid-cols-2'>
            {quickLinks.map((item) => (
              <ConfigRow
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </CardContent>
        </Card>

        <div className='grid gap-4 md:grid-cols-2'>
          {clientConfigs.map((config) => (
            <Card key={config.title}>
              <CardHeader>
                <CardTitle>{config.title}</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-col gap-3'>
                {config.items.map(([label, value]) => (
                  <ConfigRow key={label} label={label} value={value} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>常用接口</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 md:grid-cols-2'>
            {endpoints.map(([path, desc]) => (
              <div key={path} className='border-border rounded-lg border p-4'>
                <div className='flex items-center gap-2'>
                  <LinkIcon className='h-4 w-4' />
                  <span className='font-mono text-sm font-medium'>{path}</span>
                </div>
                <p className='text-muted-foreground mt-2 text-sm'>{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>三步接入</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 md:grid-cols-3'>
            {[
              ['Step 1', '创建令牌', '在控制台创建或复制可用令牌。'],
              [
                'Step 2',
                '设置 Base URL',
                `把客户端 API Host 指向 ${gatewayBaseUrl}。`,
              ],
              [
                'Step 3',
                '选择模型并发起请求',
                '从模型广场选择模型，按 OpenAI 兼容格式请求。',
              ],
            ].map(([tag, title, text]) => (
              <div key={tag} className='bg-muted/25 rounded-lg p-4'>
                <Badge variant='outline'>{tag}</Badge>
                <h2 className='mt-3 text-base font-medium'>{title}</h2>
                <p className='text-muted-foreground mt-1 text-sm'>{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className='grid gap-4 lg:grid-cols-3'>
          {examples.map((example) => (
            <Card key={example.title}>
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle>{example.title}</CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={`复制 ${example.title}`}
                  onClick={() => copyToClipboard(example.code)}
                >
                  <Copy className='h-4 w-4' />
                </Button>
              </CardHeader>
              <CardContent>
                <pre className='overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-6 text-zinc-50'>
                  <code>{example.code}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className='border-border text-muted-foreground border-t pt-4 text-sm'>
          安全提示：不要把 API Key
          写进前端代码、公开仓库或截图。服务端调用时建议通过环境变量读取密钥。
        </p>
      </div>
    </PublicLayout>
  )
}
