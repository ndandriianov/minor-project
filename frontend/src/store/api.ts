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
} from '@/types'

function unwrapArray<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) return response as T[]
  if (response && typeof response === 'object' && key in response) {
    const value = (response as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

export const platformApi = createApi({
  reducerPath: 'platformApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Internship', 'Application', 'Bookmark', 'Student', 'Pending', 'CompanyInternship'],
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
      providesTags: (_r, _e, id) => [{ type: 'Student', id }],
    }),

    updateProfile: b.mutation<Student, Omit<Partial<Student>, 'skills'> & { skills?: string[] }>({
      query: (body) => ({ url: '/api/students/profile', method: 'PUT', body }),
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
    listApplications: b.query<Application[], void>({
      query: () => '/api/applications',
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

    getApplicants: b.query<Application[], number>({
      query: (internshipId) => `/api/company/internships/${internshipId}/applications`,
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

    // ── Skills ────────────────────────────────────────────────────────────
    searchSkills: b.query<Skill[], string>({
      query: (search) => ({ url: '/api/skills', params: { search } }),
      transformResponse: (response: unknown): Skill[] => unwrapArray<Skill>(response, 'skills'),
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
  useListPendingQuery,
  useModerateMutation,
  useSearchSkillsQuery,
} = platformApi
