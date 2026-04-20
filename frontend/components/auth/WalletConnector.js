// components/auth/WalletConnector.js
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWeb3 } from '@/hooks/useWeb3'
import toast from 'react-hot-toast'

export default function WalletConnector({ onConnected }) {
  const { user, connectWallet } = useAuth()
  const { account, isConnected, connectWallet: connectWeb3, signMessage } = useWeb3()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      const walletAddress = await connectWeb3()
      if (walletAddress) {
        const message = `Sign this message to link your wallet to your voting account: ${Date.now()}`
        const signature = await signMessage(message)
        
        if (signature) {
          const result = await connectWallet(walletAddress, signature)
          if (result.success) {
            toast.success('Wallet connected successfully!')
            if (onConnected) onConnected(walletAddress)
          } else {
            toast.error(result.error)
          }
        }
      }
    } catch (error) {
      toast.error('Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected && user?.wallet_address) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <p>✅ Wallet Connected: {user.wallet_address.substring(0, 6)}...{user.wallet_address.substring(38)}</p>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
      <p className="text-yellow-800 mb-3">Connect your wallet to vote</p>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    </div>
  )
}