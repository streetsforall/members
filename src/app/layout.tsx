import Footer from "./components/footer"
import Header from "./components/header"
import './global.css'

export const metadata = {
  title: 'Streets for All Membership',
  description: '',
  
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
      <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body>
        <Header/>
        {children}
        <Footer/>
      </body>
    </html>
  )
}
