// pages/voting/results.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

export default function ResultsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState(null)
  const [election, setElection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchResults()
    }
  }, [isAuthenticated])

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('authToken')
      // Get the latest election results
      const response = await axios.get('http://localhost:3001/api/student/election-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.hasActiveElection) {
        // If election is active, show real-time results
        const resultsRes = await axios.get(`http://localhost:3001/api/dean/elections/${response.data.election.id}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setResults(resultsRes.data)
        setElection(response.data.election)
      } else {
        // Show published results from last election
        const publishedRes = await axios.get('http://localhost:3001/api/student/results/latest', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setResults(publishedRes.data)
        setElection(publishedRes.data.election)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const barChartData = results?.candidates ? {
    labels: results.candidates.map(c => c.candidate_name),
    datasets: [{
      label: 'Votes',
      data: results.candidates.map(c => c.vote_count),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  } : null

  const pieChartData = results?.candidates ? {
    labels: results.candidates.map(c => c.candidate_name),
    datasets: [{
      data: results.candidates.map(c => c.vote_count),
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    }]
  } : null

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Election Results' }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">Loading results...</div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Results Available</h2>
          <p className="text-gray-600">Results have not been published yet.</p>
          <button
            onClick={() => router.push('/dashboard/student')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Election Results</h1>
          <p className="mt-2">{election?.title || 'Student Elections 2024'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Total Voters</p>
            <p className="text-3xl font-bold text-blue-600">{results.election?.total_voters || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Total Votes Cast</p>
            <p className="text-3xl font-bold text-green-600">{results.election?.total_votes_cast || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Voter Turnout</p>
            <p className="text-3xl font-bold text-purple-600">{results.election?.voter_turnout || 0}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Published On</p>
            <p className="text-sm font-semibold">
              {results.election?.published_at ? new Date(results.election.published_at).toLocaleDateString() : 'Not Published'}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
            {barChartData && <Bar data={barChartData} options={chartOptions} />}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Pie Chart</h3>
            {pieChartData && <Pie data={pieChartData} options={chartOptions} />}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Votes</th>
                  <th className="px-4 py-3 text-left">Percentage</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.results?.map((candidate, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 font-medium">{candidate.candidate_name}</td>
                    <td className="px-4 py-3">{candidate.position}</td>
                    <td className="px-4 py-3">{candidate.vote_count}</td>
                    <td className="px-4 py-3">{candidate.percentage}%</td>
                    <td className="px-4 py-3">
                      {candidate.is_winner && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">WINNER</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard/student')}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}