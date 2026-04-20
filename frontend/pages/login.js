// pages/login.js
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash, FaUserGraduate, FaChalkboardTeacher, FaUserTie, FaShieldAlt } from 'react-icons/fa'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // Load saved credentials if "Remember Me" was checked
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('savedIdentifier')
    const savedPassword = localStorage.getItem('savedPassword')
    const savedRemember = localStorage.getItem('rememberMe')
    
    if (savedRemember === 'true' && savedIdentifier) {
      setIdentifier(savedIdentifier)
      setPassword(savedPassword || '')
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!identifier.trim()) {
      toast.error('Please enter your registration number or email')
      return
    }
    
    if (!password.trim()) {
      toast.error('Please enter your password')
      return
    }
    
    setLoading(true)
    
    const result = await login(identifier, password)
    
    if (result.success) {
      // Handle "Remember Me"
      if (rememberMe) {
        localStorage.setItem('savedIdentifier', identifier)
        localStorage.setItem('savedPassword', password)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('savedIdentifier')
        localStorage.removeItem('savedPassword')
        localStorage.removeItem('rememberMe')
      }
      
      toast.success(`Welcome back, ${result.user?.full_name?.split(' ')[0]}!`)
      
      setTimeout(() => {
        router.push(result.redirectUrl)
      }, 500)
      
    } else if (result.needs_verification) {
      // Redirect to OTP verification page
      toast('Please verify your email first. A new OTP has been sent.', {
        icon: '📧',
        duration: 5000
      })
      sessionStorage.setItem('pendingEmail', result.email)
      sessionStorage.setItem('pendingUserId', result.user_id)
      router.push(`/verify-otp?email=${encodeURIComponent(result.email)}&from=login`)
      
    } else if (result.needs_profile_completion) {
      // Store user ID in session storage and redirect to profile completion
      sessionStorage.setItem('pendingUserId', result.user_id)
      sessionStorage.setItem('pendingUserRole', result.role || 'student')
      toast('Please complete your profile to continue', {
        icon: '📝',
        duration: 4000
      })
      setTimeout(() => {
        router.push(`/complete-profile?user_id=${result.user_id}&role=${result.role || 'student'}`)
      }, 500)
      
    } else {
      toast.error(result.error || 'Invalid credentials. Please try again.')
    }
    
    setLoading(false)
  }

  const getRoleIcon = () => {
    return (
      <div className="flex justify-center space-x-4 mb-6">
        <div className="text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <FaUserGraduate className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Student</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <FaChalkboardTeacher className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Candidate</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <FaUserTie className="text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Commissioner</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <FaShieldAlt className="text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Dean/Admin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl mb-4">
            <span className="text-3xl">🗳️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">MUST Elections</h1>
          <p className="text-gray-500 mt-2">Student Leadership Voting System</p>
        </div>

        {/* Role Icons */}
        {getRoleIcon()}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g., ADMIN001 or dean@must.ac.ke"
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to MUST Elections?</span>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Create New Account
          </Link>
          <p className="text-xs text-gray-500 mt-4">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        
      </div>
    </div>
  )
}