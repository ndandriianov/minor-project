import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { logout } from './authSlice'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const rawBase = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  prepareHeaders: (headers) => {
    if (!headers.has('Authorization')) {
      const token = localStorage.getItem('access_token')
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await rawBase(args, api, extra)

  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      const refreshResult = await rawBase(
        {
          url: '/api/auth/refresh',
          method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` },
        },
        api,
        extra,
      )

      if (refreshResult.data) {
        const data = refreshResult.data as { access_token: string }
        localStorage.setItem('access_token', data.access_token)
        result = await rawBase(args, api, extra)
      } else {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}
