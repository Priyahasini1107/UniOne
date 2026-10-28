import { useCallback, useEffect, useMemo, useState } from 'react'
import '../../styles/Modules.css'

const CATEGORY_LABEL = {
  all: 'All subjects', dsa: 'Coding', aptitude: 'Aptitude & reasoning',
  programming: 'Programming fundamentals', technical: 'Technical fundamentals', hr: 'HR & behavioural',
  dbms: 'DBMS & SQL', operating_systems: 'Operating systems', networks: 'Computer networks', oop: 'OOP', ai_ml: 'AI & machine learning',
}
const SUBJECT_TAG = { 'subject:dbms': 'dbms', 'subject:operating-systems': 'operating_systems', 'subject:networks': 'networks', 'subject:oop': 'oop', 'subject:ai-ml': 'ai_ml' }
const DIFF_COLOR = { beginner: 'badge-green', intermediate: 'badge-yellow', advanced: 'badge-red' }
const COMPANIES = ['Amazon', 'Google', 'Microsoft', 'Infosys', 'TCS', 'Wipro']
const ROLES = [
  { id: 'sde', label: 'Software development' },
  { id: 'data', label: 'Data analytics' },
  { id: 'ml', label: 'AI / machine learning' },
  { id: 'all', label: 'Any role' },
]

function tagsFor(topic) { return Array.isArray(topic.tags) ? topic.tags : String(topic.tags || '').split(',').map(tag => tag.trim()).filter(Boolean) }
function subjectFor(topic) {
  const tags = tagsFor(topic)
  const tagged = tags.map(tag => SUBJECT_TAG[tag]).find(Boolean)
  if (tagged) return tagged
  if (tags.some(tag => ['dbms', 'sql', 'database'].includes(tag))) return 'dbms'
  if (tags.some(tag => ['os', 'operating-systems'].includes(tag))) return 'operating_systems'
  if (tags.some(tag => ['networks', 'tcp-ip'].includes(tag))) return 'networks'
  if (tags.includes('oop')) return 'oop'
  return topic.category
}
function contentFor(topic) {
  try { return JSON.parse(topic.content) } catch { return { format: 'text', solution: topic.content } }
}

function InterviewPrep() {
  const [topics, setTopics] = useState([])
  const [progress, setProgress] = useState({ total: 0, done: 0, attempted: 0, attempts: 0, correct_answers: 0 })
  const [mode, setMode] = useState('general')
  const [company, setCompany] = useState(COMPANIES[0])
  const [role, setRole] = useState('sde')
  const [cat, setCat] = useState('all')
  const [diff, setDiff] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [answers, setAnswers] = useState({})
  const [attemptResults, setAttemptResults] = useState({})
  const [savingAttempt, setSavingAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [quizSaving, setQuizSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/interview-prep', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not load practice questions.')
      setTopics(data.topics || [])
    } catch (err) { setError(err.message || 'Network error.') }
    finally { setLoading(false) }
  }, [])

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/interview-prep/progress', { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.success) setProgress(data)
    } catch { /* Questions remain available if only progress is unavailable. */ }
  }, [])

  useEffect(() => { load(); loadProgress() }, [load, loadProgress])

  async function toggleDone(topic) {
    const next = !topic.is_done
    try {
      const res = await fetch(`/api/interview-prep/${topic.id}/progress`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_done: next }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not update progress.')
      setTopics(items => items.map(item => item.id === topic.id ? { ...item, is_done: next ? 1 : 0 } : item))
      setProgress(value => ({ ...value, done: Math.max(0, value.done + (next ? 1 : -1)) }))
      setNotice(next ? 'Question marked complete.' : 'Question marked incomplete.')
    } catch (err) { setNotice(err.message || 'Could not update progress.') }
  }

  async function submitAttempt(topic, answer) {
    if (savingAttempt === topic.id) return
    setSavingAttempt(topic.id)
    try {
      const res = await fetch('/api/interview-prep/attempts', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id, answer: String(answer) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not save your answer.')
      setAttemptResults(items => ({ ...items, [topic.id]: data }))
      setTopics(items => items.map(item => item.id === topic.id ? { ...item, attempt_count: Number(item.attempt_count || 0) + 1, correct_count: Number(item.correct_count || 0) + (data.is_correct ? 1 : 0), last_is_correct: data.is_correct } : item))
      await loadProgress()
      return data
    } catch (err) { setNotice(err.message || 'Could not save your answer.'); throw err }
    finally { setSavingAttempt(null) }
  }

  const visible = useMemo(() => topics.filter(topic => {
    const tags = tagsFor(topic)
    if (mode === 'company' && (!tags.includes('track:company-practice') || (role !== 'all' && !(tags.includes(`role:${role}`) || tags.includes('role:all'))))) return false
    const subject = subjectFor(topic)
    const categoryMatches = cat === 'all' || subject === cat
    const difficultyMatches = diff === 'all' || topic.difficulty === diff
    const haystack = `${topic.title} ${topic.content} ${tags.join(' ')}`.toLowerCase()
    return categoryMatches && difficultyMatches && haystack.includes(search.trim().toLowerCase())
  }), [topics, mode, role, cat, diff, search])
  const quizTopics = visible.filter(topic => contentFor(topic).format === 'mcq')
  const percent = progress.total ? Math.round(progress.done * 100 / progress.total) : 0

  function startQuiz() {
    if (!quizTopics.length) { setNotice('No multiple-choice questions match these filters.'); return }
    setQuiz({ ids: quizTopics.map(topic => topic.id), index: 0, answers: {}, submitted: false, results: [] })
  }

  async function finishQuiz() {
    if (quizSaving || !quiz) return
    const unanswered = quiz.ids.filter(id => quiz.answers[id] == null)
    if (unanswered.length) { setNotice(`Answer all questions before submitting (${unanswered.length} remaining).`); return }
    setQuizSaving(true)
    try {
      const res = await fetch('/api/interview-prep/quizzes', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: quiz.ids.map(id => ({ topic_id: id, answer: String(quiz.answers[id]) })) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not save quiz score.')
      setTopics(items => items.map(topic => {
        const result = data.results.find(item => item.id === topic.id)
        return result ? { ...topic, attempt_count: Number(topic.attempt_count || 0) + 1, correct_count: Number(topic.correct_count || 0) + (result.is_correct ? 1 : 0), last_is_correct: result.is_correct } : topic
      }))
      await loadProgress()
      setQuiz(current => ({ ...current, submitted: true, results: data.results, scorePercent: data.score_percent }))
    } catch (err) { setNotice(err.message || 'Could not save quiz results.') }
    finally { setQuizSaving(false) }
  }

  return <div>
    <div className="mod-header">
      <div><div className="mod-title">🎯 Interview Preparation</div><div className="mod-subtitle">General revision and original role-aligned practice. Company-style prompts are not verified historical questions.</div></div>
      <div style={{ textAlign: 'right', minWidth: 180 }}><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Progress · {progress.attempted || 0} attempted · {progress.correct_answers || 0} correct</div><strong>{percent}% complete ({progress.done}/{progress.total})</strong><div className="mod-progress-bar" style={{ marginTop: 6 }}><div className="mod-progress-bar__fill" style={{ width: `${percent}%` }} /></div>{progress.quiz_count > 0 && <small>{progress.quiz_count} quizzes · latest {Math.round(progress.latest_quiz_score || 0)}% · average {Math.round(progress.average_quiz_score || 0)}%</small>}</div>
    </div>

    <div className="mod-tabs" role="tablist" aria-label="Practice mode">
      {[['general', 'General Practice'], ['company', 'Company-wise Practice']].map(([value, label]) => <button key={value} role="tab" aria-selected={mode === value} className={`mod-tab ${mode === value ? 'active' : ''}`} onClick={() => { setMode(value); setCat('all'); setExpanded(null) }}>{label}</button>)}
    </div>
    {mode === 'company' && <div className="mod-toolbar">
      <select className="mod-select" value={company} onChange={event => setCompany(event.target.value)} aria-label="Select company">{COMPANIES.map(name => <option key={name}>{name}</option>)}</select>
      <select className="mod-select" value={role} onChange={event => setRole(event.target.value)} aria-label="Select target role">{ROLES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <span className="mod-toast mod-toast--info">Practice prompts grouped by role fundamentals for {company}; not verified company questions.</span>
    </div>}
    <div className="mod-toolbar">
      <div className="mod-search"><span aria-hidden="true">🔎</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search questions and answers…" aria-label="Search practice questions" /></div>
      <select className="mod-select" value={cat} onChange={event => setCat(event.target.value)} aria-label="Filter by subject">{Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className="mod-select" value={diff} onChange={event => setDiff(event.target.value)} aria-label="Filter by difficulty"><option value="all">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      <button className="mod-btn mod-btn--primary" onClick={startQuiz}>Start MCQ quiz ({quizTopics.length})</button>
    </div>
    {notice && <div className="mod-toast mod-toast--info" role="status">{notice}</div>}
    {error && <div className="mod-toast mod-toast--error" role="alert">⚠️ {error} <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={load}>Retry</button></div>}
    {loading ? <div className="mod-loading"><div className="mod-spinner" /><span>Loading practice questions…</span></div> : !error && !visible.length ? <div className="mod-empty"><div className="mod-empty__icon">🎯</div><div className="mod-empty__title">No questions match</div><div className="mod-empty__sub">Try another subject, role, difficulty, or search term.</div></div> : !error && <div className="mod-list">{visible.map(topic => {
      const open = expanded === topic.id
      const data = contentFor(topic)
      const result = attemptResults[topic.id]
      const selected = answers[topic.id]
      const isMcq = data.format === 'mcq'
      const isCoding = data.format === 'coding'
      const prompt = data.prompt || data.problem || ''
      return <article key={topic.id} className="mod-card" style={{ borderLeftWidth: 3, borderLeftColor: topic.is_done ? '#22c55e' : 'var(--border)' }}>
        <div className="mod-card__header"><div className="mod-card__title">{topic.title}</div><span className={`badge ${DIFF_COLOR[topic.difficulty] || 'badge-gray'}`}>{topic.difficulty}</span></div>
        <div className="mod-card__meta"><span className="badge badge-blue">{CATEGORY_LABEL[subjectFor(topic)] || topic.category}</span><span>{topic.attempt_count || 0} attempt(s) · {topic.correct_count || 0} correct</span></div>
        {(open || isMcq) && <div className="mod-card__body">
          {prompt && <p>{prompt}</p>}
          {isMcq ? <div className="practice-options">{(data.options || []).map((option, index) => <label className="practice-option" key={index}><input type="radio" name={`answer-${topic.id}`} checked={selected === index} disabled={!!result || savingAttempt === topic.id} onChange={() => setAnswers(current => ({ ...current, [topic.id]: index }))} /><span>{option}</span></label>)}
            <button className="mod-btn mod-btn--primary mod-btn--sm" disabled={selected == null || !!result || savingAttempt === topic.id} onClick={() => submitAttempt(topic, selected)}>{savingAttempt === topic.id ? 'Saving…' : result ? (result.is_correct ? 'Correct' : 'Review answer') : 'Check answer'}</button>
            {result && <p role="status"><strong>{result.is_correct ? 'Correct.' : `Not quite. Correct answer: ${result.correct_answer}`}</strong> {result.explanation}</p>}
          </div> : isCoding ? <>
            {data.examples?.map((example, index) => <p key={index}><strong>Example:</strong> <code>{example.input}</code> → <code>{example.output}</code></p>)}
            {data.constraints && <p><strong>Constraints:</strong> {data.constraints}</p>}
            <label className="practice-answer-label">Your approach or code<textarea className="mod-select practice-answer" rows={5} value={answers[topic.id] || ''} onChange={event => setAnswers(current => ({ ...current, [topic.id]: event.target.value }))} placeholder="Write pseudocode, code, or your reasoning…" /></label>
            <button className="mod-btn mod-btn--secondary mod-btn--sm" disabled={!answers[topic.id]?.trim() || savingAttempt === topic.id} onClick={() => submitAttempt(topic, answers[topic.id])}>{savingAttempt === topic.id ? 'Saving…' : result ? 'Attempt saved' : 'Save attempt'}</button>
            {result && <p><strong>Suggested solution:</strong> {result.explanation}</p>}
          </> : data.format === 'short-answer' ? <>
            <label className="practice-answer-label">Your response<textarea className="mod-select practice-answer" rows={4} value={answers[topic.id] || ''} onChange={event => setAnswers(current => ({ ...current, [topic.id]: event.target.value }))} placeholder="Draft your response…" /></label>
            <button className="mod-btn mod-btn--secondary mod-btn--sm" disabled={!answers[topic.id]?.trim() || savingAttempt === topic.id} onClick={() => submitAttempt(topic, answers[topic.id])}>{savingAttempt === topic.id ? 'Saving…' : result ? 'Save another attempt' : 'Save response'}</button>
            {result && <p role="status"><strong>Suggested answer:</strong> {result.explanation}</p>}
          </> : <div style={{ whiteSpace: 'pre-wrap' }}>{data.solution || data.explanation || topic.content}</div>}
        </div>}
        {!isMcq && <div className="mod-card__actions"><button className="mod-btn mod-btn--secondary mod-btn--sm" aria-expanded={open} onClick={() => setExpanded(open ? null : topic.id)}>{open ? 'Hide details' : (isCoding ? 'Open coding problem' : 'Show answer')}</button><button className={`mod-btn mod-btn--sm ${topic.is_done ? 'mod-btn--ghost' : 'mod-btn--primary'}`} onClick={() => toggleDone(topic)}>{topic.is_done ? 'Mark incomplete' : 'Mark complete'}</button></div>}
        {isMcq && <div className="mod-card__actions"><button className={`mod-btn mod-btn--sm ${topic.is_done ? 'mod-btn--ghost' : 'mod-btn--primary'}`} onClick={() => toggleDone(topic)}>{topic.is_done ? 'Mark incomplete' : 'Mark complete'}</button>{!open && <button className="mod-btn mod-btn--secondary mod-btn--sm" onClick={() => setExpanded(topic.id)}>Explain</button>}</div>}
        {isMcq && open && <div className="mod-card__body"><strong>Explanation:</strong> {data.explanation}</div>}
      </article>
    })}</div>}

    {quiz && <div className="practice-quiz-backdrop" role="presentation"><section className="practice-quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div className="mod-card__header"><h2 id="quiz-title">Practice quiz</h2><button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => setQuiz(null)}>Close</button></div>
      {!quiz.submitted ? (() => {
        const topic = topics.find(item => item.id === quiz.ids[quiz.index]); const content = contentFor(topic)
        return <><p>Question {quiz.index + 1} of {quiz.ids.length}</p><h3>{content.prompt}</h3><div className="practice-options">{(content.options || []).map((option, index) => <label className="practice-option" key={index}><input type="radio" name="quiz-answer" checked={quiz.answers[topic.id] === index} onChange={() => setQuiz(current => ({ ...current, answers: { ...current.answers, [topic.id]: index } }))} /><span>{option}</span></label>)}</div><div className="mod-card__actions"><button className="mod-btn mod-btn--secondary" disabled={quiz.index === 0} onClick={() => setQuiz(current => ({ ...current, index: current.index - 1 }))}>Previous</button><button className="mod-btn mod-btn--secondary" disabled={quiz.index === quiz.ids.length - 1} onClick={() => setQuiz(current => ({ ...current, index: current.index + 1 }))}>Next</button><button className="mod-btn mod-btn--primary" disabled={quizSaving} onClick={finishQuiz}>{quizSaving ? 'Scoring…' : 'Submit quiz'}</button></div></>
      })() : <><h3>Score: {quiz.results.filter(item => item.is_correct).length} / {quiz.results.length} ({quiz.scorePercent}%)</h3><div className="mod-list">{quiz.results.map((item, index) => <p key={item.id}>Question {index + 1}: {item.is_correct ? 'Correct' : `Review — answer: ${item.correct_answer}`} — {item.explanation}</p>)}</div><button className="mod-btn mod-btn--primary" onClick={() => setQuiz(null)}>Done</button></>}
    </section></div>}
  </div>
}

export default InterviewPrep
