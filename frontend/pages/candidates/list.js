// pages/candidates/list.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function CandidatesList() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [candidates, setCandidates] = useState([])
  const [election, setElection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCandidates()
    }
  }, [isAuthenticated])

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const electionRes = await axios.get('http://localhost:3001/api/student/election-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (electionRes.data.hasActiveElection) {
        setElection(electionRes.data.election)
        const candidatesRes = await axios.get(`http://localhost:3001/api/student/candidates/${electionRes.data.election.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCandidates(candidatesRes.data.candidates)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold text-center mb-2">Candidates</h1>
        {election && (
          <p className="text-center text-gray-600 mb-8">Election: {election.title}</p>
        )}

        {candidates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No candidates have been approved yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{candidate.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {candidate.position}
                    </span>
                  </div>
                  {candidate.campaign_slogan && (
                    <p className="text-gray-600 italic mb-3">"{candidate.campaign_slogan}"</p>
                  )}
                  <details className="mt-3">
                    <summary className="text-sm text-blue-600 cursor-pointer font-medium">View Manifesto</summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.manifesto}</p>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}