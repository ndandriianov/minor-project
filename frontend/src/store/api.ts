import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithReauth } from './baseQuery'
import type {
  AuthSession,
  Internship,
  InternshipFilters,
  InternshipFormData,
  PaginatedInternships,
  Application,
  Bookmark,
  RecommendedInternship,
  Skill,
  Student,
  ApplicationFilters,
  Subscription,
  SubscriptionPlan,
  Payment,
  CheckoutResult,
  NotificationsResponse,
} from '@/types'

function unwrapArray<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) return response as T[]
  if (response && typeof response === 'object' && key in response) {
    const value = (response as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

function unwrapObject<T>(response: unknown, key: string): T {
  if (response && typeof response === 'object' && key in response) {
    return (response as Record<string, T>)[key]
  }
  return response as T
}

export const platformApi = createApi({
  reducerPath: 'platformApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Internship', 'Application', 'Bookmark', 'Student', 'Pending', 'CompanyInternship', 'Subscription', 'Notification', 'Payment'],
  endpoints: (b) => ({
    // ── Auth ──────────────────────────────────────────────────────────────
    login: b.mutation<AuthSession, { email: string; password: string }>({
      query: (body) => ({ url: '/api/auth/login', method: 'POST', body }),
    }),

    registerStudent: b.mutation<void, {
      email: string; password: string; first_name: string
      last_name: string; university: string; course: number; city: string
    }>({
      query: (body) => ({ url: '/api/auth/register/student', method: 'POST', body }),
    }),

    registerCompany: b.mutation<void, { email: string; password: string; name: string }>({
      query: (body) => ({ url: '/api/auth/register/company', method: 'POST', body }),
    }),

    me: b.query<Omit<AuthSession, 'access_token' | 'refresh_token'>, void>({
      query: () => '/api/auth/me',
    }),

    // ── Internships (public) ──────────────────────────────────────────────
    listInternships: b.query<PaginatedInternships, InternshipFilters>({
      query: (params) => ({ url: '/api/internships', params }),
      providesTags: ['Internship'],
    }),

    getInternship: b.query<Internship, number>({
      query: (id) => `/api/internships/${id}`,
      transformResponse: (response: unknown): Internship => {
        const data = response as { internship?: Internship } | Internship
        if (data && typeof data === 'object' && 'internship' in data && data.internship) {
          return data.internship
        }
        return data as Internship
      },
      providesTags: (_r, _e, id) => [{ type: 'Internship', id }],
    }),

    getRecommendations: b.query<RecommendedInternship[], void>({
      query: () => '/api/internships/recommendations',
      transformResponse: (response: unknown): RecommendedInternship[] => {
        const items = unwrapArray<{
          internship: Internship
          match_score: number
          match_reasons: string[]
        }>(response, 'recommendations')
        return items
          .filter((item) => item?.internship)
          .map((item) => ({
            ...item.internship,
            match_score: item.match_score,
            match_reasons: item.match_reasons,
          }))
      },
    }),

    // ── Student ───────────────────────────────────────────────────────────
    getStudent: b.query<Student, number>({
      query: (id) => `/api/students/${id}`,
      transformResponse: (response: unknown): Student => unwrapObject<Student>(response, 'student'),
      providesTags: (_r, _e, id) => [{ type: 'Student', id }],
    }),

    updateProfile: b.mutation<Student, Omit<Partial<Student>, 'skills'> & { skills?: string[] }>({
      query: (body) => ({ url: '/api/students/profile', method: 'PUT', body }),
      transformResponse: (response: unknown): Student => unwrapObject<Student>(response, 'student'),
      invalidatesTags: ['Student'],
    }),

    uploadResume: b.mutation<{ filename: string }, FormData>({
      query: (body) => ({
        url: '/api/students/resume',
        method: 'POST',
        body,
        formData: true,
      }),
    }),

    // ── Applications ──────────────────────────────────────────────────────
    listApplications: b.query<Application[], ApplicationFilters | void>({
      query: (params) => (params ? { url: '/api/applications', params } : '/api/applications'),
      transformResponse: (response: unknown): Application[] => unwrapArray<Application>(response, 'applications'),
      providesTags: ['Application'],
    }),

    apply: b.mutation<Application, { internship_id: number; cover_letter?: string }>({
      query: (body) => ({ url: '/api/applications', method: 'POST', body }),
      invalidatesTags: ['Application'],
    }),

    withdraw: b.mutation<void, number>({
      query: (id) => ({ url: `/api/applications/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: ['Application'],
    }),

    // ── Bookmarks ─────────────────────────────────────────────────────────
    listBookmarks: b.query<Bookmark[], void>({
      query: () => '/api/bookmarks',
      transformResponse: (response: unknown): Bookmark[] => {
        const data = response as { bookmarks?: Bookmark[] } | Bookmark[]
        if (data && typeof data === 'object' && 'bookmarks' in data && Array.isArray(data.bookmarks)) {
          return data.bookmarks
        }
        return (Array.isArray(data) ? data : []) as Bookmark[]
      },
      providesTags: ['Bookmark'],
    }),

    addBookmark: b.mutation<Bookmark, number>({
      query: (internship_id) => ({
        url: '/api/bookmarks',
        method: 'POST',
        body: { internship_id },
      }),
      transformResponse: (response: unknown): Bookmark => {
        const data = response as { bookmark?: Bookmark } | Bookmark
        if (data && typeof data === 'object' && 'bookmark' in data && data.bookmark) {
          return data.bookmark
        }
        return data as Bookmark
      },
      invalidatesTags: ['Bookmark'],
    }),

    removeBookmark: b.mutation<void, number>({
      query: (internship_id) => ({
        url: `/api/bookmarks/${internship_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Bookmark'],
    }),

    // ── Company ───────────────────────────────────────────────────────────
    listCompanyInternships: b.query<Internship[], void>({
      query: () => '/api/company/internships',
      transformResponse: (response: unknown): Internship[] => unwrapArray<Internship>(response, 'items'),
      providesTags: ['CompanyInternship'],
    }),

    createInternship: b.mutation<Internship, InternshipFormData>({
      query: (body) => ({ url: '/api/company/internships', method: 'POST', body }),
      invalidatesTags: ['CompanyInternship', 'Internship'],
    }),

    updateInternship: b.mutation<Internship, { id: number } & Partial<InternshipFormData>>({
      query: ({ id, ...body }) => ({
        url: `/api/company/internships/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CompanyInternship', 'Internship'],
    }),

    deleteInternship: b.mutation<void, number>({
      query: (id) => ({ url: `/api/company/internships/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CompanyInternship', 'Internship'],
    }),

    getApplicants: b.query<Application[], { internshipId: number; params?: ApplicationFilters }>({
      query: ({ internshipId, params }) => ({
        url: `/api/company/internships/${internshipId}/applications`,
        params,
      }),
      transformResponse: (response: unknown): Application[] => unwrapArray<Application>(response, 'applications'),
      providesTags: ['Application'],
    }),

    updateAppStatus: b.mutation<Application, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `/api/company/applications/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Application'],
    }),

    listCompanyApplications: b.query<Application[], ApplicationFilters | void>({
      query: (params) => (params ? { url: '/api/company/applications', params } : '/api/company/applications'),
      transformResponse: (response: unknown): Application[] => unwrapArray<Application>(response, 'applications'),
      providesTags: ['Application'],
    }),

    // ── Admin ─────────────────────────────────────────────────────────────
    listPending: b.query<Internship[], void>({
      query: () => '/api/admin/internships/pending',
      transformResponse: (response: unknown): Internship[] => unwrapArray<Internship>(response, 'items'),
      providesTags: ['Pending'],
    }),

    moderate: b.mutation<void, { id: number; action: 'approve' | 'reject'; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/admin/internships/${id}/moderate`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pending', 'Internship', 'CompanyInternship'],
    }),

    listAdminApplications: b.query<Application[], ApplicationFilters | void>({
      query: (params) => (params ? { url: '/api/admin/applications', params } : '/api/admin/applications'),
      transformResponse: (response: unknown): Application[] => unwrapArray<Application>(response, 'applications'),
      providesTags: ['Application'],
    }),

    // ── Skills ────────────────────────────────────────────────────────────
    searchSkills: b.query<Skill[], string>({
      query: (search) => ({ url: '/api/skills', params: { search } }),
      transformResponse: (response: unknown): Skill[] => unwrapArray<Skill>(response, 'skills'),
    }),

    // ── Autocomplete справочники ──────────────────────────────────────────
    searchUniversities: b.query<{ id: number; name: string; city?: string }[], string>({
      query: (search) => ({ url: '/api/universities', params: { search } }),
      transformResponse: (response: unknown) => unwrapArray<{ id: number; name: string; city?: string }>(response, 'items'),
    }),

    searchFaculties: b.query<{ id: number; name: string }[], { search: string; university_id?: number }>({
      query: ({ search, university_id }) => ({ url: '/api/faculties', params: { search, university_id } }),
      transformResponse: (response: unknown) => unwrapArray<{ id: number; name: string }>(response, 'items'),
    }),

    searchCities: b.query<{ id: number; name: string }[], string>({
      query: (search) => ({ url: '/api/cities', params: { search } }),
      transformResponse: (response: unknown) => unwrapArray<{ id: number; name: string }>(response, 'items'),
    }),

    // ── Подписки ─────────────────────────────────────────────────────────
    getSubscriptionPlans: b.query<SubscriptionPlan[], void>({
      query: () => '/api/subscriptions/plans',
      transformResponse: (response: unknown) => unwrapArray<SubscriptionPlan>(response, 'plans'),
    }),

    getMySubscription: b.query<Subscription | null, void>({
      query: () => '/api/subscriptions/me',
      transformResponse: (response: unknown) => unwrapObject<Subscription | null>(response, 'subscription'),
      providesTags: ['Subscription'],
    }),

    checkout: b.mutation<CheckoutResult, { plan: 'premium' | 'b2b' }>({
      query: (body) => ({ url: '/api/subscriptions/checkout', method: 'POST', body }),
      invalidatesTags: ['Subscription', 'Payment'],
    }),

    cancelSubscription: b.mutation<void, void>({
      query: () => ({ url: '/api/subscriptions/cancel', method: 'POST' }),
      invalidatesTags: ['Subscription'],
    }),

    // ── Платежи ───────────────────────────────────────────────────────────
    getPayments: b.query<Payment[], void>({
      query: () => '/api/payments',
      transformResponse: (response: unknown) => unwrapArray<Payment>(response, 'payments'),
      providesTags: ['Payment'],
    }),

    getPayment: b.query<Payment, number>({
      query: (id) => `/api/payments/${id}`,
      transformResponse: (response: unknown) => unwrapObject<Payment>(response, 'payment'),
      providesTags: (_r, _e, id) => [{ type: 'Payment', id }],
    }),

    // ── Уведомления ───────────────────────────────────────────────────────
    getNotifications: b.query<NotificationsResponse, { unread?: boolean } | void>({
      query: (params) => ({ url: '/api/notifications', params: params ?? {} }),
      providesTags: ['Notification'],
    }),

    markNotificationRead: b.mutation<void, number>({
      query: (id) => ({ url: `/api/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),

    markAllRead: b.mutation<void, void>({
      query: () => ({ url: '/api/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),

    // ── ИИ-резюме (Premium) ───────────────────────────────────────────────
    aiAdaptResume: b.mutation<{
      provider: string
      matched_skills: string[]
      missing_skills: string[]
      adapted_resume: string
      tips: string[]
    }, { internship_id: number }>({
      query: (body) => ({ url: '/api/students/resume/ai-adapt', method: 'POST', body }),
    }),

    // ── Логотип компании ──────────────────────────────────────────────────
    uploadLogo: b.mutation<{ logo_url: string }, FormData>({
      query: (body) => ({ url: '/api/companies/logo', method: 'POST', body, formData: true }),
    }),

    // ── B2B ───────────────────────────────────────────────────────────────
    searchStudents: b.query<Student[], {
      city?: string
      university?: string
      course?: number
      skills?: string[]
    }>({
      query: (params) => ({ url: '/api/company/students/search', params }),
      transformResponse: (response: unknown) => unwrapArray<Student>(response, 'students'),
    }),

    getAnalytics: b.query<Record<string, unknown>, void>({
      query: () => '/api/company/analytics',
    }),

    promoteInternship: b.mutation<void, { id: number; days: number }>({
      query: ({ id, days }) => ({
        url: `/api/company/internships/${id}/promote`,
        method: 'POST',
        body: { days },
      }),
      invalidatesTags: ['CompanyInternship', 'Internship'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterStudentMutation,
  useRegisterCompanyMutation,
  useMeQuery,
  useListInternshipsQuery,
  useGetInternshipQuery,
  useGetRecommendationsQuery,
  useGetStudentQuery,
  useUpdateProfileMutation,
  useUploadResumeMutation,
  useListApplicationsQuery,
  useApplyMutation,
  useWithdrawMutation,
  useListBookmarksQuery,
  useAddBookmarkMutation,
  useRemoveBookmarkMutation,
  useListCompanyInternshipsQuery,
  useCreateInternshipMutation,
  useUpdateInternshipMutation,
  useDeleteInternshipMutation,
  useGetApplicantsQuery,
  useUpdateAppStatusMutation,
  useListCompanyApplicationsQuery,
  useListPendingQuery,
  useModerateMutation,
  useListAdminApplicationsQuery,
  useSearchSkillsQuery,
  useSearchUniversitiesQuery,
  useSearchFacultiesQuery,
  useSearchCitiesQuery,
  useGetSubscriptionPlansQuery,
  useGetMySubscriptionQuery,
  useCheckoutMutation,
  useCancelSubscriptionMutation,
  useGetPaymentsQuery,
  useGetPaymentQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
  useAiAdaptResumeMutation,
  useUploadLogoMutation,
  useSearchStudentsQuery,
  useGetAnalyticsQuery,
  usePromoteInternshipMutation,
} = platformApi
