export interface StartResponse {
  message: string
  conversation_id: string
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || ''

export async function startConversation(query: string): Promise<StartResponse> {
  const url = `${API_BASE_URL}/start`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to start conversation (${res.status}): ${text}`)
  }
  return (await res.json()) as StartResponse
}

