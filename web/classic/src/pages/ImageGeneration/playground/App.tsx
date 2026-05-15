import { useEffect } from 'react'
import ConfirmDialog from './components/ConfirmDialog'
import DetailModal from './components/DetailModal'
import Header from './components/Header'
import ImageContextMenu from './components/ImageContextMenu'
import InputBar from './components/InputBar'
import Lightbox from './components/Lightbox'
import MaskEditorModal from './components/MaskEditorModal'
import SearchBar from './components/SearchBar'
import TaskGrid from './components/TaskGrid'
import Toast from './components/Toast'
import { initStore } from './store'
import { useStore } from './store'
import type { AppSettings } from './types'

const IMAGE_MODEL_PATTERN =
  /image|imagen|dall|gpt-image|flux|jimeng|midjourney|mj|wanx|kolors/i
const TURBO_PROFILE_ID = 'turboapi-fixed'
const TURBO_BASE_URL = '/pg'
const FALLBACK_IMAGE_MODEL = 'gpt-image-2'

async function getUserModels(): Promise<Array<{ label: string; value: string }>> {
  const response = await fetch('/api/user/models', {
    credentials: 'same-origin',
  })
  const data = await response.json()

  if (!data?.success || !Array.isArray(data.data)) return []

  return data.data.map((model: string) => ({
    label: model,
    value: model,
  }))
}

function pickDefaultModel(models: Array<{ value: string }>) {
  return (
    models.find((item) => IMAGE_MODEL_PATTERN.test(item.value))?.value ??
    models[0]?.value
  )
}

function applyTurboProfile(settings: AppSettings, model?: string) {
  const nextModel =
    model ||
    settings.model ||
    settings.profiles.find((profile) => profile.id === settings.activeProfileId)
      ?.model ||
    FALLBACK_IMAGE_MODEL

  return {
    activeProfileId: TURBO_PROFILE_ID,
    baseUrl: TURBO_BASE_URL,
    apiKey: '',
    model: nextModel,
    apiMode: 'images' as const,
    codexCli: false,
    apiProxy: false,
    customProviders: [],
    providerOrder: ['openai'],
    profiles: [
      {
        id: TURBO_PROFILE_ID,
        name: 'TurboAPI',
        provider: 'openai' as const,
        baseUrl: TURBO_BASE_URL,
        apiKey: '',
        model: nextModel,
        timeout: settings.timeout,
        apiMode: 'images' as const,
        codexCli: false,
        apiProxy: false,
      },
    ],
  }
}

export default function App() {
  const setSettings = useStore((s) => s.setSettings)

  useEffect(() => {
    initStore()
    setSettings(applyTurboProfile(useStore.getState().settings))

    getUserModels()
      .then((models) => {
        const defaultModel = pickDefaultModel(models)
        setSettings(
          applyTurboProfile(useStore.getState().settings, defaultModel)
        )
      })
      .catch(() => {
        setSettings(applyTurboProfile(useStore.getState().settings))
      })
  }, [setSettings])

  useEffect(() => {
    const preventPageImageDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest('img')) {
        e.preventDefault()
      }
    }

    document.addEventListener('dragstart', preventPageImageDrag)
    return () => document.removeEventListener('dragstart', preventPageImageDrag)
  }, [])

  return (
    <>
      <Header />
      <main data-home-main data-drag-select-surface className='pb-48'>
        <div className='safe-area-x mx-auto max-w-7xl'>
          <SearchBar />
          <TaskGrid />
        </div>
      </main>
      <InputBar />
      <DetailModal />
      <Lightbox />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}
