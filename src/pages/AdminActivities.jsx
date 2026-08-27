import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EMPTY = {
  name: '',
  price: 0,
  adult_min_charge: 150,
  description: '',
  image_url: '',
  is_active: true,
}

export default function AdminActivities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // 新增用
  const [form, setForm] = useState(EMPTY)

  // 修改中的活動
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) setMessage('讀取活動失敗：' + error.message)
    else setActivities(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function upd(setter) {
    return (key) => (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setter((prev) => ({ ...prev, [key]: value }))
    }
  }
  const setNew = upd(setForm)
  const setEdit = upd(setEditForm)

  async function addActivity(e) {
    e.preventDefault()
    setMessage('')
    if (!form.name.trim()) {
      setMessage('請輸入活動名稱')
      return
    }
    const { error } = await supabase.from('activities').insert({
      name: form.name.trim(),
      price: Number(form.price),
      adult_min_charge: Number(form.adult_min_charge),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      sort_order: activities.length + 1,
    })
    if (error) setMessage('新增失敗：' + error.message)
    else {
      setForm(EMPTY)
      load()
    }
  }

  function startEdit(a) {
    setMessage('')
    setEditingId(a.id)
    setEditForm({
      name: a.name,
      price: a.price,
      adult_min_charge: a.adult_min_charge,
      description: a.description || '',
      image_url: a.image_url || '',
      is_active: a.is_active,
    })
  }

  async function saveEdit(id) {
    setMessage('')
    if (!editForm.name.trim()) {
      setMessage('請輸入活動名稱')
      return
    }
    const { error } = await supabase
      .from('activities')
      .update({
        name: editForm.name.trim(),
        price: Number(editForm.price),
        adult_min_charge: Number(editForm.adult_min_charge),
        description: editForm.description.trim(),
        image_url: editForm.image_url.trim() || null,
        is_active: editForm.is_active,
      })
      .eq('id', id)
    if (error) setMessage('修改失敗：' + error.message)
    else {
      setEditingId(null)
      load()
    }
  }

  async function removeActivity(id) {
    if (!confirm('確定要刪除這個活動嗎？')) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) setMessage('刪除失敗：' + error.message)
    else load()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>活動管理</h1>
        <div className="slot-actions">
          <Link to="/" className="button-link">首頁</Link>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>登出</button>
        </div>
      </div>
      <p className="muted">管理人專用：新增／編輯活動與價格。</p>

      <form onSubmit={addActivity} className="card form">
        <h2 style={{ margin: 0 }}>新增活動</h2>
        <label>
          活動名稱
          <input value={form.name} onChange={setNew('name')} required />
        </label>
        <div className="time-pair">
          <label>
            小孩單價（每位）
            <input type="number" min={0} value={form.price} onChange={setNew('price')} required />
          </label>
          <label>
            大人低消
            <input
              type="number"
              min={0}
              value={form.adult_min_charge}
              onChange={setNew('adult_min_charge')}
              required
            />
          </label>
        </div>
        <label>
          活動簡介
          <textarea rows={2} value={form.description} onChange={setNew('description')} />
        </label>
        <label>
          圖片網址
          <input
            value={form.image_url}
            onChange={setNew('image_url')}
            placeholder="https://…（可留空）"
          />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.is_active} onChange={setNew('is_active')} />
          上架（客人看得到）
        </label>
        <button type="submit">新增活動</button>
      </form>

      {message && <p className="message">{message}</p>}

      <h2>目前活動</h2>
      {loading ? (
        <p>載入中…</p>
      ) : activities.length === 0 ? (
        <p className="muted">還沒有活動，用上面的表單新增。</p>
      ) : (
        <ul className="slot-list">
          {activities.map((a) =>
            editingId === a.id ? (
              <li key={a.id} className="slot-item editing">
                <div className="slot-edit">
                  <label>
                    活動名稱
                    <input value={editForm.name} onChange={setEdit('name')} />
                  </label>
                  <label>
                    小孩單價
                    <input type="number" min={0} value={editForm.price} onChange={setEdit('price')} />
                  </label>
                  <label>
                    大人低消
                    <input
                      type="number"
                      min={0}
                      value={editForm.adult_min_charge}
                      onChange={setEdit('adult_min_charge')}
                    />
                  </label>
                  <label style={{ flex: '1 1 100%' }}>
                    活動簡介
                    <textarea rows={2} value={editForm.description} onChange={setEdit('description')} />
                  </label>
                  <label style={{ flex: '1 1 100%' }}>
                    圖片網址
                    <input value={editForm.image_url} onChange={setEdit('image_url')} />
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={editForm.is_active} onChange={setEdit('is_active')} />
                    上架
                  </label>
                </div>
                <div className="slot-actions">
                  <button className="sm" onClick={() => saveEdit(a.id)}>儲存</button>
                  <button className="secondary sm" onClick={() => setEditingId(null)}>取消</button>
                </div>
              </li>
            ) : (
              <li key={a.id} className="slot-item">
                <div className="activity-row">
                  {a.image_url && <img className="activity-thumb" src={a.image_url} alt={a.name} />}
                  <div>
                    <strong>{a.name}</strong>
                    {!a.is_active && <span className="badge"> 未上架</span>}
                    <div className="muted">
                      小孩 NT${a.price} / 位 · 大人低消 NT${a.adult_min_charge}
                    </div>
                    {a.description && <div className="muted">{a.description}</div>}
                  </div>
                </div>
                <span className="slot-actions">
                  <button className="secondary sm" onClick={() => startEdit(a)}>修改</button>
                  <button className="danger" onClick={() => removeActivity(a.id)}>刪除</button>
                </span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}
