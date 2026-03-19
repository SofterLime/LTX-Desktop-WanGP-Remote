import type { PerformanceProfile } from '../types/remote-models'

interface PerformanceProfilePickerProps {
  profiles: PerformanceProfile[]
  selectedProfileId: string | undefined
  onSelect: (profileId: string | undefined) => void
  disabled?: boolean
}

export function PerformanceProfilePicker({
  profiles,
  selectedProfileId,
  onSelect,
  disabled,
}: PerformanceProfilePickerProps) {
  if (profiles.length === 0) return null

  return (
    <div className="w-full">
      <label className="block text-[12px] font-semibold text-zinc-500 mb-1.5 uppercase leading-4">
        GPU Profile
      </label>
      <select
        value={selectedProfileId || ''}
        onChange={(e) => onSelect(e.target.value || undefined)}
        disabled={disabled}
        className="w-full bg-zinc-800 text-white text-sm px-3 py-1.5 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">All Models (No Filter)</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.vram_gb > 0 ? ` (${p.vram_gb}GB)` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
