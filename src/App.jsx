import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import BookingPage from './pages/BookingPage'
import TeacherLogin from './pages/TeacherLogin'
import TeacherDashboard from './pages/TeacherDashboard'

// 只有登入的老師才能進入的頁面，未登入就導回登入頁
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="page">載入中…</p>
  if (!user) return <Navigate to="/teacher/login" replace />
  return children
}

function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">hi-kidsroom</Link>
        <nav>
          <Link to="/teacher">老師專區</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book/:teacherId" element={<BookingPage />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route
            path="/teacher"
            element={
              <RequireAuth>
                <TeacherDashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default App
