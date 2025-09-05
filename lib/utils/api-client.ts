interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

/**
 * Makes an API request with consistent error handling
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise with the parsed response data
 * @throws Error if the request fails or response is not ok
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, headers, ...fetchOptions } = options

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  let requestBody: string | undefined
  if (body !== undefined) {
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
    body: requestBody,
  })

  let result: ApiResponse<T>
  try {
    result = await response.json()
  } catch {
    throw new Error('Failed to parse response')
  }

  if (!response.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}`)
  }

  if (result.success === false) {
    throw new Error(result.error || 'Request failed')
  }

  return (result.data ?? result) as T
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' })
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'POST', body })
}

export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'PATCH', body })
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' })
}

