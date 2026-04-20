// pages/candidates.js
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaUserCheck } from 'react-icons/fa'

export default function CandidatesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!authLoading && isAuthenticated && user?.role !== 'dean') {
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'dean') {
      fetchCandidates()
    }
  }, [isAuthenticated, user, filter])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`http://localhost:3001/api/dean/candidates?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCandidates(response.data.candidates || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  const approveCandidate = async (candidateId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/candidates/${candidateId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidate approved successfully')
      fetchCandidates()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve candidate')
    }
  }

  const rejectCandidate = async (candidateId) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/candidates/${candidateId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidate rejected')
      fetchCandidates()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject candidate')
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending Commissioner Review</span>
      case 'commissioner_approved':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Commissioner Approved - Awaiting Dean</span>
      case 'dean_approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>
      case 'dean_rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejected</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>
    }
  }

  const getFilterCount = (status) => {
    if (status === 'all') return candidates.length
    return candidates.filter(c => c.status === status).length
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-700 text-white p-6 rounded-lg mb-6">
          <h1 className="text-2xl font-bold">Candidate Management</h1>
          <p className="mt-1">Review and manage candidate applications</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 font-medium transition ${filter === 'all' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
              >
                All ({getFilterCount('all')})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-6 py-3 font-medium transition ${filter === 'pending' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
              >
                Pending ({getFilterCount('pending')})
              </button>
              <button
                onClick={() => setFilter('commissioner_approved')}
                className={`px-6 py-3 font-medium transition ${filter === 'commissioner_approved' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
              >
                Commissioner Approved ({getFilterCount('commissioner_approved')})
              </button>
              <button
                onClick={() => setFilter('dean_approved')}
                className={`px-6 py-3 font-medium transition ${filter === 'dean_approved' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
              >
                Approved ({getFilterCount('dean_approved')})
              </button>
              <button
                onClick={() => setFilter('dean_rejected')}
                className={`px-6 py-3 font-medium transition ${filter === 'dean_rejected' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
              >
                Rejected ({getFilterCount('dean_rejected')})
              </button>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-lg shadow p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaUserCheck className="text-4xl mx-auto mb-2" />
              <p>No candidates found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{candidate.name}</h3>
                        {getStatusBadge(candidate.status)}
                      </div>
                      <p className="text-gray-600">Position: {candidate.position}</p>
                      <p className="text-gray-500 text-sm">Registration: {candidate.registration_number}</p>
                      <p className="text-gray-500 text-sm">Department: {candidate.department}</p>
                      <p className="text-gray-500 text-sm">Year: {candidate.year_of_study}</p>
                      {candidate.manifesto && (
                        <details className="mt-3">
                          <summary className="text-sm text-red-600 cursor-pointer">View Manifesto</summary>
                          <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded">{candidate.manifesto}</p>
                        </details>
                      )}
                      {candidate.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">Rejection Reason: {candidate.rejection_reason}</p>
                      )}
                    </div>
                    {(candidate.status === 'pending' || candidate.status === 'commissioner_approved') && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => approveCandidate(candidate.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectCandidate(candidate.id)}
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
  )
}