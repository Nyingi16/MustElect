// pages/reports/index.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ReportsCenter() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reportType, setReportType] = useState('results')
  const [electionId, setElectionId] = useState('')

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
      fetchReports()
    }
  }, [isAuthenticated, user])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/reports/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReports(response.data.reports || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!electionId && reportType !== 'audit') {
      toast.error('Please select an election')
      return
    }

    setGenerating(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post('http://localhost:3001/api/reports/generate',
        { report_type: reportType, election_id: electionId || null },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Report generated successfully')
      fetchReports()
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = async (reportId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`http://localhost:3001/api/reports/download/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download report')
    }
  }

  const verifyReport = async (reportId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`http://localhost:3001/api/reports/verify/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.is_integrity_valid) {
        toast.success('Report integrity verified!')
      } else {
        toast.error('Report integrity check failed!')
      }
    } catch (error) {
      toast.error('Failed to verify report')
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
        <h1 className="text-3xl font-bold mb-6">Reports Center</h1>

        {/* Generate Report Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate New Report</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="results">Election Results</option>
                <option value="turnout">Voter Turnout</option>
                <option value="audit">Audit Log</option>
                <option value="candidates">Candidates List</option>
              </select>
            </div>
            {reportType !== 'audit' && (
              <div>
                <label className="block text-gray-700 mb-2">Election ID</label>
                <input
                  type="text"
                  value={electionId}
                  onChange={(e) => setElectionId(e.target.value)}
                  placeholder="Enter Election ID"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={generating}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Reports</h2>
          {reports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reports generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Generated By</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Downloads</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t">
                      <td className="px-4 py-3">{report.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {report.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{report.generated_by}</td>
                      <td className="px-4 py-3">{new Date(report.generated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{report.download_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadReport(report.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => verifyReport(report.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Verify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}