import { Branch, OnboardingState } from '../types';
import { branchService, faydaService } from '../services/api';
import { BRANCHES } from '../constants';
import type { ExistingCustomerMatch } from '../components/ExistingCustomerPrompt';

/**
 * The branch directory entry of a FlexCube home branch code. An IFB code (e.g. 664) gives its
 * conventional branch — interest-free accounts are mapped back to the IFB code when submitted.
 */
export async function homeBranch(code: string): Promise<Branch> {
  let list: Branch[] = [];
  try { list = (await branchService.list()).data || []; } catch { list = BRANCHES; }
  return list.find(b => b.branchCode === code) || list.find(b => b.ifbCode === code)
    || { id: 0, name: `Branch ${code}`, category: 'City', type: 'Branch', latitude: null, longitude: null, branchCode: code };
}

/**
 * Is the person who just verified with Fayda already a customer? The Fayda backend looks their
 * national ID up in FlexCube. Null when not, or when it cannot be checked now (the bank checks
 * again on submission).
 */
export async function findExistingCustomer(ekycToken: string): Promise<ExistingCustomerMatch | null> {
  if (!ekycToken) return null;
  try {
    const r = await faydaService.customerByFayda(ekycToken);
    if (!r.found) return null;
    if (r.restricted) return { restricted: true, message: r.message };
    return { cif: r.cif, branch: r.branchCode ? await homeBranch(r.branchCode) : null };
  } catch {
    return null;
  }
}

/** "Yes, open another account": the application continues as an existing customer of that CIF */
export const asExistingCustomer = (match: ExistingCustomerMatch): Partial<OnboardingState> => ({
  hasExistingAccount: true,
  existingCif: match.cif || '',
  existingAccountNumber: '',
  ...(match.branch ? { selectedBranch: match.branch, branchFromCif: true } : { branchFromCif: false }),
});
