interface BadgeProps {
  children: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo'
  className?: string
}

const colorClass = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
}

export default function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass[color]} ${className}`}
    >
      {children}
    </span>
  )
}
