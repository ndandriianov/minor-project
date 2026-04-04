import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        user: AuthUser
        access_token: string
        refresh_token?: string
      }>,
    ) {
      state.user = action.payload.user
      state.isLoading = false
      localStorage.setItem('access_token', action.payload.access_token)
      if (action.payload.refresh_token) {
        localStorage.setItem('refresh_token', action.payload.refresh_token)
      }
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.isLoading = false
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    logout(state) {
      state.user = null
      state.isLoading = false
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },
  },
})

export const { setCredentials, setUser, setLoading, logout } = authSlice.actions
export default authSlice.reducer
