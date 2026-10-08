// a failure talking to an upstream API, the message is fine to show readers
export class UpstreamError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'UpstreamError'
    this.status = status
  }
}

const TIMEOUT_MS = 8_000

const describeStatus = (status: number): string => {
  if (status === 401 || status === 403) return 'The API key was rejected'
  if (status === 429) return 'Rate limit reached, try again shortly'
  if (status === 426) return 'Free plan result limit reached'
  return `Source responded with an error (${status})`
}

interface Options {
  headers?: Record<string, string>
  signal?: AbortSignal | undefined
}

// The URL is left out of errors because it can contain an API key. Redirects are refused
// so a key can't be forwarded to another host.
export const fetchJson = async <T>(url: string, { headers, signal }: Options = {}): Promise<T> => {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (timeout.aborted) throw new UpstreamError(504, 'Source took too long to respond')
    if (signal?.aborted) throw error
    throw new UpstreamError(502, 'Source could not be reached')
  }

  if (!response.ok) throw new UpstreamError(response.status, describeStatus(response.status))

  try {
    return (await response.json()) as T
  } catch {
    throw new UpstreamError(502, 'Source returned an unreadable response')
  }
}

export const buildUrl = (base: string, params: Record<string, string | number | undefined>): string => {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}
