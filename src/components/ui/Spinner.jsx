const colors = {
  white: 'border-white/30 border-t-white',
  emerald: 'border-emerald-200 border-t-emerald-500',
  gray: 'border-gray-200 border-t-gray-500',
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
}

export default function Spinner({ size = 'md', color = 'emerald', fullScreen = false }) {
  const spinner = (
    <div
      className={[
        'rounded-full animate-spin',
        sizes[size],
        colors[color],
      ].join(' ')}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl">🏋️</div>
          <div className="w-8 h-8 rounded-full border-3 border-emerald-200 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return spinner
}
