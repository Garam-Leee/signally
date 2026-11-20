"use client";

import { useActionState } from "react";
import { directions } from "@/features/signals/directions";
import { runInspection } from "./actions";

const labels = {
  "missing-key": "재발급 키 설정 필요",
  auth: "인증 실패",
  rate: "호출 제한",
  budget: "검증 예산 소진",
  invalid: "응답 형식 미확인",
  network: "연결 오류",
  storage: "호출 예산 저장 오류",
  upstream: "API 오류",
  "page-limit": "페이지 상한 도달",
  repeat: "중복 페이지에서 중단",
  end: "빈 페이지까지 조회 완료",
  normal: "정상",
  delayed: "지연",
  unknown: "전송 시각 미검증",
  unavailable: "미제공",
};

export function Inspector() {
  const [result, action, pending] = useActionState<Awaited<
    ReturnType<typeof runInspection>
  > | null>(runInspection, null);
  return (
    <>
      <form action={action}>
        <button
          disabled={pending}
          className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "조회 중…" : "데이터 조회"}
        </button>
      </form>
      {result && (
        <section aria-live="polite" className="space-y-5">
          <p>
            MAP · {labels[result.mapStop]} ·{" "}
            {result.mapAuthenticated
              ? "유효한 배열 응답 수신"
              : "인증 성공 미확인"}
          </p>
          <p>
            중심점 ·{" "}
            {result.center
              ? `${result.center.latitude}, ${result.center.longitude} (10121)`
              : "미확인"}
          </p>
          <p>
            반경 내 조회 결과 ·{" "}
            {result.center
              ? `${result.crossroads.length}곳${result.mapStop === "end" ? "" : " (부분 결과)"}`
              : "미검증"}
          </p>
          {result.crossroads.map(
            ({ itstId, itstNm, distance, issue, signal }) => (
              <article
                className="space-y-2 rounded border border-slate-300 p-4"
                key={itstId}
              >
                <h2 className="font-semibold">
                  {itstNm} · {itstId} · {distance.toFixed(1)} m
                </h2>
                <p>
                  {issue
                    ? `오류 · ${labels[issue]}`
                    : signal && labels[signal.status]}{" "}
                  · 보행 신호{" "}
                  {issue ? "미검증" : signal?.provided ? "제공" : "미제공"}
                </p>
                {signal && (
                  <>
                    <p>
                      전송 시각 ·{" "}
                      {signal.timestamp === null
                        ? "미확인"
                        : new Date(signal.timestamp).toISOString()}
                    </p>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>방향 그룹</th>
                          <th>상태 원본</th>
                          <th>잔여 원본</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signal.readings.map(
                          ({ code, rawState, rawRemaining }) => (
                            <tr
                              className="border-t border-slate-200"
                              key={code}
                            >
                              <th scope="row">
                                {directions[code]} ({code})
                              </th>
                              <td
                                className={
                                  signal.status === "normal" &&
                                  rawState === "stop-And-Remain"
                                    ? "font-semibold text-red-700"
                                    : undefined
                                }
                              >
                                {rawState ?? "—"}
                              </td>
                              <td>{rawRemaining ?? "—"}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </article>
            ),
          )}
        </section>
      )}
    </>
  );
}
