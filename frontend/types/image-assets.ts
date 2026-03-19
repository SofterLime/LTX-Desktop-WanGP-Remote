export type ImageAssetRole = 'character' | 'environment' | 'start_frame'

export interface ImageAsset {
  id: string
  name: string
  role: ImageAssetRole
  filePath: string
  previewUrl: string
}
