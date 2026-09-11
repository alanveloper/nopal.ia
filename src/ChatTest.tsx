import { FormEvent, useState } from 'react'
import './chat-test.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatResponse = {
  message: string
  responseId: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export default function ChatTest() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = input.trim()
    if (!content || loading) return

    const nextMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      const data = await response.json() as Partial<ChatResponse> & { error?: string }

      if (!response.ok || typeof data.message !== 'string') {
        throw new Error(data.error ?? 'No fue posible obtener una respuesta.')
      }

      setMessages([...nextMessages, { role: 'assistant', content: data.message }])
    } catch (requestError) {
      setMessages(messages)
      setError(requestError instanceof Error ? requestError.message : 'Error de conexión con el backend.')
    } finally {
      setLoading(false)
    }
  }

  function startTest() {
    setInput('Quiero comenzar mi orientación profesional. ¿Cómo empezamos?')
  }

  function clearChat() {
    setMessages([])
    setInput('')
    setError('')
  }

  return (
    <section className="chat-test page">
      <div className="chat-header">
        <div>
          <p className="eyebrow">Prueba de integración · OpenAI</p>
          <h1>Chat de orientación profesional</h1>
          <p className="lede">Este chat usa el system prompt configurado en el backend. Puedes probar el flujo completo y comprobar que Enfoca avance una fase a la vez.</p>
        </div>
        <button className="button secondary" onClick={clearChat}>Limpiar chat</button>
      </div>

      <div className="chat-notice">
        <strong>Qué estamos probando</strong>
        <span>El navegador nunca recibe la API key. Cada mensaje viaja al backend, que aplica el system prompt antes de consultar OpenAI.</span>
      </div>

      <div className="chat-window" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-mark">E</div>
            <h2>Listo para probar Enfoca</h2>
            <p>Envía el mensaje inicial y verifica que el asistente comience por la Fase 0, sin mostrar todo el cuestionario de golpe.</p>
            <button className="button primary" onClick={startTest}>Iniciar prueba</button>
          </div>
        ) : (
          messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <span className="chat-role">{message.role === 'user' ? 'Tú' : 'Enfoca'}</span>
              <div className="chat-bubble">{message.content}</div>
            </div>
          ))
        )}
        {loading && <div className="chat-message assistant"><span className="chat-role">Enfoca</span><div className="chat-bubble typing">Pensando…</div></div>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <form className="chat-form" onSubmit={sendMessage}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escribe tu respuesta o pregunta…" rows={3} disabled={loading} />
        <button className="button primary" type="submit" disabled={loading || !input.trim()}>{loading ? 'Enviando…' : 'Enviar'}</button>
      </form>
    </section>
  )
}
