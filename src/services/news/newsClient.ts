import type { NewsRequest, NewsSearchBody, SourcesResponse } from '@shared/api'
import type { AggregatedPage, PageCursor } from '@shared/pagination'

// the message is written for the reader
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const messageFor = (status: number): string => {
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status >= 500) return 'The news service is having trouble. Please try again.'
  return 'That request was not accepted.'
}

const call = async <T>(path: string, init: RequestInit): Promise<T> => {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError(0, 'You appear to be offline. Check your connection and try again.')
  }
  if (!response.ok) throw new ApiError(response.status, messageFor(response.status))
  return (await response.json()) as T
}

// everything the UI knows about the backend goes through here
export const newsClient = {
  search: (request: NewsRequest, cursor: PageCursor, signal?: AbortSignal) => {
    const body: NewsSearchBody = { request, cursor }
    return call<AggregatedPage>('/api/news/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(signal && { signal }),
    })
  },

  sources: (signal?: AbortSignal) =>
    call<SourcesResponse>('/api/news/sources', { ...(signal && { signal }) }),
}
