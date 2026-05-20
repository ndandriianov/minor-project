import { useEffect, useRef, useState } from 'react'

interface Item {
  id: number
  name: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  options: Item[]
  isLoading?: boolean
  onSearch: (query: string) => void
  onSelectItem?: (item: Item) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export default function AutocompleteInput({
  value,
  onChange,
  options,
  isLoading,
  onSearch,
  onSelectItem,
  label,
  placeholder,
  required,
  disabled,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => onSearch(inputValue), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputValue(v)
    onChange(v)
    setOpen(true)
  }

  const handleSelect = (item: Item) => {
    setInputValue(item.name)
    onChange(item.name)
    onSelectItem?.(item)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1" ref={rootRef}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
        {open && (options.length > 0 || isLoading) && (
          <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <ul className="max-h-48 overflow-y-auto py-1">
              {isLoading && options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-400">Поиск...</li>
              ) : (
                options.map((item) => (
                  <li
                    key={item.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item.name}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
