// pages/verify-otp.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function VerifyOTP() {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [fromLogin, setFromLogin] = useState(false)

  useEffect(() => {
    const { email: queryEmail, from } = router.query
    
    if (queryEmail) {
      setEmail(queryEmail)
    } else {
      const storedEmail = sessionStorage.getItem('pendingEmail')
      if (storedEmail) {
        setEmail(storedEmail)
      } else {
        toast.error('No email found. Please register again.')
        router.push('/register')
      }
    }
    
    // Check if coming from login page
    if (from === 'login') {
      setFromLogin(true)
    }
  }, [router.query])

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('http://localhost:3001/api/auth/verify-otp', {
        email,
        otp
      })

      if (response.data.message) {
        toast.success(response.data.message)
        
        // Check if profile needs to be completed
        if (response.data.needs_profile_completion) {
          sessionStorage.setItem('pendingUserId', response.data.user_id)
          sessionStorage.setItem('pendingUserRole', response.data.role || 'student')
          router.push(`/complete-profile?user_id=${response.data.user_id}&role=${response.data.role || 'student'}`)
        } 
        // If coming from login page, redirect back to login
        else if (fromLogin) {
          toast.success('Email verified! You can now login.')
          setTimeout(() => {
            router.push('/login')
          }, 1500)
        } 
        // Normal registration flow
        else {
          toast.success('Email verified successfully! Please login.')
          setTimeout(() => {
            router.push('/login')
          }, 1500)
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      const errorMsg = error.response?.data?.error || 'Verification failed. Please try again.'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (countdown > 0) return
    
    setResendLoading(true)
    try {
      const response = await axios.post('http://localhost:3001/api/auth/resend-otp', {
        email
      })
      
      toast.success('New OTP sent to your email')
      setCountdown(60)
      
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">
            We've sent a verification code to
            <br />
            <span className="font-semibold text-blue-600">{email}</span>
          </p>
          {fromLogin && (
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ You need to verify your email before logging in.
            </p>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={resendOTP}
            disabled={resendLoading || countdown > 0}
            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {resendLoading ? (
              <span className="flex items-center justify-center space-x-1">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </span>
            ) : countdown > 0 ? (
              `Resend OTP in ${countdown}s`
            ) : (
              'Resend OTP'
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-500 hover:text-gray-700 text-sm transition"
          >
            Back to Login
          </button>
        </div>

        {/* Help section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Didn't receive the code?</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• Wait a few minutes and try resending</li>
            <li>• Contact support if you continue having issues</li>
          </ul>
        </div>

        
      </div>
    </div>
  )
}