# T-DATA 10121 HTTP 429 분석

## 재현과 확인된 사실

2026-11-21 00:41:45 KST에 기존 `.env.local`의 MAP 개발용 키로 **10121 첫 페이지 한 건**을 요청했다. 호출 전에 공유 예산의 5번 슬롯을 예약했다. 재시도 없이 **HTTP 429**를 받았다. 남은 로컬 예산은 **45/50회**다. 키와 인증 쿼리 전체는 기록하지 않았다.

| 검사항목                     | 관찰값                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 응답 시각 (`Date`, KST 환산) | 2026-11-21 00:41:45                                                                                                       |
| HTTP 상태                    | 429 Too Many Requests                                                                                                     |
| `Retry-After`                | 21,402초. 응답 시각 기준 2026-11-21 06:38:27 KST                                                                          |
| `X-RateLimit-Limit`          | 1,000                                                                                                                     |
| `X-RateLimit-Remaining`      | 994                                                                                                                       |
| `X-RateLimit-Reset`          | 83,894. 상대 초로 해석하면 2026-11-21 23:59:59 KST. 제공기관의 헤더 의미는 미확인                                         |
| `Content-Type` / `Server`    | `application/json` / `web server`                                                                                         |
| 오류 본문                    | JSON 객체. `status`는 429, `error`·`code`·`message` 필드 존재, `Too Many Requests` 문구 확인. 메시지 전문은 수집하지 않음 |

## 요청 명세 대조

- 현재 구현은 `GET https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xCrossroadMapInformation/1.0`에 `apiKey`, `type=json`, `pageNo=1`, `numOfRows=100` 쿼리를 보낸다. `apiKey`의 대소문자, 경로와 버전, 나머지 인자명은 10121 문서와 일치한다. 문서의 10은 행 수 예시이며 최대 허용 행 수는 명시되지 않는다.
- 공식 샘플 URL은 HTTP다. 현재 구현은 키 보호를 위해 동일 호스트·경로의 HTTPS를 사용한다. 공개 상세 페이지에는 HTTP Method가 명시되어 있지 않다. GET은 쿼리형 REST 요청에 맞는 구현 선택이며, 429만으로 HTTPS GET의 정상 처리나 키 인가를 확정할 수 없다. [10121 공식 명세](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10121)

## 원인 분석 및 중복 실행

- **일일 한도 소진을 뒷받침하는 증거는 없다.** 응답에 표시된 1,000회 카운터에는 994회가 남아 있었고, 공식 일일 한도 또한 1,000회다. 429와 별도의 `Retry-After`는 표시된 카운터 외에 추가 요청 제한이 적용됐을 가능성을 높인다. 키·계정·API·IP별 범위, 짧은 시간 제한, 게이트웨이 정책 또는 장애 여부는 현재 응답으로 구분할 수 없다. 429는 키가 유효하다는 증거로도 사용할 수 없다. [T-DATA 공식 이용안내](https://t-data.seoul.go.kr/userguide/guideopenapi.do)
- 게이트웨이 경로에 `apiman-gateway`가 들어 있고 Apiman은 별도의 속도·쿼터 정책과 설정 가능한 헤더를 지원한다. 이번 요청을 실제로 차단한 구성요소와 서울시 배포 정책은 확인되지 않았다. [Apiman 속도 제한](https://www.apiman.io/apiman-docs/user-guide/latest/gateway/policies/rate-limiting-policy.html) · [Apiman 쿼터 정책](https://www.apiman.io/apiman-docs/user-guide/latest/gateway/policies/quota-policy.html)
- 이번 진단은 슬롯 5에서 `https.get` 한 번만 실행했다. 자동 재시도나 리다이렉트 추적은 없었다. 기존 개발 화면도 페이지 GET에서는 호출하지 않고 제출 시 호출한다. 같은 서버 프로세스의 동시 작업은 공유하며 완료 후 60초 동안 직전 결과를 재사용한다. 서로 다른 실행이나 서버 재시작 사이에 첫 페이지가 다시 조회될 수 있지만, 공유 슬롯 한도는 유지된다.
- 진단 전 슬롯은 4개였다. 1번과 2번은 같은 초에 생성됐고 3번과 4번은 별도 시각에 생성됐다. 슬롯에는 URL, 페이지 번호, 결과가 저장되지 않는다. 따라서 1번과 2번이 연속 페이지였는지, 과거에 동일 페이지가 동시에 제출됐는지, 4번이 어느 실행에서 발생했는지는 확정할 수 없다. 서버의 994 및 로컬 슬롯 5는 집계 범위가 확인되지 않아 직접 대조할 수 없다.

## 정상 연결 조건과 후속 검증

1. 이번 응답의 `Retry-After` 기준 시각인 **2026-11-21 06:38:27 KST 이후**에 같은 개발용 키로 10121 첫 페이지를 한 번 확인한다. 시각이 지났다는 사실만으로 정상 처리가 보장되지는 않는다.
2. 다시 429면 새 `Retry-After`를 기록하고 자동 재시도를 중단한다. T-DATA 미래첨단교통과(02-2133-4960)에 키를 제외한 요청 시각, 데이터 ID, HTTP 상태 및 한도 헤더를 전달해 적용 정책·집계 범위·정상 요청 조건을 확인할 수 있다. 화면 개선 시 마지막 429의 재시도 가능 시각을 서버에 보존하고 페이지네이션 간격을 제공기관 확인값에 맞춘다. [10121 담당 연락처](https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=10121)
3. 2xx와 정상 MAP 응답을 확보하면 중심점과 반경 500m 후보를 검증한 뒤 실제 후보 `itstId`로 10381을 조회한다. 조사 한도는 기존과 동일하게 50회다. 이번 429로 후보 목록, 중심 좌표, 보행 신호는 모두 **미검증**으로 남았으며 10381은 호출하지 않았다. [보행 신호 검증 기록](./pedestrian-signal-validation.md)
