interface RecommendationBadgeProps {
  score: number
  reasons: string[]
}

export default function RecommendationBadge({ score, reasons }: RecommendationBadgeProps) {
  const color =
    score >= 70 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className={`inline-flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs ${color}`}>
      <div className="font-semibold">Совпадение: {score}%</div>
      {reasons.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5">
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  )
}
