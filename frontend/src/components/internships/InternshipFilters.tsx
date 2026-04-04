import type { InternshipFilters } from '@/types'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

interface InternshipFiltersProps {
  filters: InternshipFilters
  onChange: (f: InternshipFilters) => void
}

const WORK_FORMAT_OPTIONS = [
  { value: '', label: 'Любой формат' },
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'remote', label: 'Удалённо' },
]

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Любой опыт' },
  { value: 'none', label: 'Без опыта' },
  { value: '<1year', label: 'До 1 года' },
  { value: '1-3years', label: '1–3 года' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'salary_desc', label: 'По зарплате' },
  { value: 'deadline', label: 'По дедлайну' },
]

export default function InternshipFilters({ filters, onChange }: InternshipFiltersProps) {
  const set = (key: keyof InternshipFilters, value: string | boolean | number | undefined) =>
    onChange({ ...filters, [key]: value || undefined, page: 1 })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <h3 className="font-semibold text-gray-800">Фильтры</h3>

      <Input
        label="Поиск"
        placeholder="Название, навыки..."
        value={filters.search ?? ''}
        onChange={(e) => set('search', e.target.value)}
      />

      <Input
        label="Город"
        placeholder="Москва"
        value={filters.city ?? ''}
        onChange={(e) => set('city', e.target.value)}
      />

      <Input
        label="Направление"
        placeholder="Разработка, маркетинг..."
        value={filters.direction ?? ''}
        onChange={(e) => set('direction', e.target.value)}
      />

      <Select
        label="Формат работы"
        value={filters.work_format ?? ''}
        onChange={(e) => set('work_format', e.target.value)}
        options={WORK_FORMAT_OPTIONS}
      />

      <Select
        label="Требуемый опыт"
        value={filters.required_experience ?? ''}
        onChange={(e) => set('required_experience', e.target.value)}
        options={EXPERIENCE_OPTIONS}
      />

      <div className="flex items-center gap-2">
        <input
          id="compat"
          type="checkbox"
          checked={filters.compatible_with_study ?? false}
          onChange={(e) => onChange({ ...filters, compatible_with_study: e.target.checked || undefined, page: 1 })}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="compat" className="text-sm text-gray-700">Совместимо с учёбой</label>
      </div>

      <Input
        label="Минимальная зарплата (₽)"
        type="number"
        placeholder="0"
        value={filters.min_salary ?? ''}
        onChange={(e) => set('min_salary', e.target.value ? Number(e.target.value) : undefined)}
      />

      <Select
        label="Сортировка"
        value={filters.sort ?? 'newest'}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as InternshipFilters['sort'], page: 1 })}
        options={SORT_OPTIONS}
      />

      <button
        type="button"
        onClick={() => onChange({ page: 1, per_page: 12 })}
        className="text-xs text-blue-600 hover:underline"
      >
        Сбросить фильтры
      </button>
    </div>
  )
}
