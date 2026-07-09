interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`${sizes[size]} ${className}`}>
      <div className="w-full h-full border-2 border-(--color-border) border-t-(--color-primary) rounded-full animate-spin" />
    </div>
  )
}
