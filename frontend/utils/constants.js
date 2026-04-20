// utils/constants.js
// Centralized constants for the MUST Elections frontend

// ============ USER ROLES ============
export const ROLES = {
  STUDENT: 'student',
  CANDIDATE: 'candidate',
  COMMISSIONER: 'commissioner',
  DEAN: 'dean',
  ADMIN: 'admin'
}

// ============ SELECTABLE ROLES FOR REGISTRATION ============
export const SELECTABLE_ROLES = [
  { 
    value: 'student', 
    label: 'Student', 
    description: 'Vote in elections and apply for candidacy',
    requiresApproval: false
  },
  { 
    value: 'dean', 
    label: 'Dean of Students', 
    description: 'Manage elections, verify students, approve candidates (Requires Admin Approval)',
    requiresApproval: true
  },
  { 
    value: 'commissioner', 
    label: 'Election Commissioner', 
    description: 'Review candidate applications (Requires Admin Approval)',
    requiresApproval: true
  }
]

// ============ SCHOOLS / DEPARTMENTS ============
export const SCHOOLS = [
  'Computing & Informatics',
  'Education',
  'Business & Economics',
  'Agriculture & Food Sciences',
  'Engineering & Architecture',
  'Health Sciences',
  'Nursing'
]

// ============ APPLICATION STATUS ============
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// ============ ELECTION STATUS ============
export const ELECTION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
  PUBLISHED: 'published'
}

// ============ VOTER STATUS ============
export const VOTER_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
}

// ============ CANDIDATE APPLICATION STATUS ============
export const CANDIDATE_APPLICATION_STATUS = {
  PENDING: 'pending',
  COMMISSIONER_APPROVED: 'commissioner_approved',
  COMMISSIONER_REJECTED: 'commissioner_rejected',
  DEAN_APPROVED: 'dean_approved',
  DEAN_REJECTED: 'dean_rejected'
}

// ============ VOTE STATUS ============
export const VOTE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed'
}

// ============ REPORT TYPES ============
export const REPORT_TYPES = {
  RESULTS: 'results',
  TURNOUT: 'turnout',
  AUDIT: 'audit',
  CANDIDATES: 'candidates',
  VOTERS: 'voters'
}

// ============ API ENDPOINTS ============
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    COMPLETE_PROFILE: '/auth/complete-profile',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  // Student endpoints
  STUDENT: {
    DASHBOARD: '/student/dashboard',
    ELECTION_STATUS: '/student/election-status',
    CANDIDATES: '/student/candidates',
    VOTE: '/student/vote',
    VOTE_RECEIPT: '/student/vote/receipt',
    RESULTS: '/student/results'
  },
  // Candidate endpoints
  CANDIDATE: {
    APPLY: '/candidate/apply',
    APPLICATION_STATUS: '/candidate/application-status',
    MANIFESTO: '/candidate/manifesto',
    CAMPAIGN_STATS: '/candidate/campaign-stats',
    WITHDRAW: '/candidate/withdraw'
  },
  // Commissioner endpoints
  COMMISSIONER: {
    PENDING_APPLICATIONS: '/commissioner/applications/pending',
    APPROVE_APPLICATION: '/commissioner/applications',
    REJECT_APPLICATION: '/commissioner/applications',
    APPROVED_CANDIDATES: '/commissioner/candidates/approved',
    VOTER_STATS: '/commissioner/stats/voters'
  },
  // Dean endpoints
  DEAN: {
    DASHBOARD_STATS: '/dean/dashboard/stats',
    REALTIME_STATS: '/dean/dashboard/realtime',
    STUDENTS: '/dean/students',
    VERIFY_STUDENT: '/dean/students',
    REJECT_STUDENT: '/dean/students',
    CANDIDATES: '/dean/candidates',
    APPROVE_CANDIDATE: '/dean/candidates',
    REJECT_CANDIDATE: '/dean/candidates',
    ELECTIONS: '/dean/elections',
    START_ELECTION: '/dean/elections',
    END_ELECTION: '/dean/elections',
    PUBLISH_RESULTS: '/dean/elections',
    RESULTS: '/dean/results'
  },
  // Admin endpoints
  ADMIN: {
    SYSTEM_STATS: '/admin/system/stats',
    USERS: '/admin/users',
    UPDATE_USER_ROLE: '/admin/users',
    TOGGLE_USER_STATUS: '/admin/users',
    DELETE_USER: '/admin/users',
    DEAN_APPLICATIONS: '/admin/applications/dean',
    COMMISSIONER_APPLICATIONS: '/admin/applications/commissioner',
    APPROVE_DEAN: '/admin/applications/dean',
    REJECT_DEAN: '/admin/applications/dean',
    APPROVE_COMMISSIONER: '/admin/applications/commissioner',
    REJECT_COMMISSIONER: '/admin/applications/commissioner',
    SETTINGS: '/admin/settings',
    AUDIT_LOGS: '/admin/audit',
    BACKUP: '/admin/backup'
  },
  // Report endpoints
  REPORTS: {
    GENERATE: '/reports/generate',
    LIST: '/reports/list',
    DOWNLOAD: '/reports/download',
    VERIFY: '/reports/verify'
  },
  // Blockchain endpoints
  BLOCKCHAIN: {
    CONTRACT_INFO: '/blockchain/contract-info',
    ELECTION_STATS: '/blockchain/election',
    VERIFY_VOTE: '/blockchain/vote/verify',
    SYNC_VOTES: '/blockchain/sync-votes'
  }
}

// ============ ROUTES ============
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_OTP: '/verify-otp',
  COMPLETE_PROFILE: '/complete-profile',
  DASHBOARD: {
    STUDENT: '/dashboard/student',
    CANDIDATE: '/dashboard/candidate',
    COMMISSIONER: '/dashboard/commissioner',
    DEAN: '/dashboard/dean',
    ADMIN: '/dashboard/admin'
  },
  VOTING: {
    INDEX: '/voting',
    RESULTS: '/voting/results'
  },
  CANDIDATES: {
    LIST: '/candidates/list',
    APPLY: '/candidates/apply',
    MANAGE: '/candidates/manage'
  },
  REPORTS: {
    INDEX: '/reports',
    GENERATE: '/reports/generate',
    VERIFY: '/reports/verify'
  },
  ADMIN: {
    USERS: '/admin/users',
    ELECTIONS: '/admin/elections',
    SETTINGS: '/admin/settings',
    AUDIT: '/admin/audit'
  }
}

// ============ LOCAL STORAGE KEYS ============
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ROLE: 'userRole',
  REMEMBER_ME: 'rememberMe',
  SAVED_IDENTIFIER: 'savedIdentifier',
  SAVED_PASSWORD: 'savedPassword',
  PENDING_USER_ID: 'pendingUserId',
  PENDING_USER_ROLE: 'pendingUserRole'
}

// ============ THEME COLORS ============
export const THEME_COLORS = {
  student: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    dark: '#1E3A8A',
    light: '#EFF6FF'
  },
  candidate: {
    primary: '#10B981',
    secondary: '#34D399',
    dark: '#065F46',
    light: '#ECFDF5'
  },
  commissioner: {
    primary: '#F59E0B',
    secondary: '#FBBF24',
    dark: '#B45309',
    light: '#FFFBEB'
  },
  dean: {
    primary: '#EF4444',
    secondary: '#F87171',
    dark: '#991B1B',
    light: '#FEF2F2'
  },
  admin: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    dark: '#5B21B6',
    light: '#F5F3FF'
  }
}

// ============ PAGINATION DEFAULTS ============
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100]
}

// ============ DATE FORMATS ============
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  API: 'YYYY-MM-DDTHH:mm:ssZ',
  TIME_ONLY: 'HH:mm'
}

// ============ TOAST NOTIFICATION DEFAULTS ============
export const TOAST_DURATION = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 5000
}

// ============ FORM VALIDATION ============
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 50,
  MANIFESTO_MIN_LENGTH: 50,
  MANIFESTO_MAX_LENGTH: 5000,
  REGISTRATION_NUMBER_MIN_LENGTH: 4,
  REGISTRATION_NUMBER_MAX_LENGTH: 20,
  PHONE_NUMBER_PATTERN: /^(\+254|0)[7-9][0-9]{8}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  WALLET_ADDRESS_PATTERN: /^0x[a-fA-F0-9]{40}$/i
}

// ============ FILE EXPORT FORMATS ============
export const EXPORT_FORMATS = {
  CSV: 'csv',
  PDF: 'pdf',
  EXCEL: 'excel'
}

// ============ CHART COLORS ============
export const CHART_COLORS = {
  BLUE: '#3B82F6',
  GREEN: '#10B981',
  ORANGE: '#F59E0B',
  RED: '#EF4444',
  PURPLE: '#8B5CF6',
  YELLOW: '#FBBF24',
  PINK: '#EC4899',
  INDIGO: '#6366F1',
  TEAL: '#14B8A6',
  GRAY: '#6B7280'
}

// ============ HELPER FUNCTIONS ============
export const getRoleColor = (role) => {
  const colors = {
    student: THEME_COLORS.student.primary,
    candidate: THEME_COLORS.candidate.primary,
    commissioner: THEME_COLORS.commissioner.primary,
    dean: THEME_COLORS.dean.primary,
    admin: THEME_COLORS.admin.primary
  }
  return colors[role] || THEME_COLORS.student.primary
}

export const getRoleLabel = (role) => {
  const labels = {
    student: 'Student',
    candidate: 'Candidate',
    commissioner: 'Election Commissioner',
    dean: 'Dean of Students',
    admin: 'System Administrator'
  }
  return labels[role] || 'Unknown'
}

export const formatDate = (date, format = DATE_FORMATS.DISPLAY) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (format === DATE_FORMATS.DISPLAY) {
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }
  if (format === DATE_FORMATS.DISPLAY_WITH_TIME) {
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString()
}

export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default {
  ROLES,
  SELECTABLE_ROLES,
  SCHOOLS,
  APPLICATION_STATUS,
  ELECTION_STATUS,
  VOTER_STATUS,
  CANDIDATE_APPLICATION_STATUS,
  VOTE_STATUS,
  REPORT_TYPES,
  API_URL,
  API_ENDPOINTS,
  ROUTES,
  STORAGE_KEYS,
  THEME_COLORS,
  PAGINATION,
  DATE_FORMATS,
  TOAST_DURATION,
  VALIDATION,
  EXPORT_FORMATS,
  CHART_COLORS,
  getRoleColor,
  getRoleLabel,
  formatDate,
  truncateText
}