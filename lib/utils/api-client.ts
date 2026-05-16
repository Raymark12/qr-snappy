interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

export function createSuccessResponse<T = unknown>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  }
}

export function createErrorResponse(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: message,
    code,
  }
}

export function createValidationErrorResponse(errors: unknown): ApiResponse<never> {
  return {
    success: false,
    error: 'Validation failed',
    details: errors,
  }
}

export function createNotFoundErrorResponse(resource: string): ApiResponse<never> {
  return {
    success: false,
    error: `${resource} not found`,
  }
}

export function createUnauthorizedErrorResponse(): ApiResponse<never> {
  return {
    success: false,
    error: 'Unauthorized',
  }
}

export function createForbiddenErrorResponse(message?: string): ApiResponse<never> {
  return {
    success: false,
    error: message || 'Forbidden',
  }
}

export function createInternalServerErrorResponse(): ApiResponse<never> {
  return {
    success: false,
    error: 'Internal server error',
  }
}

async function errorMessageFromFailedResponse(response: Response): Promise<string> {
  let errorMessage = `Request failed with status ${response.status}`
  try {
    const errorData = await response.json()
    if (typeof errorData.error === 'object' && errorData.error?.message) {
      errorMessage = errorData.error.message
    } else if (typeof errorData.error === 'string') {
      errorMessage = errorData.error
    } else if (typeof errorData.message === 'string') {
      errorMessage = errorData.message
    }
  } catch {
    // keep default message
  }
  return errorMessage
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

  if (!response.ok) {
    throw new Error(await errorMessageFromFailedResponse(response))
  }

  let result: ApiResponse<T>
  try {
    result = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error('Failed to parse response')
  }

  if (result.success === false) {
    throw new Error(result.error || 'Request failed')
  }

  return (result.data ?? result) as T
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' })
}

/**
 * GET and return the parsed JSON body as-is (no `result.data` unwrap).
 * Use when the route returns several top-level fields, e.g. `{ data, hasMore, nextCursor }`.
 */
export async function apiGetFull<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(await errorMessageFromFailedResponse(response))
  }

  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new Error('Failed to parse response')
  }

  if (
    result &&
    typeof result === 'object' &&
    'success' in result &&
    (result as ApiResponse).success === false
  ) {
    throw new Error((result as ApiResponse).error || 'Request failed')
  }

  return result as T
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'POST', body })
}

export async function apiPut<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'PUT', body })
}

export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'PATCH', body })
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' })
}

