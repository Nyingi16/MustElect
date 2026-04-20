// pages/index.js
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'  // Changed from '@/hooks/useAuth'
import Link from 'next/link'

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'student') window.location.href = '/dashboard/student'
      else if (user?.role === 'candidate') window.location.href = '/dashboard/candidate'
      else if (user?.role === 'commissioner') window.location.href = '/dashboard/commissioner'
      else if (user?.role === 'dean') window.location.href = '/dashboard/dean'
    }
  }, [isAuthenticated, user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              MUST Student Elections
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Secure, transparent, and decentralized voting system for Meru University 
              of Science & Technology student leadership elections.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/login" className="bg-white text-purple-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Login
              </Link>
              <Link href="/register" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Blockchain Voting</h3>
              <p className="text-gray-600">Votes recorded on blockchain - immutable and transparent</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">One Student One Vote</h3>
              <p className="text-gray-600">Prevents double voting with cryptographic verification</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Results</h3>
              <p className="text-gray-600">Live election results and voter turnout tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}