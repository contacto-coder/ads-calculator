import type { Metadata } from 'next'
import './globals.css'
import '@/features/calculator/styles/tokens.css'
import '@/features/calculator/styles/app.css'
import '@/features/calculator/styles/print.css'

export const metadata: Metadata = {
  title: 'Presupuesto inmobiliario para Meta',
  description:
    'Calcula cuánto puedes asignar a publicidad en Meta según tu comisión estimada y cómo repartirlo en 30 días.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
