import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout'
import { ImageGeneration } from '@/features/image-generation'

export const Route = createFileRoute('/_authenticated/image-generation/')({
  component: ImageGenerationPage,
})

function ImageGenerationPage() {
  return (
    <Main className='overflow-auto p-4 sm:p-6'>
      <ImageGeneration />
    </Main>
  )
}
