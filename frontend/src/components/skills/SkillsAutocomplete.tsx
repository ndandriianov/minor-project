import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchSkillsQuery } from '@/store/api'
import type { Skill } from '@/types'
import SkillTag from './SkillTag'

interface SkillsAutocompleteProps {
  value: Skill[]
  onChange: (skills: Skill[]) => void
  label?: string
  placeholder?: string
  showHint?: boolean
}

type SkillOption =
  | { type: 'create'; skill: Skill }
  | { type: 'existing'; skill: Skill }

function createCustomSkill(name: string): Skill {
  return {
    id: -Date.now() - Math.floor(Math.random() * 1000),
    name,
  }
}

export default function SkillsAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Начните вводить навык',
  showHint = true,
}: SkillsAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const trimmedQuery = query.trim()

  const { data: results = [], isFetching } = useSearchSkillsQuery(trimmedQuery)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestions = useMemo(
    () => results.filter((skill) => !value.some((selected) => selected.name.toLowerCase() === skill.name.toLowerCase())),
    [results, value],
  )

  const canCreate = Boolean(
    trimmedQuery
    && !value.some((skill) => skill.name.toLowerCase() === trimmedQuery.toLowerCase())
    && !suggestions.some((skill) => skill.name.toLowerCase() === trimmedQuery.toLowerCase()),
  )

  const options = useMemo<SkillOption[]>(() => {
    const items: SkillOption[] = suggestions.map((skill) => ({ type: 'existing', skill }))
    if (canCreate) {
      items.unshift({ type: 'create', skill: createCustomSkill(trimmedQuery) })
    }
    return items
  }, [suggestions, canCreate, trimmedQuery])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [trimmedQuery, options.length])

  const commitSkill = (skill: Skill) => {
    if (!value.some((selected) => selected.name.toLowerCase() === skill.name.toLowerCase())) {
      onChange([...value, skill])
    }
    setQuery('')
    setOpen(false)
  }

  const removeSkill = (id: number) => {
    onChange(value.filter((skill) => skill.id !== id))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((current) => (current + 1) % Math.max(options.length, 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((current) => (current - 1 + Math.max(options.length, 1)) % Math.max(options.length, 1))
    }

    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      if (!trimmedQuery || (!open && event.key === 'Tab')) return

      const selectedOption = options[highlightedIndex] ?? (canCreate ? { skill: createCustomSkill(trimmedQuery) } : null)
      if (!selectedOption) return

      if (event.key !== 'Tab' || open) {
        event.preventDefault()
      }
      commitSkill(selectedOption.skill)
    }

    if (event.key === 'Backspace' && !trimmedQuery && value.length > 0) {
      removeSkill(value[value.length - 1].id)
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

      <div className="flex flex-wrap gap-2">
        {value.map((skill) => (
          <SkillTag key={`${skill.id}-${skill.name}`} name={skill.name} onRemove={() => removeSkill(skill.id)} />
        ))}
      </div>

      <div className="relative" ref={rootRef}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {open && (
          <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <ul id={listId} className="max-h-56 overflow-y-auto py-1">
              {options.map((option, index) => (
                <li
                  key={`${option.type}-${option.skill.id}-${option.skill.name}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSkill(option.skill)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    index === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.type === 'create' ? `Добавить "${option.skill.name}"` : option.skill.name}
                </li>
              ))}

              {!options.length && (
                <li className="px-3 py-2 text-sm text-gray-500">
                  {isFetching ? 'Поиск навыков...' : 'Совпадений не найдено'}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {showHint && (
        <p className="text-xs text-gray-500">
          Выберите навык из справочника или нажмите Enter, чтобы добавить свой вариант.
        </p>
      )}
    </div>
  )
}
