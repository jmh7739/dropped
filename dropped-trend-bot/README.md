# Dropped Trend GUI

현재 단계의 목적은 **Dropped 사이트 연동 없이** 아래 흐름을 GUI 프로그램 하나에서 테스트하는 것입니다.

1. 사용자가 키워드 입력
2. visible Chromium 실행
3. 쿠팡 검색
4. 검색결과 최대 10개 수집
5. 간단한 Product Score로 대표상품 선택
6. 쿠팡 파트너스 `간편 링크 만들기` 페이지 이동
7. 일반 쿠팡 URL 입력
8. `링크 생성` 클릭
9. `https://link.coupang.com/a/...` 결과 읽기
10. JSON 파일 저장

## 주의

- 쿠팡 로그인 ID/PW, cookie, x-token을 코드에 저장하지 않습니다.
- 처음 실행 시 열린 브라우저에서 직접 로그인합니다.
- Playwright persistent profile을 사용합니다.
- CAPTCHA / Akamai / 보안 확인 화면은 자동 우회하지 않고 중단합니다.
- 쿠팡/파트너스 화면 DOM이 바뀌면 selector 수정이 필요할 수 있습니다.

## 개발 실행

Windows에서 Node.js LTS 설치 후 이 폴더에서:

```bat
npm install
npm run install:browsers
npm start
```

GUI 없이 계속 자동 실행하려면:

```bat
npm run start:auto
```

또는 `RUN-AUTO.bat`을 더블클릭합니다. 프로그램이 켜져 있는 동안 실시간 검색어는 1시간마다,
트렌드 상품은 4시간마다 갱신됩니다. Chrome의 `Dropped Link Helper` 확장 프로그램은 1분마다
로컬 프로그램의 대기열을 확인하고 쿠팡 파트너스 간편 링크를 자동 생성합니다. Chrome은 실행 중이고
쿠팡 파트너스 로그인이 유지되어 있어야 합니다. CAPTCHA·보안 확인·로그인 만료는 우회하지 않고 중단합니다.

## Windows .exe 만들기

```bat
npm install
npm run install:browsers
npm run build:win
```

빌드 성공 시:

`dist\Dropped-Trend-GUI-0.1.0.exe`

가 생성됩니다.

Electron 앱의 exe에는 Playwright 브라우저 바이너리가 자동으로 완전히 포함되지 않을 수 있으므로,
처음 사용하는 PC에서는 다음 명령을 한 번 실행하는 것을 권장합니다.

```bat
npx playwright install chromium
```

## NSIS 설치형 exe

package.json에서 build target이 portable로 되어 있습니다.
설치형을 원하면:

```bat
npm run build:win:nsis
```

을 사용하면 됩니다.

## 현재 MVP 한계

- 트렌드 자동 수집 미구현
- Dropped API 연동 미구현
- 쿠팡 DOM 변경에 따라 selector 수정 가능성 있음
- 상품 추천 점수는 임시 규칙
