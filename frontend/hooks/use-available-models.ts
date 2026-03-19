import { useState, useEffect, useCallback } from 'react'
import { backendFetch } from '../lib/backend'
import { useAppSettings } from '../contexts/AppSettingsContext'

interface ModelCapabilities {
  i2v: boolean
  t2v: boolean
  image_prompt_types_allowed: string
  image_ref_roles: string[]
  one_image_ref_needed: boolean
}

export interface VideoModel {
  model_type: string
  name: string
  architecture: string
  capabilities: ModelCapabilities
}

export interface ImageModel {
  model_type: string
  name: string
  architecture: string
}

interface AvailableModels {
  video_models: VideoModel[]
  image_models: ImageModel[]
}

const EMPTY: AvailableModels = { video_models: [], image_models: [] }

export function useAvailableModels() {
  const { wangpRemoteEnabled } = useAppSettings()
  const [models, setModels] = useState<AvailableModels>(EMPTY)
  const [loading, setLoading] = useState(false)

  const fetchModels = useCallback(async () => {
    if (!wangpRemoteEnabled) {
      setModels(EMPTY)
      return
    }
    setLoading(true)
    try {
      const res = await backendFetch('/api/available-models')
      if (res.ok) {
        const data: AvailableModels = await res.json()
        setModels(data)
      }
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }, [wangpRemoteEnabled])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return { models, loading, refresh: fetchModels }
}
