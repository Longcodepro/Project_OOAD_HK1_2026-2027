import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  database?: string
}

export default function App() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data: HealthResponse) => {
        setHealthData(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 mb-4 font-bold text-xl">
          🚌
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          VéXe Việt — Khởi tạo mới
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Khung ứng dụng sạch sẵn sàng cho quy trình phát triển và kiểm chứng từng endpoint.
        </p>

        <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-left">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Kiểm tra kết nối Backend (/api/health)
          </h2>
          {loading && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Đang kết nối backend...
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">
              ❌ Chưa kết nối được backend ({error}). Hãy đảm bảo server backend đang chạy tại cổng 8000/8005.
            </p>
          )}
          {healthData && (
            <div className="space-y-1 text-sm text-emerald-700">
              <p className="flex items-center gap-2 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Backend: {healthData.status.toUpperCase()}
              </p>
              <p className="text-xs text-slate-600">
                Database: <span className="font-mono text-slate-800">{healthData.database}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
