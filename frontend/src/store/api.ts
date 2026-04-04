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
      providesTags: ['Bookmark'],
    }),

    addBookmark: b.mutation<Bookmark, number>({
      query: (internship_id) => ({
        url: '/api/bookmarks',
        method: 'POST',
        body: { internship_id },
      }),
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
