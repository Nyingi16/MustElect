// components/common/Navbar.js
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import { FaUser, FaSignOutAlt, FaBars, FaTimes, FaShieldAlt, FaCrown, FaTachometerAlt, FaUsers } from 'react-icons/fa'

export default function Navbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getRoleColor = () => {
    switch (user?.role) {
      case 'student': return 'bg-blue-600'
      case 'candidate': return 'bg-green-600'
      case 'commissioner': return 'bg-orange-600'
      case 'dean': return 'bg-red-600'
      case 'admin': return 'bg-purple-700'
      default: return 'bg-gray-600'
    }
  }

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin': return <FaShieldAlt className="mr-1" />
      case 'dean': return <FaCrown className="mr-1" />
      default: return null
    }
  }

  const navLinks = [
    // Student/Candidate links
    { href: '/dashboard/student', label: 'Dashboard', roles: ['student', 'candidate'] },
    { href: '/dashboard/candidate', label: 'Candidate Portal', roles: ['candidate'] },
    { href: '/voting', label: 'Vote', roles: ['student'] },
    { href: '/candidates/apply', label: 'Apply as Candidate', roles: ['student'] },
    { href: '/candidates/list', label: 'Candidates', roles: ['student', 'candidate'] },
    { href: '/voting/results', label: 'Results', roles: ['student', 'candidate'] },
    
    // Commissioner links
    { href: '/dashboard/commissioner', label: 'Commissioner Dashboard', roles: ['commissioner'] },
    { href: '/candidates/manage', label: 'Review Applications', roles: ['commissioner'] },
    { href: '/reports', label: 'Reports', roles: ['commissioner'] },
    
    // Dean links - Updated: Candidate Approval replaced with Candidates
    { href: '/dashboard/dean', label: 'Dean Dashboard', roles: ['dean'] },
    { href: '/candidates', label: 'Candidates', roles: ['dean'] },
    { href: '/reports', label: 'Reports', roles: ['dean'] },
    
    // Admin links (System Administrator)
    { href: '/dashboard/admin', label: 'Admin Dashboard', roles: ['admin'] },
  ]

  const visibleLinks = navLinks.filter(link => 
    user && link.roles.includes(user.role)
  )

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin': return 'System Administrator'
      case 'dean': return 'Dean of Students'
      case 'commissioner': return 'Election Commissioner'
      case 'candidate': return 'Candidate'
      default: return 'Student'
    }
  }

  const isAdminPage = router.pathname === '/dashboard/admin'
  
  if (isAdminPage && user?.role === 'admin') {
    return null
  }

  return (
    <nav className={`${getRoleColor()} text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">🗳️ MUST Elections</span>
            {user?.role === 'admin' && (
              <span className="ml-2 text-xs bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
            )}
            {user?.role === 'dean' && (
              <span className="ml-2 text-xs bg-yellow-400 text-red-900 px-2 py-0.5 rounded-full font-semibold">DEAN</span>
            )}
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:opacity-80 transition ${
                  router.pathname === link.href ? 'font-bold underline' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getRoleIcon()}
              <FaUser />
              <div className="flex flex-col">
                <span>{user?.full_name?.split(' ')[0]}</span>
                <span className="text-xs opacity-80">{getRoleBadge()}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 hover:opacity-80 transition"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white focus:outline-none"
          >
            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <div className="flex items-center space-x-2 pb-4 mb-2 border-b border-white/20">
              <FaUser />
              <div>
                <div className="font-semibold">{user?.full_name}</div>
                <div className="text-xs opacity-80">{getRoleBadge()}</div>
              </div>
            </div>
            
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 hover:opacity-80 transition"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 py-2 w-full hover:opacity-80 transition mt-2 pt-2 border-t border-white/20"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}