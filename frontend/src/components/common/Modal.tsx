/**
 * @file Modal.tsx
 * @description Thành phần Hộp thoại Nổi Đa dụng (Accessible Modal Dialog Component).
 *
 * TÍNH NĂNG TIÊU BIỂU:
 * 1. Quản lý Ngăn xếp Modal (Stack-based Escape Key Handling):
 *    - Quản lý danh sách các modal đang mở bằng mảng `openModals: symbol[]`.
 *    - Khi người dùng nhấn phím `Escape`, chỉ đóng modal nằm trên cùng của ngăn xếp.
 * 2. Khóa cuộn trang nền (Scroll Lock):
 *    - Tự động đặt `document.body.style.overflow = 'hidden'` khi mở và phục hồi khi đóng.
 * 3. Hỗ trợ biểu mẫu linh hoạt (Form Support):
 *    - Nếu có prop `onSubmit`, thẻ bọc sẽ tự động chuyển thành `<form>` để các nút `type="submit"` ở footer
 *      có thể submit biểu mẫu một cách tự nhiên.
 * 4. Đóng khi click ngoài (Click Outside Overlay to Close):
 *    - Bắt sự kiện `onMouseDown` trên lớp phủ nền `dlg-overlay`.
 */

import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

export interface ModalProps {
  /** Tiêu đề hộp thoại */
  title: ReactNode
  /** Callback đóng hộp thoại */
  onClose: () => void
  /** Nội dung thân hộp thoại */
  children: ReactNode
  /** Hàng nút ở chân cửa sổ (Footer) */
  footer?: ReactNode
  /** Truyền vào thì cửa sổ là <form>; nút type="submit" ở footer sẽ gửi form */
  onSubmit?: (e: FormEvent) => void
  /** Độ rộng tối đa (px), mặc định 448px */
  maxWidth?: number
}

// Ngăn xếp các cửa sổ đang mở: Esc chỉ đóng cửa sổ trên cùng
const openModals: symbol[] = []

export function Modal({ title, onClose, children, footer, onSubmit, maxWidth = 448 }: ModalProps) {
  // onClose thường là hàm tạo mới mỗi lần render: giữ qua ref để không đăng ký lại (làm đảo thứ tự ngăn xếp)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Esc để đóng (chỉ cửa sổ trên cùng), khóa cuộn trang nền khi cửa sổ đang mở
  useEffect(() => {
    const id = Symbol('modal')
    openModals.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      openModals.splice(openModals.indexOf(id), 1)
      document.body.style.overflow = prev
    }
  }, [])

  const Tag = onSubmit ? 'form' : 'div'

  return (
    <div className="dlg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag className="dlg" role="dialog" aria-modal="true" style={{ maxWidth }} onSubmit={onSubmit}>
        <div className="dlg-head">
          <h3>{title}</h3>
          <button type="button" className="dlg-close" aria-label="Đóng" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="dlg-body">{children}</div>
        {footer && <div className="dlg-foot">{footer}</div>}
      </Tag>
    </div>
  )
}
