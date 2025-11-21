import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/AuthContext'

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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
