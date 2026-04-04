import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import { platformApi } from './api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [platformApi.reducerPath]: platformApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(platformApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
