// 活動沒有上傳圖片時，預設顯示的圖片（Hi Kids Room 標誌）
// 請把 Logo 圖片存成 public/logo.png，全站就會自動使用這張圖。
export const DEFAULT_ACTIVITY_IMAGE = '/logo.png'

// 圖片顯示用：有就用上傳的，沒有就用預設 logo
export function activityImageOf(url) {
  return url || DEFAULT_ACTIVITY_IMAGE
}
