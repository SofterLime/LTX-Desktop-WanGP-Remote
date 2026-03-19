import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ModelParameter } from '../types/remote-models'

interface ModelParametersPanelProps {
  parameters: ModelParameter[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

function NumberControl({ param, value, onChange, disabled }: {
  param: ModelParameter
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const showSlider = param.min !== undefined && param.max !== undefined

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-400 w-28 flex-shrink-0 truncate" title={param.label}>
        {param.label}
      </label>
      {showSlider ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="flex-1 h-1 accent-blue-500"
          />
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-16 bg-zinc-700 text-white text-xs px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none tabular-nums text-right"
          />
        </div>
      ) : (
        <input
          type="number"
          step={param.step || 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="flex-1 bg-zinc-700 text-white text-xs px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      )}
    </div>
  )
}

function StringControl({ param, value, onChange, disabled }: {
  param: ModelParameter
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const isLong = param.key === 'negative_prompt' || param.key.includes('prompt')

  return (
    <div className={isLong ? 'space-y-1' : 'flex items-center gap-2'}>
      <label className="text-xs text-zinc-400 w-28 flex-shrink-0 truncate" title={param.label}>
        {param.label}
      </label>
      {isLong ? (
        <textarea
          value={value}
          placeholder={param.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full bg-zinc-700 text-white text-xs px-2 py-1.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={param.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-zinc-700 text-white text-xs px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      )}
    </div>
  )
}

function BooleanControl({ param, value, onChange, disabled }: {
  param: ModelParameter
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-400 w-28 flex-shrink-0 truncate" title={param.label}>
        {param.label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative w-8 h-4 rounded-full transition-colors ${
          value ? 'bg-blue-500' : 'bg-zinc-600'
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function SelectControl({ param, value, onChange, disabled }: {
  param: ModelParameter
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-400 w-28 flex-shrink-0 truncate" title={param.label}>
        {param.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-zinc-700 text-white text-xs px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
      >
        {(param.options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function ModelParametersPanel({
  parameters,
  values,
  onChange,
  disabled,
}: ModelParametersPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!parameters || parameters.length === 0) return null

  const overrideCount = Object.keys(values).length

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-500 uppercase leading-4 mb-1.5 disabled:opacity-50"
      >
        <span>
          Parameters{overrideCount > 0 && ` (${overrideCount} set)`}
        </span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 p-3 space-y-2.5">
          {parameters.map((param) => {
            const val = values[param.key] ?? param.default
            switch (param.type) {
              case 'number':
                return (
                  <NumberControl
                    key={param.key}
                    param={param}
                    value={typeof val === 'number' ? val : Number(val)}
                    onChange={(v) => onChange(param.key, v)}
                    disabled={disabled}
                  />
                )
              case 'string':
                return (
                  <StringControl
                    key={param.key}
                    param={param}
                    value={typeof val === 'string' ? val : String(val ?? '')}
                    onChange={(v) => onChange(param.key, v)}
                    disabled={disabled}
                  />
                )
              case 'boolean':
                return (
                  <BooleanControl
                    key={param.key}
                    param={param}
                    value={typeof val === 'boolean' ? val : Boolean(val)}
                    onChange={(v) => onChange(param.key, v)}
                    disabled={disabled}
                  />
                )
              case 'select':
                return (
                  <SelectControl
                    key={param.key}
                    param={param}
                    value={typeof val === 'string' ? val : String(val ?? '')}
                    onChange={(v) => onChange(param.key, v)}
                    disabled={disabled}
                  />
                )
              default:
                return null
            }
          })}
        </div>
      )}
    </div>
  )
}
