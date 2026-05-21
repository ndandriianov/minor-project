import { useState } from 'react'
import type { Internship, InternshipFormData, Skill } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import SkillsAutocomplete from '@/components/skills/SkillsAutocomplete'

interface InternshipFormProps {
  initial?: Internship
  onSubmit: (data: InternshipFormData) => Promise<void>
  loading?: boolean
}

const FORMAT_OPTIONS = [
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'remote', label: 'Удалённо' },
]

const EXP_OPTIONS = [
  { value: 'none', label: 'Без опыта' },
  { value: '<1year', label: 'До 1 года' },
  { value: '1-3years', label: '1–3 года' },
]

export default function InternshipForm({ initial, onSubmit, loading }: InternshipFormProps) {
  const [form, setForm] = useState<InternshipFormData>(() => ({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    work_format: initial?.work_format ?? 'office',
    direction: initial?.direction ?? '',
    requirements: initial?.requirements ?? '',
    selection_stages: initial?.selection_stages ?? '',
    schedule: initial?.schedule ?? '',
    min_hours: initial?.min_hours,
    max_hours: initial?.max_hours,
    compatible_with_study: initial?.compatible_with_study ?? false,
    counts_as_practice: initial?.counts_as_practice ?? false,
    salary_min: initial?.salary_min,
    salary_max: initial?.salary_max,
    is_paid: initial?.is_paid ?? false,
    city: initial?.city ?? '',
    required_experience: initial?.required_experience ?? 'none',
    deadline: initial?.deadline ? initial.deadline.split('T')[0] : '',
  }))
  const [skills, setSkills] = useState<Skill[]>(() => initial?.required_skills ?? [])

  const set = <K extends keyof InternshipFormData>(key: K, value: InternshipFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form, skills: skills.map((s) => s.name) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basics */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Основная информация</h2>
        <Input label="Название *" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Стажёр-разработчик" />
        <Input label="Направление *" required value={form.direction} onChange={(e) => set('direction', e.target.value)} placeholder="Backend-разработка" />
        <Textarea label="Описание *" required rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} />
        <Textarea label="Требования" rows={4} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} />
        <Textarea label="Этапы отбора" rows={3} value={form.selection_stages} onChange={(e) => set('selection_stages', e.target.value)} />
      </section>

      {/* Format */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Формат и расписание</h2>
        <Select label="Формат работы *" value={form.work_format} onChange={(e) => set('work_format', e.target.value as 'office' | 'hybrid' | 'remote')} options={FORMAT_OPTIONS} />
        <Input label="График" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} placeholder="2 раза в неделю, гибко" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Мин. часов/нед" type="number" min={0} max={40} value={form.min_hours ?? ''} onChange={(e) => set('min_hours', e.target.value ? Number(e.target.value) : undefined)} />
          <Input label="Макс. часов/нед" type="number" min={0} max={40} value={form.max_hours ?? ''} onChange={(e) => set('max_hours', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="flex flex-col gap-2">
          {([['compatible_with_study', 'Совместимо с учёбой'], ['counts_as_practice', 'Засчитывается как практика']] as [keyof InternshipFormData, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => set(key, e.target.checked as InternshipFormData[typeof key])} className="w-4 h-4 accent-blue-600" />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Salary & Location */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Зарплата и местоположение</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.is_paid} onChange={(e) => set('is_paid', e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Оплачиваемая вакансия
        </label>
        {form.is_paid && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Зарплата от (₽)" type="number" min={0} value={form.salary_min ?? ''} onChange={(e) => set('salary_min', e.target.value ? Number(e.target.value) : undefined)} />
            <Input label="Зарплата до (₽)" type="number" min={0} value={form.salary_max ?? ''} onChange={(e) => set('salary_max', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        )}
        <Input label="Город" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Москва" />
      </section>

      {/* Requirements */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Требования</h2>
        <Select label="Требуемый опыт" value={form.required_experience ?? 'none'} onChange={(e) => set('required_experience', e.target.value as InternshipFormData['required_experience'])} options={EXP_OPTIONS} />
        <Input label="Дедлайн" type="date" value={form.deadline ?? ''} onChange={(e) => set('deadline', e.target.value)} />
        <SkillsAutocomplete value={skills} onChange={setSkills} label="Требуемые навыки" />
      </section>

      <Button type="submit" loading={loading} size="lg">
        {initial ? 'Сохранить изменения' : 'Создать вакансию'}
      </Button>
    </form>
  )
}
