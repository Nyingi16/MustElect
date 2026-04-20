// config/constants.js
export const ROLES = {
  STUDENT: 'student',
  CANDIDATE: 'candidate',
  COMMISSIONER: 'commissioner',
  DEAN: 'dean'
}

export const ELECTION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
  PUBLISHED: 'published'
}

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  COMMISSIONER_APPROVED: 'commissioner_approved',
  COMMISSIONER_REJECTED: 'commissioner_rejected',
  DEAN_APPROVED: 'dean_approved',
  DEAN_REJECTED: 'dean_rejected'
}

export const API_URL = process.env.API_URL || 'http://localhost:3001/api'

export const COLORS = {
  student: { primary: '#3B82F6', secondary: '#60A5FA', dark: '#1E3A8A' },
  candidate: { primary: '#10B981', secondary: '#34D399', dark: '#065F46' },
  commissioner: { primary: '#F59E0B', secondary: '#FBBF24', dark: '#B45309' },
  dean: { primary: '#EF4444', secondary: '#F87171', dark: '#991B1B' }
}

export const POSITIONS = [
  'Student Council President',
  'Vice President',
  'Secretary General',
  'Treasurer',
  'Academic Affairs Director',
  'Sports and Recreation Director',
  'Health and Wellness Director',
  'International Students Representative'
]

export const DEPARTMENTS = [
  'Computer Science',
  'Engineering',
  'Business',
  'Education',
  'Health Sciences',
  'Agriculture',
  'Law'
]