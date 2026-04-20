// components/common/Sidebar.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import {
  FaTachometerAlt,
  FaUsers,
  FaVoteYea,
  FaUserCheck,
  FaFileAlt,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaUserGraduate,
  FaClipboardList
} from 'react-icons/fa'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const menuItems = {
    student: [
      { href: '/dashboard/student', icon: FaTachometerAlt, label: 'Dashboard' },
      { href: '/voting', icon: FaVoteYea, label: 'Cast Vote' },
      { href: '/candidates/list', icon: FaUsers, label: 'View Candidates' },
      { href: '/candidates/apply', icon: FaUserCheck, label: 'Apply as Candidate' },
      { href: '/voting/results', icon: FaChartBar, label: 'Results' },
    ],
    candidate: [
      { href: '/dashboard/candidate', icon: FaTachometerAlt, label: 'Dashboard' },
      { href: '/candidates/list', icon: FaUsers, label: 'View Candidates' },
      { href: '/voting/results', icon: FaChartBar, label: 'Results' },
    ],
    commissioner: [
      { href: '/dashboard/commissioner', icon: FaTachometerAlt, label: 'Dashboard' },
      { href: '/candidates/manage', icon: FaClipboardList, label: 'Review Applications' },
      { href: '/reports', icon: FaFileAlt, label: 'Reports' },
    ],
    dean: [
      { href: '/dashboard/dean', icon: FaTachometerAlt, label: 'Dashboard' },
      { href: '/admin/users', icon: FaUserGraduate, label: 'User Management' },
      { href: '/admin/elections', icon: FaVoteYea, label: 'Election Management' },
      { href: '/candidates/manage', icon: FaClipboardList, label: 'Candidate Management' },
      { href: '/reports', icon: FaFileAlt, label: 'Reports' },
      { href: '/admin/audit', icon: FaFileAlt, label: 'Audit Logs' },
      { href: '/admin/settings', icon: FaCog, label: 'Settings' },
    ]
  }

  const items = menuItems[user?.role] || menuItems.student

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">MUST Elections</h2>
          <p className="text-sm text-gray-400 mt-1">{user?.full_name?.split(' ')[0]}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>

        <nav className="p-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition mt-4"
          >
            <FaSignOutAlt size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </>
  )
}