/**
 * PlaceholderTab - Reusable placeholder for unimplemented tabs
 *
 * DRY: Eliminates duplicate placeholder code
 * SOLID: Single responsibility for showing "coming soon" state
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { LucideIcon } from 'lucide-react'

interface PlaceholderTabProps {
  title: string
  description: string
  icon: LucideIcon
  placeholderText: string
  subText?: string
  buttonText?: string
  onButtonClick?: () => void
}

export function PlaceholderTab({
  title,
  description,
  icon: Icon,
  placeholderText,
  subText,
  buttonText,
  onButtonClick,
}: PlaceholderTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{placeholderText}</p>
          {subText && <p className="text-sm mt-2">{subText}</p>}
          {buttonText && onButtonClick && (
            <Button className="mt-4" variant="outline" onClick={onButtonClick}>
              <Icon className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
