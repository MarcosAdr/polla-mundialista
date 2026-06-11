import './globals.css'
import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Polla Mundialista',
  description: 'Participa, predice y gana en la Polla Mundialista.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
