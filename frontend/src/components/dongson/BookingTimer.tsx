import { useEffect, useState } from 'react'

interface BookingTimerProps {
  /** Số giây giữ chỗ còn lại do backend trả về. */
  initialSeconds: number
  onExpire?: () => void
  className?: string
}

export function BookingTimer({
  initialSeconds,
  onExpire,
  className = '',
}: BookingTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire()
      return
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft, onExpire])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  // Progress from 0 to 1
  const progress = initialSeconds > 0 ? 1 - secondsLeft / initialSeconds : 1
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * progress

  return (
    <div className={`flex items-center gap-3 bg-paper-deep/80 border border-hairline px-3.5 py-2 rounded text-ink ${className}`}>
      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 60 60" width="40" height="40" className="rotate-[-90deg]">
          {/* Track */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="3.5"
          />
          {/* Progress */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="var(--terracotta)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="material-symbols-outlined text-terracotta text-sm absolute">
          timer
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold text-base tracking-tight tabular-nums text-terracotta">
            {formattedTime}
          </span>
          <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
            Thời gian giữ chỗ
          </span>
        </div>
        <span className="text-[11.5px] text-ink-soft leading-tight">
          Ghế được giữ tạm để bạn hoàn tất đặt vé
        </span>
      </div>
    </div>
  )
}
