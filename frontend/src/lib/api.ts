async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function login(password: string): Promise<boolean> {
  const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ password }) })
  return res.ok
}

export async function logout(): Promise<void> {
  await apiFetch('/logout', { method: 'POST' })
}

export async function sendChat(message: string): Promise<string> {
  const res = await apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message }) })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Request failed')
  }
  const data = await res.json()
  return data.reply
}

export async function transcribeAudio(audioBase64: string, encoding: string, sampleRateHertz: number): Promise<string> {
  const res = await apiFetch('/stt', {
    method: 'POST',
    body: JSON.stringify({ audio: audioBase64, encoding, sampleRateHertz }),
  })
  if (!res.ok) throw new Error('Transcription failed')
  const data = await res.json()
  return data.transcript as string
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const res = await apiFetch('/tts', { method: 'POST', body: JSON.stringify({ text }) })
  if (!res.ok) throw new Error('Speech synthesis failed')
  return res.blob()
}

export class UnauthorizedError extends Error {}
