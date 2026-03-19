import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import type { LoraEntry, SelectedLora } from '../types/remote-models'

interface LoraSelectorProps {
  availableLoras: LoraEntry[]
  selectedLoras: SelectedLora[]
  onChangeSelection: (loras: SelectedLora[]) => void
  loading?: boolean
  disabled?: boolean
}

export function LoraSelector({
  availableLoras,
  selectedLoras,
  onChangeSelection,
  loading,
  disabled,
}: LoraSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (!search) return availableLoras
    const q = search.toLowerCase()
    return availableLoras.filter(
      (l) => l.display_name.toLowerCase().includes(q) || l.filename.toLowerCase().includes(q),
    )
  }, [availableLoras, search])

  const selectedMap = useMemo(() => {
    const map = new Map<string, SelectedLora>()
    for (const s of selectedLoras) map.set(s.filename, s)
    return map
  }, [selectedLoras])

  const toggleLora = (filename: string) => {
    if (selectedMap.has(filename)) {
      onChangeSelection(selectedLoras.filter((s) => s.filename !== filename))
    } else {
      onChangeSelection([...selectedLoras, { filename, strength: 1.0 }])
    }
  }

  const updateStrength = (filename: string, strength: number) => {
    onChangeSelection(
      selectedLoras.map((s) => (s.filename === filename ? { ...s, strength } : s)),
    )
  }

  const updateSchedule = (filename: string, schedule: string) => {
    onChangeSelection(
      selectedLoras.map((s) => (s.filename === filename ? { ...s, schedule: schedule || undefined } : s)),
    )
  }

  const activeCount = selectedLoras.length

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-500 uppercase leading-4 mb-1.5 disabled:opacity-50"
      >
        <span>
          LoRAs{activeCount > 0 && ` (${activeCount})`}
        </span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden">
          {availableLoras.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-zinc-500">
              {loading ? 'Loading LoRAs...' : 'No LoRAs available for this model'}
            </div>
          ) : (
            <>
              {availableLoras.length > 5 && (
                <div className="relative px-2 pt-2">
                  <Search className="absolute left-4 top-1/2 mt-1 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search LoRAs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-700 text-white text-sm pl-8 pr-3 py-1.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                {filtered.map((lora) => {
                  const selected = selectedMap.get(lora.filename)
                  const isSelected = !!selected
                  const advancedOpen = showAdvanced[lora.filename]

                  return (
                    <div key={lora.filename} className="rounded-md bg-zinc-800/80">
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleLora(lora.filename)}
                          disabled={disabled}
                          className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="flex-1 text-sm text-zinc-300 truncate" title={lora.filename}>
                          {lora.display_name}
                        </span>

                        {isSelected && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min={0}
                              max={2}
                              step={0.05}
                              value={selected!.strength}
                              onChange={(e) => updateStrength(lora.filename, parseFloat(e.target.value))}
                              disabled={disabled}
                              className="w-16 h-1 accent-blue-500"
                            />
                            <span className="text-xs text-zinc-400 w-8 text-right tabular-nums">
                              {selected!.strength.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowAdvanced((prev) => ({ ...prev, [lora.filename]: !prev[lora.filename] }))}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                              title="Advanced schedule"
                            >
                              {advancedOpen ? '−' : '⋯'}
                            </button>
                          </div>
                        )}
                      </div>

                      {isSelected && advancedOpen && (
                        <div className="px-8 pb-2">
                          <input
                            type="text"
                            placeholder="Schedule: 0.8@0.5,1.0"
                            value={selected!.schedule || ''}
                            onChange={(e) => updateSchedule(lora.filename, e.target.value)}
                            disabled={disabled}
                            className="w-full bg-zinc-700 text-white text-xs px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
