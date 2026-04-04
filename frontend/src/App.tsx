import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import RequireAuth from '@/guards/RequireAuth'
import RequireRole from '@/guards/RequireRole'

// Public
import HomePage from '@/pages/public/HomePage'
import InternshipsPage from '@/pages/public/InternshipsPage'
import InternshipDetailPage from '@/pages/public/InternshipDetailPage'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterStudentPage from '@/pages/auth/RegisterStudentPage'
import RegisterCompanyPage from '@/pages/auth/RegisterCompanyPage'

// Student
import StudentDashboardPage from '@/pages/student/StudentDashboardPage'
import RecommendationsPage from '@/pages/student/RecommendationsPage'
import ApplicationsPage from '@/pages/student/ApplicationsPage'
import BookmarksPage from '@/pages/student/BookmarksPage'
import ProfilePage from '@/pages/student/ProfilePage'

// Company
import CompanyDashboardPage from '@/pages/company/CompanyDashboardPage'
import MyInternshipsPage from '@/pages/company/MyInternshipsPage'
import CreateInternshipPage from '@/pages/company/CreateInternshipPage'
import EditInternshipPage from '@/pages/company/EditInternshipPage'
import InternshipApplicantsPage from '@/pages/company/InternshipApplicantsPage'

// Admin
import AdminModerationPage from '@/pages/admin/AdminModerationPage'

// 404
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route index element={<HomePage />} />
        <Route path="internships" element={<InternshipsPage />} />
        <Route path="internships/:id" element={<InternshipDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register/student" element={<RegisterStudentPage />} />
        <Route path="register/company" element={<RegisterCompanyPage />} />

        {/* Student */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole role="student" />}>
            <Route path="student/dashboard" element={<StudentDashboardPage />} />
            <Route path="student/recommendations" element={<RecommendationsPage />} />
            <Route path="student/applications" element={<ApplicationsPage />} />
            <Route path="student/bookmarks" element={<BookmarksPage />} />
            <Route path="student/profile" element={<ProfilePage />} />
          </Route>

          {/* Company */}
          <Route element={<RequireRole role="company" />}>
            <Route path="company/dashboard" element={<CompanyDashboardPage />} />
            <Route path="company/internships" element={<MyInternshipsPage />} />
            <Route path="company/internships/new" element={<CreateInternshipPage />} />
            <Route path="company/internships/:id/edit" element={<EditInternshipPage />} />
            <Route path="company/internships/:id/applicants" element={<InternshipApplicantsPage />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="admin/moderation" element={<AdminModerationPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
