// AIRequestor.ts
// Class to handle AI requests using /v1/chat/completions format
// Fluent builder for /v1/chat/completions requests

export interface AIRequestResult {
  status: number
  response: string
}

export interface ChatMessage {
  role: string
  content?: string
  name?: string
  tool_calls?: unknown[]
}

// Export a type for the raw payload (useful for debugging / testing)
export interface ChatCompletionPayload {
  model: string
  stream: boolean
  messages: ChatMessage[]
  [key: string]: unknown
}

export class AIRequestor {
  url: string
  token: string // token is optional for many self?hosted / open models; blank means "no auth"
  model: string
  private _messages: ChatMessage[] = []
  private _extraPayload: Record<string, unknown> = {}

  constructor(url: string, token: string, model: string) {
    this.url   = url
    this.token = token || ''
    this.model = model
  }

  // Allow updating core fields fluently (no optional params, just explicit setters)
  setUrl(newUrl: string): this { this.url = newUrl; return this }
  setToken(newToken: string): this { this.token = newToken || ''; return this }
  setModel(newModel: string): this { this.model = newModel; return this }

  // Access messages (read?only copy)
  getMessages(): ChatMessage[] { return [...this._messages] }

  /**
   * Add a system message. This sets the context for the entire conversation (e.g., persona, rules, or instructions).
   * System messages should always be at the top and only appear once per conversation.
   */
  system(content: string): this {
    this._messages.push({ role: 'system', content })
    return this
  }

  /**
   * Add a user message. This is the main input from the human user, e.g., a question or command.
   * User messages can appear multiple times in a conversation.
   */
  user(content: string): this {
    this._messages.push({ role: 'user', content })
    return this
  }

  /**
   * Add an assistant message. This is a response from the AI assistant, usually used for multi-turn conversations.
   * Most single-turn requests do not need this.
   */
  assistant(content: string): this {
    this._messages.push({ role: 'assistant', content })
    return this
  }

  /**
   * Add a function call message. This represents a function being called by the assistant, with a name and arguments.
   * Used for OpenAI function-calling or similar APIs. Not the same as a tool call.
   */
  functionCall(name: string, content: string): this {
    this._messages.push({ role: 'function', name, content })
    return this
  }

  /**
   * Add a tool call message. This is for tool-calling APIs (e.g., OpenAI tools), where the assistant requests a tool to be run.
   * Tool calls are structured objects, not just text. Not the same as a function call.
   */
  toolCall(tool_calls: unknown[]): this {
    this._messages.push({ role: 'tool', tool_calls })
    return this
  }

  /**
   * Add extra fields to the payload (e.g., temperature, top_p, response_format, etc.).
   * Use this for advanced options or API-specific extensions.
   */
  extra(payload: Record<string, unknown>): this {
    this._extraPayload = { ...this._extraPayload, ...payload }
    return this
  }

  /**
   * Clear all messages and extra payload fields. Use this to start a new conversation or request.
   */
  clear(): this {
    this._messages = []
    this._extraPayload = {}
    return this
  }

  // Build the raw payload (separate so callers can inspect or log before sending)
  buildPayload(): ChatCompletionPayload {
    if (!this.url) throw new Error('AI URL is required')
    if (!this.model) throw new Error('AI model is required')
    return {
      model: this.model,
      stream: false,
      messages: this._messages,
      ...this._extraPayload
    }
  }

  /**
   * Send the built request to the AI endpoint. Returns the HTTP status and the response (or error message).
   * Attempts to extract the assistant's reply from the OpenAI-compatible response format.
   */
  async send(): Promise<AIRequestResult> {
    const payload = this.buildPayload()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}` // only attach if provided

    let status = 0
    let responseText = ''
    try {
      const resp = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(payload) })
      status = resp.status
      responseText = await resp.text()
      try {
        const json = JSON.parse(responseText)
        if (json && json.choices && json.choices.length > 0 && json.choices[0].message && json.choices[0].message.content) {
          responseText = json.choices[0].message.content
        }
      } catch { /* leave raw text */ }
    } catch (err) {
      status = 0
      responseText = err instanceof Error ? err.message : String(err)
    }
    return { status, response: responseText }
  }
}
