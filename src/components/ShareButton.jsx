import { Share2 } from 'lucide-react'

export default function ShareButton({ onClick, title, size = 'sm', className = '' }) {
  const isSmall = size === 'sm'
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors ${
        isSmall ? 'w-7 h-7' : 'w-9 h-9'
      } ${className}`}
      title={title || 'Compartir'}
      type="button"
    >
      <Share2 className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </button>
  )
}
