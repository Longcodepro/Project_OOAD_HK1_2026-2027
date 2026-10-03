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
    primary:
      'bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 shadow-sm cursor-pointer',
    ghost:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs cursor-pointer',
    secondary:
      'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50 cursor-pointer',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-sm',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${types[kind]} ${className}`}
    >
      {children}
    </button>
  )
}
