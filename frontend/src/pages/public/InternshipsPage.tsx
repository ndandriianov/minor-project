import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useListInternshipsQuery } from '@/store/api'
import type { InternshipFilters } from '@/types'
import InternshipCard from '@/components/internships/InternshipCard'
import InternshipFiltersPanel from '@/components/internships/InternshipFilters'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function InternshipsPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<InternshipFilters>({
    search: searchParams.get('search') ?? undefined,
    page: 1,
    per_page: 12,
  })

  const debouncedFilters = useDebounce(filters, 300)
  const { data, isLoading, isFetching } = useListInternshipsQuery(debouncedFilters)

  const handleFiltersChange = useCallback((f: InternshipFilters) => setFilters(f), [])

  return (
    <div className="flex gap-6">
      {/* Filters sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <InternshipFiltersPanel filters={filters} onChange={handleFiltersChange} />
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Стажировки</h1>
          {data && (
            <span className="text-sm text-gray-500">Найдено: {data.total}</span>
          )}
        </div>

        {/* Mobile filters */}
        <div className="lg:hidden mb-4">
          <InternshipFiltersPanel filters={filters} onChange={handleFiltersChange} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data?.internships.length ? (
          <EmptyState
            title="Стажировки не найдены"
            description="Попробуйте изменить параметры поиска"
          />
        ) : (
          <>
            <div className={`grid sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {data.internships.map((internship) => (
                <InternshipCard key={internship.id} internship={internship} />
              ))}
            </div>
            <Pagination
              page={data.page}
              pages={data.pages}
              onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            />
          </>
        )}
      </div>
    </div>
  )
}
