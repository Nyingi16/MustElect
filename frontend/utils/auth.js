// utils/auth.js
import jwtDecode from 'jwt-decode'

export const isTokenValid = (token) => {
  if (!token) return false
  try {
    const decoded = jwtDecode(token)
    return decoded.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export const getUserFromToken = (token) => {
  if (!token) return null
  try {
    return jwtDecode(token)
  } catch {
    return null
  }
}

export const getRoleRedirect = (role) => {
  const redirects = {
    student: '/dashboard/student',
    candidate: '/dashboard/candidate',
    commissioner: '/dashboard/commissioner',
    dean: '/dashboard/dean'
  }
  return redirects[role] || '/login'
}