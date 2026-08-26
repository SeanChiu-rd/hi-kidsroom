// ============================================================
// Edge Function：客戶預約後寄 email 通知老師
// 由 Supabase Database Webhook（bookings insert）觸發
// ============================================================
//
// 需要設定的環境變數（Secrets）：
//   RESEND_API_KEY   → Resend 的 API 金鑰（re_ 開頭）
//   FROM_EMAIL       → 寄件人（未驗證網域前用 onboarding@resend.dev）
//   SUPABASE_URL     → 專案網址（部署時 Supabase 會自動注入）
//   SUPABASE_SERVICE_ROLE_KEY → 服務金鑰（部署時自動注入）

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 台灣時區的時間字串
function formatTaipei(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  })
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    // Database Webhook 會把新資料放在 record
    const booking = payload.record
    if (!booking) {
      return new Response('no record', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 查出老師 email 與時段時間
    const [{ data: teacher }, { data: slot }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', booking.teacher_id)
        .single(),
      supabase
        .from('slots')
        .select('start_time, end_time, activity_name')
        .eq('id', booking.slot_id)
        .single(),
    ])

    if (!teacher?.email) {
      console.error('找不到老師 email，teacher_id =', booking.teacher_id)
      return new Response('teacher email not found', { status: 200 })
    }

    const timeText = slot
      ? `${formatTaipei(slot.start_time)} － ${formatTaipei(slot.end_time)}`
      : '（時段資訊查詢失敗）'

    const activityText = slot?.activity_name || '課程'

    const html = `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1f2430;">
        <h2 style="color: #6d5efc;">🎉 你有一筆新預約</h2>
        <p>Hi ${teacher.full_name || '老師'}，有客人預約了你的課程：</p>
        <table style="border-collapse: collapse; margin: 12px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">活動</td><td><strong>${activityText}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">時段</td><td><strong>${timeText}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">姓名</td><td>${booking.customer_name || ''}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">電話</td><td>${booking.customer_phone || ''}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">入店大人</td><td>${booking.adults_count ?? 0} 位</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">參加小孩</td><td>${booking.kids_count ?? 1} 位</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">小孩年齡</td><td>${booking.customer_age || '未填'}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">備註</td><td>${booking.note || '無'}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">請儘快與客戶聯繫確認。</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev',
        to: teacher.email,
        subject: `【新預約】${activityText} · ${booking.customer_name || '客人'} · ${timeText}`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend 寄信失敗：', errText)
      return new Response(errText, { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('notify-booking 發生錯誤：', err)
    return new Response(String(err), { status: 500 })
  }
})
