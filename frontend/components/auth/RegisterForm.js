// components/auth/RegisterForm.js
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    registration_number: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
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

    const result = await registerUser(
      formData.registration_number,
      formData.email,
      formData.password,
      formData.full_name,
      formData.department,
      formData.year_of_study
    )

    if (result.success) {
      if (result.auto_verified) {
        toast.success('Registration successful! Please login.')
        router.push('/login')
      } else {
        toast.success('OTP sent to your email')
        router.push(`/verify-otp?email=${encodeURIComponent(result.email)}`)
      }
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  const departments = [
    'Computer Science',
    'Engineering',
    'Business',
    'Education',
    'Health Sciences',
    'Agriculture',
    'Law'
  ]

  return (
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
      
      <select
        name="department"
        value={formData.department}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        required
      >
        <option value="">Select Department</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
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
  )
}