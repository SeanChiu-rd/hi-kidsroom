import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityName, setActivityName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [capacity, setCapacity] = useState(1)
  const [message, setMessage] = useState('')

  // 修改中的時段
  const [editingId, setEditingId] = useState(null)
  const [editActivity, setEditActivity] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editCapacity, setEditCapacity] = useState(1)

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

  // 選了開始時間後，自動把結束時間的「年月日」帶成一樣（時間部分沿用既有或開始時間）
  function handleStartChange(e) {
    const value = e.target.value
    setStart(value)
    if (!value) return
    const [datePart, timePart] = value.split('T')
    setEnd((prev) => {
      const prevTime = prev ? prev.split('T')[1] : ''
      return `${datePart}T${prevTime || timePart}`
    })
  }

  async function addSlot(e) {
    e.preventDefault()
    setMessage('')

    if (new Date(end) <= new Date(start)) {
      setMessage('結束時間必須晚於開始時間')
      return
    }
    if (Number(capacity) < 1) {
      setMessage('人數上限至少為 1')
      return
    }
    if (!activityName.trim()) {
      setMessage('請輸入活動名稱')
      return
    }

    const { error } = await supabase.from('slots').insert({
      teacher_id: user.id,
      activity_name: activityName.trim(),
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      capacity: Number(capacity),
    })
    if (error) {
      setMessage('新增失敗：' + error.message)
    } else {
      setActivityName('')
      setStart('')
      setEnd('')
      setCapacity(1)
      loadSlots()
    }
  }

  async function deleteSlot(id) {
    const { error } = await supabase.from('slots').delete().eq('id', id)
    if (error) setMessage('刪除失敗：' + error.message)
    else loadSlots()
  }

  function startEdit(slot) {
    setMessage('')
    setEditingId(slot.id)
    setEditActivity(slot.activity_name || '')
    setEditStart(toLocalInput(slot.start_time))
    setEditEnd(toLocalInput(slot.end_time))
    setEditCapacity(slot.capacity)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleEditStartChange(e) {
    const value = e.target.value
    setEditStart(value)
    if (!value) return
    const [datePart] = value.split('T')
    setEditEnd((prev) => {
      const prevTime = prev ? prev.split('T')[1] : value.split('T')[1]
      return `${datePart}T${prevTime}`
    })
  }

  async function saveEdit(slot) {
    setMessage('')

    if (new Date(editEnd) <= new Date(editStart)) {
      setMessage('結束時間必須晚於開始時間')
      return
    }
    if (Number(editCapacity) < slot.booked_count) {
      setMessage(`人數上限不能小於已預約人數（目前已預約 ${slot.booked_count} 人）`)
      return
    }

    if (!editActivity.trim()) {
      setMessage('請輸入活動名稱')
      return
    }

    const { error } = await supabase
      .from('slots')
      .update({
        activity_name: editActivity.trim(),
        start_time: new Date(editStart).toISOString(),
        end_time: new Date(editEnd).toISOString(),
        capacity: Number(editCapacity),
      })
      .eq('id', slot.id)

    if (error) {
      setMessage('修改失敗：' + error.message)
    } else {
      setEditingId(null)
      loadSlots()
    }
  }

  // ISO 時間轉成 <input type="datetime-local"> 需要的本地格式
  function toLocalInput(iso) {
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`
  }

  function formatDT(iso) {
    return new Date(iso).toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      timeZone: 'Asia/Taipei',
    })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>老師專區</h1>
        <div className="slot-actions">
          <Link to="/" className="button-link">
            首頁
          </Link>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            登出
          </button>
        </div>
      </div>
      <p className="muted">目前登入：{user.email}</p>

      <form onSubmit={addSlot} className="card form row">
        <label>
          活動名稱
          <input
            type="text"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="例如 黏土手作課"
            required
          />
        </label>
        <label>
          開始時間
          <input
            type="datetime-local"
            value={start}
            onChange={handleStartChange}
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
        <label>
          人數上限
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
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
          {slots.map((slot) => {
            const full = slot.booked_count >= slot.capacity

            if (editingId === slot.id) {
              return (
                <li key={slot.id} className="slot-item editing">
                  <div className="slot-edit">
                    <label>
                      活動名稱
                      <input
                        type="text"
                        value={editActivity}
                        onChange={(e) => setEditActivity(e.target.value)}
                      />
                    </label>
                    <label>
                      開始時間
                      <input
                        type="datetime-local"
                        value={editStart}
                        onChange={handleEditStartChange}
                      />
                    </label>
                    <label>
                      結束時間
                      <input
                        type="datetime-local"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                      />
                    </label>
                    <label>
                      人數上限
                      <input
                        type="number"
                        min={1}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="slot-actions">
                    <button className="sm" onClick={() => saveEdit(slot)}>
                      儲存
                    </button>
                    <button className="secondary sm" onClick={cancelEdit}>
                      取消
                    </button>
                  </div>
                </li>
              )
            }

            return (
              <li key={slot.id} className="slot-item">
                <span>
                  {slot.activity_name && (
                    <strong className="slot-activity">{slot.activity_name}</strong>
                  )}
                  {formatDT(slot.start_time)} － {formatDT(slot.end_time)}
                  <span className="muted"> · 已預約 {slot.booked_count}/{slot.capacity} 位小孩</span>
                </span>
                <span className="slot-actions">
                  {full && <span className="badge booked">已約滿</span>}
                  <button className="secondary sm" onClick={() => startEdit(slot)}>
                    修改
                  </button>
                  {slot.booked_count === 0 && (
                    <button className="danger" onClick={() => deleteSlot(slot.id)}>
                      刪除
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
