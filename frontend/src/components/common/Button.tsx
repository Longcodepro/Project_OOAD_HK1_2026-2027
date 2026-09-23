import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost' | 'dark'
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
    primary: 'bg-violet-400 text-[#11163c] hover:bg-violet-300 disabled:opacity-50',
    ghost:
      'border border-white/15 bg-white/[.05] text-white hover:bg-white/[.12] disabled:opacity-50',
    dark: 'bg-[#0c1236] text-white hover:bg-[#182057] disabled:opacity-50',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${types[kind]} ${className}`}
    >
      {children}
    </button>
  )
}
