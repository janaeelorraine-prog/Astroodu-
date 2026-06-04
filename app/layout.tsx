import type { Metadata } from 'next'
import { Cinzel, Cinzel_Decorative, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import TempleChrome from '@/components/TempleChrome'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
})
const cinzelDec = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel-dec',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'AstroOdu — The Temple',
  description: 'Iboru. Iboya. Ibosheshe.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cinzelDec.variable} ${cormorant.variable}`}
    >
      <body>
        <TempleChrome />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  )
}
