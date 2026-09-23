export interface SeatItemProps {
  label: string
  active?: boolean
  unavailable?: boolean
  onClick?: () => void
}

export function SeatItem({
  label,
  active,
  unavailable,
  onClick,
}: SeatItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      className={`seat ${active ? 'selected' : ''} ${unavailable ? 'taken' : ''}`}
    >
      <span>⌂</span>
      <small>{label}</small>
    </button>
  )
}
