import Footer from "./components/footer"
import Header from "./components/header"
import './global.css'
import { Courier_Prime } from 'next/font/google'

export const metadata = {
  title: 'Streets for All Membership Club',
  description: '',
  
}

const courier = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal'],
  subsets: ['latin']
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={courier.className} lang="en">
      <head>
      <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body >
        <Header/>
        {children}
        <Footer/>
      </body>
    </html>
  )
}
