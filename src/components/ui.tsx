import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Screen({ title, onBack, right, children }: { title: string; onBack?: () => void; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        {onBack && (
          <button onClick={onBack} className="-ml-1 rounded-full p-2 text-slate-300 active:bg-slate-800" aria-label="Back">
            ←
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {right}
      </header>
      <div className="flex-1 px-4 pb-8 pt-4">{children}</div>
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base = 'rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800',
    danger: 'bg-red-900 text-red-100 hover:bg-red-800',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}>{children}</div>
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const tones: Record<string, string> = {
    default: 'bg-slate-800 text-slate-200',
    good: 'bg-emerald-900 text-emerald-200',
    warn: 'bg-amber-900 text-amber-200',
    bad: 'bg-red-900 text-red-200',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}
