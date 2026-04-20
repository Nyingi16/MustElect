// pages/admin/users.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')

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
      fetchUsers()
    }
  }, [isAuthenticated, user])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/dean/students', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.students || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('User role updated')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/dean/users/${userId}/status`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.user?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.user?.role === filterRole
    return matchesSearch && matchesRole
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-2">Manage students, commissioners, and system users</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by name, reg number, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="candidate">Candidates</option>
              <option value="commissioner">Commissioners</option>
              <option value="dean">Dean</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{student.user?.full_name}</div>
                    <div className="text-sm text-gray-500">{student.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{student.user?.registration_number}</td>
                  <td className="px-6 py-4">
                    <select
                      value={student.user?.role}
                      onChange={(e) => updateUserRole(student.user?.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                      disabled={student.user?.role === 'dean'}
                    >
                      <option value="student">Student</option>
                      <option value="candidate">Candidate</option>
                      <option value="commissioner">Commissioner</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      student.user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {student.user?.wallet_address ? (
                      <span className="text-xs font-mono">{student.user.wallet_address.substring(0, 10)}...</span>
                    ) : (
                      <span className="text-gray-400">Not connected</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus(student.user?.id, student.user?.is_active)}
                      className={`text-sm ${student.user?.is_active ? 'text-red-600' : 'text-green-600'} hover:underline`}
                    >
                      {student.user?.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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