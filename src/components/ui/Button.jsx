import Spinner from './Spinner'

const variants = {
  primary:
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm',
  secondary:
    'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  danger:
    'bg-red-500 hover:bg-red-600 text-white',
  ghost:
    'text-blue-600 hover:bg-blue-50 active:bg-blue-100',
  google:
    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 shadow-sm',
}

export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
        'transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? <Spinner size="sm" color={variant === 'primary' ? 'white' : 'blue'} /> : children}
    </button>
  )
}
