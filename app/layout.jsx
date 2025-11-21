import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PizzAI - AI-Powered Restaurant Operations',
  description: 'Intelligent operations management for pizza restaurants',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
