// pages/dashboard/candidate.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function CandidateDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState(null)
  const [manifesto, setManifesto] = useState('')
  const [campaignSlogan, setCampaignSlogan] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!authLoading && isAuthenticated && user?.role !== 'candidate') {
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'candidate') {
      fetchData()
    }
  }, [isAuthenticated, user])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const [appRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3001/api/candidate/application-status', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/candidate/campaign-stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setApplication(appRes.data.application)
      setStats(statsRes.data)
      if (appRes.data.application?.manifesto) {
        setManifesto(appRes.data.application.manifesto)
        setCampaignSlogan(appRes.data.application.campaign_slogan || '')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const updateManifesto = async () => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put('http://localhost:3001/api/candidate/manifesto',
        { manifesto, campaign_slogan: campaignSlogan },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Manifesto updated successfully')
      setEditing(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to update manifesto')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      commissioner_approved: 'bg-blue-100 text-blue-800',
      commissioner_rejected: 'bg-red-100 text-red-800',
      dean_approved: 'bg-green-100 text-green-800',
      dean_rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusMessage = (status) => {
    const messages = {
      pending: 'Your application is pending review by Election Commissioners',
      commissioner_approved: 'Approved by Commissioners. Waiting for Dean approval.',
      commissioner_rejected: 'Application rejected by Commissioners',
      dean_approved: 'Congratulations! You are an official candidate!',
      dean_rejected: 'Application rejected by Dean'
    }
    return messages[status] || 'Status unknown'
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
      <div className="bg-candidate-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
          <p className="mt-2">Welcome, {user?.full_name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Application Status */}
        {application && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Application Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600">Position Applied</p>
                <p className="font-semibold">{application.position}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-gray-600">Status Message</p>
                <p className="text-sm">{getStatusMessage(application.status)}</p>
              </div>
              {application.commissioner_comments && (
                <div>
                  <p className="text-gray-600">Commissioner Comments</p>
                  <p className="text-sm italic">{application.commissioner_comments}</p>
                </div>
              )}
              {application.dean_comments && (
                <div>
                  <p className="text-gray-600">Dean Comments</p>
                  <p className="text-sm italic">{application.dean_comments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaign Stats (if approved) */}
        {stats?.candidate && application?.status === 'dean_approved' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Campaign Statistics</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-gray-600">Current Votes</p>
                <p className="text-3xl font-bold text-candidate-primary">{stats.candidate.vote_count || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-gray-600">Vote Percentage</p>
                <p className="text-3xl font-bold text-candidate-primary">{stats.performance?.vote_percentage || 0}%</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-gray-600">Current Rank</p>
                <p className="text-3xl font-bold text-candidate-primary">{stats.performance?.rank || 'TBD'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manifesto Editor (if approved) */}
        {application?.status === 'dean_approved' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Manifesto</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-candidate-primary text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Edit Manifesto
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Campaign Slogan</label>
                  <input
                    type="text"
                    value={campaignSlogan}
                    onChange={(e) => setCampaignSlogan(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Your campaign slogan"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Manifesto</label>
                  <textarea
                    value={manifesto}
                    onChange={(e) => setManifesto(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Write your manifesto here..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={updateManifesto}
                    className="bg-candidate-primary text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {campaignSlogan && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-semibold">"{campaignSlogan}"</p>
                  </div>
                )}
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{manifesto || 'No manifesto yet. Click Edit to add your manifesto.'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Election Info */}
        {stats?.election && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Election Information</h3>
            <p className="text-sm text-blue-700">Election Status: {stats.election.status}</p>
            <p className="text-sm text-blue-700">Total Voters: {stats.election.total_voters || 0}</p>
            <p className="text-sm text-blue-700">Total Votes Cast: {stats.election.total_votes_cast || 0}</p>
          </div>
        )}
      </div>
    </div>
  )
}