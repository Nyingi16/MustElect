// components/student/VotingCard.js
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function VotingCard({ candidate, onVote, hasVoted }) {
  const [loading, setLoading] = useState(false)

  const handleVote = async () => {
    if (hasVoted) {
      toast.error('You have already voted')
      return
    }
    setLoading(true)
    await onVote(candidate.id)
    setLoading(false)
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
          {candidate.name.charAt(0)}
        </div>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
          {candidate.position}
        </span>
      </div>
      
      <h3 className="font-semibold text-lg">{candidate.name}</h3>
      
      {candidate.campaign_slogan && (
        <p className="text-gray-500 italic text-sm mt-1">"{candidate.campaign_slogan}"</p>
      )}
      
      <details className="mt-3">
        <summary className="text-sm text-blue-600 cursor-pointer">View Manifesto</summary>
        <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">{candidate.manifesto}</p>
      </details>
      
      <button
        onClick={handleVote}
        disabled={loading || hasVoted}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Processing...' : hasVoted ? 'Already Voted' : 'Vote'}
      </button>
    </div>
  )
}