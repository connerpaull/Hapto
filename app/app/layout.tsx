
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hapto - Professional Haptic Cue Editor',
  description: 'Create and edit haptic cues for your videos with frame-level precision',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
