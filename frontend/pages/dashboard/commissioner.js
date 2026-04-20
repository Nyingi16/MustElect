// pages/dashboard/commissioner.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function CommissionerDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState([])
  const [voterStats, setVoterStats] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!authLoading && isAuthenticated && user?.role !== 'commissioner') {
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'commissioner') {
      fetchData()
    }
  }, [isAuthenticated, user, activeTab])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const [appsRes, statsRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/commissioner/${activeTab === 'pending' ? 'applications/pending' : 'candidates/approved'}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/commissioner/stats/voters', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setApplications(appsRes.data.applications || appsRes.data.candidates || [])
      setVoterStats(statsRes.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const approveApplication = async (applicationId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/commissioner/applications/${applicationId}/approve`,
        { comments: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Application approved')
      fetchData()
      setSelectedApp(null)
    } catch (error) {
      toast.error('Failed to approve application')
    }
  }

  const rejectApplication = async (applicationId) => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection')
      return
    }
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/commissioner/applications/${applicationId}/reject`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Application rejected')
      fetchData()
      setSelectedApp(null)
      setRejectionReason('')
    } catch (error) {
      toast.error('Failed to reject application')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-commissioner-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Commissioner Dashboard</h1>
          <p className="mt-2">Welcome, Commissioner {user?.full_name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        {voterStats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Total Students</p>
              <p className="text-3xl font-bold">{voterStats.total_students || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Verified Students</p>
              <p className="text-3xl font-bold text-green-600">{voterStats.verified_students || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Students with Wallet</p>
              <p className="text-3xl font-bold text-blue-600">{voterStats.students_with_wallet || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Verification Rate</p>
              <p className="text-3xl font-bold">{voterStats.verification_rate || 0}%</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 font-medium ${activeTab === 'pending' ? 'border-b-2 border-commissioner-primary text-commissioner-primary' : 'text-gray-500'}`}
              >
                Pending Applications ({applications.filter(a => a.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-3 font-medium ${activeTab === 'approved' ? 'border-b-2 border-commissioner-primary text-commissioner-primary' : 'text-gray-500'}`}
              >
                Approved Candidates
              </button>
            </nav>
          </div>

          <div className="p-6">
            {applications.length === 0 ? (
              <p className="text-center text-gray-500">No {activeTab === 'pending' ? 'pending applications' : 'approved candidates'}</p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{app.applicant_name || app.name}</h3>
                        <p className="text-gray-600">Position: {app.position}</p>
                        <p className="text-gray-500 text-sm">Reg: {app.registration_number}</p>
                        <p className="text-gray-500 text-sm">Department: {app.department}</p>
                        {app.manifesto && (
                          <details className="mt-2">
                            <summary className="text-sm text-commissioner-primary cursor-pointer">View Manifesto</summary>
                            <p className="text-sm text-gray-600 mt-2">{app.manifesto}</p>
                          </details>
                        )}
                      </div>
                      {activeTab === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app)
                              approveApplication(app.id)
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Reject Application</h3>
            <p className="text-gray-600 mb-4">Rejecting: {selectedApp.applicant_name}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
              rows={4}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => rejectApplication(selectedApp.id)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setSelectedApp(null)
                  setRejectionReason('')
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}