import { NonLaHat } from '../dongson/NonLaHat'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const hatSizes = {
    sm: { w: 28, h: 18 },
    md: { w: 34, h: 22 },
    lg: { w: 44, h: 28 },
  }

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-extrabold',
    lg: 'text-2xl font-black',
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className.includes('text-') ? '' : 'text-ink'} ${className}`}>
      <NonLaHat
        full={false}
        periodic={true}
        intervalMs={8500}
        width={hatSizes[size].w}
        height={hatSizes[size].h}
        className="text-terracotta shrink-0"
      />
      <span className={`tracking-tight ${textSizes[size]}`}>
        VéXe <span className="text-terracotta">Việt</span>
      </span>
    </div>
  )
}
