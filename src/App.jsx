import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import ActivityBooking from './pages/ActivityBooking'
import TeacherLogin from './pages/TeacherLogin'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminActivities from './pages/AdminActivities'
import AdminTeachers from './pages/AdminTeachers'

// 已登入但尚未被管理人核准的帳號，看到的提示畫面
function PendingNotice() {
  return (
    <div className="page narrow">
      <div className="card">
        <h1>帳號審核中</h1>
        <p className="muted">
          你的帳號已註冊成功，需要管理人開通後才能使用老師專區。開通後重新整理即可進入。
        </p>
        <div className="slot-actions" style={{ marginTop: '1rem' }}>
          <Link to="/" className="button-link">回首頁</Link>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            登出
          </button>
        </div>
      </div>
    </div>
  )
}

// 只有「已核准的老師（或管理人）」才能進入的頁面
function RequireAuth({ children }) {
  const { user, ready, isTeacher } = useAuth()
  if (!ready) return <p className="page">載入中…</p>
  if (!user) return <Navigate to="/teacher/login" replace />
  if (!isTeacher) return <PendingNotice />
  return children
}

// 只有管理人可進入的頁面
function RequireAdmin({ children }) {
  const { user, ready, isAdmin } = useAuth()
  if (!ready) return <p className="page">載入中…</p>
  if (!user) return <Navigate to="/teacher/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function App() {
  const { user, ready, isAdmin, isTeacher } = useAuth()
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <img className="brand-logo" src="/logo.png" alt="Hi Kids Room" />
          hi-kidsroom
        </Link>
        <nav>
          {ready && !user && <Link to="/teacher/login">登入</Link>}
          {ready && user && isAdmin && <Link to="/admin">活動管理</Link>}
          {ready && user && isAdmin && <Link to="/admin/teachers">老師管理</Link>}
          {ready && user && isTeacher && <Link to="/teacher">老師專區</Link>}
          {/* 已登入但尚未核准 */}
          {ready && user && !isTeacher && <Link to="/teacher">帳號審核中</Link>}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/activity/:activityId" element={<ActivityBooking />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route
            path="/teacher"
            element={
              <RequireAuth>
                <TeacherDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminActivities />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <RequireAdmin>
                <AdminTeachers />
              </RequireAdmin>
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default App
