// pages/forgot-password.js
import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaEnvelope, FaArrowLeft, FaSpinner } from 'react-icons/fa'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }
    
    setLoading(true)
    try {
      await axios.post('http://localhost:3001/api/auth/forgot-password', { email })
      setSubmitted(true)
      toast.success('Password reset link sent to your email')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            The link will expire in 1 hour. If you don't receive it, check your spam folder.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Forgot Password?</h1>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:underline flex items-center justify-center space-x-1">
            <FaArrowLeft size={12} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}