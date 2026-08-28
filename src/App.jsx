import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import ActivityBooking from './pages/ActivityBooking'
import TeacherLogin from './pages/TeacherLogin'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminActivities from './pages/AdminActivities'

// 只有登入的老師才能進入的頁面，未登入就導回登入頁
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="page">載入中…</p>
  if (!user) return <Navigate to="/teacher/login" replace />
  return children
}

// 只有管理人可進入的頁面
function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <p className="page">載入中…</p>
  if (!user) return <Navigate to="/teacher/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function App() {
  const { isAdmin } = useAuth()
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">hi-kidsroom</Link>
        <nav>
          {isAdmin && <Link to="/admin">活動管理</Link>}
          <Link to="/teacher">老師專區</Link>
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
        </Routes>
      </main>
    </>
  )
}

export default App
