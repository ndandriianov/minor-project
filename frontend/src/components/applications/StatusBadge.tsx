import Badge from '@/components/ui/Badge'

const STATUS_CONFIG: Record<string, { label: string; color: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  applied:   { label: 'Отправлен', color: 'blue' },
  interview: { label: 'Интервью', color: 'yellow' },
  offer:     { label: 'Оффер', color: 'green' },
  rejected:  { label: 'Отказ', color: 'red' },
  withdrawn: { label: 'Отозван', color: 'gray' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'gray' as const }
  return <Badge color={cfg.color}>{cfg.label}</Badge>
}
