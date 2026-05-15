import { useEffect } from 'react'
import ConfirmDialog from './components/ConfirmDialog'
import DetailModal from './components/DetailModal'
import Header from './components/Header'
import ImageContextMenu from './components/ImageContextMenu'
import InputBar from './components/InputBar'
import Lightbox from './components/Lightbox'
import MaskEditorModal from './components/MaskEditorModal'
import SearchBar from './components/SearchBar'
import SettingsModal from './components/SettingsModal'
import TaskGrid from './components/TaskGrid'
import Toast from './components/Toast'
import { initStore } from './store'
import { useStore } from './store'
import type { ApiProfile, AppSettings } from './types'

const IMAGE_MODEL_PATTERN =
  /image|imagen|dall|gpt-image|flux|jimeng|midjourney|mj|wanx|kolors/i
const TURBO_PROFILE_ID = 'turboapi-fixed'
const DEFAULT_OPENAI_PROFILE_ID = 'default-openai'
const TURBO_BASE_URL = '/pg'
const FALLBACK_IMAGE_MODEL = 'gpt-image-2'

async function getUserModels(): Promise<
  Array<{ label: string; value: string }>
> {
  const response = await fetch('/api/user/models', {
    credentials: 'same-origin'
  })
  const data = await response.json()

  if (!data?.success || !Array.isArray(data.data)) return []

  return data.data.map((model: string) => ({
    label: model,
    value: model
  }))
}

function pickDefaultModel(models: Array<{ value: string }>) {
  return (
    models.find((item) => IMAGE_MODEL_PATTERN.test(item.value))?.value ??
    models[0]?.value
  )
}

function buildTurboProfile(
  settings: AppSettings,
  existingProfile?: ApiProfile,
  model?: string
): ApiProfile {
  return {
    id: TURBO_PROFILE_ID,
    name: 'TurboAPI',
    provider: 'openai',
    baseUrl: existingProfile?.baseUrl || TURBO_BASE_URL,
    apiKey: existingProfile?.apiKey ?? '',
    model:
      existingProfile?.model || model || settings.model || FALLBACK_IMAGE_MODEL,
    timeout: existingProfile?.timeout ?? settings.timeout,
    apiMode: existingProfile?.apiMode || 'images',
    codexCli: existingProfile?.codexCli ?? false,
    apiProxy: existingProfile?.apiProxy ?? false,
    responseFormatB64Json: existingProfile?.responseFormatB64Json,
    providerDrafts: existingProfile?.providerDrafts
  }
}

function ensureTurboDefaultProfile(settings: AppSettings, model?: string) {
  const existingTurboProfile = settings.profiles.find(
    (profile) => profile.id === TURBO_PROFILE_ID
  )
  const turboProfile = buildTurboProfile(settings, existingTurboProfile, model)
  const hasTurboProfile = Boolean(existingTurboProfile)
  const profiles = hasTurboProfile
    ? settings.profiles.map((profile) =>
        profile.id === TURBO_PROFILE_ID ? turboProfile : profile
      )
    : [turboProfile, ...settings.profiles]
  const activeProfileExists = profiles.some(
    (profile) => profile.id === settings.activeProfileId
  )
  const previousActiveProfile = settings.profiles.find(
    (profile) => profile.id === settings.activeProfileId
  )
  const isPristineDefaultProfile =
    settings.profiles.length === 1 &&
    previousActiveProfile?.id === DEFAULT_OPENAI_PROFILE_ID &&
    previousActiveProfile.baseUrl.trim() === TURBO_BASE_URL &&
    !previousActiveProfile.apiKey.trim()
  const activeProfileId =
    !activeProfileExists ||
    settings.activeProfileId === TURBO_PROFILE_ID ||
    isPristineDefaultProfile
      ? TURBO_PROFILE_ID
      : settings.activeProfileId
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? turboProfile
  const providerOrder = settings.providerOrder?.includes('openai')
    ? settings.providerOrder
    : ['openai', ...(settings.providerOrder ?? [])]

  return {
    activeProfileId,
    baseUrl: activeProfile.baseUrl,
    apiKey: activeProfile.apiKey,
    model: activeProfile.model,
    timeout: activeProfile.timeout,
    apiMode: activeProfile.apiMode,
    codexCli: activeProfile.codexCli,
    apiProxy: activeProfile.apiProxy,
    providerOrder,
    profiles
  }
}

export default function App() {
  const setSettings = useStore((s) => s.setSettings)

  useEffect(() => {
    initStore()
    setSettings(ensureTurboDefaultProfile(useStore.getState().settings))

    getUserModels()
      .then((models) => {
        const defaultModel = pickDefaultModel(models)
        setSettings(
          ensureTurboDefaultProfile(useStore.getState().settings, defaultModel)
        )
      })
      .catch(() => {
        setSettings(ensureTurboDefaultProfile(useStore.getState().settings))
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
      <SettingsModal />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}
