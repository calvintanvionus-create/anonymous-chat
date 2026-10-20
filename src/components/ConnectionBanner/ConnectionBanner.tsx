/** 斷線時頂部的黃色提示 */
export function ConnectionBanner() {
  return (
    <div className="banner" role="status">
      <span>▲ 連線中斷，重新連線中</span>
      <span className="dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  )
}
