export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center bg-emerald-50/60 px-5 py-12 text-slate-950 sm:px-8">
      <section
        aria-labelledby="service-name"
        className="w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white px-6 py-10 shadow-sm sm:px-14 sm:py-16"
      >
        <p lang="en" className="text-base font-semibold text-emerald-800">
          Signally
        </p>
        <h1
          id="service-name"
          className="mt-3 text-5xl font-bold tracking-tight sm:text-7xl"
        >
          시그널리
        </h1>
        <p className="mt-5 text-xl text-slate-700 sm:text-2xl">
          우리 동네 신호를 한눈에
        </p>
        <dl className="mt-10 space-y-5 border-t border-emerald-100 pt-6 sm:flex sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <dt className="text-sm text-slate-600">초기 서비스 지역</dt>
            <dd className="mt-1 font-medium">서울 관악구 난곡사거리</dd>
          </div>
          <div>
            <dt className="sr-only">서비스 상태</dt>
            <dd className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-emerald-600"
              />
              서비스 준비 중
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
