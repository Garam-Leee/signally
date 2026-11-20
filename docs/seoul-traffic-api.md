# 서울시 T-DATA API 조사

조사일 2026-11-21 (KST). 대상은 서울 관악구 미성동 난곡사거리 중심 반경 500m다.

## 활용 신청 및 인증키

| 데이터 ID | 이번 신청                                 | 인증키                                     |
| --------- | ----------------------------------------- | ------------------------------------------ |
| 10381     | 신청데이터 목록에서 처리완료 (2026-11-21) | 개발용 키 1건 발급 확인, API별 인증 미검증 |
| 10121     | 신청데이터 목록에서 처리완료 (2026-11-21) | 개발용 키 1건 발급 확인, API별 인증 미검증 |

두 양식의 용도는 **웹사이트 개발**이다. 10381은 보행자 상태·잔여시간 검증 및 참고용 표시, 10121은 교차로 위치·식별자 검증 및 지도 표시 목적을 입력했다. 첨부파일은 추가하지 않았다. 두 양식은 제출 전부터 `자동 승인`과 `처리완료`를 표시했다. 신청 관리에서 두 건 모두 처리완료로 확인되어 중복 제출 없이 기존 신청을 사용한다. API 인증키 발급 현황에는 같은 날짜에 발급된 개발용 키 1건이 표시됐다. 확인 중 브라우저 도구 출력에 키가 표시됐으므로 해당 키는 폐기하거나 재발급한 뒤 사용한다.

수동 절차는 서울시 통합 로그인 → 각 데이터 상세 페이지의 **활용신청** → 용도와 활용 목적 입력 → 필수 저작자 표시 동의 → **신청** 순서다. 제출 전 기존 신청을 확인하고, 제출 후 우측 상단 사용자 메뉴 → **나의 데이터 신청관리**에서 **신청데이터**와 **인증키 발급현황**을 확인한다. [Open API 이용안내](https://t-data.seoul.go.kr/userguide/guideopenapi.do) · [공식 FAQ](https://t-data.seoul.go.kr/board/faq/list.do)

## 10381 — 실시간 신호정보 및 잔여시간

- 요청 URL: `https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingFusionCurrentInfo/1.0`
- HTTP Method: 우선 검증할 방식은 `GET`과 쿼리 파라미터다. 공개 명세의 샘플 URL과 신청 화면의 REST 표기를 바탕으로 한 호출 형태이며 인증 성공으로 확인해야 한다.
- 갱신 주기: 실시간으로 공시한다. 실제 갱신 간격, 최대 지연, 가용성 보장은 미검증이다.
- 키 없는 공개 URL 조회에서 HTTP 403이 관찰됐다. 응답 본문과 상태 코드 매핑, 유효 키의 정상·빈 결과·한도 초과 응답은 미검증이다. 출처에 저작자 표시(BY)가 명시되어 있다. [10381 공식 명세](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10381)

| 요청 파라미터 | 필수   | 설명                                                                       |
| ------------- | ------ | -------------------------------------------------------------------------- |
| `apikey`      | 예     | T-DATA 발급 인증키                                                         |
| `itstId`      | 예     | 교차로 ID, 문서 표기 크기 5                                                |
| `sggCd`       | 아니요 | 시군구 코드, 문서 표기 크기 5. 관악구 코드 체계 및 동시 필터 동작은 미검증 |
| `type`        | 아니요 | `json` 기본값, `xml` 선택 가능                                             |
| `pageNo`      | 아니요 | 페이지 번호, 문서 예시 1                                                   |
| `numOfRows`   | 아니요 | 페이지당 행 수, 문서 예시 10                                               |

공식 JSON 샘플은 최상위 배열이다. 아래는 샘플에서 확인한 필드 타입으로, 운영 성공 응답의 필수성은 추가 검증이 필요하다. 방향 코드는 `nt` 북, `et` 동, `st` 남, `wt` 서, `ne` 북동, `se` 남동, `sw` 남서, `nw` 북서다. `Pdsg`는 보행 신호다. 함께 제공되는 `Bssg`, `Bcsg`, `Ltsg`, `Stsg`, `Utsg`는 각각 버스, 자전거, 좌회전, 직진, 유턴 신호다.

```ts
type Direction = "nt" | "et" | "st" | "wt" | "ne" | "se" | "sw" | "nw";
type SignalKind = "Pdsg" | "Bssg" | "Bcsg" | "Ltsg" | "Stsg" | "Utsg";

type SignalSampleRow = {
  dataId: string;
  itstId: string;
  eqmnId: string;
  trsmUtcTime: number;
  trsmYear: string;
  trsmMt: string;
  trsmDy: number;
  trsmTm: string;
  trsmMs: string;
  msgCreatMin: number;
  msgCreatDs: number;
  rgtrId: string;
  regDt: string;
} & Record<`${Direction}${SignalKind}StatNm`, string | null> &
  Record<`${Direction}${SignalKind}RmdrCs`, number | null>;

type SignalSampleResponse = SignalSampleRow[];
```

남은 시간 필드명과 한글 변수 설명은 센티초를 가리키지만, 값 설명은 **1/10초**로 명시한다. 값 설명대로라면 공식 샘플의 `nePdsgRmdrCs = 414`는 41.4초다. 같은 행의 `nePdsgStatNm`은 `stop-And-Remain`이므로 이 잔여값을 통행 허용 시간으로 해석할 수 없다. 제공부서(02-2133-4954)에 단위와 각 상태에서 카운트가 가리키는 전환을 확인하고, 실제 현시 전환과 비교한 뒤 초 단위 변환을 확정한다. `null`, 누락, 미정의 상태나 특수값, 오래된 패킷은 미표시로 처리한다. `trsmUtcTime`은 샘플 자릿수가 밀리초 Unix 시각과 일치하므로 수신 시각과 비교하되, 전송 필드·등록 필드 각각의 의미, 소스 시계 오차와 갱신 주기는 실측한다. 현장 신호등을 직접 확인하도록 안내한다. [10381 공식 명세](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10381)

## 10121 — 교차로 Map 정보

- 공식 샘플 URL: `http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xCrossroadMapInformation/1.0`
- 인증 요청 검증 후보: 동일 호스트·경로의 `https://`와 `GET` 쿼리. 공개 샘플은 HTTP로 게시되어 있으며 HTTPS에서의 인증 성공과 HTTP Method는 미검증이다. 키는 암호화된 요청에서만 전송한다.
- 갱신 주기: 일별. 저작자 표시(BY). 정상 응답의 JSON 최상위 구조, 마지막 페이지 표시, 오류 형식은 미검증이다. [10121 공식 명세](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10121)

| 요청 파라미터 | 필수   | 설명                                                 |
| ------------- | ------ | ---------------------------------------------------- |
| `apiKey`      | 예     | 명세의 대소문자 유지. 10381의 `apikey`와 표기가 다름 |
| `type`        | 아니요 | `json` 기본값, `xml` 선택 가능                       |
| `pageNo`      | 아니요 | 페이지 번호, 문서 예시 1                             |
| `numOfRows`   | 아니요 | 페이지당 행 수, 문서 예시 10                         |

10121 명세에는 중심 좌표, 반경, 교차로 ID 필터가 없다. 공개 JSON 미리보기도 비어 있으므로 행의 키 목록과 검증 후 사용할 내부 타입을 구분한다. `laneWidth`, `limitSped`, `limitSpedTypeNm`, `regDt`의 실제 JSON 타입은 확인 후 좁힌다. 제한속도에는 양방향 값이 올 수 있으며 단위와 인코딩은 미검증이다.

```ts
type CrossroadMapDocumentedField =
  | "itstId"
  | "itstNm"
  | "itstEngNm"
  | "mapCtptIntLat"
  | "mapCtptIntLot"
  | "laneWidth"
  | "limitSpedTypeNm"
  | "limitSped"
  | "rgtrId"
  | "regDt";

type CrossroadMapRawRow = Partial<Record<CrossroadMapDocumentedField, unknown>>;
type CrossroadMapResponse = unknown;

type ValidatedCrossroad = {
  itstId: string;
  itstNm: string;
  latitude: number;
  longitude: number;
};
```

## 호출 제한 및 처리

플랫폼 이용안내는 **1일 1,000회**를 명시한다. 키·서비스·계정 중 어떤 단위로 합산하는지, 일일 초기화 시각, 별도 초당 제한, 오류 메시지 형식은 미검증이다. 하루 종일 호출한다면 1,000회는 교차로 한 곳 기준 평균 86.4초당 한 번이며, 초 단위 연속 조회에는 부족하다. 초기 검증은 소량의 관측 구간으로 진행하고, 실서비스는 교차로별 서버 요청 공유와 활성 사용자 기반 호출을 검토한다. 네트워크 오류, 인증 거절, 한도 초과, 빈 응답, 응답 파싱 실패를 구분하고, 오류 응답 원문이나 키가 포함된 요청 URL을 로그에 남기지 않는다. [Open API 이용안내](https://t-data.seoul.go.kr/userguide/guideopenapi.do)

## 교차로 및 횡단보도 연결

1. 10121을 페이지 단위로 읽고 좌표계·좌표 범위를 확인한다. 출처가 확인된 난곡사거리 중심점을 기준으로 지표면 거리가 500m 이하인 교차로를 고른다. API 목록은 해당 데이터셋에 수록된 교차로만 대표한다.
2. 원본 `itstId`를 불투명 식별자로 다룬다. JSON 숫자는 정밀도를 확인해 문자열로 변환하고 문자 ID의 선행 0을 유지한다. 패딩이나 절삭은 명세 확인 전 적용하지 않는다. 각 ID로 10381을 호출하고, 응답 ID가 요청 ID와 일치하는지 확인한다.
3. 10121의 좌표는 교차로 중심점이다. 10381의 방향은 보행자의 이동 방위 또는 횡단보도의 위치와 자동으로 일치하지 않는다. 서울시의 기존 잔여시간 API 보충 자료에서는 직진 차량의 우측 횡단보도에 그 진입 방향의 그룹을 부여한다. 예를 들어 북쪽 그룹의 보행 필드가 서쪽 횡단보도에 대응한다. 이 규칙이 10381과 실제 난곡사거리에도 적용되는지 제공부서 및 현장에서 검증한다. [서울시 방향 규칙 보충 자료](https://t-data.seoul.go.kr/dataprovide/download.do?id=10000)
4. 추가 후보인 10123은 `itstId`, `laneId`, `laneCnncId`, `signlgroupCd`를 제공하지만 공개 출력에 횡단보도 좌표가 없다. 서울시 횡단보도 속성 파일의 공간정보·식별자와 대조하고, 필요한 경우 관측을 통해 교차로별 횡단보도 위치와 신호 그룹 관계를 기록한다. 두 필수 API만으로 개별 횡단보도 매핑이 검증되지는 않았다. 추가 API는 신청하지 않았다. [10123 공식 명세](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10123) · [횡단보도 속성 정보](https://t-data.seoul.go.kr/dataprovide/trafficdataviewfile.do?data_id=2001)

## 난곡사거리 검증 결과

| 항목                                 | 결과   |
| ------------------------------------ | ------ |
| 500m 이내 10121 수록 교차로 목록     | 미검증 |
| 교차로별 `itstId`                    | 미검증 |
| 교차로별 10381 제공 여부             | 미검증 |
| 교차로별 보행자 신호 값 존재 여부    | 미검증 |
| 신호 상태 및 잔여시간 정상 수신 여부 | 미검증 |
| 횡단보도 위치와 신호 그룹 대응       | 미검증 |

인증된 운영 응답의 지역 확인이 필요하다. 문서에 공개된 ID와 좌표는 지역 검증에 사용하지 않았다. 두 API의 필드로 교차로별 보행 신호와 시간을 표현할 수 있으나, 난곡사거리 제공 여부와 초 단위 표시의 신뢰도는 지역 커버리지, 지연, 단위, 현장 대응 검증을 통과해야 확정할 수 있다.

## 서버 설계 및 다음 단계

1. 기존 신청 두 건의 처리완료와 개발용 키 발급을 확인했다. 재발급한 키는 사용자가 로컬 `.env.local`에 직접 넣고, 예시 파일은 `SEOUL_TDATA_SIGNAL_API_KEY`, `SEOUL_TDATA_MAP_API_KEY`의 빈 값만 제공한다. 동일 키가 두 API 모두에 유효한지는 발급 화면과 인증 호출로 확인한다.
2. Next.js의 서버 전용 모듈에서 고정된 HTTPS 주소로 호출하며 키에 `NEXT_PUBLIC_` 접두사를 사용하지 않는다. 클라이언트에는 검증·정규화된 교차로 및 신호 필드만 반환한다. 브라우저 요청, 로그, 에러 메시지, README 또는 Git에 키나 원본 인증 URL을 남기지 않는다.
3. 지도 API의 페이지와 좌표를 확인한 뒤 범위 내 교차로 ID를 추출한다. 각 ID에서 HTTP 상태, 응답 형태, 방향별 비어 있지 않은 값과 복수 현시 전환을 확인한다. 상태·시간이 모두 확인된 횡단보도를 현장과 맞추고, 단위와 지연 검증 후 표시 기능을 설계한다.
