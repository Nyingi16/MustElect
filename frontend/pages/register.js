// pages/register.js - Simplified version
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { SELECTABLE_ROLES, SCHOOLS } from '../utils/constants'

export default function Register() {
  const [formData, setFormData] = useState({
    registration_number: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    selected_role: 'student',
    // Student fields (only needed if student)
    department: '',
    year_of_study: ''
  })
  const [loading, setLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    // Only validate student-specific fields for students
    if (formData.selected_role === 'student') {
      if (!formData.department) {
        toast.error('Please select your school/department')
        setLoading(false)
        return
      }
      if (!formData.year_of_study) {
        toast.error('Please select your year of study')
        setLoading(false)
        return
      }
    }

    const result = await registerUser(
      formData.registration_number,
      formData.email,
      formData.password,
      formData.full_name,
      formData.selected_role,
      formData.department,
      formData.year_of_study,
      '', // justification (optional now)
      '', // qualifications (optional now)
      ''  // experience (optional now)
    )

    if (result.success) {
      toast.success(result.message || 'Registration successful! Please check your email for OTP.')
      sessionStorage.setItem('pendingEmail', result.email)
      router.push(`/verify-otp?email=${encodeURIComponent(result.email)}`)
    } else {
      toast.error(result.error || 'Registration failed')
    }
    setLoading(false)
  }

  const isRoleRequiringApproval = formData.selected_role !== 'student'
  const isStudent = formData.selected_role === 'student'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="full_name"
            placeholder="Full Name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          
          <input
            type="text"
            name="registration_number"
            placeholder="Registration Number"
            value={formData.registration_number}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          
          {/* Role Selection */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">I want to register as:</label>
            <select
              name="selected_role"
              value={formData.selected_role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            >
              {SELECTABLE_ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            {isRoleRequiringApproval && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                ⚠️ Note: Dean and Commissioner roles require admin approval. 
                You can register with basic info now and complete your profile after email verification.
                You will be notified once your role is approved.
              </div>
            )}
          </div>

          {/* Student-specific fields (only show for students) */}
          {isStudent && (
            <>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select School</option>
                {SCHOOLS.map(school => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
              
              <select
                name="year_of_study"
                value={formData.year_of_study}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Year of Study</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
            </>
          )}

          {/* For Dean/Commissioner - show simple info message */}
          {isRoleRequiringApproval && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                📝 You'll be able to complete your application details after email verification.
                For now, just verify your email to continue.
              </p>
            </div>
          )}
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm Password"
            value={formData.confirm_password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-2 rounded-lg font-semibold"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        
        <p className="text-center text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}