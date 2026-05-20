import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, Subscription } from '@/types'

interface AuthState {
  user: AuthUser | null
  subscription: Subscription | null
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  subscription: null,
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
        subscription?: Subscription
      }>,
    ) {
      state.user = action.payload.user
      state.subscription = action.payload.subscription ?? null
      state.isLoading = false
      localStorage.setItem('access_token', action.payload.access_token)
      if (action.payload.refresh_token) {
        localStorage.setItem('refresh_token', action.payload.refresh_token)
      }
    },
    setUser(state, action: PayloadAction<AuthUser & { subscription?: Subscription }>) {
      const { subscription, ...user } = action.payload
      state.user = user as AuthUser
      state.subscription = subscription ?? null
      state.isLoading = false
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    logout(state) {
      state.user = null
      state.subscription = null
      state.isLoading = false
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },
  },
})

export const { setCredentials, setUser, setLoading, logout } = authSlice.actions
export default authSlice.reducer
