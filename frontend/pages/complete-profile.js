// pages/complete-profile.js - For completing dean/commissioner details
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function CompleteProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [formData, setFormData] = useState({
    phone_number: '',
    justification: '',
    qualifications: '',
    experience: '',
    bio: ''
  })

  useEffect(() => {
    const { user_id, role } = router.query
    if (user_id) {
      setUserId(user_id)
      setUserRole(role)
    } else {
      const storedUserId = sessionStorage.getItem('pendingUserId')
      const storedRole = sessionStorage.getItem('pendingUserRole')
      if (storedUserId) {
        setUserId(storedUserId)
        setUserRole(storedRole)
      } else {
        router.push('/login')
      }
    }
  }, [router.query])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        user_id: userId,
        phone_number: formData.phone_number,
        bio: formData.bio
      }

      // Add role-specific fields for dean/commissioner
      if (userRole === 'dean' || userRole === 'commissioner') {
        payload.justification = formData.justification
        payload.qualifications = formData.qualifications
        payload.experience = formData.experience
      }

      const response = await axios.post('http://localhost:3001/api/auth/complete-profile', payload)

      if (response.data.message) {
        if (response.data.requires_approval) {
          toast.success('Profile completed! Your application has been submitted for admin approval.')
          toast.info('You will be notified once your role is approved.')
        } else {
          toast.success('Profile completed! You can now login.')
        }
        
        sessionStorage.removeItem('pendingUserId')
        sessionStorage.removeItem('pendingUserRole')
        router.push('/login')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  const isRoleRequiringApproval = userRole === 'dean' || userRole === 'commissioner'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">
            {isRoleRequiringApproval 
              ? `Please complete your ${userRole?.toUpperCase()} application`
              : 'Please complete your student profile'}
          </p>
          {isRoleRequiringApproval && (
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ Your application will be reviewed by the System Administrator
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., +254 700 000000"
              required
            />
          </div>

          {isRoleRequiringApproval && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you applying for this position? *
                </label>
                <textarea
                  name="justification"
                  value={formData.justification}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why you are suitable for this role..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualifications *
                </label>
                <textarea
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List your relevant qualifications..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relevant Experience *
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your relevant experience..."
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio (Optional)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us a little about yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isRoleRequiringApproval ? 'Submit Application' : 'Complete Profile')}
          </button>
        </form>
      </div>
    </div>
  )
}