import { useState, useEffect, useCallback } from 'react'
import '../../styles/Modules.css'

function parseJSON(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function tasksForStage(stage) {
  if (Array.isArray(stage.checklist) && stage.checklist.length) return stage.checklist
  if (Array.isArray(stage.essential) && stage.essential.length) return stage.essential
  return Array.isArray(stage.topics) ? stage.topics : []
}

function CareerRoadmaps() {
  const [roadmaps, setRoadmaps] = useState([])
  const [detail,   setDetail]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [expandedStage, setExpandedStage] = useState(null)
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/roadmaps')
      const data = await res.json()
      if (data.success) setRoadmaps(data.roadmaps)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function openRoadmap(rm) {
    setError('')
    try {
      const res = await fetch(`/api/roadmaps/${rm.id}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not load this roadmap.')
      setExpandedStage(null)
      setDetail(data.roadmap)
    } catch (err) { setError(err.message || 'Could not load this roadmap.') }
  }

  async function toggleProgressItem(item) {
    const completed = parseJSON(detail.completed_stages_json)
    const next = completed.includes(item)
      ? completed.filter(value => value !== item)
      : [...completed, item]
    setSaving(true)
    try {
      const res  = await fetch(`/api/roadmaps/${detail.id}/progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_stages: next })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not save progress.')
      setDetail(d => ({ ...d, completed_stages_json: next }))
      setRoadmaps(rs => rs.map(r => r.id === detail.id ? { ...r, completed_stages_json: next } : r))
      setMsg('Progress saved!'); setTimeout(() => setMsg(''), 2000)
    } catch (err) { setError(err.message || 'Could not save progress.') } finally { setSaving(false) }
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (detail) {
    const stages    = parseJSON(detail.stages_json)
    const completed = parseJSON(detail.completed_stages_json)
    const completedStages = completed.filter(value => Number.isInteger(value))
    const completedTasks = completed.filter(value => typeof value === 'string' && value.startsWith('task:'))
    const totalTasks = stages.reduce((count, stage) => count + tasksForStage(stage).length, 0)
    const totalUnits = stages.length + totalTasks
    const pct = totalUnits > 0 ? Math.round(((completedStages.length + completedTasks.length) / totalUnits) * 100) : 0
    const nextStage = stages.find(stage => !completedStages.includes(stage.stage))
    const nextStageTasks = nextStage ? tasksForStage(nextStage) : []
    const nextTaskIndex = nextStageTasks.findIndex((_, index) => !completed.includes(`task:${nextStage.stage}:${index}`))
    const finalStage = stages[stages.length - 1]
    const finalProject = detail.final_project || finalStage?.portfolio || finalStage?.project

    return (
      <div>
        <div className="mod-header">
          <div>
            <button className="mod-btn mod-btn--ghost mod-btn--sm" style={{ marginBottom: '10px' }}
              onClick={() => setDetail(null)}>← Back</button>
            <div className="mod-title">{detail.icon} {detail.title}</div>
            <div className="mod-subtitle">{detail.category}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '120px' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--navy-700)' }}>{pct}%</div>
            <div className="mod-progress-bar" style={{ marginTop: '6px' }}>
              <div className="mod-progress-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>{completedStages.length}/{stages.length} stages · {completedTasks.length}/{totalTasks} tasks</div>
          </div>
        </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error" role="alert">⚠️ {error}</div>}
        {detail.overview && <div className="mod-toast mod-toast--info" style={{ marginBottom: '20px' }}>{detail.overview}</div>}

        <div className="mod-grid-2">
          {stages.map(st => {
            const done   = completedStages.includes(st.stage)
            const topics = Array.isArray(st.topics) ? st.topics : []
            const tasks = tasksForStage(st)
            const open = expandedStage === st.stage
            return (
              <div key={st.stage} className={`stage-card ${done ? 'done' : ''}`}>
                <div className="stage-card__num">{done ? '✓' : st.stage}</div>
                <div className="stage-card__title">{st.title}</div>
                <div className="stage-card__topics">
                  {topics.map((tp, i) => <span key={i} className="badge badge-gray" style={{ marginRight: '4px', marginBottom: '4px' }}>{tp}</span>)}
                </div>
                {st.resources && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '6px' }}>📖 {st.resources}</div>}
                {st.project   && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', marginBottom: '10px' }}>🔨 Project: {st.project}</div>}
                <div className="mod-card__actions">
                  <button className="mod-btn mod-btn--secondary mod-btn--sm" aria-expanded={open} onClick={() => setExpandedStage(open ? null : st.stage)}>{open ? 'Hide guidance' : 'Stage guidance'}</button>
                  <button className={`mod-btn mod-btn--sm ${done ? 'mod-btn--ghost' : 'mod-btn--primary'}`} onClick={() => toggleProgressItem(st.stage)} disabled={saving}>{saving ? 'Saving…' : done ? 'Mark Incomplete' : 'Mark Complete'}</button>
                </div>
                {open && <div className="roadmap-guidance">
                  <p><strong>Why this stage matters:</strong> {st.why || `These foundations prepare you for ${stages.find(stage => stage.stage === st.stage + 1)?.title || 'job applications and interviews'}.`}</p>
                  <p><strong>Weekly plan:</strong> Week 1: learn and take notes on the core topics. Week 2: practise with the exercise and review mistakes. Repeat this cycle for each topic before moving on.</p>
                  {st.essential?.length > 0 && <p><strong>Essential:</strong> {st.essential.join(', ')}</p>}
                  {st.optional?.length > 0 && <p><strong>Optional:</strong> {st.optional.join(', ')}</p>}
                  {st.tools?.length > 0 && <p><strong>Tools:</strong> {st.tools.join(', ')}</p>}
                  <p><strong>Practice exercise:</strong> {st.exercise || st.project || `Choose one ${topics[0] || 'topic'} concept, implement or explain it, then check your work against the readiness criteria.`}</p>
                  {tasks.length > 0 && <div className="roadmap-tasks"><strong>Checkpoint tasks</strong>{tasks.map((task, index) => {
                    const taskId = `task:${st.stage}:${index}`
                    const checked = completed.includes(taskId)
                    return <label key={taskId} className="roadmap-task"><input type="checkbox" checked={checked} disabled={saving} onChange={() => toggleProgressItem(taskId)} /> <span>{task}</span></label>
                  })}</div>}
                  {st.portfolio && <p><strong>Portfolio milestone:</strong> {st.portfolio}</p>}
                  {st.interview && <p><strong>Interview practice:</strong> {st.interview}</p>}
                  {st.checklist?.length > 0 && <p><strong>Readiness checklist:</strong> {st.checklist.join(' • ')}</p>}
                  {st.readiness && <p><strong>Ready to move on when:</strong> {st.readiness}</p>}
                  {st.resources && <p><strong>Suggested resource:</strong> {st.resources}</p>}
                </div>}
              </div>
            )
          })}
        </div>
        {nextStage && <div className="mod-toast mod-toast--info" style={{ marginTop: 16 }}><strong>Next recommended action:</strong> {nextTaskIndex >= 0 ? `Stage ${nextStage.stage} — ${nextStageTasks[nextTaskIndex]}` : `Mark Stage ${nextStage.stage}, “${nextStage.title}”, complete after reviewing its readiness criteria.`}</div>}
        {finalProject && <div className="mod-toast mod-toast--info" style={{ marginTop: 12 }}><strong>Final portfolio project:</strong> {finalProject}</div>}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🗺️ Career Roadmaps</div>
          <div className="mod-subtitle">Follow structured paths to your career goal and track stage completion.</div>
        </div>
      </div>

      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading roadmaps…</span></div>
      ) : roadmaps.length === 0 ? (
        <div className="mod-empty"><div className="mod-empty__icon">🗺️</div><div className="mod-empty__title">No career paths available</div><div className="mod-empty__sub">Try again later or contact your administrator.</div></div>
      ) : (
        <div className="mod-grid-2">
          {roadmaps.map(rm => {
            const completed = parseJSON(rm.completed_stages_json)
            const totalStages = Number(rm.stage_count) || 5
            const doneStages = completed.filter(value => Number.isInteger(value))
            const doneTasks = completed.filter(value => typeof value === 'string' && value.startsWith('task:'))
            const roadmapStages = parseJSON(rm.stages_json)
            const taskCount = roadmapStages.reduce((count, stage) => count + tasksForStage(stage).length, 0)
            const units = Number(totalStages) + taskCount
            const pct = units ? Math.round(((doneStages.length + doneTasks.length) / units) * 100) : 0
            return (
              <div key={rm.id} className="mod-card" style={{ cursor: 'pointer' }} onClick={() => openRoadmap(rm)}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{rm.icon || '🗺️'}</div>
                <div className="mod-card__title">{rm.title}</div>
                <div className="mod-card__body" style={{ marginBottom: '10px' }}>{rm.category}</div>
                {doneStages.length + doneTasks.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>{doneStages.length}/{totalStages} stages · {doneTasks.length}/{taskCount} tasks • {pct}%</div>
                    <div className="mod-progress-bar"><div className="mod-progress-bar__fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                <div className="mod-card__actions">
                  <span className="mod-btn mod-btn--primary mod-btn--sm">View Roadmap →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CareerRoadmaps
