import Button from './Button'

interface PaginationProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null

  const nums: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
    nums.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Button
        variant="ghost"
        size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </Button>
      {nums[0] > 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onPageChange(1)}>1</Button>
          {nums[0] > 2 && <span className="px-2 text-gray-400">…</span>}
        </>
      )}
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPageChange(n)}
        >
          {n}
        </Button>
      ))}
      {nums[nums.length - 1] < pages && (
        <>
          {nums[nums.length - 1] < pages - 1 && <span className="px-2 text-gray-400">…</span>}
          <Button variant="ghost" size="sm" onClick={() => onPageChange(pages)}>{pages}</Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </Button>
    </div>
  )
}
