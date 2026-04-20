// pages/candidates/apply.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ApplyCandidate() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    position: '',
    manifesto: '',
    campaign_slogan: '',
    achievements: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [existingApplication, setExistingApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      checkExistingApplication()
    }
  }, [isAuthenticated])

  const checkExistingApplication = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/candidate/application-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.hasApplied) {
        setExistingApplication(response.data.application)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    if (formData.manifesto.length < 50) {
      toast.error('Manifesto should be at least 50 characters')
      setSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      await axios.post('http://localhost:3001/api/candidate/apply',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Application submitted successfully!')
      router.push('/dashboard/candidate')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const withdrawApplication = async () => {
    if (!confirm('Are you sure you want to withdraw your application?')) return

    try {
      const token = localStorage.getItem('authToken')
      await axios.delete('http://localhost:3001/api/candidate/withdraw', {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Application withdrawn')
      setExistingApplication(null)
      router.push('/dashboard/student')
    } catch (error) {
      toast.error('Failed to withdraw application')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (existingApplication) {
    const statusMessages = {
      pending: 'Your application is pending review.',
      commissioner_approved: 'Your application has been approved by commissioners and is waiting for dean approval.',
      commissioner_rejected: 'Your application was rejected by commissioners.',
      dean_approved: 'Congratulations! You have been approved as a candidate!',
      dean_rejected: 'Your application was rejected by the dean.'
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Application Already Submitted</h2>
          <div className={`p-4 rounded-lg mb-4 ${
            existingApplication.status === 'dean_approved' ? 'bg-green-100 text-green-800' :
            existingApplication.status === 'commissioner_rejected' || existingApplication.status === 'dean_rejected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            <p>{statusMessages[existingApplication.status]}</p>
          </div>
          <p className="text-gray-600 mb-4">Position: {existingApplication.position}</p>
          <p className="text-gray-600 mb-4">Status: {existingApplication.status.replace('_', ' ').toUpperCase()}</p>
          {(existingApplication.status === 'pending' || existingApplication.status === 'commissioner_approved') && (
            <button
              onClick={withdrawApplication}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
            >
              Withdraw Application
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard/student')}
            className="ml-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Apply as Candidate</h1>
          <p className="text-gray-600 text-center mb-8">
            Complete the form below to apply for a leadership position.
            Your application will be reviewed by Election Commissioners and the Dean.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Position *</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Position</option>
                <option value="Student Council President">Student Council President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary General">Secretary General</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Academic Affairs Director">Academic Affairs Director</option>
                <option value="Sports and Recreation Director">Sports and Recreation Director</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Campaign Slogan</label>
              <input
                type="text"
                name="campaign_slogan"
                value={formData.campaign_slogan}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., 'Together We Rise'"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Manifesto *</label>
              <textarea
                name="manifesto"
                value={formData.manifesto}
                onChange={handleChange}
                rows={8}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Write your manifesto here. Include your goals, plans, and promises..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 50 characters. Currently: {formData.manifesto.length} characters
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Achievements</label>
              <textarea
                name="achievements"
                value={formData.achievements}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="List your previous achievements, leadership experience, etc."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Your application will go through a two-step approval process:
                1. Election Commissioner review
                2. Dean of Students final approval
                You will be notified via email about the status of your application.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}