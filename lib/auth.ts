import { readJSON, writeJSON } from '@/lib/storage'

export interface User {
  id: string
  username: string
  name: string
  grade: number
  classNumber?: string
  bio?: string
  interests?: string[]
  mbti?: string
  toefl?: string
  sat?: string
  ap?: string
  otherScores?: string
  externalScores?: string
  gpa?: string
  bestSubject?: string
  message?: string
}

export interface RegisteredUser extends User {
  password: string
}

const PASSWORD_PREFIX = 'sha256:'

const canHashPasswords = () =>
  typeof window !== 'undefined' &&
  typeof crypto !== 'undefined' &&
  typeof crypto.subtle !== 'undefined' &&
  typeof TextEncoder !== 'undefined'

const toHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const hashPassword = async (password: string) => {
  if (!canHashPasswords()) return `${PASSWORD_PREFIX}${password}`
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `${PASSWORD_PREFIX}${toHex(digest)}`
}

const isHashedPassword = (value: string) => value.startsWith(PASSWORD_PREFIX)

export const verifyPassword = async (input: string, stored: string) => {
  if (!stored) return false
  if (isHashedPassword(stored)) {
    return stored === (await hashPassword(input))
  }
  return stored === input
}

export const hashPasswordForStorage = (password: string) => hashPassword(password)

export async function registerUser(userData: RegisteredUser) {
  const users = getRegisteredUsers()
  const password = await hashPassword(userData.password)
  users.push({ ...userData, password })
  writeJSON('kgscp_registered_users', users)
}

export function getRegisteredUsers(): RegisteredUser[] {
  const users = readJSON<RegisteredUser[]>('kgscp_registered_users', [])
  return Array.isArray(users) ? users : []
}

export async function validateLogin(username: string, password: string): Promise<User | null> {
  const users = getRegisteredUsers()
  const userIndex = users.findIndex((u) => u.username === username)
  if (userIndex === -1) return null

  const user = users[userIndex]
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) return null

  if (!isHashedPassword(user.password)) {
    const hashedPassword = await hashPassword(password)
    users[userIndex] = { ...user, password: hashedPassword }
    writeJSON('kgscp_registered_users', users)
  }

  const { password: _, ...userWithoutPassword } = users[userIndex]
  return userWithoutPassword
}

export function getCurrentUser(): User | null {
  return readJSON<User | null>('kgscp_user', null)
}

export function logout() {
  localStorage.removeItem('kgscp_user')
  window.location.href = '/login'
}
