import { FormEvent, useEffect, useMemo, useState } from 'react'
import ChatTest from './ChatTest'
import { assessments, mockJobs, workQuestions } from './data'

type BasicProfile = { name: string; email: string; headline: string }
type Answers = Record<string, string>
type Step = 'welcome' | 'profile' | 'questions' | 'assessments' | 'results' | 'chat'

const storageKey = 'enfoca-profile-v1'
const initialProfile: BasicProfile = { name: '', email: '', headline: '' }

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as { profile?: BasicProfile; answers?: Answers; completed?: string[] }
  } catch {
    return {}
  }
}

function App() {
  const saved = useMemo(loadSaved, [])
  const [step, setStep] = useState<Step>('welcome')
  const [profile, setProfile] = useState<BasicProfile>(saved.profile ?? initialProfile)
  const [answers, setAnswers] = useState<Answers>(saved.answers ?? {})
  const [completed, setCompleted] = useState<string[]>(saved.completed ?? [])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ profile, answers, completed }))
  }, [profile, answers, completed])

  const currentQuestion = workQuestions[questionIndex]
  const overallProgress = step === 'profile' ? 12 : step === 'questions' ? 20 + (questionIndex / workQuestions.length) * 35 : step === 'assessments' ? 60 + (completed.length / assessments.length) * 25 : step === 'results' ? 100 : 0
  const firstName = profile.name.trim().split(' ')[0] || 'tu'

  function beginProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile.name.trim() || !profile.email.trim()) {
      setError('Completa tu nombre y correo para continuar.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) {
      setError('Escribe un correo válido.')
      return
    }
    setError('')
    setStep('questions')
  }

  function nextQuestion() {
    if (!answers[currentQuestion.id]?.trim()) {
      setError('Elige o escribe una respuesta para continuar.')
      return
    }
    setError('')
    if (questionIndex === workQuestions.length - 1) setStep('assessments')
    else setQuestionIndex((index) => index + 1)
  }

  function toggleAssessment(id: string) {
    setCompleted((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  function resetDemo() {
    localStorage.removeItem(storageKey)
    setProfile(initialProfile)
    setAnswers({})
    setCompleted([])
    setQuestionIndex(0)
    setStep('welcome')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setStep('welcome')} aria-label="Ir al inicio de Enfoca"><span>enfoca</span><i /></button>
        <div className="topbar-actions">
          {step !== 'welcome' && <div className="save-status">Tus avances se guardan en este dispositivo</div>}
          {step !== 'chat' && <button className="text-button chat-link" onClick={() => setStep('chat')}>Probar asistente IA</button>}
        </div>
      </header>

      {step !== 'welcome' && step !== 'chat' && <div className="progress-wrap" aria-label={`Progreso ${Math.round(overallProgress)}%`}><div className="progress" style={{ width: `${overallProgress}%` }} /></div>}

      <main>
        {step === 'welcome' && <section className="welcome page">
          <div className="welcome-copy">
            <p className="eyebrow">Tu siguiente paso profesional</p>
            <h1>Un trabajo que encaje contigo empieza por conocerte.</h1>
            <p className="lede">Descubre lo que buscas en un trabajo y recibe oportunidades que se adapten a tu manera de avanzar.</p>
            <button className="button primary" onClick={() => setStep('profile')}>Crear mi perfil</button>
            <button className="button secondary demo-chat-button" onClick={() => setStep('chat')}>Probar asistente IA</button>
            <p className="microcopy">Te tomará alrededor de 15 minutos.</p>
          </div>
          <div className="welcome-panel" aria-hidden="true">
            <div className="panel-top"><span>Perfil de trabajo</span><b>En progreso</b></div>
            <div className="panel-person"><div className="avatar">T</div><div><strong>Tu perfil</strong><small>Construyendo una dirección clara</small></div></div>
            <div className="signal"><span className="signal-mark">01</span><div><strong>Lo que te mueve</strong><small>Intereses y motivaciones</small></div></div>
            <div className="signal"><span className="signal-mark">02</span><div><strong>Cómo trabajas mejor</strong><small>Ritmo, entorno y comunicación</small></div></div>
            <div className="signal"><span className="signal-mark">03</span><div><strong>Dónde puedes aportar</strong><small>Roles y oportunidades compatibles</small></div></div>
          </div>
        </section>}

        {step === 'profile' && <section className="form-page page narrow">
          <p className="eyebrow">Paso 1 de 3</p><h1>Empecemos por lo básico.</h1><p className="lede">Usaremos estos datos para personalizar tu experiencia. Por ahora, todo queda guardado solo en este navegador.</p>
          <form onSubmit={beginProfile} noValidate>
            <label>Nombre completo<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Escribe tu nombre" autoComplete="name" /></label>
            <label>Correo electrónico<input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="tu@correo.com" autoComplete="email" /></label>
            <label>Una breve descripción <span className="optional">Opcional</span><textarea value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} placeholder="Ej. Me interesa aprender, crear soluciones y encontrar un lugar donde crecer." rows={3} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="actions"><button type="button" className="button secondary" onClick={() => setStep('welcome')}>Atrás</button><button className="button primary" type="submit">Continuar</button></div>
          </form>
        </section>}

        {step === 'questions' && <section className="form-page page narrow question-page">
          <p className="eyebrow">Perfil de trabajo · {questionIndex + 1} de {workQuestions.length}</p><h1>{currentQuestion.title}</h1><p className="lede">{currentQuestion.description}</p>
          <div className="question-content">
            {currentQuestion.kind === 'choices' ? <div className="choices">{currentQuestion.options.map((option) => <button key={option} className={`choice ${answers[currentQuestion.id] === option ? 'selected' : ''}`} onClick={() => { setAnswers({ ...answers, [currentQuestion.id]: option }); setError('') }}>{option}</button>)}</div> : <textarea className="answer-area" rows={5} placeholder={currentQuestion.placeholder} value={answers[currentQuestion.id] ?? ''} onChange={(e) => { setAnswers({ ...answers, [currentQuestion.id]: e.target.value }); setError('') }} />}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="actions"><button className="button secondary" onClick={() => questionIndex === 0 ? setStep('profile') : setQuestionIndex((index) => index - 1)}>Atrás</button><button className="button primary" onClick={nextQuestion}>{questionIndex === workQuestions.length - 1 ? 'Ver mis evaluaciones' : 'Continuar'}</button></div>
        </section>}

        {step === 'assessments' && <section className="form-page page assessment-page">
          <div className="assessment-heading"><div><p className="eyebrow">Paso 3 de 3</p><h1>Conoce tu forma de trabajar.</h1><p className="lede">Marca las evaluaciones que completaste. Por ahora son una simulación: después se conectarán con los tests del producto.</p></div><div className="completion-count"><strong>{completed.length}/{assessments.length}</strong><span>evaluaciones</span></div></div>
          <div className="assessment-list">{assessments.map((assessment, index) => <article className={`assessment ${completed.includes(assessment.id) ? 'done' : ''}`} key={assessment.id}><span className="assessment-number">0{index + 1}</span><div><h2>{assessment.title}</h2><p>{assessment.description}</p><small>{assessment.time}</small></div><button className={`button ${completed.includes(assessment.id) ? 'secondary' : 'primary'}`} onClick={() => toggleAssessment(assessment.id)}>{completed.includes(assessment.id) ? 'Completado' : 'Completar'}</button></article>)}</div>
          <div className="actions"><button className="button secondary" onClick={() => setStep('questions')}>Atrás</button><button className="button primary" onClick={() => setStep('results')}>Ver mi resultado preliminar</button></div>
        </section>}

        {step === 'results' && <section className="results page">
          <div className="result-hero"><p className="eyebrow">Tu perfil de trabajo</p><h1>Hola, {firstName}. Aquí hay un punto de partida.</h1><p>Este resultado es una muestra basada en datos de ejemplo. En la versión conectada, será generado con tus respuestas y evaluaciones.</p></div>
          <section className="insight"><div><p className="eyebrow">Lectura preliminar</p><h2>Podrías sentirte mejor en roles con autonomía, organización y metas claras.</h2></div><div className="preference-list"><span>Espacio para decidir cómo avanzar</span><span>Objetivos concretos y orden</span><span>Comunicación enfocada y práctica</span></div></section>
          <section className="jobs"><div className="section-heading"><div><p className="eyebrow">Oportunidades para explorar</p><h2>Vacantes que podrían interesarte</h2></div><span className="mock-label">Datos de ejemplo</span></div><div className="job-list">{mockJobs.map((job) => <article className="job" key={job.title}><div className="match"><strong>{job.match}%</strong><span>afinidad</span></div><div className="job-main"><h3>{job.title}</h3><p className="company">{job.company} · {job.location}</p><p>{job.description}</p><div className="tags">{job.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="job-meta"><span>{job.schedule}</span><small>Detalle disponible al conectar vacantes</small></div></article>)}</div></section>
          <div className="result-footer"><button className="button secondary" onClick={() => setStep('assessments')}>Volver a evaluaciones</button><button className="text-button" onClick={resetDemo}>Reiniciar demostración</button></div>
        </section>}

        {step === 'chat' && <ChatTest />}
      </main>
    </div>
  )
}

export default App
