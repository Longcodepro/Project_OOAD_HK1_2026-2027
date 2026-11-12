import { useMemo } from 'react'
import { CRANE, renderFigureSvg } from './dongsonData'

interface FlockOfCranesProps {
  className?: string
  title?: string
  subtitle?: string
  badge?: string
}

export function FlockOfCranes({
  className = '',
  title = 'HÀNH TRÌNH PHƯƠNG NAM & BẮC',
  subtitle = 'Đàn chim Lạc dẫn lối ngàn dặm non sông',
  badge = '42+ TỈNH THÀNH',
}: FlockOfCranesProps) {
  const craneHtml = useMemo(() => renderFigureSvg(CRANE), [])

  const cranes = [
    { delay: 0, top: 4, w: 130, dur: 22 },
    { delay: -5, top: 22, w: 90, dur: 28 },
    { delay: -10, top: 0, w: 74, dur: 32 },
    { delay: -15, top: 28, w: 98, dur: 26 },
    { delay: -19, top: 12, w: 84, dur: 30 },
  ]

  return (
    <div
      className={`my-6 relative overflow-hidden border-y border-hairline bg-paper-deep/50 py-2.5 rounded ${className}`}
    >
      <div className="max-w-[1080px] mx-auto px-4 flex items-center justify-between relative z-10 pointer-events-none mb-1">
        <div className="flex min-w-0 items-center gap-2 text-ink-soft text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-celadon animate-pulse"></span>
          <span className="font-bold text-ink uppercase tracking-widest text-[11px] whitespace-nowrap">
            {title}
          </span>
          <span className="text-hairline">|</span>
          <span className="hidden sm:inline truncate text-ink-soft">{subtitle}</span>
        </div>
        <span className="shrink-0 whitespace-nowrap pl-3 text-bronze font-bold text-[11px] tracking-widest uppercase">
          {badge}
        </span>
      </div>

      <div className="flock w-full h-14 relative overflow-hidden">
        {cranes.map((c, idx) => {
          const h = Math.round(c.w * 0.42)
          return (
            <div
              key={idx}
              className="fly"
              style={{
                top: `${c.top}px`,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
              }}
            >
              <svg
                viewBox="0 0 200 84"
                width={c.w}
                height={h}
                className="motif flap text-bronze"
                style={{
                  animationDelay: `${c.delay / 3}s`,
                }}
                dangerouslySetInnerHTML={{ __html: craneHtml }}
                aria-hidden="true"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
