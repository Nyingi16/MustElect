// pages/_app.js
import '../styles/globals.css'
import '../styles/themes/student.css'
import '../styles/themes/candidate.css'
import '../styles/themes/commissioner.css'
import '../styles/themes/dean.css'

import { AuthProvider } from '../context/AuthContext'
import { Toaster } from 'react-hot-toast'
import Navbar from '../components/common/Navbar'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const noNavbarPages = ['/login', '/register']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const showNavbar = !noNavbarPages.includes(router.pathname)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role) {
      document.body.className = `${role}-theme`
    }
  }, [])

  return (
    <AuthProvider>
      <Toaster position="top-right" />
      {showNavbar && <Navbar />}
      <Component {...pageProps} />
    </AuthProvider>
  )
}
