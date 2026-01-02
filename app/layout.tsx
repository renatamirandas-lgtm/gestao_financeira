import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestão Financeira',
  description: 'Sistema de controle financeiro pessoal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

