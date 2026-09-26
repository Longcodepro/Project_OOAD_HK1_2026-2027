import type { View, User } from '../types'
import { Header } from '../components/layout/Header'
import { SearchBox } from '../components/home/SearchBox'
import { Button } from '../components/common/Button'

export interface HomePageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onSearch: (from: string, to: string, date: string) => void
  onLogout?: () => void
}

export function HomePage({
  setView,
  user,
  backendOnline,
  onSearch,
  onLogout,
}: HomePageProps) {
  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('login')}
        openRegister={() => setView('register')}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />
      <main className="relative overflow-hidden">
        <div className="hero-glow" />
        <div className="hero-grid" />
        <section className="mx-auto max-w-[1320px] px-5 pb-20 pt-12 text-center lg:px-8 lg:pt-24">
          <div className="eyebrow mx-auto">KẾT NỐI NHỮNG HÀNH TRÌNH</div>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-7xl lg:text-[88px]">
            Đi xa hơn.
            <br />
            <span className="text-violet-300">Đến đúng chất.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/60">
            Chọn hành trình liên tỉnh với không gian riêng tư, kết nối liền mạch
            và trải nghiệm được thiết kế quanh bạn.
          </p>
          <SearchBox onSearch={onSearch} />
          <div className="mt-12 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-5 text-left">
            <div className="px-5">
              <b className="text-lg text-white">42+</b>
              <p>tỉnh thành kết nối</p>
            </div>
            <div className="px-5">
              <b className="text-lg text-white">4.9/5</b>
              <p>đánh giá hành khách</p>
            </div>
            <div className="px-5">
              <b className="text-lg text-white">24/7</b>
              <p>hỗ trợ hành trình</p>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-[1320px] gap-4 px-5 pb-14 lg:grid-cols-[1.7fr_1fr] lg:px-8">
          <article className="journey-art relative min-h-64 overflow-hidden rounded-[28px] border border-white/10 bg-[#17204d] p-7">
            <img
              alt="Nội thất limousine hạng sang"
              src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&h=500&fit=crop&auto=format"
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
            <div className="relative">
              <span className="eyebrow">TRẢI NGHIỆM VIOLETLINE</span>
              <h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight">
                Cabin riêng, khoảng lặng của riêng bạn.
              </h2>
              <Button kind="ghost" className="mt-7">
                Khám phá hạng vé
              </Button>
            </div>
          </article>
          <article className="rounded-[28px] border border-violet-300/20 bg-violet-400/10 p-7">
            <p className="font-mono text-[10px] tracking-[.22em] text-violet-300">
              VIOLET PASS
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              Tích điểm mỗi cây số.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Ưu tiên chỗ ngồi, ưu đãi sinh nhật và linh hoạt đổi lịch.
            </p>
            <button
              type="button"
              onClick={() => setView('profile')}
              className="mt-8 text-sm font-semibold text-violet-200 hover:underline"
            >
              Tìm hiểu thêm →
            </button>
          </article>
        </section>
      </main>
    </>
  )
}
