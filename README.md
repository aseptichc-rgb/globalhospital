# Globalhospital Brand Handoff Package

이 폴더 통째로 프로젝트 루트에 복사하면 끝납니다.

## 구성
- `BRAND.md` — AI 코딩 도구가 읽는 디자인 가이드 (가장 중요)
- `tokens.css` — 모든 디자인 토큰을 CSS 변수로 정의. 한 줄로 import.
- `assets/logo/` — SVG / PNG / PDF 모든 변형 (Logo Library에서 ZIP으로 다운로드 후 이 폴더에 풀기)

## 사용법 (Cursor / Claude Code / Copilot)

### 1. 프로젝트에 복사
```
/your-project
  ├── BRAND.md
  ├── tokens.css
  └── assets/logo/
      ├── horizontal/
      ├── vertical/
      ├── symbol/
      ├── app-icon/
      ├── reverse/
      └── mono/
```

### 2. 앱 진입점에 토큰 import
**Vite / Next.js / CRA:**
```ts
import './tokens.css';
```
**HTML:**
```html
<link rel="stylesheet" href="/tokens.css" />
```

### 3. AI에게 지시
- "`BRAND.md`를 따라서 로그인 페이지 만들어줘. `tokens.css` 변수만 사용해."
- "키오스크 시작 화면 만들어줘. `BRAND.md`의 Accessibility(9번)와 Components(6번) 따라서."
- "이 컴포넌트에서 하드코딩된 색상을 `tokens.css` 변수로 바꿔줘."

### 4. 추가 팁
- Cursor: `.cursorrules` 파일에 `"Always read BRAND.md before designing UI. Never use hex values — only var(--gh-*) tokens."` 한 줄 추가하면 자동 참조.
- Claude Code: 새 세션에서 처음에 `BRAND.md` 읽고 시작하라고 한 번만 말하면 됨.

## 무엇이 달라지나?
- ✅ 색은 무조건 토큰 — `#1656E0` 대신 `var(--gh-blue)`
- ✅ 본문 최소 16px, 키오스크 18px
- ✅ 터치 타겟 최소 56px
- ✅ 한국어 + 영어 2개 언어 병기 (gh-bilingual 헬퍼 사용)
- ✅ Coral은 액센트, Danger는 별도 (`--gh-danger`)
- ✅ 그림자는 블랙이 아니라 blue-tinted

## 로고 ZIP 다운로드
Logo Library 페이지의 "Download ZIP" 버튼으로 받아서 `assets/logo/` 위치에 그대로 풀어주세요.
