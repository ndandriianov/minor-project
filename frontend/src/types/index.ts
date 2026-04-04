export interface Skill {
  id: number
  name: string
}

export interface Company {
  id: number
  name: string
  description?: string
  website?: string
  logo_url?: string
  city?: string
}

export interface Student {
  id: number
  user_id: number
  first_name: string
  last_name: string
  patronymic?: string
  university?: string
  faculty?: string
  course?: number
  speciality?: string
  city?: string
  work_format?: 'office' | 'hybrid' | 'remote' | 'any'
  desired_hours?: '40' | '20-40' | '<20' | 'any'
  bio?: string
  portfolio_url?: string
  github_url?: string
  resume_filename?: string
  experience?: string
  certificates?: string
  skills: Skill[]
}

export interface Internship {
  id: number
  title: string
  direction?: string
  description: string
  requirements?: string
  selection_stages?: string
  work_format: 'office' | 'hybrid' | 'remote'
  schedule?: string
  min_hours?: number
  max_hours?: number
  compatible_with_study: boolean
  salary_min?: number
  salary_max?: number
  is_paid: boolean
  city?: string
  counts_as_practice: boolean
  required_experience: 'none' | '<1year' | '1-3years'
  deadline?: string
  moderation_status: 'pending' | 'published' | 'rejected' | 'archived'
  is_verified: boolean
  created_at: string
  company: Company
  required_skills: Skill[]
}

export interface Application {
  id: number
  student_id: number
  internship_id: number
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
  cover_letter?: string
  created_at: string
  updated_at: string
  internship?: Internship
  student?: Student
}

export interface Bookmark {
  id: number
  student_id: number
  internship_id: number
  created_at: string
  internship: Internship
}

export interface AuthUser {
  id: number
  email: string
  role: 'student' | 'company'
  student?: Student
  company?: Company
}

export interface RecommendedInternship extends Internship {
  match_score: number
  match_reasons: string[]
}

export interface PaginatedInternships {
  items: Internship[]
  internships?: Internship[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface InternshipFilters {
  search?: string
  city?: string
  direction?: string
  work_format?: string
  required_experience?: string
  compatible_with_study?: boolean
  min_salary?: number
  max_hours?: number
  sort?: 'newest' | 'salary_desc' | 'deadline'
  page?: number
  per_page?: number
}

export interface InternshipFormData {
  title: string
  direction?: string
  description: string
  requirements?: string
  selection_stages?: string
  work_format: 'office' | 'hybrid' | 'remote'
  schedule?: string
  min_hours?: number
  max_hours?: number
  compatible_with_study?: boolean
  salary_min?: number
  salary_max?: number
  is_paid?: boolean
  city?: string
  counts_as_practice?: boolean
  required_experience?: 'none' | '<1year' | '1-3years'
  deadline?: string
  skills?: string[]
}
