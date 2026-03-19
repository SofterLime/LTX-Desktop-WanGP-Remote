import { useState, useEffect, useCallback } from 'react'
import { backendFetch } from '../lib/backend'
import { useAppSettings } from '../contexts/AppSettingsContext'
import type { LoraEntry } from '../types/remote-models'

export function useAvailableLoras(modelType: string | undefined) {
  const { wangpRemoteEnabled } = useAppSettings()
  const [loras, setLoras] = useState<LoraEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLoras = useCallback(async () => {
    if (!wangpRemoteEnabled || !modelType) {
      setLoras([])
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (modelType) params.set('model_type', modelType)
      const res = await backendFetch(`/api/loras?${params.toString()}`)
      if (res.ok) {
        const data: LoraEntry[] = await res.json()
        setLoras(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('[useAvailableLoras] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [wangpRemoteEnabled, modelType])

  useEffect(() => {
    fetchLoras()
  }, [fetchLoras])

  return { loras, loading, refresh: fetchLoras }
}
