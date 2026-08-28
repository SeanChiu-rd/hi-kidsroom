import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TeacherLogin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' 或 'signup'
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // 已登入就直接進老師專區（未核准者會在該頁看到審核中提示）
  if (user) {
    navigate('/teacher', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      })
      if (error) {
        setMessage('註冊失敗：' + error.message)
      } else {
        // 註冊後先登出，讓使用者停在登入頁看到提示（帳號需管理人核准）
        await supabase.auth.signOut()
        setMessage('註冊成功！帳號需管理人開通後才能使用，開通後再用此帳密登入。')
        setMode('login')
        setFullName('')
        setPhone('')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage('登入失敗：' + error.message)
      } else {
        navigate('/teacher', { replace: true })
      }
    }
    setBusy(false)
  }

  return (
    <div className="page narrow">
      <h1>老師{mode === 'login' ? '登入' : '註冊'}</h1>
      {mode === 'signup' && (
        <p className="muted">註冊後需由管理人開通，才能使用老師專區。</p>
      )}

      <form onSubmit={handleSubmit} className="card form">
        {mode === 'signup' && (
          <>
            <label>
              姓名
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label>
              電話
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
          </>
        )}

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
          {busy ? '處理中…' : mode === 'login' ? '登入' : '註冊'}
        </button>
      </form>

      {message && <p className="message">{message}</p>}

      <p className="switch">
        {mode === 'login' ? '還沒有帳號？' : '已經有帳號？'}{' '}
        <button
          type="button"
          className="linklike"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
        >
          {mode === 'login' ? '註冊新老師' : '改用登入'}
        </button>
      </p>
    </div>
  )
}
