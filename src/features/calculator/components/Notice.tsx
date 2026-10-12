import type { ReactNode } from 'react'

interface NoticeProps {
  tone: 'info' | 'warning'
  title?: string
  /** `alert` interrumpe al lector de pantalla; úsalo solo para avisos que bloquean. */
  role?: 'alert' | 'status' | 'note'
  children: ReactNode
}

const TONE_LABEL = { info: 'Información', warning: 'Aviso' } as const

/** Mensaje destacado. El tono se indica también con texto, no solo con color. */
export function Notice({ tone, title, role = 'note', children }: NoticeProps) {
  return (
    <div className={`notice notice-${tone}`} role={role}>
      <p className="notice-title">
        <span className="notice-tone">{TONE_LABEL[tone]}</span>
        {title ? `: ${title}` : ''}
      </p>
      <div className="notice-body">{children}</div>
    </div>
  )
}
