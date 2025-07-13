import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

interface ImageSource {
  type: string
  media_type?: string
  data?: string
  index?: number
}

export function ImageBlock({ source }: { source: ImageSource | string }) {
  const [imageError, setImageError] = useState(false)

  // Handle different image source formats
  let imageSrc = ''
  let imageAlt = 'Image'

  if (typeof source === 'string') {
    imageSrc = source
  } else if (
    typeof source === 'object' &&
    source.type === 'base64' &&
    source.media_type &&
    source.data
  ) {
    imageSrc = `data:${source.media_type};base64,${source.data}`
  }

  if (!imageSrc || imageError) {
    return (
      <div className="my-2 p-4 bg-secondary rounded-md flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load image</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="max-w-full rounded-md border border-border"
        onError={() => setImageError(true)}
      />
      <p className="text-xs text-muted-foreground mt-1">
        [Image #{typeof source === 'object' && source.index ? source.index : '1'}]
      </p>
    </div>
  )
}
