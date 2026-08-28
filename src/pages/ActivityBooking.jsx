import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ActivityBooking() {
  const { activityId } = useParams()
  const [activity, setActivity] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [adults, setAdults] = useState(1)
  const [kids, setKids] = useState(1)
  const [age, setAge] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  async function loadData() {
    setLoading(true)
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('activities').select('*').eq('id', activityId).single(),
      supabase
        .from('slots')
        .select('*')
        .eq('activity_id', activityId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true }),
    ])
    setActivity(a)
    setSlots(s ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  // 依日期分組
  const groups = {}
  for (const slot of slots) {
    const day = new Date(slot.start_time).toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Asia/Taipei',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(slot)
  }

  function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
    })
  }

  function fullDateLabel(iso) {
    return new Date(iso).toLocaleString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
    })
  }

  function remainingOf(slot) {
    return slot.capacity - slot.booked_count
  }

  const price = activity?.price ?? 0
  const adultMin = activity?.adult_min_charge ?? 0
  const amount = Number(kids) * price

  async function submitBooking(e) {
    e.preventDefault()
    if (!selected) return

    const remaining = remainingOf(selected)
    if (Number(kids) > remaining) {
      setMessage(`小孩人數超過剩餘名額（尚剩 ${remaining} 位）`)
      return
    }

    setBusy(true)
    setMessage('')

    const { error } = await supabase.from('bookings').insert({
      slot_id: selected.id,
      teacher_id: selected.teacher_id,
      customer_name: name,
      customer_phone: phone,
      adults_count: Number(adults),
      kids_count: Number(kids),
      customer_age: age,
      note: note,
      amount: amount,
    })

    if (error) {
      setMessage('預約失敗：' + error.message)
      setBusy(false)
      loadData() // 重新整理名額（可能剛好被別人約走）
    } else {
      setDone(true)
    }
  }

  if (loading) return <div className="page">載入中…</div>
  if (!activity)
    return (
      <div className="page">
        找不到這個活動。<Link to="/">回首頁</Link>
      </div>
    )

  if (done) {
    return (
      <div className="page narrow">
        <div className="card">
          <h1>預約成功 🎉</h1>
          <p>
            已為你送出 <strong>{activity.name}</strong> 的預約：
          </p>
          <p>
            <strong>{fullDateLabel(selected.start_time)}</strong>
            <br />
            大人 {adults} 位、小孩 {kids} 位
            <br />
            課程費用：NT${amount}
          </p>
          <p className="muted">老師會收到通知並與你聯繫。</p>
          <Link to="/" className="back-link">
            ← 回首頁
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← 回活動列表
      </Link>

      <div className="activity-hero">
        {activity.image_url && (
          <img className="activity-hero-img" src={activity.image_url} alt={activity.name} />
        )}
        <div>
          <h1>{activity.name}</h1>
          {activity.description && <p className="muted">{activity.description}</p>}
          <p className="activity-hero-price">
            小孩 NT${price} / 位
            <span className="muted"> · 每位大人低消 NT${adultMin}</span>
          </p>
        </div>
      </div>

      <h2>選擇時段</h2>
      {slots.length === 0 ? (
        <p className="muted">這個活動目前沒有可預約的時段，請稍後再來。</p>
      ) : (
        Object.entries(groups).map(([day, daySlots]) => (
          <div key={day} className="day-group">
            <div className="day-label">{day}</div>
            <div className="slot-chips">
              {daySlots.map((slot) => {
                const remaining = remainingOf(slot)
                const full = remaining <= 0
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={full}
                    className={`slot-chip ${full ? 'booked' : ''} ${
                      selected?.id === slot.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelected(slot)}
                  >
                    {timeLabel(slot.start_time)}－{timeLabel(slot.end_time)}
                    {full ? ' · 已約滿' : ` · 剩 ${remaining} 位`}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}

      {selected && (
        <>
          <h2>填寫預約資料</h2>
          <form onSubmit={submitBooking} className="card form">
            <p className="muted">
              已選時段：{fullDateLabel(selected.start_time)}（尚剩 {remainingOf(selected)} 位小孩名額）
            </p>
            <label>
              姓名
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              電話
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </label>
            <label>
              入店大人人數
              <input
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                required
              />
            </label>
            <label>
              參加課程小孩人數
              <select value={kids} onChange={(e) => setKids(e.target.value)} required>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              小孩年齡
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例如 5歲、3-5歲"
              />
            </label>
            <label>
              備註
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="有任何需求可在此說明（可留空）"
              />
            </label>

            <div className="amount-box">
              <div>
                課程費用：小孩 {kids} 位 × NT${price} =
                <strong> NT${amount}</strong>
              </div>
              <div className="muted">＊每位大人低消 NT${adultMin}（現場消費）</div>
            </div>

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
