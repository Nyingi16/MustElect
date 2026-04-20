// utils/constants.js
export const ROLES = {
  STUDENT: 'student',
  CANDIDATE: 'candidate',
  COMMISSIONER: 'commissioner',
  DEAN: 'dean',
  ADMIN: 'admin'
}

export const SELECTABLE_ROLES = [
  { value: 'student', label: 'Student', description: 'Vote in elections and apply for candidacy' },
  { value: 'dean', label: 'Dean of Students', description: 'Manage elections, verify students, approve candidates (Requires Admin Approval)' },
  { value: 'commissioner', label: 'Election Commissioner', description: 'Review candidate applications (Requires Admin Approval)' }
]

export const SCHOOLS = [
  'Computing & Informatics',
  'Education',
  'Business & Economics',
  'Agriculture & Food Sciences',
  'Engineering & Architecture',
  'Health Sciences',
  'Nursing'
]

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const ELECTION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
  PUBLISHED: 'published'
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'