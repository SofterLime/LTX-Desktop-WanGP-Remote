import { useState, useRef, useCallback, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import { Textarea } from './ui/textarea'
import type { ImageAsset } from '../types/image-assets'

interface PromptTextareaProps {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  imageAssets?: ImageAsset[]
  disabled?: boolean
}

export function PromptTextarea({ value, onChange, imageAssets = [], disabled }: PromptTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [atStartPos, setAtStartPos] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const namedAssets = imageAssets.filter((a) => a.name.trim().length > 0)

  const updateSuggestions = useCallback(
    (text: string, cursorPos: number) => {
      if (namedAssets.length === 0) {
        setShowSuggestions(false)
        return
      }

      const before = text.slice(0, cursorPos)
      const atMatch = before.match(/@(\w*)$/)
      if (!atMatch) {
        setShowSuggestions(false)
        setAtStartPos(null)
        return
      }

      const partial = atMatch[1].toLowerCase()
      setAtStartPos(cursorPos - atMatch[0].length)
      const matches = namedAssets
        .map((a) => a.name)
        .filter((n) => n.toLowerCase().startsWith(partial))

      if (matches.length > 0) {
        setSuggestions(matches)
        setSelectedIndex(0)
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    },
    [namedAssets],
  )

  const insertSuggestion = useCallback(
    (name: string) => {
      if (atStartPos === null) return

      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart ?? value.length
      const before = value.slice(0, atStartPos)
      const after = value.slice(cursorPos)
      const newValue = `${before}@${name} ${after}`

      const syntheticEvent = {
        target: { value: newValue },
      } as ChangeEvent<HTMLTextAreaElement>
      onChange(syntheticEvent)

      setShowSuggestions(false)
      setAtStartPos(null)

      requestAnimationFrame(() => {
        const newPos = atStartPos + name.length + 2
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
      })
    },
    [atStartPos, onChange, value],
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e)
      const el = e.target
      updateSuggestions(el.value, el.selectionStart ?? el.value.length)
    },
    [onChange, updateSuggestions],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          insertSuggestion(suggestions[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [insertSuggestion, selectedIndex, showSuggestions, suggestions],
  )

  useEffect(() => {
    const handleClick = () => {
      const textarea = textareaRef.current
      if (textarea) {
        updateSuggestions(textarea.value, textarea.selectionStart ?? textarea.value.length)
      }
    }
    const el = textareaRef.current
    el?.addEventListener('click', handleClick)
    return () => el?.removeEventListener('click', handleClick)
  }, [updateSuggestions])

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        label="Prompt"
        placeholder="Write a prompt... Use @name to reference images"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        helperText="Longer, detailed prompts lead to better results. Use @name to reference uploaded images."
        charCount={value.length}
        maxChars={5000}
        disabled={disabled}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-60 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((name, i) => (
            <button
              key={name}
              className={`w-full text-left px-3 py-2 text-sm ${
                i === selectedIndex ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-700'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                insertSuggestion(name)
              }}
            >
              @{name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
