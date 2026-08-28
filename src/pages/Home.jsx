import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setActivities(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <>
      <section className="hero">
        <h1>hi-kidsroom 課程預約</h1>
        <p>挑一個喜歡的活動，選個方便的時段，線上預約超簡單！</p>
      </section>

      <div className="page">
        <h2>探索活動</h2>

        {loading ? (
          <p className="muted">載入中…</p>
        ) : activities.length === 0 ? (
          <p className="muted">目前還沒有開放的活動，請稍後再來看看。</p>
        ) : (
          <div className="activity-grid">
            {activities.map((a) => (
              <Link key={a.id} to={`/activity/${a.id}`} className="activity-card">
                <div
                  className="activity-card-img"
                  style={
                    a.image_url ? { backgroundImage: `url(${a.image_url})` } : undefined
                  }
                >
                  {!a.image_url && <span className="activity-card-emoji">🎨</span>}
                </div>
                <div className="activity-card-body">
                  <div className="activity-card-name">{a.name}</div>
                  {a.description && <p className="activity-card-desc">{a.description}</p>}
                  <div className="activity-card-foot">
                    <span className="activity-card-price">
                      NT${a.price}
                      <span className="unit"> / 位</span>
                    </span>
                    <span className="cta">立即預約 →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
