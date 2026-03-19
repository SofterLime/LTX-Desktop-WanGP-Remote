import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageAsset, ImageAssetRole } from '../types/image-assets'
import type { VideoModel } from '../hooks/use-available-models'

interface ImageAssetsPanelProps {
  assets: ImageAsset[]
  onAdd: (filePath: string, previewUrl: string) => void
  onRemove: (id: string) => void
  onRename: (id: string, name: string) => void
  onChangeRole: (id: string, role: ImageAssetRole) => void
  selectedVideoModel?: VideoModel | null
  disabled?: boolean
}

function getAvailableRoles(model: VideoModel | null | undefined): ImageAssetRole[] {
  const roles: ImageAssetRole[] = []

  if (!model) {
    return ['start_frame']
  }

  const caps = model.capabilities
  const ipt = caps?.image_prompt_types_allowed ?? ''
  const refRoles = caps?.image_ref_roles ?? []

  if (ipt.includes('S')) {
    roles.push('start_frame')
  }
  if (refRoles.includes('character')) {
    roles.push('character')
  }
  if (refRoles.includes('environment')) {
    roles.push('environment')
  }

  if (roles.length === 0) {
    roles.push('start_frame')
  }

  return roles
}

const ROLE_LABELS: Record<ImageAssetRole, string> = {
  start_frame: 'Start Frame',
  character: 'Character/Object',
  environment: 'Environment/Background',
}

function canAddRole(assets: ImageAsset[], role: ImageAssetRole, model: VideoModel | null | undefined): boolean {
  if (role === 'environment') {
    return assets.filter((a) => a.role === 'environment').length < 1
  }
  if (role === 'start_frame') {
    return assets.filter((a) => a.role === 'start_frame').length < 1
  }
  if (role === 'character' && model?.capabilities?.one_image_ref_needed) {
    return assets.filter((a) => a.role === 'character').length < 1
  }
  return true
}

export function ImageAssetsPanel({
  assets,
  onAdd,
  onRemove,
  onRename,
  onChangeRole,
  selectedVideoModel,
  disabled,
}: ImageAssetsPanelProps) {
  const availableRoles = getAvailableRoles(selectedVideoModel)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const filePath = (file as any).path as string | undefined
        if (filePath) {
          await window.electronAPI?.approveLocalPath?.(filePath)
          const normalized = filePath.replace(/\\/g, '/')
          const fileUrl = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
          onAdd(filePath, fileUrl)
        } else {
          const url = URL.createObjectURL(file)
          onAdd(url, url)
        }
      }
    },
    [onAdd],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled,
  })

  return (
    <div className="w-full">
      <label className="block text-[12px] font-semibold text-zinc-500 mb-2 uppercase leading-4">
        Image Assets
      </label>

      {assets.length > 0 && (
        <div className="space-y-2 mb-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-2 p-2 border border-zinc-700 rounded-lg bg-zinc-800/50">
              <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
                <img src={asset.previewUrl} alt={asset.name || 'Asset'} className="w-full h-full object-cover" />
              </div>

              <input
                type="text"
                placeholder="Name..."
                value={asset.name}
                onChange={(e) => onRename(asset.id, e.target.value)}
                disabled={disabled}
                className="flex-1 min-w-0 bg-zinc-700 text-white text-sm px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
              />

              <select
                value={asset.role}
                onChange={(e) => onChangeRole(asset.id, e.target.value as ImageAssetRole)}
                disabled={disabled}
                className="bg-zinc-700 text-white text-sm px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
              >
                {availableRoles.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={asset.role !== role && !canAddRole(assets, role, selectedVideoModel)}
                  >
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onRemove(asset.id)}
                disabled={disabled}
                className="p-1.5 hover:bg-zinc-600 rounded transition-colors"
                title="Remove"
              >
                <Trash2 className="h-4 w-4 text-zinc-400 hover:text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'border border-dashed border-zinc-600 rounded-lg cursor-pointer transition-colors p-4',
          'hover:border-zinc-500',
          isDragActive && 'border-blue-500 bg-blue-500/5',
          disabled && 'opacity-50 cursor-default',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2 bg-zinc-700 rounded-lg">
            {isDragActive ? (
              <Upload className="h-5 w-5 text-blue-400" />
            ) : (
              <ImageIcon className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <div>
            <p className="text-sm text-zinc-400">
              Drop images here or <span className="text-blue-400 underline">browse</span>
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-2">
        png, jpeg, webp. Max 10MB each. Name images and assign roles.
      </p>
    </div>
  )
}
