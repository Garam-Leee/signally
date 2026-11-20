import { requireLocalDevelopment } from "./actions";
import { Inspector } from "./inspector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DevSignalsPage() {
  await requireLocalDevelopment();
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <h1 className="text-2xl font-bold">난곡사거리 보행 신호 검증</h1>
      <p>
        반경 500m · 잔여시간은 원본 단위로 표시합니다. 자동 조회 없이 버튼을
        누를 때만 조회합니다.
      </p>
      <Inspector />
    </main>
  );
}
