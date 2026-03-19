import { useState, useCallback } from 'react'
import type { ImageAsset, ImageAssetRole } from '../types/image-assets'

let nextId = 1

export function useImageAssets() {
  const [assets, setAssets] = useState<ImageAsset[]>([])

  const addAsset = useCallback((filePath: string, previewUrl: string) => {
    const id = `asset_${nextId++}`
    const asset: ImageAsset = {
      id,
      name: '',
      role: 'start_frame',
      filePath,
      previewUrl,
    }
    setAssets((prev) => [...prev, asset])
    return id
  }, [])

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const renameAsset = useCallback((id: string, name: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name } : a)),
    )
  }, [])

  const changeRole = useCallback((id: string, role: ImageAssetRole) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, role } : a)),
    )
  }, [])

  const clearAll = useCallback(() => {
    setAssets([])
  }, [])

  return {
    assets,
    addAsset,
    removeAsset,
    renameAsset,
    changeRole,
    clearAll,
  }
}
