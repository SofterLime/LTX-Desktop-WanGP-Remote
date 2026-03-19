import { useState, useEffect, useCallback } from 'react'
import { backendFetch } from '../lib/backend'
import { useAppSettings } from '../contexts/AppSettingsContext'
import type { PerformanceProfile, ImageModelCapabilities, ModelParameter } from '../types/remote-models'

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
  parameters?: ModelParameter[]
}

export interface ImageModel {
  model_type: string
  name: string
  architecture: string
  capabilities?: ImageModelCapabilities
  parameters?: ModelParameter[]
}

interface AvailableModels {
  video_models: VideoModel[]
  image_models: ImageModel[]
}

const EMPTY: AvailableModels = { video_models: [], image_models: [] }

export function useAvailableModels() {
  const { wangpRemoteEnabled } = useAppSettings()
  const [models, setModels] = useState<AvailableModels>(EMPTY)
  const [profiles, setProfiles] = useState<PerformanceProfile[]>([])
  const [loading, setLoading] = useState(false)

  const fetchModels = useCallback(async () => {
    if (!wangpRemoteEnabled) {
      setModels(EMPTY)
      setProfiles([])
      return
    }
    setLoading(true)
    try {
      const [modelsRes, profilesRes] = await Promise.all([
        backendFetch('/api/available-models'),
        backendFetch('/api/profiles'),
      ])
      if (modelsRes.ok) {
        const data: AvailableModels = await modelsRes.json()
        setModels(data)
      }
      if (profilesRes.ok) {
        const data: PerformanceProfile[] = await profilesRes.json()
        setProfiles(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('[useAvailableModels] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [wangpRemoteEnabled])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return { models, profiles, loading, refresh: fetchModels }
}
