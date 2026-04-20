// pages/dashboard/student.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import Web3 from 'web3'
import { FaWallet, FaCheckCircle, FaSpinner, FaVoteYea, FaUserCheck, FaChartLine, FaInfoCircle, FaSignOutAlt, FaExchangeAlt } from 'react-icons/fa'

export default function StudentDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout, sessionId } = useAuth()
  const router = useRouter()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [voting, setVoting] = useState(false)
  
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [walletError, setWalletError] = useState(null)

  // Session-specific storage key
  const getSessionKey = (key) => `${key}_session_${sessionId}`

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboard()
      checkSessionWalletConnection()
    }
  }, [isAuthenticated, user, sessionId])

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
        toast.error('Please approve wallet connection to vote')
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
      
      toast.success(`Wallet ${selectedAccount.substring(0, 6)}...${selectedAccount.substring(38)} connected!`)
      
      // Link wallet to backend
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

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/student/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDashboard(response.data)
    } catch (error) {
      console.error('Fetch error:', error)
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        router.push('/login')
      } else {
        toast.error('Failed to load dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const castVote = async () => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first to vote')
      return
    }
    
    if (!selectedCandidate) {
      toast.error('Please select a candidate first')
      return
    }
    
    if (dashboard?.hasVoted) {
      toast.error('You have already voted')
      return
    }

    if (!dashboard?.election) {
      toast.error('No active election')
      return
    }

    const candidate = dashboard.candidates.find(c => c.id === selectedCandidate)
    if (!candidate) {
      toast.error('Invalid candidate selected')
      return
    }

    const confirmMessage = `Are you sure you want to vote for ${candidate.name} (${candidate.position})?\n\nWallet: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}\n\nYour vote cannot be changed once cast.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setVoting(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post('http://localhost:3001/api/student/vote', 
        { 
          candidateId: selectedCandidate, 
          electionId: dashboard.election.id,
          walletAddress: walletAddress 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.success) {
        toast.success('Vote cast successfully! Your vote has been recorded on the blockchain.')
        setSelectedCandidate(null)
        await fetchDashboard()
      } else {
        toast.error(response.data.message || 'Failed to cast vote')
      }
    } catch (error) {
      console.error('Vote error:', error)
      const errorMsg = error.response?.data?.error || 'Failed to cast vote. Please try again.'
      toast.error(errorMsg)
    } finally {
      setVoting(false)
    }
  }

  const selectCandidate = (candidateId) => {
    if (dashboard?.hasVoted) {
      toast.error('You have already voted')
      return
    }
    if (!walletConnected) {
      toast.error('Please connect your wallet first')
      return
    }
    setSelectedCandidate(candidateId)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const hasActiveElection = dashboard?.election && !dashboard.hasVoted
  const hasVoted = dashboard?.hasVoted
  const candidates = dashboard?.candidates || []
  const selectedCandidateData = candidates.find(c => c.id === selectedCandidate)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Student Dashboard</h1>
              <p className="mt-1">Welcome, {user?.full_name}</p>
              <p className="text-sm opacity-80">Registration: {user?.registration_number}</p>
              <p className="text-xs opacity-60 mt-1">Session: {sessionId?.substring(0, 8)}...</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Wallet Status Card */}
              <div className={`flex flex-col items-end ${walletConnected ? 'text-green-100' : 'text-yellow-100'}`}>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${walletConnected ? 'bg-green-700' : 'bg-yellow-700'}`}>
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
                    <button 
                      onClick={connectWallet} 
                      disabled={connectingWallet}
                      className="text-sm hover:underline disabled:opacity-50"
                    >
                      {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  )}
                </div>
                {walletError && !walletConnected && (
                  <p className="text-xs mt-1 text-yellow-200">{walletError}</p>
                )}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* No Active Election Banner */}
        {!dashboard?.election && !hasVoted && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center mb-6">
            <FaInfoCircle className="text-4xl text-gray-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Election</h3>
            <p className="text-gray-500">There is no active election at this time. Please check back later.</p>
          </div>
        )}

        {/* Already Voted Banner */}
        {hasVoted && dashboard?.election && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <FaCheckCircle className="text-4xl text-green-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-green-800">You Have Voted!</h3>
                <p className="text-green-700 mt-1">
                  Thank you for participating in the <strong>{dashboard.election.title}</strong> election.
                  Your vote has been securely recorded on the blockchain.
                </p>
                <button
                  onClick={() => router.push('/voting/results')}
                  className="mt-3 flex items-center gap-2 text-green-700 hover:text-green-900 font-medium"
                >
                  <FaChartLine />
                  View Live Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Election Info */}
        {dashboard?.election && !hasVoted && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FaInfoCircle className="text-blue-500" />
                Current Election
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-gray-500 text-sm">Election Title</p>
                  <p className="font-semibold text-lg">{dashboard.election.title}</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="text-gray-500 text-sm">Time Remaining</p>
                  <p className="font-semibold text-lg">
                    {Math.max(0, Math.ceil(dashboard.election.time_remaining / (1000 * 60 * 60)))} hours
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-gray-500 text-sm">Your Status</p>
                  <p className="font-semibold text-lg text-yellow-600">Not Voted Yet</p>
                </div>
              </div>
            </div>

            {/* Wallet Required Banner */}
            {!walletConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <FaWallet className="text-3xl text-yellow-600" />
                    <div>
                      <h3 className="font-semibold text-yellow-800">Wallet Required to Vote</h3>
                      <p className="text-sm text-yellow-700">Connect your MetaMask wallet to cast your vote</p>
                    </div>
                  </div>
                  <button
                    onClick={connectWallet}
                    disabled={connectingWallet}
                    className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition flex items-center gap-2"
                  >
                    {connectingWallet ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <FaWallet />
                        Connect Wallet
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Candidates Section */}
            {walletConnected && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FaUserCheck className="text-green-600" />
                    Select Your Candidate
                  </h2>
                  <button
                    onClick={switchWallet}
                    disabled={connectingWallet}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FaExchangeAlt />
                    Switch Wallet
                  </button>
                </div>
                
                {candidates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No candidates have been approved for this election yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => selectCandidate(candidate.id)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedCandidate === candidate.id
                              ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200'
                              : 'border-gray-200 hover:shadow-md hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{candidate.name}</h3>
                                {selectedCandidate === candidate.id && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600">{candidate.position}</p>
                              {candidate.campaign_slogan && (
                                <p className="text-sm text-gray-500 italic mt-1">"{candidate.campaign_slogan}"</p>
                              )}
                              <details className="mt-3">
                                <summary className="text-sm text-blue-600 cursor-pointer hover:underline">Read Manifesto</summary>
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.manifesto}</p>
                                </div>
                              </details>
                            </div>
                            {selectedCandidate === candidate.id && (
                              <div className="ml-3">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <FaCheckCircle className="text-white text-xs" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vote Button Section */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      {!selectedCandidate ? (
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">Select a candidate above to enable voting</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg inline-block">
                            <p className="text-sm text-blue-700">
                              Voting with wallet: <span className="font-mono">{walletAddress.substring(0, 10)}...{walletAddress.substring(34)}</span>
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              You are voting for: <strong>{selectedCandidateData?.name}</strong> ({selectedCandidateData?.position})
                            </p>
                          </div>
                          <button
                            onClick={castVote}
                            disabled={voting}
                            className={`px-8 py-3 rounded-lg font-semibold text-white transition flex items-center gap-2 mx-auto ${
                              voting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {voting ? (
                              <>
                                <FaSpinner className="animate-spin" />
                                Casting Vote...
                              </>
                            ) : (
                              <>
                                <FaVoteYea />
                                Confirm Vote for {selectedCandidateData?.name.split(' ')[0]}
                              </>
                            )}
                          </button>
                          <p className="text-xs text-gray-500 mt-3">
                            ⚠️ Your vote is final and cannot be changed once cast
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}