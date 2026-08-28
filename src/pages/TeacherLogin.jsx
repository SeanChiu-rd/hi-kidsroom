import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TeacherLogin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // 已登入就直接進老師專區
  if (user) {
    navigate('/teacher', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('登入失敗：' + error.message)
    } else {
      navigate('/teacher', { replace: true })
    }
    setBusy(false)
  }

  return (
    <div className="page narrow">
      <h1>員工登入</h1>
      <p className="muted">此頁供老師與管理人登入使用。</p>

      <form onSubmit={handleSubmit} className="card form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? '處理中…' : '登入'}
        </button>
      </form>

      {message && <p className="message">{message}</p>}

      <p className="switch muted">
        沒有帳號嗎？老師帳號由管理人建立，請洽管理人。
      </p>
    </div>
  )
}
