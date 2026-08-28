import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true) // session 讀取中
  // 記錄目前 profile 是「對應到哪個 user」載入的，避免載入時序競態
  const [profileUserId, setProfileUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // 使用者登入後，讀取個人資料（含是否為管理人／已核准老師）
  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileUserId(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, is_admin, is_teacher')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setProfile(data ?? null)
        setProfileUserId(user.id) // 標記：profile 已對應到這個 user
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // ready：session 已確認，且（沒有登入者，或 profile 已對應到目前登入者）
  // 這樣路由守衛不會在 profile 還沒載入完就用 null 判斷身分
  const ready = !loading && (user ? profileUserId === user.id : true)

  const value = {
    user,
    loading,
    ready,
    profile,
    isAdmin: !!profile?.is_admin,
    // 管理人也視為可進入老師專區
    isTeacher: !!profile?.is_teacher || !!profile?.is_admin,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
