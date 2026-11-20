"use client";

import { useActionState } from "react";
import { directions } from "@/features/signals/directions";
import { runInspection, type InspectorState } from "./actions";

const labels = {
  "missing-key": "로컬 API 키 설정 필요",
  blocked: "호출 제한 해제 시각 대기 중",
  busy: "다른 조회가 실행 중이거나 호출 기록 확인 필요",
  "probe-required": "먼저 MAP 첫 페이지를 확인하세요.",
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

const connection = {
  ok: "실제 응답 수신 · 형식 검사 통과",
  empty: "실제 응답 수신 · 빈 배열",
  auth: "인증 또는 접근 거절 (401/403)",
  rate: "요청 제한 (429)",
  invalid: "스키마 오류 · 예상한 JSON 배열과 다름",
  network: "응답을 받지 못함 · 연결 또는 시간 초과",
  upstream: "API 오류 · 정상 응답을 받지 못함",
};

function displayTime(value: number | undefined) {
  if (value === undefined) return "기록 없음";
  return (
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(value) + " KST"
  );
}

export function Inspector({
  overview,
}: {
  overview: InspectorState["overview"];
}) {
  const [current, action, pending] = useActionState(runInspection, {
    overview,
    inspection: null,
    probe: null,
    issue: null,
  });
  const { state, used, limit, blocked, busy } = current.overview;
  const result = current.inspection;
  const last = Math.max(state?.map?.at ?? 0, state?.signal?.at ?? 0);
  const disabled = pending || blocked || busy || used === null || used >= limit;
  return (
    <>
      <dl className="space-y-1 rounded border border-slate-300 p-4">
        <div>
          <dt className="inline font-semibold">교차로 MAP (10121) · </dt>
          <dd className="inline">
            {state?.map ? connection[state.map.status] : "조회 이력 없음"}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">실시간 신호 (10381) · </dt>
          <dd className="inline">
            {state?.signal ? connection[state.signal.status] : "미조회"}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">마지막 조회 · </dt>
          <dd className="inline">{displayTime(last || undefined)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">마지막 제한 · </dt>
          <dd className="inline">{displayTime(state?.limit.limitedAt)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">다음 요청 가능 시각 · </dt>
          <dd className="inline">{displayTime(state?.limit.retryAt)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">로컬 호출 예산 · </dt>
          <dd className="inline">
            {used === null ? "확인 불가" : `${used}/${limit}회 사용`}
          </dd>
        </div>
      </dl>
      <p className="text-sm">
        화면에 표시되는 조회 결과는 실제 API 응답입니다. 샘플은 단위
        테스트에서만 사용합니다.
      </p>
      {blocked && (
        <p role="status">
          {state
            ? "호출 제한 중입니다. 가능 시각 이후 페이지를 새로 고침하고 수동으로 조회하세요."
            : "제한 상태를 안전하게 읽을 수 없어 조회를 차단했습니다."}
        </p>
      )}
      {busy && (
        <p role="status">
          다른 요청이 실행 중이거나 호출 기록 확인이 필요합니다.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="mode" value="probe" />
          <button
            disabled={disabled}
            className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
          >
            {pending ? "조회 중…" : "MAP 첫 페이지 1회 확인"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="mode" value="area" />
          <button
            disabled={disabled || !state?.mapProbePassed}
            className="rounded border border-emerald-800 px-4 py-2 text-emerald-900 disabled:opacity-50"
          >
            반경 500m 및 보행 신호 조회
          </button>
        </form>
      </div>
      <div aria-live="polite">
        {current.issue && <p>{labels[current.issue]}</p>}
        {current.probe?.rows != null && (
          <p>실제 MAP 첫 페이지 · 최상위 JSON 배열 · {current.probe.rows}행</p>
        )}
      </div>
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
