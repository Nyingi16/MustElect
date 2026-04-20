// pages/admin/elections.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ManageElections() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  })

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
      fetchElections()
    }
  }, [isAuthenticated, user])

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/dean/elections', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setElections(response.data.elections || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load elections')
    } finally {
      setLoading(false)
    }
  }

  const createElection = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      await axios.post('http://localhost:3001/api/dean/elections', newElection, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Election created successfully')
      setShowCreateForm(false)
      setNewElection({ title: '', description: '', start_date: '', end_date: '' })
      fetchElections()
    } catch (error) {
      toast.error('Failed to create election')
    }
  }

  const startElection = async (electionId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Election started')
      fetchElections()
    } catch (error) {
      toast.error('Failed to start election')
    }
  }

  const endElection = async (electionId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Election ended')
      fetchElections()
    } catch (error) {
      toast.error('Failed to end election')
    }
  }

  const publishResults = async (electionId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Results published')
      fetchElections()
    } catch (error) {
      toast.error('Failed to publish results')
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Elections</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            {showCreateForm ? 'Cancel' : 'Create Election'}
          </button>
        </div>

        {/* Create Election Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Election</h2>
            <form onSubmit={createElection} className="space-y-4">
              <input
                type="text"
                placeholder="Election Title"
                value={newElection.title}
                onChange={(e) => setNewElection({...newElection, title: e.target.value})}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <textarea
                placeholder="Description"
                value={newElection.description}
                onChange={(e) => setNewElection({...newElection, description: e.target.value})}
                className="w-full px-4 py-2 border rounded"
                rows={3}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="datetime-local"
                  value={newElection.start_date}
                  onChange={(e) => setNewElection({...newElection, start_date: e.target.value})}
                  className="px-4 py-2 border rounded"
                  required
                />
                <input
                  type="datetime-local"
                  value={newElection.end_date}
                  onChange={(e) => setNewElection({...newElection, end_date: e.target.value})}
                  className="px-4 py-2 border rounded"
                  required
                />
              </div>
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                Create Election
              </button>
            </form>
          </div>
        )}

        {/* Elections List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Start Date</th>
                <th className="px-6 py-3 text-left">End Date</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {elections.map((election) => (
                <tr key={election.id} className="border-t">
                  <td className="px-6 py-4 font-medium">{election.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      election.status === 'active' ? 'bg-green-100 text-green-800' :
                      election.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                      election.status === 'published' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {election.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(election.start_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{new Date(election.end_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {election.status === 'draft' && (
                        <button
                          onClick={() => startElection(election.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Start
                        </button>
                      )}
                      {election.status === 'active' && (
                        <button
                          onClick={() => endElection(election.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          End
                        </button>
                      )}
                      {election.status === 'ended' && !election.results_published && (
                        <button
                          onClick={() => publishResults(election.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Publish Results
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}