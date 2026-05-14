import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getUserGroups, getUserModels } from '../playground/api'
import { DEFAULT_GROUP } from '../playground/constants'

type ImageResult = {
  id: string
  url: string
  revisedPrompt?: string
}

type ImageGenerationResponse = {
  data?: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
  error?: {
    message?: string
  }
}

const SIZE_OPTIONS = ['1024x1024', '1024x1792', '1792x1024', '512x512']
const QUALITY_OPTIONS = ['auto', 'standard', 'hd']
const STYLE_OPTIONS = ['auto', 'vivid', 'natural']

const isLikelyImageModel = (model: string) =>
  /image|imagen|dall|gpt-image|flux|jimeng|midjourney|mj|wanx|kolors/i.test(
    model
  )

const toImageUrl = (item: { url?: string; b64_json?: string }) => {
  if (item.url) return item.url
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  return ''
}

export function ImageGeneration() {
  const { t } = useTranslation()
  const [model, setModel] = useState('')
  const [group, setGroup] = useState<string>(DEFAULT_GROUP)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('auto')
  const [style, setStyle] = useState('auto')
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])

  const { data: models = [], isLoading: loadingModels } = useQuery({
    queryKey: ['image-generation-models'],
    queryFn: getUserModels,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['image-generation-groups'],
    queryFn: getUserGroups,
  })

  const modelOptions = useMemo(() => {
    const imageModels = models.filter((item) => isLikelyImageModel(item.value))
    return imageModels.length > 0 ? imageModels : models
  }, [models])

  const groupOptions = useMemo(() => {
    const hasAuto = groups.some((item) => item.value === DEFAULT_GROUP)
    return hasAuto
      ? groups
      : [
          {
            value: DEFAULT_GROUP,
            label: 'Auto',
            ratio: 1,
            desc: 'Circuit Breaker',
          },
          ...groups,
        ]
  }, [groups])

  useEffect(() => {
    if (model || modelOptions.length === 0) return
    setModel(modelOptions[0].value)
  }, [model, modelOptions])

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim()
    if (!model) {
      toast.error(t('Please select a model'))
      return
    }
    if (!trimmedPrompt) {
      toast.error(t('Please enter a prompt'))
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        model,
        group,
        prompt: trimmedPrompt,
        n: count,
        size,
      }
      if (quality !== 'auto') payload.quality = quality
      if (style !== 'auto') payload.style = style

      const res = await api.post<ImageGenerationResponse>(
        '/pg/images/generations',
        payload,
        {
          skipErrorHandler: true,
        } as Record<string, unknown>
      )

      const items = Array.isArray(res.data?.data) ? res.data.data : []
      const nextResults = items
        .map((item, index) => ({
          id: `${Date.now()}-${index}`,
          url: toImageUrl(item),
          revisedPrompt: item.revised_prompt,
        }))
        .filter((item) => item.url)

      if (nextResults.length === 0) {
        throw new Error(res.data?.error?.message || t('No image returned'))
      }

      setResults(nextResults)
      toast.success(t('Image generated'))
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        (error as Error).message ||
        t('Generation failed')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    toast.success(t('Copied'))
  }

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `image-generation-${index + 1}.png`
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>{t('Image Generation')}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Use your account balance to generate images through NewAPI.')}
          </p>
        </div>
      </div>

      <div className='grid gap-5 xl:grid-cols-[420px_1fr]'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Sparkles className='size-4' />
              {t('Generation settings')}
            </CardTitle>
            <CardDescription>
              {t('Select a relay model, group, and image parameters.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='image-model'>{t('Model')}</Label>
              <Select
                items={modelOptions}
                value={model}
                onValueChange={(value) => value && setModel(value)}
                disabled={loadingModels || loading}
              >
                <SelectTrigger id='image-model' className='w-full'>
                  <SelectValue placeholder={t('Select model')} />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='image-group'>{t('Group')}</Label>
              <Select
                items={groupOptions}
                value={group}
                onValueChange={(value) => value && setGroup(value)}
                disabled={loading}
              >
                <SelectTrigger id='image-group' className='w-full'>
                  <SelectValue placeholder={t('Select group')} />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {groupOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='image-prompt'>{t('Prompt')}</Label>
              <Textarea
                id='image-prompt'
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('Describe the image you want to create')}
                className='min-h-32 resize-y'
                disabled={loading}
              />
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='image-size'>{t('Size')}</Label>
                <Select
                  items={SIZE_OPTIONS.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                  value={size}
                  onValueChange={(value) => value && setSize(value)}
                  disabled={loading}
                >
                  <SelectTrigger id='image-size' className='w-full'>
                    <SelectValue placeholder={t('Size')} />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='image-count'>{t('Count')}</Label>
                <Input
                  id='image-count'
                  type='number'
                  min={1}
                  max={4}
                  value={count}
                  disabled={loading}
                  onChange={(event) =>
                    setCount(
                      Math.max(1, Math.min(4, Number(event.target.value) || 1))
                    )
                  }
                />
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='image-quality'>{t('Quality')}</Label>
                <Select
                  items={QUALITY_OPTIONS.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                  value={quality}
                  onValueChange={(value) => value && setQuality(value)}
                  disabled={loading}
                >
                  <SelectTrigger id='image-quality' className='w-full'>
                    <SelectValue placeholder={t('Quality')} />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {QUALITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='image-style'>{t('Style')}</Label>
                <Select
                  items={STYLE_OPTIONS.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                  value={style}
                  onValueChange={(value) => value && setStyle(value)}
                  disabled={loading}
                >
                  <SelectTrigger id='image-style' className='w-full'>
                    <SelectValue placeholder={t('Style')} />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type='button'
              className='w-full'
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ImageIcon className='size-4' />
              )}
              {loading ? t('Generating...') : t('Generate image')}
            </Button>
          </CardContent>
        </Card>

        <div className='bg-muted/20 min-h-[520px] rounded-lg border p-4'>
          {results.length === 0 ? (
            <div className='text-muted-foreground flex h-full min-h-[480px] flex-col items-center justify-center gap-3 text-center'>
              <ImageIcon className='size-10' />
              <div className='text-sm'>
                {t('Generated images will appear here.')}
              </div>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {results.map((item, index) => (
                <div
                  key={item.id}
                  className='bg-background overflow-hidden rounded-lg border'
                >
                  <div className='bg-muted aspect-square'>
                    <img
                      src={item.url}
                      alt={`generated-${index + 1}`}
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2 p-3'>
                    <div className='text-muted-foreground text-xs'>
                      {item.revisedPrompt || t('Generated image')}
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => copyUrl(item.url)}
                        title={t('Copy')}
                      >
                        <Copy className='size-4' />
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => downloadImage(item.url, index)}
                        title={t('Download')}
                      >
                        <Download className='size-4' />
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        render={
                          <a
                            href={item.url}
                            target='_blank'
                            rel='noopener noreferrer'
                          />
                        }
                        title={t('Open')}
                      >
                        <ExternalLink className='size-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
