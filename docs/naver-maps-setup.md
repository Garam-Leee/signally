# NAVER Maps 설정 및 지도 비교

## 콘솔 확인

2026-11-21 KST에 로그인된 한국 VPC 콘솔의 **Application Services → Maps → Application**을 확인했다. Maps는 이용 신청 전 상태였으며, **대표 계정 확인**에는 대표 계정이 설정되지 않았다고 표시됐다. 이용 신청 화면은 필수 약관 동의를 요구했다. 신청을 확정하지 않았으며 Application 등록, Dynamic Map 활성화, URL 등록, 한도·알림 변경 또는 결제 변경은 진행하지 않았다. 계정에 실제 무료 이용량이 적용되는지는 미확인 상태다. [Maps 이용 신청 안내](https://guide.ncloud-docs.com/docs/application-maps-start-vpc) · [대표 계정 정책](https://www.ncloud.com/support/faq/prod/2829)

## 신청 후 설정 순서

1. 콘솔의 이용 신청 화면에서 약관과 결제 조건을 확인한다. 동의하고 진행할 경우 **대표 계정 확인**을 다시 열어 무료 이용량 적용 여부를 먼저 확인한다. 공식 요금표상 대표 계정의 Dynamic Map 무료량은 계정 전체 월 600만 건이며, 유료 이용 단가는 건당 0.1원이다. 무료 적용이 확인되지 않으면 검증용 호출을 시작하지 않는다. [공식 요금표](https://www.ncloud.com/charge/price/ko) · [무료 이용량 정책](https://www.ncloud.com/support/faq/all/2828)
2. 기존 `Signally` Application이 있으면 재사용한다. 없으면 **Application 등록**에서 이름을 `Signally`로 입력하고 **Dynamic Map**만 선택한다. 목적 입력란이 있으면 개인 개발용 지도 기반 교통 신호 정보 서비스라고 기재한다. Web 서비스 URL에 `http://localhost:3000`, `http://127.0.0.1:3000`을 각각 시도하고 실제로 저장된 값을 확인한다. 공식 문서는 `http://` 시작, 최대 10개, HTTP/HTTPS 미구분을 명시한다. 포트와 루프백 IP 허용 여부는 이 계정에서 확인하지 못했다. 콘솔이 한 주소를 거부하면 허용된 주소로만 브라우저를 열어 검증한다. [Application 등록 가이드](https://guide.ncloud-docs.com/docs/application-maps-app-vpc)
3. Dynamic Map 항목의 **한도 및 알림 설정**에서 콘솔이 허용하면 일 100건·월 1,000건 정도로 제한한다. 이는 제안값이며 콘솔의 최소 입력값은 미확인이다. 계정 내 다른 앱까지 합친 한도가 실제 무료량 이내인지 확인하고 **한도 초과 사용을 비허용**으로 저장한다. 사용량 알림과 통보 대상은 콘솔에서 지원되는 항목을 확인한 뒤 설정한다. [한도 및 알림 설정](https://guide.ncloud-docs.com/docs/application-maps-app-vpc#이용-한도-설정)
4. **인증 정보**에서 Client ID를 확인해 로컬 `.env.local`의 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 저장한다. Client Secret은 Web Dynamic Map 브라우저 연동에 필요하지 않다. 개발 서버를 다시 시작하고 등록된 URL에서 **NAVER**를 선택해 타일과 인증을 확인한다. 검증 후 기본 공급원을 바꾸려면 `SIGNALLY_MAP_PROVIDER=naver`를 설정하고 개발 서버를 다시 시작하거나 운영 빌드를 다시 생성한다. [Web Dynamic Map SDK](https://guide.ncloud-docs.com/docs/maps-web-sdk) · [공식 시작 가이드](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

## 비교 결과

| 항목                 | MapLibre                                                       | NAVER                                                       |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 난곡사거리 도로·건물 | 390×844와 데스크톱에서 OpenFreeMap 도로 및 건물 윤곽 표시 확인 | SDK 연결 준비, 실제 타일 미검증                             |
| 상호·랜드마크        | 현 스타일은 도로명 중심                                        | 다이소·파리바게뜨 및 횡단보도 표현 미검증. 임의 POI 없음    |
| 마커·카운트다운      | DEMO 마커, 선택 및 상세 패널 확인                              | 같은 컴포넌트와 데이터 모델 사용, 실제 타일 투영 미검증     |
| 이동·위치·성능       | 기존 지도와 복귀 동작, 모바일 레이아웃 확인                    | 드래그·확대·위치·로딩 속도는 실제 SDK 인증 후 확인 필요     |
| 출처                 | 화면에서 OpenFreeMap·OpenMapTiles·OpenStreetMap 표시 확인      | SDK 자체 로고·지도 데이터 컨트롤을 활성화. 실제 표시 미검증 |

기본 지도는 MapLibre다. 개발 화면에서 공급원 전환 및 NAVER Client ID 미설정 안내를 확인했다. Style Editor 적용과 동일 영역의 성능·가독성 비교는 실지도 인증 후 진행할 수 있다. T-DATA 검증 모듈과 호출 예산은 수정하지 않았다.
