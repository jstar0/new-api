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
import SupportPromptModal from './components/SupportPromptModal'
import TaskGrid from './components/TaskGrid'
import Toast from './components/Toast'
import { useDockerApiUrlMigrationNotice } from './hooks/useDockerApiUrlMigrationNotice'
import {
  buildSettingsFromUrlParams,
  clearUrlSettingParams,
  hasUrlSettingParams,
} from './lib/urlSettings'
import { initStore } from './store'
import { useStore } from './store'

const IMAGE_MODEL_PATTERN =
  /image|imagen|dall|gpt-image|flux|jimeng|midjourney|mj|wanx|kolors/i

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

export default function App() {
  const setSettings = useStore((s) => s.setSettings)
  useDockerApiUrlMigrationNotice()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextSettings = buildSettingsFromUrlParams(
      useStore.getState().settings,
      searchParams
    )

    setSettings(nextSettings)

    if (hasUrlSettingParams(searchParams)) {
      clearUrlSettingParams(searchParams)

      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    initStore()

    getUserModels()
      .then((models) => {
        const defaultModel = pickDefaultModel(models)
        if (!defaultModel) return

        const { settings } = useStore.getState()
        const profiles = settings.profiles.map((profile) =>
          profile.id === settings.activeProfileId &&
          (!profile.model || profile.model === 'gpt-image-2')
            ? {
                ...profile,
                name: 'TurboAPI',
                baseUrl: '/pg',
                apiKey: '',
                model: defaultModel,
              }
            : profile
        )

        setSettings({
          profiles,
          baseUrl: '/pg',
          apiKey: '',
          model:
            profiles.find((profile) => profile.id === settings.activeProfileId)
              ?.model ?? defaultModel,
        })
      })
      .catch(() => {
        setSettings({ baseUrl: '/pg', apiKey: '' })
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
      <SupportPromptModal />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}
