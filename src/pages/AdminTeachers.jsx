import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminTeachers() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null) // { text, type }

  function showToast(text, type = 'info') {
    setToast({ text, type })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_admin, is_teacher')
      .order('created_at', { ascending: true })
    if (error) showToast('讀取帳號失敗：' + error.message, 'error')
    else setPeople(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function setTeacher(id, next) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_teacher: next })
      .eq('id', id)
    if (error) {
      showToast('更新失敗：' + error.message, 'error')
    } else {
      showToast(next ? '已開通這位老師' : '已取消這位老師的權限', 'success')
      load()
    }
  }

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
      <div className="page-head">
        <h1>老師管理</h1>
        <div className="slot-actions">
          <Link to="/admin" className="button-link">活動管理</Link>
          <Link to="/" className="button-link">首頁</Link>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>登出</button>
        </div>
      </div>
      <p className="muted">核准註冊的老師。只有「已核准」的老師才能進入老師專區、建立時段。</p>

      {loading ? (
        <p>載入中…</p>
      ) : people.length === 0 ? (
        <p className="muted">目前沒有任何帳號。</p>
      ) : (
        <ul className="slot-list">
          {people.map((p) => (
            <li key={p.id} className="slot-item">
              <div className="slot-info">
                <strong className="slot-activity">{p.full_name || '（未填姓名）'}</strong>
                <span className="muted">{p.email || '（無 email）'}</span>
                {p.phone && <span className="muted">電話：{p.phone}</span>}
              </div>
              <span className="slot-actions">
                {p.is_admin ? (
                  <span className="badge booked">管理人</span>
                ) : p.is_teacher ? (
                  <>
                    <span className="badge booked">已核准</span>
                    <button className="secondary sm" onClick={() => setTeacher(p.id, false)}>
                      取消核准
                    </button>
                  </>
                ) : (
                  <>
                    <span className="badge">待核准</span>
                    <button className="sm" onClick={() => setTeacher(p.id, true)}>
                      核准為老師
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
