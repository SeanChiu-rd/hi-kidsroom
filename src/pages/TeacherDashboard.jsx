import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [message, setMessage] = useState('')

  async function loadSlots() {
    setLoading(true)
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('teacher_id', user.id)
      .order('start_time', { ascending: true })
    if (error) setMessage('讀取時段失敗：' + error.message)
    else setSlots(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addSlot(e) {
    e.preventDefault()
    setMessage('')

    if (new Date(end) <= new Date(start)) {
      setMessage('結束時間必須晚於開始時間')
      return
    }

    const { error } = await supabase.from('slots').insert({
      teacher_id: user.id,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
    })
    if (error) {
      setMessage('新增失敗：' + error.message)
    } else {
      setStart('')
      setEnd('')
      loadSlots()
    }
  }

  async function deleteSlot(id) {
    const { error } = await supabase.from('slots').delete().eq('id', id)
    if (error) setMessage('刪除失敗：' + error.message)
    else loadSlots()
  }

  function formatDT(iso) {
    return new Date(iso).toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>老師專區</h1>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          登出
        </button>
      </div>
      <p className="muted">目前登入：{user.email}</p>

      <form onSubmit={addSlot} className="card form row">
        <label>
          開始時間
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label>
          結束時間
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>
        <button type="submit">新增可預約時段</button>
      </form>

      {message && <p className="message">{message}</p>}

      <h2>我的時段</h2>
      {loading ? (
        <p>載入中…</p>
      ) : slots.length === 0 ? (
        <p className="muted">還沒有登記任何時段，用上面的表單新增吧。</p>
      ) : (
        <ul className="slot-list">
          {slots.map((slot) => (
            <li key={slot.id} className="slot-item">
              <span>
                {formatDT(slot.start_time)} － {formatDT(slot.end_time)}
              </span>
              {slot.is_booked ? (
                <span className="badge booked">已被預約</span>
              ) : (
                <button className="danger" onClick={() => deleteSlot(slot.id)}>
                  刪除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
