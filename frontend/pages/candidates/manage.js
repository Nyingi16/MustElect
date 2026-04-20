// pages/candidates/manage.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ManageCandidates() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!authLoading && isAuthenticated && user?.role !== 'dean' && user?.role !== 'commissioner') {
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'dean' || user?.role === 'commissioner')) {
      fetchApplications()
    }
  }, [isAuthenticated, user])

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const endpoint = user?.role === 'dean' 
        ? 'http://localhost:3001/api/dean/candidates/pending'
        : 'http://localhost:3001/api/commissioner/applications/pending'
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplications(response.data.applications || response.data.candidates || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const approveCandidate = async (applicationId) => {
    try {
      const token = localStorage.getItem('authToken')
      const endpoint = user?.role === 'dean'
        ? `http://localhost:3001/api/dean/candidates/${applicationId}/approve`
        : `http://localhost:3001/api/commissioner/applications/${applicationId}/approve`
      
      await axios.put(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Candidate approved')
      fetchApplications()
    } catch (error) {
      toast.error('Failed to approve candidate')
    }
  }

  const rejectCandidate = async (applicationId) => {
    const reason = prompt('Reason for rejection:')
    if (!reason) return
    
    try {
      const token = localStorage.getItem('authToken')
      const endpoint = user?.role === 'dean'
        ? `http://localhost:3001/api/dean/candidates/${applicationId}/reject`
        : `http://localhost:3001/api/commissioner/applications/${applicationId}/reject`
      
      await axios.put(endpoint, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Candidate rejected')
      fetchApplications()
    } catch (error) {
      toast.error('Failed to reject candidate')
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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Candidate Applications</h1>
        
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No pending applications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{app.applicant_name || app.name}</h3>
                    <p className="text-gray-600">Registration: {app.registration_number}</p>
                    <p className="text-gray-600">Position: {app.position}</p>
                    <p className="text-gray-600">Department: {app.department}</p>
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer">View Manifesto</summary>
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{app.manifesto}</p>
                    </details>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveCandidate(app.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectCandidate(app.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}