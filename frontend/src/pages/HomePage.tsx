/**
 * @file HomePage.tsx
 * @description Trang chủ Cổng Khách hàng (Customer Portal Home).
 *
 * CHỨC NĂNG CHÍNH:
 * 1. Tải danh sách tuyến đường đang mở bán (`routesApi.offers()`):
 *    - Lấy thông tin điểm đi, điểm đến, thời lượng di chuyển và giá vé sàn thấp nhất.
 * 2. Biểu mẫu Tìm kiếm Chuyến xe (Search Form):
 *    - Lọc động danh sách Điểm đi (`origins`) và Điểm đến (`destinations` tương ứng theo điểm đi).
 *    - Nút hoán đổi điểm đi - điểm đến (`handleSwap`) có kiểm tra điều kiện logic (`canSwap`):
 *      chỉ cho phép đổi nếu hệ thống thực sự có chuyến chạy theo chiều ngược lại.
 *    - Bộ chọn ngày đi (`DatePicker`) chặn chọn ngày trong quá khứ (`min={today}`).
 * 3. Thẻ tuyến tiêu biểu (Featured Route Card):
 *    - Tự động lấy tuyến có nhiều chuyến sắp chạy nhất làm điểm nhấn trực quan.
 * 4. Danh sách các tuyến nổi bật & Các nút gợi ý nhanh:
 *    - Nhấp một chạm để điền ngay thông tin và tìm kiếm chuyến xe.
 * 5. Tích hợp bản sắc văn hóa Đông Sơn:
 *    - Họa tiết chim Lạc bay, dải hoa văn sông nước non sông (`FlockOfCranes`).
 */

import { useEffect, useMemo, useState } from 'react'
import type { View, User, RouteOffer } from '../types'
import { routesApi, apiErrorMessage, formatDuration, formatVnd } from '../services/api'
import { Header } from '../components/layout/Header'
import { FlockOfCranes } from '../components/dongson/FlockOfCranes'
import { CRANE, renderFigureSvg } from '../components/dongson/dongsonData'
import { PlacePicker, DatePicker, toYmd } from '../components/common/PickerFields'

export interface HomePageProps {
  /** Hàm điều hướng giữa các màn hình */
  setView: (v: View) => void
  /** Thông tin người dùng đăng nhập hiện tại */
  user: User | null
  /** Trạng thái online của máy chủ backend */
  backendOnline: boolean
  /** Callback kích hoạt tìm kiếm chuyến (từ, đến, ngày) */
  onSearch: (from: string, to: string, date: string) => void
  /** Callback đăng xuất tài khoản */
  onLogout?: () => void
}

/** Loại bỏ các giá trị trùng lặp trong mảng chuỗi */
const unique = (xs: string[]) => [...new Set(xs)]

export function HomePage({ setView, user, backendOnline, onSearch, onLogout }: HomePageProps) {
  /** Danh sách các tuyến đang mở bán tải về từ backend (`GET /routes`) */
  const [offers, setOffers] = useState<RouteOffer[] | null>(null)
  /** Thông báo lỗi nếu việc tải danh sách tuyến thất bại */
  const [offersError, setOffersError] = useState('')
  /** Điểm xuất phát được chọn */
  const [fromCity, setFromCity] = useState('')
  /** Điểm đến được chọn */
  const [toCity, setToCity] = useState('')
  /** Ngày khởi hành (mặc định là ngày hôm nay theo giờ địa phương YYYY-MM-DD) */
  const [departureDate, setDepartureDate] = useState(() => toYmd(new Date()))
  /** Thông báo lỗi xác thực form tìm kiếm */
  const [searchError, setSearchError] = useState('')

  /**
   * Gọi API nạp danh sách tuyến xe đang mở bán.
   * Tự động gán giá trị mặc định cho Điểm đi và Điểm đến từ tuyến đầu tiên tìm thấy.
   */
  const loadOffers = () => {
    setOffersError('')
    setOffers(null)
    routesApi
      .offers()
      .then((list) => {
        setOffers(list)
        if (list[0]) {
          setFromCity(list[0].origin)
          setToCity(list[0].destination)
        }
      })
      .catch((err) => setOffersError(apiErrorMessage(err)))
  }

  // Nạp danh sách tuyến khi HomePage mount
  useEffect(() => {
    loadOffers()
  }, [])

  /** Danh sách các tỉnh/thành phố xuất phát duy nhất */
  const origins = useMemo(() => unique((offers ?? []).map((o) => o.origin)), [offers])

  /**
   * Danh sách các tỉnh/thành phố đích đến tương ứng với điểm xuất phát đã chọn.
   * Ngăn chặn người dùng chọn tuyến xe không có thực trong hệ thống và loại bỏ điểm đến trùng điểm đi.
   */
  const destinations = useMemo(
    () =>
      unique(
        (offers ?? [])
          .filter((o) => o.origin === fromCity && o.destination !== fromCity)
          .map((o) => o.destination),
      ),
    [offers, fromCity],
  )

  /** Kiểm tra xem có tồn tại chuyến xe theo chiều ngược lại (toCity -> fromCity) hay không */
  const canSwap = Boolean(
    fromCity &&
      toCity &&
      fromCity !== toCity &&
      (offers ?? []).some((o) => o.origin === toCity && o.destination === fromCity),
  )

  /**
   * Xử lý khi thay đổi Điểm đi:
   * Nếu điểm đến hiện tại trùng điểm đi mới hoặc không còn nằm trong danh sách điểm đến,
   * tự động gán điểm đến đầu tiên khả dụng.
   */
  const changeFrom = (city: string) => {
    setFromCity(city)
    setSearchError('')
    const availableDests = unique(
      (offers ?? []).filter((o) => o.origin === city && o.destination !== city).map((o) => o.destination),
    )
    if (toCity === city || !availableDests.includes(toCity)) {
      setToCity(availableDests[0] || '')
    }
  }

  const changeTo = (city: string) => {
    setToCity(city)
    setSearchError('')
  }

  const changeDate = (date: string) => {
    setDepartureDate(date)
    setSearchError('')
  }

  /** Hoán đổi vị trí Điểm đi và Điểm đến nếu tuyến ngược lại hợp lệ */
  const handleSwap = () => {
    if (!canSwap) return
    setSearchError('')
    const nextFrom = toCity
    const nextTo = fromCity
    setFromCity(nextFrom)
    setToCity(nextTo)
  }

  const today = toYmd(new Date())

  /** Xử lý gửi biểu mẫu tìm kiếm chuyến xe có kiểm tra ràng buộc chặt chẽ */
  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchError('')
    const trimmedFrom = fromCity.trim()
    const trimmedTo = toCity.trim()

    if (!trimmedFrom) {
      setSearchError('Vui lòng chọn Điểm khởi hành (Điểm đi).')
      return
    }
    if (!trimmedTo) {
      setSearchError('Vui lòng chọn Điểm đến.')
      return
    }
    if (trimmedFrom.toLowerCase() === trimmedTo.toLowerCase()) {
      setSearchError('Điểm đi và Điểm đến không được trùng nhau. Vui lòng chọn lộ trình hợp lệ.')
      return
    }
    if (departureDate < today) {
      setSearchError('Ngày khởi hành không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
      return
    }

    onSearch(trimmedFrom, trimmedTo, departureDate)
  }

  /** Bấm tuyến xe phổ biến: Tự động điền Điểm đi, Điểm đến và tìm kiếm */
  const handleQuickSearch = (origin: string, destination: string) => {
    setSearchError('')
    setFromCity(origin)
    setToCity(destination)
    const validDate = departureDate < today ? today : departureDate
    setDepartureDate(validDate)
    onSearch(origin, destination, validDate)
  }

  /** Tuyến tiêu biểu có nhiều chuyến nhất dùng làm điểm nhấn ở Hero */
  const featured = offers?.[0]
  const craneSvg = renderFigureSvg(CRANE)

  return (
    <>
      <Header setView={setView} user={user} backendOnline={backendOnline} onLogout={onLogout} />

      <main className="relative z-10 max-w-[1080px] mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-10">
        {/* SECTION HERO: Tiêu đề và Khung tìm kiếm chuyến */}
        <section className="relative w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
            <div className="lg:col-span-7 flex flex-col justify-center z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-3 h-0.5 bg-terracotta"></span>
                <span className="font-bold text-xs tracking-[0.2em] uppercase text-terracotta">
                  {offers && offers.length > 0 ? `${offers.length} TUYẾN ĐANG MỞ BÁN` : 'ĐẶT VÉ XE KHÁCH LIÊN TỈNH'}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.08] mb-5">
                Đi khắp dải đất bằng <span className="text-terracotta">một tấm vé.</span>
              </h1>

              <p className="text-base text-ink-soft leading-relaxed max-w-[54ch] mb-6">
                Chọn tuyến, xem sơ đồ ghế theo thời gian thực và đặt đúng chỗ bạn muốn. Vé và lịch sử chuyến đi luôn nằm trong tài khoản của bạn.
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-ink-soft">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-bronze text-base">airline_seat_recline_extra</span>
                  <span>Sơ đồ ghế cập nhật trực tiếp</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-terracotta text-base">timer</span>
                  <span>Giữ chỗ tạm thời khi đặt vé</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-celadon text-base">currency_exchange</span>
                  <span>Hủy vé trực tuyến, hoàn tiền theo chính sách</span>
                </div>
              </div>
            </div>

            {/* Thẻ tuyến tiêu biểu: hiển thị dữ liệu thật của tuyến có nhiều chuyến sắp chạy nhất */}
            {featured && (
              <div className="lg:col-span-5 flex items-center justify-center">
                <div className="relative w-full max-w-[360px] bg-paper-deep/90 backdrop-blur-xs p-5 border border-dashed border-hairline rounded overflow-hidden">
                  <svg
                    aria-hidden="true"
                    className="absolute -right-5 -bottom-4 w-32 h-auto text-bronze opacity-25 pointer-events-none"
                    viewBox="0 0 200 84"
                    dangerouslySetInnerHTML={{ __html: craneSvg }}
                  />
                  <div className="border-b border-dashed border-hairline pb-3 mb-3">
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Tuyến nhiều chuyến nhất</span>
                  </div>
                  <div className="space-y-2 relative z-10">
                    <span className="font-extrabold text-lg text-ink block">
                      {featured.origin} → {featured.destination}
                    </span>
                    <p className="text-xs text-ink-soft">
                      {featured.upcomingTrips} chuyến sắp chạy
                      {featured.expectedMinutes ? ` · khoảng ${formatDuration(featured.expectedMinutes)}` : ''}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-hairline">
                      <span className="text-xs text-ink-soft">Giá chỉ từ:</span>
                      <span className="font-extrabold text-lg text-terracotta">{formatVnd(featured.fromPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KHUNG TÌM CHUYẾN XE (Search Box) */}
          <div className="mt-8 relative z-20">
            <div className="bg-[#FFFDF9] border border-hairline rounded p-5 md:p-6 shadow-xs">
              {offersError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm" role="alert">
                  <span className="text-terracotta font-medium">Không tải được danh sách tuyến: {offersError}</span>
                  <button type="button" onClick={loadOffers} className="btn btn-ghost">
                    Thử lại
                  </button>
                </div>
              ) : offers === null ? (
                <p className="text-sm text-ink-soft">Đang tải các tuyến đang mở bán…</p>
              ) : offers.length === 0 ? (
                <p className="text-sm text-ink-soft">Hiện chưa có chuyến nào đang mở bán. Vui lòng quay lại sau.</p>
              ) : (
                <>
                  <form onSubmit={handleSubmitSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Ô chọn Điểm đi */}
                    <div className="md:col-span-3 flex flex-col gap-1.5 relative">
                      <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-terracotta">trip_origin</span>
                        Điểm đi
                      </span>
                      <PlacePicker label="Điểm đi" value={fromCity} onChange={changeFrom} options={origins} />
                    </div>

                    {/* Nút Đổi chiều đi - đến */}
                    <div className="md:col-span-1 flex items-center justify-center pb-1">
                      <button
                        type="button"
                        onClick={handleSwap}
                        disabled={!canSwap}
                        className="w-9 h-9 rounded-full border border-hairline hover:border-bronze flex items-center justify-center text-ink-soft hover:text-ink transition cursor-pointer"
                        title={canSwap ? 'Đổi điểm đi - điểm đến' : 'Chưa có chuyến chiều ngược lại'}
                        aria-label="Đổi điểm đi và điểm đến"
                      >
                        <span className="material-symbols-outlined text-base">sync_alt</span>
                      </button>
                    </div>

                    {/* Ô chọn Điểm đến */}
                    <div className="md:col-span-3 flex flex-col gap-1.5 relative">
                      <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-celadon">location_on</span>
                        Điểm đến
                      </span>
                      <PlacePicker label="Điểm đến" value={toCity} onChange={changeTo} options={destinations} />
                    </div>

                    {/* Ô chọn Ngày khởi hành */}
                    <div className="md:col-span-3 flex flex-col gap-1.5 relative">
                      <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-bronze">calendar_today</span>
                        Ngày khởi hành
                      </span>
                      <DatePicker label="Ngày khởi hành" value={departureDate} onChange={changeDate} min={today} />
                    </div>

                    {/* Nút Tìm chuyến */}
                    <div className="md:col-span-2 flex flex-col justify-end">
                      <button
                        type="submit"
                        className="cta-terracotta w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">search</span>
                        <span>Tìm chuyến xe</span>
                      </button>
                    </div>
                  </form>

                  {/* Cảnh báo lỗi kiểm tra ràng buộc tìm kiếm */}
                  {searchError && (
                    <div className="mt-3 p-3 rounded bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs font-semibold flex items-center gap-2 animate-fade-in" role="alert">
                      <span className="material-symbols-outlined text-base">error</span>
                      <span>{searchError}</span>
                    </div>
                  )}

                  {/* Danh sách các tuyến gợi ý chọn nhanh */}
                  <div className="mt-4 pt-3.5 border-t border-hairline flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink-soft font-medium">Tuyến gợi ý:</span>
                    {offers.slice(0, 4).map((o) => (
                      <button
                        key={`${o.origin}-${o.destination}`}
                        type="button"
                        onClick={() => handleQuickSearch(o.origin, o.destination)}
                        className="px-2.5 py-1 text-xs rounded border border-hairline bg-paper hover:border-terracotta hover:text-terracotta transition cursor-pointer"
                        title={`Bấm để tìm ngay chuyến ${o.origin} → ${o.destination}`}
                      >
                        {o.origin} → {o.destination}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Họa tiết Đàn chim Lạc Đông Sơn và Danh sách các tuyến đang mở bán */}
        {offers && offers.length > 0 && (
          <>
            <FlockOfCranes
              title="HÀNH TRÌNH PHƯƠNG NAM & BẮC"
              subtitle="Đàn chim Lạc dẫn lối ngàn dặm non sông"
              badge={`${offers.length} TUYẾN`}
            />

            {/* CÁC TUYẾN ĐANG MỞ BÁN */}
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <span className="eyebrow">Tuyến đang mở bán</span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mt-1">Các tuyến nổi bật</h2>
                </div>
                <p className="hidden md:block text-xs text-ink-soft">Giá thấp nhất trong các chuyến sắp chạy</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {offers.slice(0, 8).map((o) => (
                  <button
                    key={`${o.origin}-${o.destination}`}
                    type="button"
                    onClick={() => handleQuickSearch(o.origin, o.destination)}
                    className="text-left bg-[#FFFDF9] border border-hairline p-4 rounded hover:border-terracotta transition cursor-pointer flex flex-col justify-between group"
                    title={`Bấm để tìm ngay chuyến ${o.origin} → ${o.destination}`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-ink-soft mb-2">
                        <span className="font-semibold text-celadon">{o.upcomingTrips} chuyến sắp chạy</span>
                        {o.expectedMinutes ? <span>{formatDuration(o.expectedMinutes)}</span> : null}
                      </div>
                      <h3 className="font-extrabold text-base text-ink group-hover:text-terracotta transition">
                        {o.origin} → {o.destination}
                      </h3>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-hairline flex items-center justify-between">
                      <span className="text-xs text-ink-soft">Chỉ từ</span>
                      <span className="font-extrabold text-base text-terracotta">{formatVnd(o.fromPrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* 3 ĐIỀU BẠN NHẬN ĐƯỢC: Cam kết dịch vụ minh bạch */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-hairline pt-8">
          <div className="bg-paper-deep/60 border border-hairline p-5 rounded space-y-2">
            <div className="w-9 h-9 rounded bg-paper border border-hairline flex items-center justify-center text-terracotta">
              <span className="material-symbols-outlined text-xl">event_seat</span>
            </div>
            <h4 className="font-bold text-sm text-ink">Chọn đúng ghế bạn muốn</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Sơ đồ ghế hiển thị ghế trống, ghế đang được giữ và ghế đã bán theo dữ liệu thực tế của chuyến.
            </p>
          </div>

          <div className="bg-paper-deep/60 border border-hairline p-5 rounded space-y-2">
            <div className="w-9 h-9 rounded bg-paper border border-hairline flex items-center justify-center text-celadon">
              <span className="material-symbols-outlined text-xl">hourglass_top</span>
            </div>
            <h4 className="font-bold text-sm text-ink">Giữ chỗ khi đặt vé</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Khi vào bước thanh toán, ghế của bạn được giữ tạm thời và đồng hồ đếm ngược cho biết thời gian còn lại.
            </p>
          </div>

          <div className="bg-paper-deep/60 border border-hairline p-5 rounded space-y-2">
            <div className="w-9 h-9 rounded bg-paper border border-hairline flex items-center justify-center text-bronze">
              <span className="material-symbols-outlined text-xl">currency_exchange</span>
            </div>
            <h4 className="font-bold text-sm text-ink">Hủy vé minh bạch</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Trước khi hủy, hệ thống báo rõ phí và số tiền được hoàn theo thời điểm hủy; hủy xong tiền được hoàn tự động.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
