export interface AuthUser {
  id: string
  email: string
  username: string
}

export interface SignUpData {
  username: string
  password: string
}

export interface SignInData {
  username: string
  password: string
}
