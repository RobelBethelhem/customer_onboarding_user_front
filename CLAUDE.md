# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zemen Bank Customer Onboarding Web App — a multi-step wizard for opening premium savings accounts, with Fayda national-ID eKYC, OFAC/sanctions screening, camera-based face verification, and a referral/rewards system. It also takes **business account applications** (organizations; `corporate/`, see below). Built with React 19, TypeScript, and Vite. Originally scaffolded from Google AI Studio (hence the vestigial `GEMINI_API_KEY` config — see Environment).

> **Project location:** the actual app lives at `ZOnboarding Backup/zemen_bank_customer_onboarding_web_app-main (2)/` (where `package.json` is). All commands below must run from that directory, not the repo root. The sibling `zemen_bank_customer_onboarding_web_app-main/` folder is empty and can be ignored.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000 (host 0.0.0.0)
npm run dev:demo     # Same, with sample answers instead of the bank's servers (dev/mockApi.ts): try every screen locally — each Fayda ID number is a different sample person; the DEMO panel opens the SMS links (new tab) and plays KYC
npm run build        # Production build (output: dist/)
npm run preview      # Preview production build
```

There is no test runner, linter, or formatter configured. There is no `tsc` type-check script either — `tsconfig.json` is `noEmit` and types are only checked by the editor/build, not enforced in CI.

## Backend Dependency

This is a frontend-only repo; it calls two remote backends defined at the top of `services/api.ts`:

- `API_BASE_URL = https://onboard.zemenbank.com/api1` — onboarding backend (`faydaService`)
- `DASHBOARD_URL = https://onboard.zemenbank.com/api2` — referral/rewards backend (`referralService`)

The URL referral code is validated through `referralService.validateCode` (`DASHBOARD_URL`). Business account calls go to `api1/api/corporate/*`: the Fayda backend relays them to the dashboard's public corporate API.

## Architecture

### Wizard Flow (Step-Based SPA, no router)

Navigation is driven by the `Step` enum (`types.ts`) and `currentStep` in centralized state — there is no router library. Active flow:

```
Landing(0) → Welcome(1) → ExistingAccount(2) → Branch(3) → AccountType(4) → FaydaId(5)
→ Otp(6) → Review(7) → AdditionalInfo(8) → [Documents(9) SKIPPED] → FaceVerify(10) → Services(11)
→ FinalReview(12) → Success(13)
```

**`Documents` (step 9) is skipped.** `App.tsx` defines `SKIPPED_STEPS = new Set([Step.Documents])`; `nextStep`/`prevStep` step over it and its `case` in `renderStep` is commented out. `DocumentUploadStep.tsx` still exists but is not reachable. `ProgressBar` likewise omits it (shows ExistingAccount→FinalReview as circles on `sm`+ screens and as a compact "Step x of y" bar on phones).

**Adding or reordering a step** shifts the numbers of saved sessions: extend `upgradeSavedState` in `App.tsx` so older sessions still resume on the same screen, and add the step to `ProgressBar` / `ResumeModal` labels.

**`Services` step (optional):** the services come from the dashboard (`additionalServicesService.list()` → GET `/api/additional-services`), managed by KYC on the dashboard's Products & Services page (add, switch off, reorder, terms). A service with `termsText` must have its terms accepted before it can be chosen (tapping it opens the terms sheet; "I accept" chooses it). Sent as `requestedServices` (ids) plus `serviceTermsAccepted: [{ id, version, acceptedAt }]`; `selectedServices` keeps the names for the review screens (`chosenServiceNames` in `constants.tsx`, with `LEGACY_SERVICE_NAMES` for older sessions). After approval the branch Personal Banker sets them up and SMSes the customer. The terms sheet is rendered with a portal into `#app-root` — inside the (transformed) wizard card a `fixed` sheet would be pinned to the card, not the screen.

**`FaceVerify` step — live check:** face-api.js runs in the browser (`utils/liveness.ts`; lazy-loaded, models in `public/models`: tiny face detector + 68 landmarks). The customer holds still (that frame is the selfie), then opens their mouth and turns their head in random order; the video records throughout for KYC. The frames that passed in the browser are sent to `verifyLiveness` (`/api/face/verify-liveness`): the Fayda backend checks them again, runs the anti-spoof model and compares with the Fayda photo, and returns a **signed token**. The token goes with the application; the backend only trusts it for the same selfie/Fayda photo, so the dashboard gets the server's verdict, never a browser score. Failed checks can be retried; after 3 the customer may continue ("our team will review") with the result recorded. If face-api.js cannot run on the device, it falls back to a 5-second video only.

**`ExistingAccount` step:** "Do you already have an account?" — *No* continues the normal flow; *Yes* takes a 16-digit account number (CIF = `substring(6, 13)`) or a 7-digit CIF into `hasExistingAccount` / `existingAccountNumber` / `existingCif`, sent on submit as `existingCustomer` / `existingCif` / `existingAccountNumber`. The dashboard verifies the CIF in FlexCube and, on approval, opens only a new account under it (no new CIF). Sessions saved before this step existed are migrated on load in `App.tsx` (step +1, treated as new customer).

`App.tsx` picks the flow from the URL: `?invite=TOKEN` → `corporate/InviteApp`, `?corporate=ID&key=KEY` → `corporate/StatusPage`, otherwise `IndividualApp` (landing page + the wizard above); the landing page's "Business Account" buttons open `corporate/CorporateApp`. `IndividualApp` owns `OnboardingState`, renders the current step via `renderStep` (a `useMemo`), and wraps non-landing steps in `components/WizardWrapper` (parallax background, logo, progress bar — another wizard passes its own `progress` steps/labels —, referral banner). Each step gets `state`, `onUpdate`, `onNext`, `onBack` props. Every flow renders inside `components/AppShell` (`#app-root`, toaster, `data-theme="ifb"`). The empty `OnboardingState` is `INITIAL_STATE` in `initialState.ts`.

### Business accounts (`corporate/`)

Organizations apply through their representative; everything about documents is managed by KYC on the dashboard (Products → Business Accounts: organization types, sub-types, documents, and the rules — max people per application (≤ 10), max file size, specimen signature required, link validity).

- **`CorporateApp`** (`CorporateStep` in `corporate/types.ts`): Intro → Fayda ID → OTP → Review → Face check → Type of organization → Organization details → Contact & address → Branch → Account (products with audience "organization": `AccountTypeStep audience="organization"`) → Signatories & directors → Documents (+ specimen signature per signatory) → Review & submit → Submitted. The Fayda/OTP/review/face/branch/account screens are the individual steps, fed with `CorporateState.identity` (an `OnboardingState`) through `updateIdentity`.
- **Identity proof:** the OTP step stores the Fayda backend's signed `ekycToken`; with the face check's `faceVerificationToken` the dashboard trusts only what the Fayda backend signed (`identityPayload` in `corporate/api.ts`). The eKYC result is valid 7 days and the face result 48 hours: before submitting (and on resume) the wizard asks again when they are older than 6.5 days / 46 hours (`returnAfterFace` brings the applicant back to where they were).
- **Uploads** (`corporate/FileUpload.tsx`): photos are made smaller on the device (canvas, JPEG on white; 2000 px documents, 1200 px signatures), PDFs go as they are; each upload returns `{fileId, fileKey}` and the application sends those. An upload unused for 7 days is deleted; if the server answers with a `fileId`, that file is asked for again.
- **Other signatories / directors** (`PeopleStep`): for each one the applicant answers "Is this person with you now?". *Yes* → they verify on this phone right away (`CorporateState.guest`: Fayda ID → OTP → review → face check with the individual steps, then `addPerson` mode `with_applicant`). *No* → their mobile (+ optional name) → `addPerson` mode `link`: the bank sends the SMS link `?invite=TOKEN` immediately and returns it (copy / share). They verify on their own phone (`InviteApp`) and the applicant's screen polls `peopleStatus` every 6 s and shows the tick. Each person is a record at the bank (`verificationId` + key, grouped by `CorporateState.groupId`); the name always comes from Fayda. The applicant may submit while links are still open — the application takes the records over, the open links keep working, and it reaches KYC when everyone has verified. Removing a person cancels their link.
- **Status page** `?corporate=ID&key=KEY` (link in the applicant's SMS; also kept in `localStorage` `zemen-business-apps` and listed on the intro screen): status, who has verified (send the link again), and — when KYC returns it — upload of the rejected documents/signatures.
- **Account types per kind of organization:** KYC can limit, per category, which account classes (Account Products for organizations) it can open, optionally per sub-type. The catalog gives `category.accounts` (`null` = every account for organizations); `accountClassesFor(category, subtypeId)` → `AccountTypeStep allowedClasses` → `productService.list(audience, onlyClasses)`. The server refuses other classes on submit; `validateAccount` checks it again before submitting (e.g. after the type was changed from the review screen).
- Validation mirrors the server (`corporate/validation.ts`); fixed company fields, FlexCube LOV codes for industry (`INDUSTRIES`) and source of funds (`SOURCES_OF_FUNDS`).

### State Management

All state is one `OnboardingState` object (`types.ts`) held in `App.tsx` `useState` — no Redux/Zustand/Context, pure prop drilling. `onUpdate(updates: Partial<OnboardingState>)` shallow-merges; `onNext`/`onBack` change the step and `scrollTo` top. Note `state.fcn` holds the **Fayda ID number** (used as `individualId` in eKYC calls); `state.token` is largely vestigial under the current eKYC flow.

### Session Persistence (`services/sessionStore.ts`)

State auto-saves to **IndexedDB** (DB `zemen-onboarding`, store `sessions`), **AES-GCM 256-bit encrypted** via Web Crypto — one entry per flow: `current` (individual), `business` (business wizard), `invite` (verification link). The key is generated once and kept in `localStorage` (`zemen-session-key`); `clearSession(key)` removes it only when no entry is left.

- Auto-save is debounced 800ms (`App.tsx`), and only for steps `Branch ≤ currentStep < Success`.
- On mount, a saved session at step ≥ Branch triggers `ResumeModal` ("resume" vs "start fresh") when the user starts onboarding.
- Reaching `Success` clears the session. All storage operations fail silently (best-effort).

### API Layer (`services/api.ts`)

`faydaService` (POSTs to `api1`):

| Method | Endpoint | Purpose | Called from |
|--------|----------|---------|-------------|
| `verifyFcn` | `/api/fayda/request-otp` | Request OTP for a Fayda ID → `{transactionID, maskedMobile}` | `FaydaIdStep` |
| `validateOtp` | `/api/fayda/ekyc` | OTP → eKYC customer data | `OtpVerificationStep` |
| `resendFcn` | `/api/resend` | Resend OTP | OTP step |
| `screeningCheck` | `/api/screening/check` | Sanctions/OFAC screening (runs right after OTP) | `OtpVerificationStep` |
| `verifyLiveness` | `/api/face/verify-liveness` | Live check: frames re-checked on the server, anti-spoof, match with the Fayda photo → signed token | `FaceVerificationStep` |
| `detectFace` | `/api/face/detect` | Face count + expressions (no longer used by the web app) | — |
| `checkLiveness` | `/api/face/liveness` | Single-frame liveness challenge (no longer used by the web app) | — |
| `passiveLiveness` | `/api/face/passive-liveness` | **Deprecated**, kept for reference | — |
| `uploadFaceVideo` | `/api/face/upload-video` | Upload video for manual KYC | `FaceVerificationStep` |
| `compareFace` | `/api/face/compare` | Match selfie vs Fayda ID photo (the live check does this itself) | — |
| `submitOnboarding` | `/api/flexcube/create-customer` | Final account creation in core banking | `FaceVerificationStep` |

`referralService` (talks to `api2` / dashboard): `verifyAccount` (POST), `validateCode` (GET `/api/referrals/:code`), `getRewards` (GET), `convertPoints` (POST). When changing payload field names, match the backend exactly — several call sites carry comments noting the field names are backend-coupled.

### Referral & Rewards System

- URL referral capture: `?ref=REF-XXXXXXX` is read on mount, validated, and the referrer's name shows as a banner across the wizard. The code is preserved across session resume (`handleResume` won't let a saved session overwrite a freshly-captured code).
- `components/ReferralLinkGenerator.tsx` and `components/RewardsDashboard.tsx` are rendered on the **LandingPage** for existing customers to generate referral links and view/convert reward points.
- Account-number convention used by these components: 16 digits = `BRN(3) + 111(3) + CIF(7) + SEQ(3)`; the customer number is `accountNumber.substring(6, 13)`.

### `constants.tsx`

Static domain data: `COLORS`, `BRANCHES` (full branch list with lat/long + `branchCode`), `WELCOME_FEATURES`, and **FlexCube LOV dropdowns** (`OCCUPATIONS`, `INDUSTRIES`, etc.). The LOV codes must match the FlexCube core-banking `FCUBSPRD.UDTM_LOV` table exactly — do not invent or relabel codes. Account types are **not** here: `AccountTypeStep` loads them from the dashboard (`productService.list()` → GET `/api/account-products`), which KYC officers manage on the dashboard's Account Products page (add, deactivate, reorder). A product maps to `AccountType` (`id` = product id, `isIFB`), each account class to `AccountTier` (`id`/`code` = class code such as `DBSV`, `productNumber`, `interestRate` may be `null` = interest-free). On submit `accountTypeId` = product id, `tierName` = class code, `tierId` = product number. `isIfbAccountType` checks the `isIFB` flag.

### Styling

Tailwind is loaded via **CDN** (`https://cdn.tailwindcss.com` in `index.html`), not a build dependency — there is no PostCSS; the inline `tailwind.config` in `index.html` only adds the `brand` colour. Custom CSS classes (`zemen-gradient`, `red-gradient`, `animate-fade-in`, `custom-scrollbar`, `otp-input`) live in the `<style>` block of `index.html`.

**Brand colour:** wizard steps use the `brand` Tailwind colour (`bg-brand`, `text-brand`, `bg-brand/10`, `hover:bg-brand-dark`, `bg-brand-50`, `shadow-brand-200` …), backed by CSS variables (`--brand`, `--brand-dark`, `--brand-50/100/200`) — red `#ed1c24` by default. When an IFB product is selected, `App.tsx` sets `data-theme="ifb"` and the variables switch to green, and `WizardWrapper` (prop `ifb`) swaps the header logo to Z-Qamar (`public/IFB_logo.png`, a trimmed copy of `IFB.png`, shown on a white card because it has a white background) and every step's background to `public/IFB_background.webp` (a cropped, compressed copy of `IFB_background.png`; see `backgroundFor`). Use `brand` (not `#ed1c24`) for new wizard UI; keep plain `red-*` only for errors/warnings. The landing page and its components still use the literal red. In `COLORS` both `primaryRed` and `primaryBlue` are `#ed1c24` (the "blue" is a leftover).

### Mobile

Most applicants use a phone: check new UI at 360px width. Use responsive classes for large text and padding (e.g. `text-xl sm:text-3xl`, `p-6 sm:p-10`) — the OTP boxes and the Fayda ID field were cut off on phones before they got this treatment.

### Browser APIs

Steps use `navigator.mediaDevices.getUserMedia()` (camera, in `FaceVerificationStep`), `navigator.geolocation` (branch proximity sorting in `BranchSelectionStep`), and Canvas (image compression → base64). `metadata.json` declares the `camera` and `geolocation` frame permissions.

### Path Aliases & Build

`@/*` maps to the project root (set in both `vite.config.ts` and `tsconfig.json`). `index.html` also contains an esm.sh **importmap** for React/lucide/sonner — that is for the AI Studio runtime; the Vite build bundles these from `node_modules`, so the importmap is not the source of truth for local dev/build.

### Environment

`vite.config.ts` exposes `GEMINI_API_KEY` (from `.env.local`) as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`. **This is vestigial scaffold from AI Studio** — there is no `@google/genai` dependency and no code reads these vars. The app runs without `.env.local`; the README's instruction to set `GEMINI_API_KEY` is leftover boilerplate.

### Key Files

| File | Role |
|------|------|
| `App.tsx` | Flow by URL (individual / business / verification link / status page); `IndividualApp` owns the individual state, session save/resume, referral capture |
| `corporate/` | Business accounts: `CorporateApp`, `InviteApp`, `StatusPage`, steps, `FileUpload`, API client, validation |
| `types.ts` | `OnboardingState`, `Step` enum, all domain interfaces |
| `constants.tsx` | Branches, account types, FlexCube LOV dropdowns, colors |
| `services/api.ts` | `faydaService` + `referralService` API clients |
| `services/sessionStore.ts` | Encrypted IndexedDB session persistence |
| `steps/*.tsx` | One component per wizard step (`FaceVerificationStep` is the most complex) |
| `components/` | `AppShell`, `WizardWrapper`, `ProgressBar`, `ResumeModal`, `ReferralLinkGenerator`, `RewardsDashboard` |
