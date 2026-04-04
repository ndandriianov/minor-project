import { useState, useRef, useEffect } from 'react'
import { useSearchSkillsQuery } from '@/store/api'
import type { Skill } from '@/types'
import SkillTag from './SkillTag'

interface SkillsAutocompleteProps {
  value: Skill[]
  onChange: (skills: Skill[]) => void
  label?: string
}

export default function SkillsAutocomplete({ value, onChange, label }: SkillsAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useSearchSkillsQuery(query, {
    skip: query.length < 2,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const add = (skill: Skill) => {
    if (!value.find((s) => s.id === skill.id)) onChange([...value, skill])
    setQuery('')
    setOpen(false)
  }

  const remove = (id: number) => onChange(value.filter((s) => s.id !== id))

  const filtered = results.filter((r) => !value.find((s) => s.id === r.id))

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map((s) => (
          <SkillTag key={s.id} name={s.name} onRemove={() => remove(s.id)} />
        ))}
      </div>
      <div className="relative" ref={ref}>
        <input
          type="text"
          placeholder="Введите навык..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {filtered.map((skill) => (
              <li
                key={skill.id}
                onClick={() => add(skill)}
                className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
