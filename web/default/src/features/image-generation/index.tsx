import ImagePlaygroundApp from './playground/App'
import './playground/playground.css'

export function ImageGeneration() {
  return (
    <div className='newapi-image-playground -m-4 min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50'>
      <ImagePlaygroundApp />
    </div>
  )
}
