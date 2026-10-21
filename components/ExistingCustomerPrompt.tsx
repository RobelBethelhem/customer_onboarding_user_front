import React from 'react';
import { UserCheck, AlertTriangle, Building2, Hash } from 'lucide-react';
import { Branch } from '../types';

// The applicant said they have no account, but their Fayda national ID already has a CIF at the bank
export interface ExistingCustomerMatch {
  cif?: string;            // their customer number (CIF)
  branch?: Branch | null;  // their home branch, where another account is opened
  restricted?: boolean;    // an account of theirs is frozen / on No-Debit: only the branch can help
  message?: string;
}

interface Props {
  match: ExistingCustomerMatch;
  accountName?: string;    // the account they chose, e.g. "Basic Saving — Digital"
  onYes: () => void;       // open the new account under the existing CIF
  onNo: () => void;        // stop here
}

/** "You already have an account" — open another one under it (Yes) or stop (No) */
const ExistingCustomerPrompt: React.FC<Props> = ({ match, accountName, onYes, onNo }) => {
  if (match.restricted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center h-full">
        <div className="p-5 bg-amber-100 rounded-full mb-6">
          <AlertTriangle className="w-12 h-12 text-amber-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">Please visit a branch</h2>
        <p className="text-gray-600 mb-2 max-w-sm">Dear customer, you already have an account with Zemen Bank.</p>
        <p className="text-gray-600 mb-8 max-w-sm">
          {match.message || 'One of your accounts is frozen or on No-Debit. Please visit a Zemen Bank branch to continue.'}
        </p>
        <button onClick={onNo} className="px-8 py-3 bg-brand text-white font-bold rounded-xl">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 sm:p-10 flex-1 flex flex-col items-center text-center">
        <div className="p-5 bg-brand-50 rounded-full mb-6">
          <UserCheck className="w-12 h-12 text-brand" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">You already bank with us</h2>
        <p className="text-gray-600 max-w-sm">Dear customer, you already have an account with Zemen Bank.</p>

        <div className="w-full max-w-sm mt-6 p-4 rounded-xl border border-gray-100 bg-gray-50 text-left space-y-2 text-sm">
          {match.cif && (
            <p className="flex items-center gap-2 text-gray-700">
              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Customer number (CIF): <b className="font-mono">{match.cif}</b></span>
            </p>
          )}
          {match.branch && (
            <p className="flex items-center gap-2 text-gray-700">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Home branch: <b>{match.branch.name}</b></span>
            </p>
          )}
        </div>

        <p className="mt-6 font-semibold text-gray-800 max-w-sm">
          Do you want to open {accountName ? <>a new <span className="text-brand">{accountName}</span></> : 'another account'} under
          your existing customer profile?
        </p>
        <p className="mt-2 text-xs text-gray-500 max-w-sm">
          {match.branch ? 'It will be opened at your home branch. ' : ''}No new customer profile is needed.
        </p>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onNo} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          No
        </button>
        <button onClick={onYes} className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200">
          Yes, open another account
        </button>
      </div>
    </div>
  );
};

export default ExistingCustomerPrompt;
