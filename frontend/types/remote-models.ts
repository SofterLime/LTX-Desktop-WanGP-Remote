export interface PerformanceProfile {
  id: string
  name: string
  vram_gb: number
  compatible_model_types: string[]
}

export interface LoraEntry {
  filename: string
  display_name: string
  compatible_architectures: string[]
}

export interface SelectedLora {
  filename: string
  strength: number
  schedule?: string
}

export interface ModelParameterOption {
  value: string
  label: string
}

export interface ModelParameter {
  key: string
  label: string
  type: 'number' | 'string' | 'boolean' | 'select'
  default: number | string | boolean
  min?: number
  max?: number
  step?: number
  placeholder?: string
  options?: ModelParameterOption[]
}

export interface ImageModelCapabilities {
  supports_reference: boolean
  reference_roles: string[]
}
