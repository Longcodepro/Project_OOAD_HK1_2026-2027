import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost' | 'dark' | 'secondary'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const types = {
    primary: 'cta-terracotta hover:bg-terracotta-hover',
    ghost: 'border border-hairline bg-card text-ink hover:border-bronze hover:bg-paper-deep',
    secondary: 'border border-hairline bg-paper-deep text-ink hover:border-bronze',
    dark: 'bg-ink text-paper hover:bg-ink/85',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 cursor-pointer ${types[kind]} ${className}`}
    >
      {children}
    </button>
  )
}
