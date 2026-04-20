// frontend/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import tabSessionManager from '../utils/tabSessionManager'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const tabId = tabSessionManager.getTabId()
  const sessionId = tabSessionManager.getSessionId()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const storedToken = tabSessionManager.getItem('authToken')
    const storedUser = tabSessionManager.getItem('user')
    const storedWalletConnected = tabSessionManager.getItem('walletConnected')
    const storedWalletAddress = tabSessionManager.getItem('walletAddress')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      if (storedWalletConnected === 'true') {
        setWalletConnected(true)
        setWalletAddress(storedWalletAddress || '')
      }
      verifyToken(storedToken)
    } else {
      setLoading(false)
    }
    
    // Listen for cross-tab logout events
    const unsubscribe = tabSessionManager.onMessage((message, data, sourceTab, sourceSession) => {
      if (message === 'LOGOUT' && sourceTab !== tabId) {
        // Another tab logged out, clear this tab's session
        if (tabSessionManager.getSessionId() === sourceSession) {
          tabSessionManager.clearSession()
          setToken(null)
          setUser(null)
          setWalletConnected(false)
          setWalletAddress('')
          toast.info('You have been logged out from another tab')
        }
      }
    })
    
    return () => unsubscribe()
  }, [tabId])

  const verifyToken = async (authToken) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      setUser(response.data.user)
      if (response.data.user?.role) {
        tabSessionManager.setItem('userRole', response.data.user.role)
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier,
        password
      })
      
      const { accessToken, user, redirectUrl } = response.data
      
      // Clear any existing session data first
      tabSessionManager.clearSession()
      
      // Store new session data
      tabSessionManager.setItem('authToken', accessToken)
      tabSessionManager.setItem('user', JSON.stringify(user))
      if (user?.role) {
        tabSessionManager.setItem('userRole', user.role)
      }
      
      // Reset wallet connection for this session (will need to reconnect)
      tabSessionManager.setItem('walletConnected', 'false')
      tabSessionManager.removeItem('walletAddress')
      setWalletConnected(false)
      setWalletAddress('')
      
      setToken(accessToken)
      setUser(user)
      
      // Notify other tabs about login
      tabSessionManager.notifyLogin(user)
      
      return { success: true, redirectUrl, user }
    } catch (error) {
      const errorData = error.response?.data || {}
      return { 
        success: false, 
        error: errorData.error || 'Login failed',
        needs_profile_completion: errorData.needs_profile_completion,
        needs_verification: errorData.needs_verification,
        user_id: errorData.user_id,
        role: errorData.role,
        email: errorData.email
      }
    }
  }

  const connectWallet = async (walletAddress, signature) => {
    try {
      const response = await axios.post(`${API_URL}/auth/connect-wallet`, 
        { wallet_address: walletAddress, signature },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const { accessToken, wallet_address } = response.data
      
      // Update session with wallet info
      tabSessionManager.setItem('authToken', accessToken)
      tabSessionManager.setItem('walletConnected', 'true')
      tabSessionManager.setItem('walletAddress', wallet_address)
      
      setToken(accessToken)
      setWalletConnected(true)
      setWalletAddress(wallet_address)
      setUser({ ...user, wallet_address })
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Wallet connection failed' }
    }
  }

  const disconnectWallet = () => {
    tabSessionManager.setItem('walletConnected', 'false')
    tabSessionManager.removeItem('walletAddress')
    setWalletConnected(false)
    setWalletAddress('')
    toast.info('Wallet disconnected')
  }

  const logout = () => {
    tabSessionManager.clearSession()
    tabSessionManager.notifyLogout()
    setToken(null)
    setUser(null)
    setWalletConnected(false)
    setWalletAddress('')
    toast.success('Logged out successfully')
  }

  const register = async (
    registrationNumber, 
    email, 
    password, 
    fullName, 
    selectedRole,
    department,
    yearOfStudy,
    justification,
    qualifications,
    experience
  ) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        registration_number: registrationNumber,
        email,
        password,
        confirm_password: password,
        full_name: fullName,
        selected_role: selectedRole,
        department,
        year_of_study: parseInt(yearOfStudy),
        justification,
        qualifications,
        experience
      })
      
      return { success: true, ...response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' }
    }
  }

  const verifyOTP = async (email, otp) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp })
      return { success: true, ...response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'OTP verification failed' }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      token,
      tabId,
      sessionId,
      walletConnected,
      walletAddress,
      isAuthenticated: !!user,
      login,
      register,
      verifyOTP,
      connectWallet,
      disconnectWallet,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}