import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lista de Presentes — Antônia Lucena 80 Anos',
  description: 'Escolha um presente especial para celebrar os 80 anos de Antônia Lucena! 16 de agosto de 2026.',
  openGraph: {
    title: 'Lista de Presentes — Antônia Lucena 80 Anos',
    description: 'Ajude a tornar esse dia ainda mais especial! Escolha um presente.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FDF8F3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-inter">{children}</body>
    </html>
  )
}
