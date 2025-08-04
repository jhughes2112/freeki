export interface ApiError {
  message: string
  status: number
  statusText: string
  isNetworkError: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export type ErrorDisplayHandler = (message: string) => void

// Central API client for all server communication
class ApiClient {
  private errorHandler: ErrorDisplayHandler | null = null

  // Set the error handler that will be called for all API errors
  setErrorHandler(handler: ErrorDisplayHandler): void {
    this.errorHandler = handler
  }

  // Remove the error handler
  clearErrorHandler(): void {
    this.errorHandler = null
  }

  // Internal method to handle errors consistently
  private handleError(error: ApiError): void {
    // Always log errors to console for debugging
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

  // Internal method to make HTTP requests with consistent error handling
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        let data: T
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // For non-JSON responses (like binary data), return the response itself
          data = response as unknown as T
        }
        
        return {
          success: true,
          data
        }
      } else {
        const error: ApiError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          isNetworkError: false
        }
        
        this.handleError(error)
        return {
          success: false,
          error
        }
      }
    } catch (err) {
      const error: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown network error',
        status: 0,
        statusText: 'Network Error',
        isNetworkError: true
      }
      
      this.handleError(error)
      return {
        success: false,
        error
      }
    }
  }

  // GET request
  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'GET'
    })
  }

  // POST request with JSON body
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    
    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }
    
    return this.makeRequest<T>(url, options)
  }

  // PUT request with JSON body
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    
    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }
    
    return this.makeRequest<T>(url, options)
  }

  // DELETE request
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'DELETE'
    })
  }

  // POST request with binary data
  async postBinary<T>(url: string, data: ArrayBuffer | Blob): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data
    })
  }

  // PUT request with binary data
  async putBinary<T>(url: string, data: ArrayBuffer | Blob): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data
    })
  }
}

// Singleton instance
const apiClient = new ApiClient()

export default apiClient