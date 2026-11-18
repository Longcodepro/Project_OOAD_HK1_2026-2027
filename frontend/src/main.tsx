/**
 * @file main.tsx
 * @description Điểm khởi nhập (Entry Point) của ứng dụng React.
 *
 * CHỨC NĂNG:
 * 1. Nạp file stylesheet toàn cục (`index.css`), khởi tạo các biến màu sắc văn hóa Đông Sơn và Tailwind CSS.
 * 2. Tìm phần tử DOM container `#root`.
 * 3. Khởi tạo React Root và render component `App` trong chế độ `StrictMode` để phát hiện sớm các tác dụng phụ (side-effects).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
