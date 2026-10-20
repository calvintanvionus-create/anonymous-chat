// 像素圖示：都是小格子拼出來的 SVG，顏色跟著文字色或樣式變數走。

export function PixelHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 7 6" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      <path d="M1 0h2v1h-2z M4 0h2v1h-2z M0 1h7v2h-7z M1 3h5v1h-5z M2 4h3v1h-3z M3 5h1v1h-1z" />
    </svg>
  )
}

export function PixelSakura({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path className="sk-petal" d="M1 0h3v1h-3z M0 1h5v3h-5z M1 4h3v1h-3z" />
      <path className="sk-core" d="M2 1h1v1h-1z M1 2h3v1h-3z M2 3h1v1h-1z" />
    </svg>
  )
}

export function SmileIcon() {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M1 0h5v1h-5z M1 6h5v1h-5z M0 1h1v5h-1z M6 1h1v5h-1z M2 2h1v1h-1z M4 2h1v1h-1z M2 4h3v1h-3z" />
    </svg>
  )
}

export function PictureIcon() {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M0 0h7v1h-7z M0 6h7v1h-7z M0 1h1v5h-1z M6 1h1v5h-1z M4 2h1v1h-1z M2 4h1v1h-1z M3 3h1v2h-1z M4 4h1v1h-1z" />
    </svg>
  )
}
