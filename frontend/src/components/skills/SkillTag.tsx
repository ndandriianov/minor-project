interface SkillTagProps {
  name: string
  onRemove?: () => void
}

export default function SkillTag({ name, onRemove }: SkillTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-blue-900 font-bold leading-none"
        >
          ×
        </button>
      )}
    </span>
  )
}
