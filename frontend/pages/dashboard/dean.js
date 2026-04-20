// pages/dashboard/dean.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUsers, FaVoteYea, FaUserCheck, FaChartLine, FaSignOutAlt, FaUserGraduate, FaCalendarAlt, FaSpinner, FaWallet, FaCheckCircle, FaTimesCircle, FaUserPlus, FaUserMinus, FaExchangeAlt } from 'react-icons/fa'
import { Bar } from 'react-chartjs-2'
import Web3 from 'web3'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function DeanDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout, sessionId } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('students')
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateElection, setShowCreateElection] = useState(false)
  
  // Wallet state with MetaMask native selection
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [walletError, setWalletError] = useState(null)
  
  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  })

  // Session-specific storage key
  const getSessionKey = (key) => `${key}_session_${sessionId}`

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    // Check for dean role - if not dean, redirect to student dashboard
    if (!authLoading && isAuthenticated && user?.role !== 'dean') {
      toast.error('Access denied. Dean privileges required.')
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'dean') {
      fetchData()
      checkSessionWalletConnection()
    }
  }, [isAuthenticated, user, activeTab, sessionId])

  const checkSessionWalletConnection = async () => {
    const sessionWalletConnected = sessionStorage.getItem(getSessionKey('walletConnected'))
    const sessionWalletAddress = sessionStorage.getItem(getSessionKey('walletAddress'))
    
    if (sessionWalletConnected === 'true' && sessionWalletAddress) {
      setWalletConnected(true)
      setWalletAddress(sessionWalletAddress)
    } else {
      setWalletConnected(false)
      setWalletAddress('')
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('Please install MetaMask extension!')
      setWalletError('MetaMask not installed')
      return
    }

    setConnectingWallet(true)
    setWalletError(null)
    
    try {
      // This opens MetaMask's native account selection popup
      // MetaMask will automatically show the account selector
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts'
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      // MetaMask returns the selected account(s)
      const selectedAccount = accounts[0]
      await finalizeWalletConnection(selectedAccount)
      
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      if (error.code === 4001) {
        toast.error('Please approve wallet connection to manage elections')
      } else {
        toast.error(error.message || 'Failed to connect wallet')
      }
      setWalletError(error.message)
      setConnectingWallet(false)
    }
  }

  const switchWallet = async () => {
    // To switch wallet, we need to request accounts again
    // MetaMask will show the account selector again
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('MetaMask not installed')
      return
    }

    setConnectingWallet(true)
    
    try {
      // Request accounts again - MetaMask will show account selector
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts'
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      const newAccount = accounts[0]
      
      if (newAccount !== walletAddress) {
        await finalizeWalletConnection(newAccount)
        toast.success(`Switched to wallet ${newAccount.substring(0, 6)}...${newAccount.substring(38)}`)
      } else {
        toast.info('Same wallet selected')
      }
      
    } catch (error) {
      console.error('Failed to switch wallet:', error)
      toast.error('Failed to switch wallet')
    } finally {
      setConnectingWallet(false)
    }
  }

  const finalizeWalletConnection = async (selectedAccount) => {
    try {
      if (!selectedAccount.match(/^0x[a-fA-F0-9]{40}$/i)) {
        throw new Error('Invalid wallet address')
      }
      
      setWalletConnected(true)
      setWalletAddress(selectedAccount)
      
      // Store in session-specific storage
      sessionStorage.setItem(getSessionKey('walletConnected'), 'true')
      sessionStorage.setItem(getSessionKey('walletAddress'), selectedAccount)
      
      toast.success(`Wallet ${selectedAccount.substring(0, 6)}...${selectedAccount.substring(38)} connected for this session!`)
      
      // Link wallet to backend for this session
      const token = localStorage.getItem('authToken')
      if (token) {
        await axios.post('http://localhost:3001/api/auth/connect-wallet',
          { wallet_address: selectedAccount, signature: '0x0' },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      
      // Listen for account changes in MetaMask
      window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length === 0) {
          setWalletConnected(false)
          setWalletAddress('')
          sessionStorage.removeItem(getSessionKey('walletConnected'))
          sessionStorage.removeItem(getSessionKey('walletAddress'))
          toast.info('Wallet disconnected')
        } else if (newAccounts[0] !== selectedAccount) {
          setWalletAddress(newAccounts[0])
          sessionStorage.setItem(getSessionKey('walletAddress'), newAccounts[0])
          toast.info(`Switched to wallet ${newAccounts[0].substring(0, 6)}...${newAccounts[0].substring(38)}`)
        }
      })
      
    } catch (error) {
      console.error('Failed to finalize wallet connection:', error)
      toast.error(error.message || 'Failed to connect wallet')
      setWalletError(error.message)
    } finally {
      setConnectingWallet(false)
    }
  }

  const disconnectWallet = () => {
    sessionStorage.removeItem(getSessionKey('walletConnected'))
    sessionStorage.removeItem(getSessionKey('walletAddress'))
    setWalletConnected(false)
    setWalletAddress('')
    toast.info('Wallet disconnected from this session')
  }

  const handleLogout = () => {
    disconnectWallet()
    logout()
    router.push('/login')
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      
      const [statsRes, studentsRes, electionsRes] = await Promise.all([
        axios.get('http://localhost:3001/api/dean/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/dean/students?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/dean/elections', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setStats(statsRes.data)
      setStudents(studentsRes.data.students || [])
      setElections(electionsRes.data.elections || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(error.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const verifyStudent = async (studentId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/students/${studentId}/verify`,
        { status: 'verified' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Student verified successfully')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify student')
    }
  }

  const createElection = async (e) => {
    e.preventDefault()
    
    if (!walletConnected) {
      toast.error('Please connect your wallet first to create an election')
      return
    }
    
    if (new Date(newElection.start_date) >= new Date(newElection.end_date)) {
      toast.error('End date must be after start date')
      return
    }
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.post('http://localhost:3001/api/dean/elections',
        newElection,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Election created successfully!')
      setShowCreateElection(false)
      setNewElection({ title: '', description: '', start_date: '', end_date: '' })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create election')
    }
  }

  const startElection = async (electionId) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first to start an election')
      return
    }
    if (!confirm('Are you sure you want to start this election?')) return
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Election started')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start election')
    }
  }

  const endElection = async (electionId) => {
    if (!confirm('Are you sure you want to end this election?')) return
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Election ended')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to end election')
    }
  }

  const publishResults = async (electionId) => {
    if (!confirm('Publish results? This action cannot be undone.')) return
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/elections/${electionId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Results published')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to publish results')
    }
  }

  const pendingStudents = students.filter(s => s.registration_status === 'pending')
  const verifiedStudents = students.filter(s => s.registration_status === 'verified')
  
  const hasCandidates = stats?.candidates && Array.isArray(stats.candidates) && stats.candidates.length > 0
  const chartData = hasCandidates ? {
    labels: stats.candidates.map(c => c.name || c.candidate_name || 'Unknown'),
    datasets: [{
      label: 'Votes',
      data: stats.candidates.map(c => c.votes || c.vote_count || 0),
      backgroundColor: 'rgba(239, 68, 68, 0.5)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1
    }]
  } : null

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Dean Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Dean Dashboard</h1>
              <p className="mt-1">Welcome, Dean {user?.full_name}</p>
              <p className="text-sm opacity-80">Manage student verifications and elections</p>
              <p className="text-xs opacity-60 mt-1">Session: {sessionId?.substring(0, 8)}...</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Wallet Status Card */}
              <div className={`flex flex-col items-end ${walletConnected ? 'text-green-100' : 'text-yellow-100'}`}>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${walletConnected ? 'bg-green-600' : 'bg-yellow-600'}`}>
                  <FaWallet className="text-lg" />
                  {walletConnected ? (
                    <>
                      <span className="text-sm font-mono">
                        {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                      </span>
                      <button 
                        onClick={switchWallet}
                        disabled={connectingWallet}
                        className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded ml-2 flex items-center gap-1"
                        title="Switch Wallet"
                      >
                        <FaExchangeAlt size={10} />
                        Switch
                      </button>
                      <button 
                        onClick={disconnectWallet}
                        className="text-xs bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded ml-1"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button onClick={connectWallet} disabled={connectingWallet} className="text-sm hover:underline">
                      {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  )}
                </div>
                {walletError && !walletConnected && (
                  <p className="text-xs mt-1 text-yellow-200">{walletError}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-800 px-4 py-2 rounded-lg transition"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'students' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserGraduate />
              <span>Student Management</span>
              {pendingStudents.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingStudents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('elections')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'elections' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCalendarAlt />
              <span>Election Management</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'stats' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaChartLine />
              <span>Statistics</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* ============ STUDENT MANAGEMENT TAB ============ */}
        {activeTab === 'students' && (
          <div>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-gray-800">{students.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm">Pending Verification</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingStudents.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm">Verified Students</p>
                <p className="text-3xl font-bold text-green-600">{verifiedStudents.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm">Verification Rate</p>
                <p className="text-3xl font-bold text-blue-600">
                  {students.length > 0 ? Math.round((verifiedStudents.length / students.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-semibold p-6 pb-0">Pending Verifications</h2>
              {pendingStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FaUserCheck className="text-4xl mx-auto mb-2 text-green-500" />
                  <p>All students have been verified!</p>
                </div>
              ) : (
                <div className="overflow-x-auto p-6 pt-4">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Registration Number</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">School</th>
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{student.user?.full_name}</td>
                          <td className="px-4 py-3">{student.user?.registration_number}</td>
                          <td className="px-4 py-3">{student.user?.email}</td>
                          <td className="px-4 py-3">{student.department}</td>
                          <td className="px-4 py-3">Year {student.year_of_study}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => verifyStudent(student.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Verify Student
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow mt-8 overflow-hidden">
              <h2 className="text-xl font-semibold p-6 pb-0">Verified Students</h2>
              {verifiedStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No verified students yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto p-6 pt-4">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Registration Number</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">School</th>
                        <th className="px-4 py-3 text-left">Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {verifiedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{student.user?.full_name}</td>
                          <td className="px-4 py-3">{student.user?.registration_number}</td>
                          <td className="px-4 py-3">{student.user?.email}</td>
                          <td className="px-4 py-3">{student.department}</td>
                          <td className="px-4 py-3">Year {student.year_of_study}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ ELECTION MANAGEMENT TAB ============ */}
        {activeTab === 'elections' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Elections</h2>
                <button
                  onClick={() => setShowCreateElection(!showCreateElection)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  {showCreateElection ? 'Cancel' : '+ Create Election'}
                </button>
              </div>

              {showCreateElection && (
                <form onSubmit={createElection} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Create New Election</h3>
                  
                  {/* Wallet Status Banner */}
                  <div className={`mb-4 p-3 rounded-lg ${walletConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    {walletConnected ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-800">✅ Wallet Connected for this Session</p>
                          <p className="text-xs text-green-600 font-mono">
                            {walletAddress.substring(0, 10)}...{walletAddress.substring(34)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={switchWallet}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1"
                        >
                          <FaExchangeAlt size={10} />
                          Switch
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-800">⚠️ Wallet not connected for this session</p>
                          <p className="text-xs text-yellow-600">Connect wallet to create elections</p>
                        </div>
                        <button
                          type="button"
                          onClick={connectWallet}
                          disabled={connectingWallet}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Election Title"
                      value={newElection.title}
                      onChange={(e) => setNewElection({...newElection, title: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                    <textarea
                      placeholder="Description"
                      value={newElection.description}
                      onChange={(e) => setNewElection({...newElection, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                      rows={3}
                    />
                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="datetime-local"
                        value={newElection.start_date}
                        onChange={(e) => setNewElection({...newElection, start_date: e.target.value})}
                        className="px-3 py-2 border rounded"
                        required
                      />
                      <input
                        type="datetime-local"
                        value={newElection.end_date}
                        onChange={(e) => setNewElection({...newElection, end_date: e.target.value})}
                        className="px-3 py-2 border rounded"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={!walletConnected}
                      className={`w-full px-4 py-2 rounded text-white transition ${
                        walletConnected 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {walletConnected ? 'Create Election' : 'Connect Wallet to Create Election'}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Start Date</th>
                      <th className="px-4 py-3 text-left">End Date</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {elections.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">
                          No elections created yet
                        </td>
                      </tr>
                    ) : (
                      elections.map((election) => (
                        <tr key={election.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{election.title}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              election.status === 'active' ? 'bg-green-100 text-green-800' :
                              election.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                              election.status === 'published' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {election.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(election.start_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{new Date(election.end_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {election.status === 'draft' && (
                                <button
                                  onClick={() => startElection(election.id)}
                                  disabled={!walletConnected}
                                  className={`px-3 py-1 rounded text-sm transition ${
                                    walletConnected 
                                      ? 'bg-green-600 text-white hover:bg-green-700' 
                                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                  }`}
                                  title={!walletConnected ? 'Connect wallet to start election' : ''}
                                >
                                  Start
                                </button>
                              )}
                              {election.status === 'active' && (
                                <button
                                  onClick={() => endElection(election.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                  End
                                </button>
                              )}
                              {election.status === 'ended' && !election.results_published && (
                                <button
                                  onClick={() => publishResults(election.id)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                >
                                  Publish
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ STATISTICS TAB ============ */}
        {activeTab === 'stats' && (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Student Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total Registered Students</span>
                    <span className="font-bold text-xl">{students.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Pending Verification</span>
                    <span className="font-bold text-xl text-yellow-600">{pendingStudents.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Verified Students</span>
                    <span className="font-bold text-xl text-green-600">{verifiedStudents.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Verification Progress</span>
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${students.length > 0 ? (verifiedStudents.length / students.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Election Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total Elections</span>
                    <span className="font-bold text-xl">{elections.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Active Elections</span>
                    <span className="font-bold text-xl text-green-600">
                      {elections.filter(e => e.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Completed Elections</span>
                    <span className="font-bold text-xl text-gray-600">
                      {elections.filter(e => e.status === 'ended' || e.status === 'published').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Voter Turnout</span>
                    <span className="font-bold text-xl text-blue-600">{stats?.election?.voterTurnout || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {chartData && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Real-time Results</h3>
                <Bar data={chartData} options={{ responsive: true }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}