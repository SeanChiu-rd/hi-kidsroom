import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, bio')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setTeachers(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <>
      <section className="hero">
        <h1>hi-kidsroom 課程預約</h1>
        <p>選擇喜歡的老師，挑一個方便的時段，線上預約超簡單！</p>
      </section>

      <div className="page">
        <h2>選擇老師</h2>

        {loading ? (
          <p className="muted">載入中…</p>
        ) : teachers.length === 0 ? (
          <p className="muted">目前還沒有老師開放時段，請稍後再來看看。</p>
        ) : (
          <div className="teacher-grid">
            {teachers.map((t) => {
              const name = t.full_name || '老師'
              return (
                <Link key={t.id} to={`/book/${t.id}`} className="teacher-card">
                  <div className="avatar">{name.charAt(0)}</div>
                  <div className="name">{name}</div>
                  <div className="bio">{t.bio || '點我看可預約時段'}</div>
                  <div className="cta">立即預約 →</div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
