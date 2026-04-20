// pages/dashboard/admin.js
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUsers, FaUserCog, FaCog, FaFileAlt, FaDatabase, FaChartLine, FaShieldAlt, FaDownload, FaEye, FaEdit, FaTrash, FaUserPlus, FaUserMinus } from 'react-icons/fa'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

export default function SystemAdminDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State variables
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [systemLogs, setSystemLogs] = useState([])
  const [systemSettings, setSystemSettings] = useState({
    system_name: 'MUST Elections',
    election_default_duration: 2,
    email_verification_required: true,
    wallet_required: true,
    auto_verify_student_emails: true,
    maintenance_mode: false
  })
  const [backupInfo, setBackupInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [exportFormat, setExportFormat] = useState('csv')

  // Application state variables
  const [deanApplications, setDeanApplications] = useState([])
  const [commissionerApplications, setCommissionerApplications] = useState([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectType, setRejectType] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectName, setRejectName] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!authLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard/student')
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchAllData()
      fetchSystemLogs()
      fetchBackupInfo()
      fetchApplications()
      
      // Refresh data every 30 seconds
      const interval = setInterval(() => {
        fetchAllData()
        fetchSystemLogs()
        fetchApplications()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const [statsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:3001/api/admin/system/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/admin/users?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data.users || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemLogs = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/admin/audit?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSystemLogs(response.data.logs || [])
    } catch (error) {
      console.error(error)
    }
  }

  const fetchBackupInfo = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:3001/api/admin/backup/info', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBackupInfo(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const [deanRes, commRes] = await Promise.all([
        axios.get('http://localhost:3001/api/admin/applications/dean/pending', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3001/api/admin/applications/commissioner/pending', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setDeanApplications(deanRes.data.applications || [])
      setCommissionerApplications(commRes.data.applications || [])
    } catch (error) {
      console.error(error)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`User role updated to ${newRole}`)
      fetchAllData()
      setShowRoleModal(false)
      setSelectedUser(null)
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/admin/users/${userId}/status`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchAllData()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.delete(`http://localhost:3001/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('User deleted successfully')
      fetchAllData()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const updateSystemSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put('http://localhost:3001/api/admin/settings',
        { [key]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSystemSettings({ ...systemSettings, [key]: value })
      toast.success('Setting updated successfully')
    } catch (error) {
      toast.error('Failed to update setting')
    }
  }

  const createBackup = async () => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.post('http://localhost:3001/api/admin/backup', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Backup created successfully')
      fetchBackupInfo()
    } catch (error) {
      toast.error('Failed to create backup')
    }
  }

  const exportData = async (type) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`http://localhost:3001/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `system_export_${type}_${Date.now()}.${exportFormat}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export started')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const approveDeanApplication = async (applicationId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/admin/applications/dean/${applicationId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Dean application approved')
      fetchApplications()
      fetchAllData()
    } catch (error) {
      toast.error('Failed to approve application')
    }
  }

  const approveCommissionerApplication = async (applicationId) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(`http://localhost:3001/api/admin/applications/commissioner/${applicationId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Commissioner application approved')
      fetchApplications()
      fetchAllData()
    } catch (error) {
      toast.error('Failed to approve application')
    }
  }

  const rejectApplication = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    
    try {
      const token = localStorage.getItem('authToken')
      const endpoint = rejectType === 'dean' 
        ? `http://localhost:3001/api/admin/applications/dean/${rejectId}/reject`
        : `http://localhost:3001/api/admin/applications/commissioner/${rejectId}/reject`
      
      await axios.put(endpoint, { reason: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Application rejected')
      setShowRejectModal(false)
      setRejectReason('')
      fetchApplications()
    } catch (error) {
      toast.error('Failed to reject application')
    }
  }

  const showRejectModalHandler = (type, id, name) => {
    setRejectType(type)
    setRejectId(id)
    setRejectName(name)
    setShowRejectModal(true)
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  // Chart data
  const userTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'New Users',
      data: [12, 19, 15, 25, 22, 30],
      borderColor: 'rgb(139, 92, 246)',
      backgroundColor: 'rgba(139, 92, 246, 0.5)',
      tension: 0.4
    }]
  }

  const roleDistributionData = {
    labels: ['Students', 'Candidates', 'Commissioners', 'Dean', 'Admin'],
    datasets: [{
      data: [
        stats?.users?.student || 0,
        stats?.users?.candidate || 0,
        stats?.users?.commissioner || 0,
        stats?.users?.dean || 0,
        stats?.users?.admin || 0
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    }]
  }

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading System Dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-purple-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">System Administrator Dashboard</h1>
              <p className="mt-2">Welcome, {user?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm opacity-80">System Status</p>
                <p className="font-semibold">
                  {systemSettings.maintenance_mode ? '🔧 Maintenance Mode' : '✅ Operational'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'overview' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaChartLine />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'users' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUsers />
              <span>User Management</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'roles' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserCog />
              <span>Role Management</span>
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'applications' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserCog />
              <span>Role Applications</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'settings' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCog />
              <span>System Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'logs' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaFileAlt />
              <span>System Logs</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-purple-600">{stats?.users?.total || 0}</p>
                  </div>
                  <FaUsers className="text-4xl text-purple-300" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Active Users</p>
                    <p className="text-3xl font-bold text-green-600">
                      {users.filter(u => u.is_active).length}
                    </p>
                  </div>
                  <FaUserPlus className="text-4xl text-green-300" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">System Uptime</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {Math.floor(stats?.system?.uptime / 3600)}h
                    </p>
                  </div>
                  <FaShieldAlt className="text-4xl text-blue-300" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Last Backup</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {backupInfo?.last_backup ? new Date(backupInfo.last_backup).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <FaDatabase className="text-4xl text-orange-300" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">User Registration Trend</h3>
                <Line data={userTrendData} options={{ responsive: true }} />
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Role Distribution</h3>
                <div className="space-y-3">
                  {roleDistributionData.labels.map((label, index) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span>{roleDistributionData.datasets[0].data[index]}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(roleDistributionData.datasets[0].data[index] / stats?.users?.total) * 100}%`,
                            backgroundColor: roleDistributionData.datasets[0].backgroundColor[index]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Backup Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Database Backup</h3>
                <button
                  onClick={createBackup}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center space-x-2"
                >
                  <FaDatabase />
                  <span>Create Backup Now</span>
                </button>
              </div>
              {backupInfo && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-500">Last Backup</p>
                    <p className="font-semibold">{new Date(backupInfo.last_backup).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-500">Backup Size</p>
                    <p className="font-semibold">{backupInfo.size || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-500">Backup Status</p>
                    <p className="font-semibold text-green-600">✅ Healthy</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ USER MANAGEMENT TAB ============ */}
        {activeTab === 'users' && (
          <div>
            {/* Export Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border rounded-lg w-64"
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="candidate">Candidates</option>
                  <option value="commissioner">Commissioners</option>
                  <option value="dean">Dean</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
                <button
                  onClick={() => exportData('users')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2"
                >
                  <FaDownload />
                  <span>Export Users</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium">{userItem.full_name}</div>
                          <div className="text-xs text-gray-500">ID: {userItem.id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">{userItem.registration_number}</td>
                        <td className="px-6 py-4 text-sm">{userItem.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            userItem.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            userItem.role === 'dean' ? 'bg-red-100 text-red-800' :
                            userItem.role === 'commissioner' ? 'bg-orange-100 text-orange-800' :
                            userItem.role === 'candidate' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            userItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {userItem.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {userItem.last_login ? new Date(userItem.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(userItem)
                                setShowRoleModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Change Role"
                            >
                              <FaUserCog />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(userItem.id, userItem.is_active)}
                              className={userItem.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                              title={userItem.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {userItem.is_active ? <FaUserMinus /> : <FaUserPlus />}
                            </button>
                            {userItem.role !== 'admin' && (
                              <button
                                onClick={() => deleteUser(userItem.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete User"
                              >
                                <FaTrash />
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
        )}

        {/* ============ ROLE MANAGEMENT TAB ============ */}
        {activeTab === 'roles' && (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dean Management */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  Dean of Students
                </h3>
                <p className="text-gray-600 text-sm mb-4">Manages elections, verifies students, approves candidates</p>
                <div className="space-y-3">
                  {users.filter(u => u.role === 'dean').map(dean => (
                    <div key={dean.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <div>
                        <p className="font-semibold">{dean.full_name}</p>
                        <p className="text-sm text-gray-500">{dean.email}</p>
                      </div>
                      <button
                        onClick={() => updateUserRole(dean.id, 'commissioner')}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Dean
                      </button>
                    </div>
                  ))}
                  {users.filter(u => u.role !== 'dean' && u.role !== 'admin').length > 0 && (
                    <select
                      onChange={(e) => updateUserRole(parseInt(e.target.value), 'dean')}
                      className="w-full mt-2 px-3 py-2 border rounded"
                      defaultValue=""
                    >
                      <option value="">Assign New Dean...</option>
                      {users.filter(u => u.role !== 'dean' && u.role !== 'admin').map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.registration_number})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Commissioner Management */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Election Commissioners
                </h3>
                <p className="text-gray-600 text-sm mb-4">Review candidate applications</p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {users.filter(u => u.role === 'commissioner').map(comm => (
                    <div key={comm.id} className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <div>
                        <p className="font-semibold">{comm.full_name}</p>
                        <p className="text-sm text-gray-500">{comm.email}</p>
                      </div>
                      <button
                        onClick={() => updateUserRole(comm.id, 'student')}
                        className="text-orange-600 hover:text-orange-800 text-sm"
                      >
                        Remove Commissioner
                      </button>
                    </div>
                  ))}
                  {users.filter(u => u.role === 'student' || u.role === 'candidate').length > 0 && (
                    <select
                      onChange={(e) => updateUserRole(parseInt(e.target.value), 'commissioner')}
                      className="w-full mt-2 px-3 py-2 border rounded"
                      defaultValue=""
                    >
                      <option value="">Add Commissioner...</option>
                      {users.filter(u => u.role === 'student' || u.role === 'candidate').map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.registration_number})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Role Descriptions */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Role Responsibilities</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <h4 className="font-semibold text-blue-800">Students / Candidates</h4>
                  <p className="text-sm text-blue-600 mt-2">Vote in elections, apply for candidacy</p>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <h4 className="font-semibold text-orange-800">Commissioners</h4>
                  <p className="text-sm text-orange-600 mt-2">Review candidate applications</p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <h4 className="font-semibold text-red-800">Dean</h4>
                  <p className="text-sm text-red-600 mt-2">Manage elections, verify students, approve candidates</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ ROLE APPLICATIONS TAB ============ */}
        {activeTab === 'applications' && (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dean Applications */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  Dean Applications
                </h3>
                {deanApplications.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending dean applications</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {deanApplications.map((app) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{app.applicant?.full_name}</h4>
                            <p className="text-sm text-gray-500">{app.applicant?.registration_number}</p>
                            <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                            <p className="text-sm text-gray-500">Phone: {app.applicant?.phone_number || 'Not provided'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveDeanApplication(app.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => showRejectModalHandler('dean', app.id, app.applicant?.full_name)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                        <details className="mt-3">
                          <summary className="text-sm text-purple-600 cursor-pointer">View Application</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            <p><strong>Justification:</strong> {app.justification}</p>
                            {app.qualifications && <p><strong>Qualifications:</strong> {app.qualifications}</p>}
                            {app.experience && <p><strong>Experience:</strong> {app.experience}</p>}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commissioner Applications */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Commissioner Applications
                </h3>
                {commissionerApplications.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending commissioner applications</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {commissionerApplications.map((app) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{app.applicant?.full_name}</h4>
                            <p className="text-sm text-gray-500">{app.applicant?.registration_number}</p>
                            <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                            <p className="text-sm text-gray-500">Phone: {app.applicant?.phone_number || 'Not provided'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveCommissionerApplication(app.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => showRejectModalHandler('commissioner', app.id, app.applicant?.full_name)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                        <details className="mt-3">
                          <summary className="text-sm text-purple-600 cursor-pointer">View Application</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            <p><strong>Justification:</strong> {app.justification}</p>
                            {app.qualifications && <p><strong>Qualifications:</strong> {app.qualifications}</p>}
                            {app.experience && <p><strong>Experience:</strong> {app.experience}</p>}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ SYSTEM SETTINGS TAB ============ */}
        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
                  <input
                    type="text"
                    value={systemSettings.system_name}
                    onChange={(e) => updateSystemSetting('system_name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Election Duration (Days)</label>
                  <input
                    type="number"
                    value={systemSettings.election_default_duration}
                    onChange={(e) => updateSystemSetting('election_default_duration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="30"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Verification Required</p>
                    <p className="text-sm text-gray-500">Require email verification before voting</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.email_verification_required}
                      onChange={(e) => updateSystemSetting('email_verification_required', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Wallet Required for Voting</p>
                    <p className="text-sm text-gray-500">Require MetaMask wallet connection</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.wallet_required}
                      onChange={(e) => updateSystemSetting('wallet_required', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-verify Student Emails</p>
                    <p className="text-sm text-gray-500">Automatically verify @students.must.ac.ke emails</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.auto_verify_student_emails}
                      onChange={(e) => updateSystemSetting('auto_verify_student_emails', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="font-medium text-red-600">Maintenance Mode</p>
                    <p className="text-sm text-gray-500">Temporarily disable system access</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenance_mode}
                      onChange={(e) => updateSystemSetting('maintenance_mode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Node Version</span>
                  <span className="font-mono text-sm">{stats?.system?.node_version || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Environment</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${stats?.system?.environment === 'production' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {stats?.system?.environment || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Database</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Blockchain</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Total Storage Used</span>
                  <span className="font-mono text-sm">{backupInfo?.storage_used || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ SYSTEM LOGS TAB ============ */}
        {activeTab === 'logs' && (
          <div>
            {/* Export Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-end">
              <div className="flex items-center space-x-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
                <button
                  onClick={() => exportData('logs')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2"
                >
                  <FaDownload />
                  <span>Export Logs</span>
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {systemLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {log.user?.full_name || 'System'}
                          <div className="text-xs text-gray-500">{log.user?.registration_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-800' :
                            log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                            log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                            log.action.includes('UPDATE') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                         </td>
                        <td className="px-6 py-4 text-sm max-w-xs truncate">
                          {JSON.stringify(log.details).substring(0, 100)}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">{log.ip_address || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Change User Role</h3>
            <p className="text-gray-600 mb-4">User: <strong>{selectedUser.full_name}</strong></p>
            <p className="text-gray-600 mb-4">Current Role: <span className="capitalize">{selectedUser.role}</span></p>
            <select
              id="newRole"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              defaultValue={selectedUser.role}
            >
              <option value="student">Student</option>
              <option value="candidate">Candidate</option>
              <option value="commissioner">Commissioner</option>
              <option value="dean">Dean</option>
              {selectedUser.role !== 'admin' && <option value="admin">Admin</option>}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newRole = document.getElementById('newRole').value
                  updateUserRole(selectedUser.id, newRole)
                }}
                className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
              >
                Update Role
              </button>
              <button
                onClick={() => {
                  setShowRoleModal(false)
                  setSelectedUser(null)
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Reject Application</h3>
            <p className="text-gray-600 mb-2">Rejecting: <strong>{rejectName}</strong></p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              rows={4}
              placeholder="Please provide a reason for rejection..."
            />
            <div className="flex gap-2">
              <button
                onClick={rejectApplication}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}