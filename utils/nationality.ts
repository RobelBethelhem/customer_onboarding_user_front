import type { ForeignDocumentsState } from '../types';

// Nationality from Fayda: anything other than Ethiopia (any case) is a foreign national, who
// uploads a passport and either a work permit or an Origin ID. The bank applies the same rule.
const ETHIOPIAN = new Set(['ethiopia', 'ethiopian', 'et', 'eth', 'ኢትዮጵያ', 'ኢትዮጵያዊ', 'ኢትዮጵያዊት']);

/** A nationality other than Ethiopia; none given counts as Ethiopian */
export function isForeignNational(nationality?: string): boolean {
  const n = String(nationality || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return !!n && !ETHIOPIAN.has(n);
}

export const FOREIGN_DOCUMENT_LABELS = {
  passport: 'Passport',
  work_permit: 'Work permit',
  origin_id: 'Origin ID',
} as const;

export const EMPTY_FOREIGN_DOCUMENTS: ForeignDocumentsState = {
  passport: null, permitType: 'work_permit', workPermit: null, originId: null,
};

/** The work permit or the Origin ID — whichever the applicant chose to give */
export const chosenPermit = (d: ForeignDocumentsState) => (d.permitType === 'origin_id' ? d.originId : d.workPermit);

/** Passport and the chosen work permit / Origin ID are both uploaded */
export const foreignDocumentsComplete = (d: ForeignDocumentsState) => !!d.passport && !!chosenPermit(d);

/** What goes with the application: { type, fileId, fileKey } (a file the bank already holds has no key) */
export function foreignDocumentRefs(d: ForeignDocumentsState) {
  const permit = chosenPermit(d);
  return [
    d.passport && { type: 'passport', fileId: d.passport.fileId, fileKey: d.passport.fileKey },
    permit && { type: d.permitType, fileId: permit.fileId, fileKey: permit.fileKey },
  ].filter(Boolean) as { type: string; fileId: string; fileKey: string }[];
}

/** The documents of a returned application, as the bank holds them (amending on another device) */
export function foreignDocumentsFromBank(
  list: { type: string; fileId: string; fileName: string; mimeType: string; size: number }[] = []
): ForeignDocumentsState {
  const file = (type: string) => {
    const d = list.find(x => x.type === type);
    return d ? { fileId: d.fileId, fileKey: '', fileName: d.fileName, mimeType: d.mimeType, size: d.size } : null;
  };
  const originId = file('origin_id');
  return { passport: file('passport'), permitType: originId ? 'origin_id' : 'work_permit', workPermit: file('work_permit'), originId };
}
