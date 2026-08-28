import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEFAULT_ACTIVITY_IMAGE } from '../lib/constants'

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

  // 圖片上傳中的狀態（new = 新增表單、edit = 修改表單）
  const [uploading, setUploading] = useState('')

  // 浮動提示（取代瀏覽器 alert）
  const [toast, setToast] = useState(null) // { text, type }
  function showToast(text, type = 'info') {
    setToast({ text, type })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 2800)
  }

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

  // 上傳圖片到 Supabase Storage，成功後把公開網址寫回表單的 image_url
  // which = 'new'（新增表單）或 'edit'（修改表單）
  async function uploadImage(which, file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('請選擇圖片檔', 'error')
      return
    }
    // 檔案大小上限 5MB，避免手機拍的大圖太肥
    if (file.size > 5 * 1024 * 1024) {
      showToast('圖片太大了，請選 5MB 以下的圖片', 'error')
      return
    }

    setUploading(which)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('activity-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr) {
      const hint =
        upErr.message === 'Bucket not found'
          ? '找不到圖片儲存空間，請先在 Supabase 建立名為 activity-images 的 bucket。'
          : upErr.message
      showToast('圖片上傳失敗：' + hint, 'error')
      setUploading('')
      return
    }

    const { data } = supabase.storage.from('activity-images').getPublicUrl(path)
    const publicUrl = data.publicUrl

    const setter = which === 'edit' ? setEditForm : setForm
    setter((prev) => ({ ...prev, image_url: publicUrl }))
    setUploading('')
    showToast('圖片上傳成功！記得按「儲存」才會套用。', 'success')
  }

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
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
      <div className="page-head">
        <h1>活動管理</h1>
        <div className="slot-actions">
          <Link to="/admin/teachers" className="button-link">老師管理</Link>
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
        <div className="image-field">
          <span className="image-field-label">活動圖片</span>
          <div className="image-uploader">
            <img
              className={`image-preview ${form.image_url ? '' : 'is-logo'}`}
              src={form.image_url || DEFAULT_ACTIVITY_IMAGE}
              alt="活動圖片預覽"
            />
            <div className="image-uploader-actions">
              <label className="button-link file-button">
                {uploading === 'new' ? '上傳中…' : '選擇圖片上傳'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploading === 'new'}
                  onChange={(e) => uploadImage('new', e.target.files?.[0])}
                />
              </label>
              {form.image_url && (
                <button
                  type="button"
                  className="secondary sm"
                  onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                >
                  移除圖片
                </button>
              )}
              <span className="muted image-hint">可從手機或電腦上傳，留空會用預設 Logo。</span>
            </div>
          </div>
        </div>
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
                  <div className="image-field" style={{ flex: '1 1 100%' }}>
                    <span className="image-field-label">活動圖片</span>
                    <div className="image-uploader">
                      <img
                        className={`image-preview ${editForm.image_url ? '' : 'is-logo'}`}
                        src={editForm.image_url || DEFAULT_ACTIVITY_IMAGE}
                        alt="活動圖片預覽"
                      />
                      <div className="image-uploader-actions">
                        <label className="button-link file-button">
                          {uploading === 'edit' ? '上傳中…' : '選擇圖片上傳'}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploading === 'edit'}
                            onChange={(e) => uploadImage('edit', e.target.files?.[0])}
                          />
                        </label>
                        {editForm.image_url && (
                          <button
                            type="button"
                            className="secondary sm"
                            onClick={() => setEditForm((p) => ({ ...p, image_url: '' }))}
                          >
                            移除圖片
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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
                  <img
                    className={`activity-thumb ${a.image_url ? '' : 'is-logo'}`}
                    src={a.image_url || DEFAULT_ACTIVITY_IMAGE}
                    alt={a.name}
                  />
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
