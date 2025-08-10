export interface StartResponse {
  message: string
  conversation_id: string
}

// Use a relative base with Vite dev proxy to avoid CORS/preflight
const API_BASE_URL = "/api"

export async function startConversation(query: string): Promise<StartResponse> {
  const url = `${API_BASE_URL}/start`
  const controller = new AbortController()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: controller.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to start conversation (${res.status}): ${text}`)
  }

  // Expect an SSE stream: text/event-stream with events: init, heartbeat, done
  if (!res.body) {
    throw new Error('No response body from /start (expected SSE stream)')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // Read chunks and parse SSE frames until we get the init event
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        const lines = rawEvent.split(/\r?\n/)
        let event = 'message'
        const dataLines: string[] = []
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        const dataStr = dataLines.join('\n')

        if (event === 'init') {
          const payload = JSON.parse(dataStr) as StartResponse
          // Cancel the request to close the stream on client side; server will finish on its own.
          try { controller.abort() } catch {}
          try { reader.releaseLock() } catch {}
          return payload
        }
        // Ignore heartbeat and done events here; Firestore listeners handle progress.
      }
    }
  } finally {
    try { reader.releaseLock() } catch {}
  }

  throw new Error('SSE stream closed before init event')
}
