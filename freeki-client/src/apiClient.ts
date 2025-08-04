export interface ApiError {
  message: string
  status: number
  statusText: string
  isNetworkError: boolean
  timestamp: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export type ErrorDisplayHandler = (message: string) => void
export type LoadingStateHandler = (isLoading: boolean) => void

export interface RequestInterceptor {
  (url: string, options: RequestInit): { url: string; options: RequestInit } | Promise<{ url: string; options: RequestInit }>
}

export interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>
}

export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryOn: number[]
}

export interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  defaultHeaders?: Record<string, string>
  retryConfig?: RetryConfig
}

// Central API client for all server communication
class ApiClient {
  private errorHandler: ErrorDisplayHandler | null = null
  private loadingHandler: LoadingStateHandler | null = null
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private activeRequests = new Map<string, AbortController>()
  private config: ApiClientConfig
  private authToken: string | null = null

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: '',
      timeout: 30000,
      defaultHeaders: {},
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOn: [408, 429, 500, 502, 503, 504]
      },
      ...config
    }
  }

  // Configuration methods
  setBaseUrl(url: string): void {
    this.config.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url
  }

  setTimeout(timeout: number): void {
    this.config.timeout = timeout
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.config.defaultHeaders = { ...headers }
  }

  setRetryConfig(retryConfig: Partial<RetryConfig>): void {
    this.config.retryConfig = { ...this.config.retryConfig!, ...retryConfig }
  }

  // Authentication methods
  setAuthToken(token: string): void {
    this.authToken = token
  }

  clearAuthToken(): void {
    this.authToken = null
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  // Handler methods
  setErrorHandler(handler: ErrorDisplayHandler): void {
    this.errorHandler = handler
  }

  clearErrorHandler(): void {
    this.errorHandler = null
  }

  setLoadingHandler(handler: LoadingStateHandler): void {
    this.loadingHandler = handler
  }

  clearLoadingHandler(): void {
    this.loadingHandler = null
  }

  // Interceptor methods
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  clearInterceptors(): void {
    this.requestInterceptors = []
    this.responseInterceptors = []
  }

  // Request cancellation methods
  cancelRequest(requestId: string): void {
    const controller = this.activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(requestId)
    }
  }

  cancelAllRequests(): void {
    for (const [, controller] of this.activeRequests) {
      controller.abort()
    }
    this.activeRequests.clear()
  }

  // Internal method to handle errors consistently
  private handleError(error: ApiError): void {
    console.error('API Error:', error)
    
    // Only show error UI for non-permission errors (401/403 are expected)
    if (error.status !== 401 && error.status !== 403 && this.errorHandler) {
      if (error.isNetworkError) {
        this.errorHandler('Network error - please check your connection')
      } else {
        this.errorHandler(error.message)
      }
    }
  }

  // Internal method to create full URL
  private createUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return `${this.config.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  // Internal method to create request options with defaults
  private async createRequestOptions(options: RequestInit = {}): Promise<RequestInit> {
    const headers = new Headers()
    
    // Add default headers
    for (const [key, value] of Object.entries(this.config.defaultHeaders || {})) {
      headers.set(key, value)
    }
    
    // Add request-specific headers
    if (options.headers) {
      if (options.headers instanceof Headers) {
        for (const [key, value] of options.headers.entries()) {
          headers.set(key, value)
        }
      } else if (Array.isArray(options.headers)) {
        for (const [key, value] of options.headers) {
          headers.set(key, value)
        }
      } else {
        for (const [key, value] of Object.entries(options.headers)) {
          headers.set(key, value)
        }
      }
    }

    // Add auth token if available
    if (this.authToken) {
      headers.set('Authorization', this.authToken)
    }

    return {
      ...options,
      headers
    }
  }

  // Internal method to apply request interceptors
  private async applyRequestInterceptors(url: string, options: RequestInit): Promise<{ url: string; options: RequestInit }> {
    let result = { url, options }
    
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result.url, result.options)
    }
    
    return result
  }

  // Internal method to apply response interceptors
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let result = response
    
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result)
    }
    
    return result
  }

  // Internal method to implement retry logic
  private async executeWithRetry(
    requestFn: () => Promise<Response>,
    requestId: string
  ): Promise<Response> {
    const { maxRetries, retryDelay, retryOn } = this.config.retryConfig!
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if request was cancelled
        const controller = this.activeRequests.get(requestId)
        if (controller?.signal.aborted) {
          throw new Error('Request cancelled')
        }

        const response = await requestFn()
        
        // If successful or non-retryable error, return
        if (response.ok || !retryOn.includes(response.status)) {
          return response
        }

        // If this is the last attempt, return the response anyway
        if (attempt === maxRetries) {
          return response
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      } catch (error) {
        lastError = error as Error
        
        // If this is the last attempt or not a network error, rethrow
        if (attempt === maxRetries || !(error as Error).message.includes('network')) {
          throw error
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  // Internal method to make HTTP requests with comprehensive error handling
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {},
    requestId?: string
  ): Promise<ApiResponse<T>> {
    // Generate request ID if not provided
    const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create abort controller for request cancellation
    const controller = new AbortController()
    this.activeRequests.set(id, controller)

    // Set loading state
    this.loadingHandler?.(true)

    try {
      // Apply request interceptors
      const { url: finalUrl, options: finalOptions } = await this.applyRequestInterceptors(
        this.createUrl(url),
        await this.createRequestOptions({
          ...options,
          signal: controller.signal
        })
      )

      // Add timeout if configured
      if (this.config.timeout && this.config.timeout > 0) {
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), this.config.timeout)
        
        finalOptions.signal = controller.signal
          
        // Clear timeout if request completes
        const originalSignal = finalOptions.signal
        if (originalSignal) {
          originalSignal.addEventListener('abort', () => clearTimeout(timeoutId))
        }
      }

      // Execute request with retry logic
      let response = await this.executeWithRetry(
        () => fetch(finalUrl, finalOptions),
        id
      )

      // Apply response interceptors
      response = await this.applyResponseInterceptors(response)
      
      if (response.ok) {
        let data: T
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else if (contentType && (contentType.includes('application/octet-stream') || contentType.includes('image/') || contentType.includes('video/') || contentType.includes('audio/'))) {
          // For binary data, return as Blob
          data = await response.blob() as unknown as T
        } else if (contentType && contentType.includes('text/')) {
          // For text data
          data = await response.text() as unknown as T
        } else {
          // For other responses, return the response itself
          data = response as unknown as T
        }
        
        return {
          success: true,
          data
        }
      } else {
        // Try to parse error response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Use default error message if parsing fails
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          statusText: response.statusText,
          isNetworkError: false,
          timestamp: Date.now()
        }
        
        this.handleError(error)
        return {
          success: false,
          error
        }
      }
    } catch (err) {
      const isAborted = err instanceof Error && (err.name === 'AbortError' || err.message.includes('cancelled'))
      
      if (isAborted) {
        // Don't show error for cancelled requests
        return {
          success: false,
          error: {
            message: 'Request cancelled',
            status: 0,
            statusText: 'Cancelled',
            isNetworkError: true,
            timestamp: Date.now()
          }
        }
      }

      const error: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown network error',
        status: 0,
        statusText: 'Network Error',
        isNetworkError: true,
        timestamp: Date.now()
      }
      
      this.handleError(error)
      return {
        success: false,
        error
      }
    } finally {
      // Clean up
      this.activeRequests.delete(id)
      this.loadingHandler?.(false)
    }
  }

  // HTTP method implementations
  async get<T>(url: string, requestId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'GET' }, requestId)
  }

  async post<T>(url: string, data?: unknown, options?: { headers?: Record<string, string> }, requestId?: string): Promise<ApiResponse<T>> {
    const requestOptions: RequestInit = {
      method: 'POST'
    }
    
    // Handle headers properly
    if (options?.headers) {
      requestOptions.headers = new Headers(options.headers)
    }
    
    if (data !== undefined) {
      if (data instanceof FormData || data instanceof ArrayBuffer || data instanceof Blob) {
        requestOptions.body = data
      } else if (typeof data === 'string') {
        // For raw text content
        requestOptions.body = data
        if (!requestOptions.headers) {
          requestOptions.headers = new Headers()
        }
        if (requestOptions.headers instanceof Headers && !requestOptions.headers.get('Content-Type')) {
          requestOptions.headers.set('Content-Type', 'text/plain')
        }
      } else {
        if (!requestOptions.headers) {
          requestOptions.headers = new Headers()
        }
        if (requestOptions.headers instanceof Headers) {
          requestOptions.headers.set('Content-Type', 'application/json')
        }
        requestOptions.body = JSON.stringify(data)
      }
    }
    
    return this.makeRequest<T>(url, requestOptions, requestId)
  }

  async put<T>(url: string, data?: unknown, options?: { headers?: Record<string, string> }, requestId?: string): Promise<ApiResponse<T>> {
    const requestOptions: RequestInit = {
      method: 'PUT'
    }
    
    // Handle headers properly
    if (options?.headers) {
      requestOptions.headers = new Headers(options.headers)
    }
    
    if (data !== undefined) {
      if (data instanceof FormData || data instanceof ArrayBuffer || data instanceof Blob) {
        requestOptions.body = data
      } else if (typeof data === 'string') {
        // For raw text content
        requestOptions.body = data
        if (!requestOptions.headers) {
          requestOptions.headers = new Headers()
        }
        if (requestOptions.headers instanceof Headers && !requestOptions.headers.get('Content-Type')) {
          requestOptions.headers.set('Content-Type', 'text/plain')
        }
      } else {
        if (!requestOptions.headers) {
          requestOptions.headers = new Headers()
        }
        if (requestOptions.headers instanceof Headers) {
          requestOptions.headers.set('Content-Type', 'application/json')
        }
        requestOptions.body = JSON.stringify(data)
      }
    }
    
    return this.makeRequest<T>(url, requestOptions, requestId)
  }

  async patch<T>(url: string, data?: unknown, requestId?: string): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'PATCH'
    }
    
    if (data !== undefined) {
      if (data instanceof FormData || data instanceof ArrayBuffer || data instanceof Blob) {
        options.body = data
      } else {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(data)
      }
    }
    
    return this.makeRequest<T>(url, options, requestId)
  }

  async delete<T>(url: string, requestId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'DELETE' }, requestId)
  }

  // Specialized methods for common use cases
  async postBinary<T>(url: string, data: ArrayBuffer | Blob, requestId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data
    }, requestId)
  }

  async putBinary<T>(url: string, data: ArrayBuffer | Blob, requestId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data
    }, requestId)
  }

  async uploadFile<T>(url: string, file: File, additionalData?: Record<string, string>, requestId?: string): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value)
      }
    }
    
    return this.post<T>(url, formData, undefined, requestId)
  }

  async uploadFiles<T>(url: string, files: File[], additionalData?: Record<string, string>, requestId?: string): Promise<ApiResponse<T>> {
    const formData = new FormData()
    
    files.forEach((file, index) => {
      formData.append(`file${index}`, file)
    })
    
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value)
      }
    }
    
    return this.post<T>(url, formData, undefined, requestId)
  }

  async downloadFile(url: string, requestId?: string): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(url, requestId)
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health')
      return response.success
    } catch {
      return false
    }
  }

  // Debug method to get current state
  getDebugInfo() {
    return {
      config: this.config,
      activeRequestsCount: this.activeRequests.size,
      hasAuthToken: !!this.authToken,
      hasErrorHandler: !!this.errorHandler,
      hasLoadingHandler: !!this.loadingHandler,
      interceptorsCount: {
        request: this.requestInterceptors.length,
        response: this.responseInterceptors.length
      }
    }
  }
}

// Create singleton instance with default configuration
const apiClient = new ApiClient()

export default apiClient
export { ApiClient }