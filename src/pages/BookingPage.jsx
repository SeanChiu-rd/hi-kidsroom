import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function BookingPage() {
  const { teacherId } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  async function loadData() {
    setLoading(true)
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, bio').eq('id', teacherId).single(),
      supabase
        .from('slots')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true }),
    ])
    setTeacher(t)
    setSlots(s ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId])

  // 依日期把時段分組
  const groups = {}
  for (const slot of slots) {
    const key = new Date(slot.start_time).toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(slot)
  }

  function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function submitBooking(e) {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    setMessage('')

    const { error } = await supabase.from('bookings').insert({
      slot_id: selected.id,
      teacher_id: teacherId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      note,
    })

    if (error) {
      setMessage('預約失敗：' + error.message)
      setBusy(false)
    } else {
      setDone(true)
    }
  }

  if (loading) return <div className="page">載入中…</div>
  if (!teacher) return <div className="page">找不到這位老師。<Link to="/">回首頁</Link></div>

  if (done) {
    return (
      <div className="page narrow">
        <div className="card">
          <h1>預約成功 🎉</h1>
          <p>
            已為你向 <strong>{teacher.full_name || '老師'}</strong> 送出預約：
          </p>
          <p>
            <strong>
              {new Date(selected.start_time).toLocaleString('zh-TW', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
          </p>
          <p className="muted">老師會收到通知並與你聯繫。</p>
          <Link to="/" className="back-link">← 回首頁</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">← 回老師列表</Link>
      <h1>預約 {teacher.full_name || '老師'} 的課程</h1>
      {teacher.bio && <p className="muted">{teacher.bio}</p>}

      <h2>選擇時段</h2>
      {slots.length === 0 ? (
        <p className="muted">這位老師目前沒有可預約的時段，請稍後再來。</p>
      ) : (
        Object.entries(groups).map(([day, daySlots]) => (
          <div key={day} className="day-group">
            <div className="day-label">{day}</div>
            <div className="slot-chips">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.is_booked}
                  className={`slot-chip ${slot.is_booked ? 'booked' : ''} ${
                    selected?.id === slot.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelected(slot)}
                >
                  {timeLabel(slot.start_time)}－{timeLabel(slot.end_time)}
                  {slot.is_booked && ' · 已約'}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {selected && (
        <>
          <h2>填寫預約資料</h2>
          <form onSubmit={submitBooking} className="card form">
            <p className="muted">
              已選時段：
              {new Date(selected.start_time).toLocaleString('zh-TW', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <label>
              姓名
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              電話
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              備註（想上的內容、孩子年齡等）
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? '送出中…' : '確認預約'}
            </button>
          </form>
        </>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  )
}
