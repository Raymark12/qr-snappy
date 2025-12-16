import { useQuery } from '@tanstack/react-query'
import { getImageUrl } from '@/lib/actions/image-url'

interface UseMediaUrlOptions {
  enabled?: boolean
  publicMode?: boolean
  eventId?: string
}

export function useMediaUrl(
  filePath: string | null | undefined,
  options: UseMediaUrlOptions = {}
) {
  const { enabled = true, publicMode, eventId } = options

  return useQuery({
    queryKey: ['media-url', filePath, publicMode, eventId],
    queryFn: async () => {
      if (!filePath) return null
      return getImageUrl(filePath, { publicMode, eventId })
    },
    enabled: enabled && !!filePath,
    staleTime: 45 * 60 * 1000, // 45 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  })
}

