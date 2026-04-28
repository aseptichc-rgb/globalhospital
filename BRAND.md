# Globalhospital — Brand Guide for AI Coding Tools

> **For AI assistants (Cursor / Claude Code / Copilot / etc.):**
> When designing or coding any UI for this product, follow this guide as the binding source of truth for visuals, copy, and patterns. Import `tokens.css` once at the root and reference its CSS variables — never hardcode hex values. Use the logo SVGs in `assets/logo/` as-is; do not redraw them.

---

## 1 · 브랜드 한 줄 요약

**Globalhospital** — 한국 의료기관을 찾는 외국인 환자가 모국어로 진료를 받을 수 있도록, 사전 문진부터 진료 중 실시간 통역까지 한 흐름으로 이어주는 AI 의료 통역 서비스.

**감정 키워드 (디자인이 담아야 할 인상)**
- **Trust** — 의료 환경. 가볍거나 장난스러운 톤 금지
- **Global** — 경계 없음, 환영. 단 특정 국가 색깔에 치우치지 않음
- **Clarity** — 아픈 사람·고령자·언어가 통하지 않는 사람도 1초 안에 이해
- **Care** — 차가운 의료 기술 도구가 아닌, 손을 잡아주는 도우미
- **Instant** — "지금 바로 통역됨"이라는 속도감

---

## 2 · Logo · Speech Cross

두 개의 말풍선이 직각으로 교차해 의료 십자(+)를 형성하는 마크. **대화(speech) + 진료(care)** 를 한 형태에 압축.

**파일 위치 (이 패키지 안)**
```
assets/logo/
├── horizontal/    가로 락업 (가장 일반적)
├── vertical/      세로 락업 (정사각 영역)
├── symbol/        심볼만 (파비콘, 아바타)
├── app-icon/      앱 아이콘 (iOS / Android)
├── reverse/       다크 배경용 (흰색)
└── mono/          1색 (블랙 또는 화이트)
```
각 폴더에 `.svg`, `.png`, `.pdf` 세 가지 포맷이 들어있습니다. **웹·앱에서는 SVG를 우선 사용.**

**클리어 스페이스** — 심볼 높이의 ½ 이상을 모든 가장자리에 확보.
**최소 크기** — 심볼 16px / 워드마크 80px 미만 사용 금지.
**금지 사항**
- 깃발 콜라주와 함께 두지 않기
- 회전·기울이기·그림자 효과 금지
- 마크의 두 말풍선 색을 단색으로 합치지 않기 (Mono 변형은 별도 파일 사용)
- 빨강 단독 사용 금지 (병원에서 빨강 = 응급/위험)

---

## 3 · Color Tokens

> CSS 변수로만 사용하세요. 새 색을 만들지 말 것.

| Token | Hex | 용도 |
|---|---|---|
| `--gh-blue` | `#1656E0` | **PRIMARY** — 버튼, 링크, 활성 상태, 마크 메인 |
| `--gh-blue-deep` | `#0B3FA6` | 호버, 깊이감, 그림자 색조 |
| `--gh-blue-soft` | `#5B8DEF` | 보조 인포 칩, 비활성 활성 상태 |
| `--gh-coral` | `#FF7A6B` | **CARE** — 마크 액센트, 따뜻한 강조 (CTA 아님) |
| `--gh-mint` | `#34D4B0` | 성공, 연결됨 상태, "Live" 인디케이터 |
| `--gh-amber` | `#FFB547` | 주의 (warning) |
| `--gh-ink` | `#0E1A2B` | 본문 텍스트, 다크 배경 |
| `--gh-steel` | `#7A8BA3` | 서브 텍스트, 메타 정보 |
| `--gh-cloud` | `#E7ECF5` | 보더, 디바이더 |
| `--gh-bone` | `#F6F7FB` | 카드 보조 배경, 인풋 배경 |
| `--gh-white` | `#FFFFFF` | 페이지 배경, 카드 메인 |

**시맨틱 사용 규칙**
- 응급/오류는 `--gh-coral`이 아니라 **별도의 `--gh-danger: #D7263D`** 를 따로 정의해서 사용 (Coral은 브랜드 액센트, 위험 신호와 분리)
- 주요 CTA 버튼: `background: var(--gh-blue); color: var(--gh-white)`
- Secondary 버튼: `background: var(--gh-white); color: var(--gh-blue); border: 1.5px solid var(--gh-blue)`
- 하이라이트(예: 통역 중 표시): `background: var(--gh-mint); color: var(--gh-ink)`

---

## 4 · Typography

**폰트 패밀리 (다국어 지원이 필수)**
1. 기본: **Pretendard** (한국어 + Latin 최적, 무료) — `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css`
2. 보조 (Latin 전용): **Inter** — Google Fonts
3. 폴백: `-apple-system, BlinkMacSystemFont, 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans Arabic', 'Noto Sans Cyrillic', sans-serif`

41개 언어 지원이 핵심이므로 **Noto 패밀리 폴백 체인은 절대 빼지 말 것.**

**스케일 (의료 환경 — 노안 친화 큰 타이포)**

| Token | px | 사용처 |
|---|---|---|
| `--gh-text-display` | `48 / 56` (lh) | 키오스크 대형 타이틀 |
| `--gh-text-h1` | `32 / 40` | 페이지 타이틀 |
| `--gh-text-h2` | `24 / 32` | 섹션 헤더 |
| `--gh-text-h3` | `18 / 26` | 카드 타이틀 |
| `--gh-text-body` | `16 / 24` | **본문 기본 — 14px 미만 사용 금지** |
| `--gh-text-body-lg` | `18 / 28` | 환자용 본문 (병원 환경) |
| `--gh-text-caption` | `14 / 20` | 메타, 캡션 |
| `--gh-text-label` | `12 / 16` | 업퍼케이스 라벨 (letter-spacing 0.08em) |

**가중치** — 400 / 600 / 800 세 단계만. 500/700은 사용하지 말 것 (브랜드 일관성).

**워드마크 타이포**
- "global" — Inter/Pretendard **Regular (400)**, 본문색 (`--gh-ink`)
- "hospital" — Inter/Pretendard **ExtraBold (800)**, `--gh-blue`
- letter-spacing: -0.025em
- 두 단어는 붙여 씀 (공백 없음)

---

## 5 · Spacing · Radii · Shadows

**Spacing (4px 베이스)** — `--gh-sp-1`(4px) / `-2`(8) / `-3`(12) / `-4`(16) / `-5`(20) / `-6`(24) / `-8`(32) / `-10`(40) / `-12`(48) / `-16`(64)

**Radii**
- `--gh-r-xs` 6px (input)
- `--gh-r-sm` 10px (버튼, 작은 카드)
- `--gh-r-md` 14px (메인 카드)
- `--gh-r-lg` 22px (모달, 키오스크 패널)
- `--gh-r-pill` 999px (필 버튼, 태그)
- `--gh-r-circle` 50%

**Shadows** — 조심해서. 의료 UI는 깊이감보다 명료함 우선.
- `--gh-shadow-sm`: `0 1px 0 rgba(0,0,0,0.04), 0 1px 2px rgba(11,63,166,0.06)` — 카드
- `--gh-shadow-md`: `0 6px 22px rgba(11,63,166,0.10)` — 떠 있는 모달
- `--gh-shadow-cta`: `0 8px 24px rgba(22,86,224,0.28)` — 주요 버튼
- 그림자 컬러는 **블랙이 아니라 `--gh-blue-deep` 베이스의 알파**로 깔것

---

## 6 · Components — Patterns

> 이 섹션은 신규 컴포넌트의 **시각적 기준선**입니다. 그대로 따르세요.

### Button
```
height: 48px (모바일 56px / 키오스크 64px)
padding: 0 20px
border-radius: var(--gh-r-pill)
font: 600 14px/1 — UPPERCASE 금지 (단, 작은 라벨 칩만 UPPERCASE 허용)
transition: transform .12s, box-shadow .12s
press: transform: scale(0.97)
```
**Primary** = blue bg / white text / `--gh-shadow-cta`
**Secondary** = white bg / blue text / 1.5px blue border, no shadow
**Ghost** = transparent / steel text / hover bg `--gh-bone`

### Input
```
height: 48px (키오스크 64px)
padding: 0 16px
border-radius: var(--gh-r-sm)
border: 1.5px solid var(--gh-cloud)
background: var(--gh-white)
font: 16px (모바일에서 자동 줌 방지를 위해 16px 미만 금지)
focus: border-color: var(--gh-blue); box-shadow: 0 0 0 4px rgba(22,86,224,0.12)
```

### Card
```
background: var(--gh-white)
border-radius: var(--gh-r-md)
padding: 24px
shadow: var(--gh-shadow-sm)
border: 1px solid transparent (호버 시에만 var(--gh-cloud) 보이기)
```

### Language Pill (이 서비스의 시그니처)
```
모든 언어 버튼은 정사각 (aspect-ratio: 1)
border-radius: var(--gh-r-sm)
선택됨: background: var(--gh-blue); 텍스트/국기: white
미선택: background: var(--gh-bone); border: 1px solid var(--gh-cloud)
크기: 키오스크 88px / 모바일 64px
```

### Live / Translation Indicator
```
"통역 중" 같은 활성 상태에는 mint(#34D4B0) 점 + 미세한 펄스 애니메이션
@keyframes pulse {0%,100%{opacity:1} 50%{opacity:0.4}}
```

---

## 7 · Iconography

- **둥글고 굵은 라인** — stroke-width 2, stroke-linecap/linejoin: round
- 의료 십자 단독 사용 금지 (마크와 충돌)
- 추천 아이콘 라이브러리: **Lucide** (`https://lucide.dev`) — 필수 import: `MessageCircle`, `Mic`, `Globe`, `Languages`, `Stethoscope`, `Heart`, `ArrowRight`
- 의료 클리셰 (주사기, 청진기, 약 봉지) **금지** — 키오스크 / 통역 / 대화 메타포로 대체

---

## 8 · Voice & Copy Rules

**원칙**
- **2개 언어 병기**: 한국어 + 영어가 기본. 큰 글씨가 한국어, 그 아래 영어가 1단계 작게.
  ```
  언어를 선택해주세요
  Please select your language
  ```
- **명령형보다 안내형** — "입력하세요" → "어떻게 도와드릴까요?"
- **속도감 표현** — "1초 만에", "지금 바로", "Instant"
- **숫자로 신뢰** — "41개 언어", "평균 1.2초 응답"
- **금지 어휘** — "AI", "혁신", "스마트" 같은 마케팅 용어. 환자에게는 "통역사"라고 표현.
- **이모지** — 국기 이모지 외에는 사용 금지

**예시**
- ✅ "통역사가 함께 합니다 · An interpreter is with you"
- ❌ "AI 기반 스마트 의료 통역 솔루션"
- ✅ "어디가 불편하세요? · Where does it hurt?"
- ❌ "증상을 입력해주십시오"

---

## 9 · Accessibility (의료 환경 필수)

- **터치 타겟 최소 56×56px** (44px가 아니라 56px — 노약자 / 떨림)
- **본문 최소 16px**, 키오스크는 18px 이상
- **명도 대비 4.5:1 이상** (WCAG AA), 본문 텍스트는 7:1 권장
- 모든 버튼에 `aria-label` 한국어 + 영어 둘 다
- 음성 입력 버튼은 시각적 표시 + 진동/소리 피드백 동반
- 폼은 키보드만으로 완주 가능해야 함 (키오스크 가상 키보드 호환)

---

## 10 · 사용 흐름 (참고)

이 서비스는 다음 4단계로 흐릅니다. 각 화면 디자인은 이 단계에 명확히 위치해야 합니다.

1. **언어 선택** — 41개 언어 그리드, 정사각 셀, 한 번 탭으로 결정
2. **사전 문진 (Pre-Consultation Intake)** — 챗봇 UI. 환자 모국어로 질문 → 답변은 한국어로 의사에게
3. **실시간 진료 통역** — 양방향 음성, 한쪽 발언 종료 시 자동 마이크 토글 (Live 모드)
4. **기록 저장** — 진료 후 PDF 요약, 차후 참조

---

## 11 · How to Apply (AI Coding Tools 사용법)

**Step 1.** 이 패키지 전체를 프로젝트 루트에 복사:
```
/your-project
  ├── BRAND.md          ← 이 파일
  ├── tokens.css        ← CSS 변수 정의
  └── assets/logo/      ← SVG / PNG / PDF 로고
```

**Step 2.** 앱 진입점에 토큰 import:
```html
<!-- HTML -->
<link rel="stylesheet" href="/tokens.css" />
```
```ts
// React / Vite
import './tokens.css';
```

**Step 3.** AI에게 자연스럽게 지시 (예시):
- "BRAND.md를 따라 로그인 페이지를 만들어줘. tokens.css의 변수만 써."
- "BRAND.md 9번 항목 (Accessibility) 기준으로 키오스크 시작 화면을 디자인해."
- "환자가 통역 시작을 기다리는 중간 화면을 BRAND.md 6번의 Live Indicator 패턴으로 만들어줘."

**Step 4.** 새 컴포넌트를 만들 때마다 BRAND.md를 참조하라고 명시. AI가 직접 hex/spacing을 입력하면 거부하고 토큰으로 바꾸라고 지시.

---

## 12 · Quick Reference Card

```
색       primary=#1656E0  ink=#0E1A2B  bone=#F6F7FB
액센트   coral=#FF7A6B  mint=#34D4B0
폰트     Pretendard / Inter, 400·600·800
본문     16px (키오스크 18px) / lh 24
버튼     height 48 / radius 999 / shadow blue-tinted
카드     radius 14 / padding 24 / shadow sm
아이콘   Lucide, stroke 2, round
이모지   국기만 허용
대비     4.5:1 이상 (본문 7:1 권장)
2개 언어 한국어 위, 영어 아래 (1단계 작게)
```

---

*Last updated: 2026-04 · Globalhospital Logo Library v1*
