import type { PageCursor } from './pagination'
import type { ProviderId, SearchParams } from './news'

// one or more searches over some sources
export interface NewsRequest {
  queries: SearchParams[]
  // empty = every source
  providerIds: ProviderId[]
}

// body of POST /api/news/search
export interface NewsSearchBody {
  request: NewsRequest
  cursor: PageCursor
}

export interface SourceInfo {
  id: ProviderId
  name: string
}

// response of GET /api/news/sources
export interface SourcesResponse {
  sources: SourceInfo[]
  // true when there are no API keys and sample data is served
  demo: boolean
}
