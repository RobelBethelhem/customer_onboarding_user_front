/**
 * DEMO MODE — local only (`npm run dev:demo`). Answers the web app's calls to the bank's servers
 * (api1 / api2) with sample data, so every screen can be tried on this computer without the
 * Fayda backend or the dashboard. Nothing is sent anywhere: any Fayda ID and any 6-digit OTP work,
 * uploads and applications stay in this browser (localStorage). A small panel at the bottom
 * plays the bank's part (KYC returns / approves, the SMS verification links).
 *
 * Loaded from index.tsx only when import.meta.env.DEV and VITE_DEMO=1: never part of a build.
 */
import { BRANCHES } from '../constants';

type Json = Record<string, any>;
const STORE = 'zemen-demo-applications';
const FILES = 'zemen-demo-files';
const APPLICANT_NAME = 'HIRUT ABEBE WOLDE';
const DAY = 24 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const rand = (n = 10) => Math.random().toString(36).slice(2, 2 + n);
const load = (key: string): Json => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
const save = (key: string, v: Json) => localStorage.setItem(key, JSON.stringify(v));
const mask = (p: string) => (p && p.length >= 6 ? `${p.slice(0, 2)}******${p.slice(-2)}` : p);
const ok = (data: unknown, status = 200) => ({ status, body: { success: true, data } });
const err = (error: string, status = 400) => ({ status, body: { success: false, error } });

// ─── Sample catalog (the dashboard's defaults from the KYC procedure) ─────────────────────────
const d = (id: string, name: string, description = '', required = true, subtypes: string[] = []) => ({ id, name, description, required, subtypes });
const s = (id: string, name: string) => ({ id, name });
const CATALOG = {
  rules: { maxPeople: 10, maxFileMb: 5, signatureRequired: true, inviteValidDays: 14 },
  categories: [
    {
      id: 'business', name: 'Business Organization', description: 'Sole proprietorships, private limited companies, share companies and other businesses.',
      subtypes: [s('sole_proprietorship', 'Sole proprietorship'), s('plc', 'Private limited company (PLC)'), s('share_company', 'Share company (SC)'), s('other_business', 'Other business organization')],
      documents: [
        d('application_letter', 'Application letter', 'Letter applying to open the account, naming the signatories appointed to operate it.'),
        d('registration_certificate', 'Registration license / certificate', 'From the concerned government body.'),
        d('trade_license', 'Trade license', 'Renewed, from the government body authorized to issue it.'),
        d('moa_aoa', 'Memorandum and Articles of Association', 'For private limited companies and share companies.', true, ['plc', 'share_company']),
        d('tin_certificate', 'TIN certificate', 'Taxpayer registration certificate.', false),
        d('vat_certificate', 'VAT registration certificate', 'If registered for VAT.', false),
        d('investment_license', 'Investment license', 'If the business holds one.', false),
      ],
    },
    {
      id: 'public_enterprise', name: 'Public Enterprise', description: 'Government-owned enterprises established by proclamation.', subtypes: [],
      documents: [
        d('board_letter', 'Letter from the Board of Directors or General Manager', 'Formal letter naming, among other things, the authorized signatories.'),
        d('appointment_letter', 'Letter of appointment', 'From the General Manager.'),
        d('negarit_gazette', 'Negarit Gazette', 'Bearing the proclamation establishing the enterprise.'),
      ],
    },
    {
      id: 'ngo', name: 'NGO (Local or International)', description: 'Charities and non-governmental organizations.',
      subtypes: [s('local', 'Local NGO'), s('international', 'International NGO')],
      documents: [
        d('application_letter', 'Application letter', 'Letter applying to open the account.'),
        d('license', 'License', 'From the concerned government body.'),
        d('signatory_authorization', 'Authorization of signatories', 'From the Charities and Societies Agency.'),
        d('constitution', 'Constitution / Charter', 'Of the organization.'),
        d('operators_list', 'Persons authorized to operate the account', 'As specified in the Constitution/Charter or another document.'),
        d('work_permit', 'Work or residence permit', 'For foreign national signatories.', false),
      ],
    },
    {
      id: 'religious', name: 'Religious Organization', description: 'Churches, mosques and other religious institutions.',
      subtypes: [s('orthodox', 'Ethiopian Orthodox Church'), s('catholic', 'Catholic Church'), s('islamic', 'Islamic organization'),
        s('eecmy', 'Ethiopian Evangelical Church Mekane Yesus'), s('other_religion', 'Other religious denomination')],
      documents: [
        d('application_letter', 'Application letter', 'Letter applying to open the account.'),
        d('support_patriarch', 'Letter of support from the Patriarch', 'Or his designate.', true, ['orthodox']),
        d('support_cardinal', 'Letter of support from the Cardinal', 'Or his designate.', true, ['catholic']),
        d('support_islamic_council', 'Letter of support from the Islamic Council', 'From the Islamic Council office.', true, ['islamic']),
        d('support_eecmy', 'Letter of support from the President', 'Of the Ethiopian Evangelical Church Mekane Yesus, or his designate.', true, ['eecmy']),
        d('support_federal_affairs', 'Letter of support from the concerned government body', 'Currently the Ministry of Federal Affairs.', true, ['other_religion']),
      ],
    },
    {
      id: 'cooperative', name: 'Cooperative, Association or Edir', description: 'Cooperatives, associations and Edirs.',
      subtypes: [s('cooperative', 'Cooperative'), s('association', 'Association'), s('edir', 'Edir')],
      documents: [
        d('registration_certificate', 'Certificate of registration', 'Or letter of support from the appropriate government body certifying the establishment.'),
        d('moa_aoa', 'Memorandum and Articles of Association', 'Duly registered, where applicable.', false),
        d('rules_regulations', 'Rules and regulations', 'Approved and registered, bearing the stamps of the registering body and the cooperative.', true, ['cooperative']),
        d('empowerment_letter', 'Letter naming the persons who operate the account', 'As per the memorandum and articles of association.'),
      ],
    },
  ],
};

const cls = (code: string, name: string, interestRate: number | null, minBalance: number | null, productNumber: string) =>
  ({ code, name, interestRate, minBalance, maxBalance: null, remarks: '', productNumber });
const PRODUCTS_ORG = [
  { id: 'business_current', name: 'Business Current Account', description: 'Cheque account for the daily operations of the organization.', isIFB: false,
    classes: [cls('BCUR', 'Business Current', null, 5000, '210')] },
  { id: 'business_saving', name: 'Business Saving Account', description: 'Interest-bearing savings for organizations.', isIFB: false,
    classes: [cls('BSAV', 'Business Saving', 7, 1000, '211'), cls('BSVP', 'Business Saving Plus', 8.5, 500000, '212')] },
  { id: 'ifb_business', name: 'Z-Qamar Business Wadiah Account', description: 'Interest-free account for organizations (Interest-Free Banking).', isIFB: true,
    classes: [cls('IBWD', 'Business Wadiah', null, 1000, '971')] },
];
const PRODUCTS_INDIVIDUAL = [
  { id: 'saving-account', name: 'Saving Account', description: 'Everyday savings.', isIFB: false,
    classes: [cls('DBSV', 'Basic Saving — Digital', 7, 0, '121'), cls('ZDAC', 'Z-Club Saving', 9, 50000, '122')] },
  { id: 'ifb-saving-account', name: 'Z-Qamar Saving Account', description: 'Interest-free savings.', isIFB: true,
    classes: [cls('DWAD', 'Wadiah Saving', null, 0, '971')] },
];
const SERVICES = [
  { id: 'mobile_banking', name: 'Mobile Banking', summary: 'Bank from your phone.', details: ['Transfers', 'Bill payments'], icon: 'smartphone' },
  { id: 'internet_banking', name: 'Internet Banking', summary: 'Bank from your computer.', details: ['Statements', 'Transfers'], icon: 'globe' },
  { id: 'debit_card', name: 'Debit Card', summary: 'Pay and withdraw cash.', details: ['ATM', 'POS'], icon: 'credit-card' },
];

// ─── A Fayda photo: a drawn placeholder portrait ─────────────────────────────────────────────
let photoCache = '';
function samplePhoto(): string {
  if (photoCache) return photoCache;
  const c = document.createElement('canvas');
  c.width = 240; c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, 240, 300);
  g.fillStyle = '#8a94a3';
  g.beginPath(); g.arc(120, 115, 55, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(120, 290, 95, 90, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#5b6573'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('DEMO', 120, 28);
  photoCache = c.toDataURL('image/jpeg', 0.85).split(',')[1];
  return photoCache;
}

/** Who verifies with Fayda: on a verification link, the invited person; otherwise the applicant */
function currentPerson() {
  const token = new URLSearchParams(location.search).get('invite');
  const found = token ? findInvite(token) : null;
  const name = found ? found.person.fullName.toUpperCase() : APPLICANT_NAME;
  return { name, phone: found ? found.person.rawPhone : '0911000011' };
}

// ─── Applications kept in this browser ───────────────────────────────────────────────────────
const apps = () => load(STORE);
const putApp = (a: Json) => { const all = apps(); all[a.applicationId] = a; save(STORE, all); };
const view = (a: Json) => ({
  ...a,
  people: a.people.map((p: Json) => ({ ...p, rawPhone: undefined, phone: mask(p.rawPhone) })),
  rules: { maxFileMb: CATALOG.rules.maxFileMb, signatureRequired: CATALOG.rules.signatureRequired },
});
const inviteToken = (a: Json, p: Json) => `demo-${a.applicationId}-${p.id}-${a.accessKey.slice(0, 6)}`;
function findInvite(token: string) {
  const m = token.match(/^demo-(ZMC-\d+)-(P\d+)-/);
  const a = m ? apps()[m[1]] : null;
  const person = a?.people.find((p: Json) => p.id === m![2]);
  return a && person && inviteToken(a, person) === token ? { app: a, person } : null;
}
const roleText = (roles: string[]) =>
  roles.includes('signatory') && roles.includes('director') ? 'signatory and director'
    : roles.includes('signatory') ? 'signatory' : roles.includes('director') ? 'director' : 'representative';

function submit(body: Json) {
  const o = body.organization || {};
  const category = CATALOG.categories.find(c => c.id === o.categoryId);
  if (!category) return err('Choose the type of your organization');
  const files = load(FILES);
  const all = apps();
  const n = Object.keys(all).length + 1;
  const applicationId = `ZMC-${String(90000 + n)}`;
  const people = [
    { id: 'P1', fullName: APPLICANT_NAME, roles: body.applicant.roles, isApplicant: true, verified: true, rawPhone: body.applicant.phone,
      signature: body.applicant.signature ? { fileName: files[body.applicant.signature.fileId] || 'signature.jpg', status: 'pending' } : null },
    ...body.people.map((p: Json, i: number) => ({
      id: `P${i + 2}`, fullName: p.fullName, roles: p.roles, isApplicant: false, verified: false, rawPhone: p.phone,
      inviteSentAt: new Date().toISOString(), inviteExpiresAt: new Date(Date.now() + 14 * DAY).toISOString(),
      signature: p.signature ? { fileName: files[p.signature.fileId] || 'signature.jpg', status: 'pending' } : null,
    })),
  ];
  const docs = category.documents.filter(x => !x.subtypes.length || x.subtypes.includes(o.subtypeId));
  const app = {
    applicationId, accessKey: rand(16), status: people.length === 1 ? 'pending' : 'awaiting_verification',
    organizationName: o.name, categoryName: category.name, submittedAt: new Date().toISOString(),
    branch: BRANCHES.find(b => b.branchCode === body.branchCode)?.name || body.branchCode,
    people,
    documents: docs.map(x => {
      const given = body.documents.find((g: Json) => g.docId === x.id);
      return { docId: x.id, name: x.name, required: x.required, fileName: given ? files[given.fileId] || 'document.pdf' : '', status: given ? 'pending' : 'missing' };
    }),
  };
  putApp(app);
  return ok({ applicationId, accessKey: app.accessKey, status: app.status, view: view(app) }, 201);
}

// ─── Routes ───────────────────────────────────────────────────────────────────────────────────
function route(api: string, path: string, q: URLSearchParams, method: string, body: Json | null): { status: number; body: unknown } {
  if (api === 'api2') {
    if (path === '/api/branches') return ok(BRANCHES.slice(0, 25));
    if (path === '/api/account-products') return ok(q.get('for') === 'organization' ? PRODUCTS_ORG : PRODUCTS_INDIVIDUAL);
    if (path === '/api/additional-services') return ok(SERVICES);
    if (path.startsWith('/api/referrals/')) return ok({ valid: false });
    if (path === '/api/applications/status') return { status: 200, body: { success: true, found: false } };
    return err('Not available in demo mode', 404);
  }

  // Fayda backend (api1)
  if (path === '/api/fayda/request-otp') return { status: 200, body: { success: true, transactionID: rand(), maskedMobile: '09******11' } };
  if (path === '/api/resend') return { status: 200, body: { success: true } };
  if (path === '/api/fayda/ekyc') {
    const who = currentPerson();
    return {
      status: 200,
      body: {
        psut: `DEMO${rand(12).toUpperCase()}`,
        ekycToken: `demo-ekyc-${rand()}`,
        identity: {
          name_eng: who.name, name_amh: 'ናሙና ስም', dob: '1988-04-12', gender_eng: 'Female', gender_amh: 'ሴት',
          phone: who.phone, email: '', region_eng: 'Addis Ababa', region_amh: 'አዲስ አበባ', zone_eng: 'Bole', zone_amh: 'ቦሌ',
          woreda_eng: 'Woreda 03', woreda_amh: 'ወረዳ 03', residenceStatus_eng: 'Citizen', residenceStatus_amh: 'ዜጋ', photo: samplePhoto(),
        },
      },
    };
  }
  if (path === '/api/screening/check') return { status: 200, body: { success: true, blocked: false, hasPEP: false, riskLevel: 'LOW', matches: [] } };
  if (path === '/api/face/verify-liveness') {
    return { status: 200, body: { success: true, passed: true, matched: true, similarity: 0.87, antiSpoofScore: 0.96, failed: null, message: 'Face verified (demo)', token: `demo-face-${rand()}` } };
  }
  if (path === '/api/face/upload-video') return { status: 200, body: { success: true, videoId: `demo-video-${rand()}` } };
  if (path === '/api/flexcube/create-customer') {
    return { status: 200, body: { success: true, status: 'pending', customerId: `DEMO-${rand(6)}`, message: 'Application received (demo)' } };
  }

  // Business accounts
  if (path === '/api/corporate/catalog') return ok(CATALOG);
  if (path === '/api/corporate/files' && method === 'POST') {
    const fileId = `demo-file-${rand(12)}`;
    const files = load(FILES); files[fileId] = body!.fileName; save(FILES, files);
    const size = Math.round(String(body!.data || '').length * 0.75);
    const mimeType = String(body!.data || '').startsWith('JVBER') ? 'application/pdf' : 'image/jpeg';
    return ok({ fileId, fileKey: rand(16), fileName: body!.fileName, mimeType, size }, 201);
  }
  if (path === '/api/corporate/applications' && method === 'POST') return submit(body!);

  let m = path.match(/^\/api\/corporate\/applications\/(ZMC-\d+)$/);
  if (m) {
    const a = apps()[m[1]];
    const key = method === 'GET' ? q.get('key') : body?.key;
    if (!a || a.accessKey !== key) return err('Application not found', 404);
    if (method === 'GET') return ok(view(a));
    if (body!.action === 'resend') {
      const p = a.people.find((x: Json) => x.id === body!.personId);
      if (!p || p.verified) return err('This person has already verified.', 409);
      p.inviteSentAt = new Date().toISOString(); p.inviteExpiresAt = new Date(Date.now() + 14 * DAY).toISOString();
      putApp(a);
      return ok(view(a));
    }
    if (body!.action === 'resubmit') {
      if (a.status !== 'returned') return err('This application is not waiting for changes.', 409);
      const files = load(FILES);
      for (const x of body!.documents) {
        const doc = a.documents.find((y: Json) => y.docId === x.docId);
        Object.assign(doc, { fileName: files[x.fileId] || doc.fileName, status: 'pending', note: undefined });
      }
      for (const x of body!.signatures) {
        const p = a.people.find((y: Json) => y.id === x.personId);
        p.signature = { fileName: files[x.fileId] || 'signature.jpg', status: 'pending' };
      }
      a.status = a.people.every((p: Json) => p.verified) ? 'pending' : 'awaiting_verification';
      a.returnReason = undefined;
      putApp(a);
      return ok(view(a));
    }
    return err('Unknown action');
  }

  m = path.match(/^\/api\/corporate\/invites\/(.+)$/);
  if (m) {
    const found = findInvite(decodeURIComponent(m[1]));
    if (!found) return err('This link is not valid any more. Ask the person who applied to send you a new one.', 404);
    const { app: a, person: p } = found;
    if (method === 'GET') {
      return ok({
        applicationId: a.applicationId, organizationName: a.organizationName, categoryName: a.categoryName, applicantName: APPLICANT_NAME,
        fullName: p.fullName, roles: p.roles, roleText: roleText(p.roles), verified: p.verified, verifiedName: p.verified ? p.fullName.toUpperCase() : undefined,
        expired: false, expiresAt: p.inviteExpiresAt, open: a.status === 'awaiting_verification',
      });
    }
    if (p.verified) return err('You have already verified. Thank you!', 409);
    p.verified = true;
    p.fullName = p.fullName.toUpperCase();
    const allVerified = a.people.every((x: Json) => x.verified);
    if (allVerified) a.status = 'pending';
    putApp(a);
    return ok({ fullName: p.fullName, organizationName: a.organizationName, applicationId: a.applicationId, allVerified });
  }

  return err('Not available in demo mode', 404);
}

// ─── The bank's side: a small panel at the bottom of the screen ─────────────────────────────
function bankActions(panel: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const id = params.get('corporate');
  const a = id ? apps()[id] : null;
  panel.innerHTML = '';
  const title = document.createElement('div');
  title.textContent = 'DEMO MODE — sample data, nothing goes to the bank';
  title.style.cssText = 'font-weight:800;letter-spacing:.04em;margin-bottom:4px';
  panel.appendChild(title);
  if (!a) return;

  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin:3px 4px 0 0;padding:4px 8px;border-radius:8px;border:1px solid #fff6;background:#ffffff22;color:#fff;font:inherit;cursor:pointer';
    b.onclick = () => { fn(); putApp(a); location.reload(); };
    panel.appendChild(b);
  };
  const link = (label: string, href: string) => {
    const l = document.createElement('a');
    l.textContent = label; l.href = href;
    l.style.cssText = 'display:block;color:#fde68a;margin-top:3px;text-decoration:underline';
    panel.appendChild(l);
  };
  const waiting = a.people.filter((p: Json) => !p.verified);
  if (a.status === 'awaiting_verification') {
    waiting.forEach((p: Json) => link(`SMS link of ${p.fullName} → open`, `${location.pathname}?invite=${inviteToken(a, p)}`));
    btn('Everyone verifies', () => { a.people.forEach((p: Json) => { p.verified = true; p.fullName = p.fullName.toUpperCase(); }); a.status = 'pending'; });
  }
  if (['pending', 'in_review'].includes(a.status)) {
    btn('KYC returns it', () => {
      const doc = a.documents.find((x: Json) => x.status !== 'missing') || a.documents[0];
      Object.assign(doc, { status: 'rejected', note: 'The copy is not readable — please scan it again.' });
      a.documents.forEach((x: Json) => { if (x !== doc && x.status === 'pending') x.status = 'accepted'; });
      const signer = a.people.find((p: Json) => p.signature && !p.isApplicant) || a.people.find((p: Json) => p.signature);
      if (signer) signer.signature = { ...signer.signature, status: 'rejected', note: 'The signature is blurred.' };
      a.status = 'returned';
      a.returnReason = `Please upload ${doc.name} again${signer ? ' and a clear specimen signature' : ''}.`;
    });
    btn('KYC approves', () => {
      a.documents.forEach((x: Json) => { if (x.status === 'pending') x.status = 'accepted'; });
      a.people.forEach((p: Json) => { if (p.signature) p.signature.status = 'accepted'; });
      Object.assign(a, { status: 'approved', cifNumber: '0' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'), accountNumber: '1641110' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0') });
    });
    btn('KYC rejects', () => Object.assign(a, { status: 'rejected', rejectionReason: 'The trade license belongs to another business.' }));
  }
}

function showPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;max-width:340px;padding:8px 10px;border-radius:12px;'
    + 'background:#111827e6;color:#fff;font:12px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px #0006';
  document.body.appendChild(panel);
  let last: string | null = null;
  const refresh = () => { if (location.search !== last) { last = location.search; bankActions(panel); } };
  refresh();
  setInterval(refresh, 500);
}

export function installMockApi() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const m = url.match(/^https:\/\/onboard\.zemenbank\.com\/(api1|api2)(\/[^?]*)(\?.*)?$/);
    if (!m) return realFetch(input, init);
    await sleep(350 + Math.random() * 400);
    let body: Json | null = null;
    try { body = init?.body ? JSON.parse(String(init.body)) : null; } catch { body = null; }
    const r = route(m[1], m[2], new URLSearchParams(m[3] || ''), (init?.method || 'GET').toUpperCase(), body);
    console.info(`[demo] ${init?.method || 'GET'} ${m[1]}${m[2]} → ${r.status}`);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  };
  if (document.body) showPanel(); else window.addEventListener('DOMContentLoaded', showPanel);
}
