import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

export interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Hàng nút ở chân cửa sổ. */
  footer?: ReactNode
  /** Truyền vào thì cửa sổ là <form>; nút type="submit" ở footer sẽ gửi form. */
  onSubmit?: (e: FormEvent) => void
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
