import React from 'react';
import { CheckCircle2, MessageSquare, ExternalLink, Home, Clock } from 'lucide-react';
import type { SubmitResult } from '../types';
import { roleText } from '../constants';

interface Props {
  result: SubmitResult;
  onOpenStatus: () => void;
  onHome: () => void;
}

/** Application received: its number, who still verifies, where to follow it */
const SubmittedStep: React.FC<Props> = ({ result, onOpenStatus, onHome }) => {
  const others = result.view.people.filter(p => !p.isApplicant);
  const notYet = others.filter(p => !p.verified).length;
  const waiting = result.status === 'awaiting_verification';

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 sm:p-10 flex-1 flex flex-col items-center text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Application Received</h2>
          <p className="text-gray-500 mt-1">{result.view.organizationName}</p>
        </div>
        <div className="px-5 py-3 rounded-2xl bg-gray-50">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Application number</div>
          <div className="text-2xl font-black text-brand tracking-wider">{result.applicationId}</div>
        </div>

        {waiting ? (
          <div className="w-full text-left space-y-3">
            <div className="p-4 rounded-2xl bg-blue-50 text-sm text-blue-800 flex gap-3">
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span>
                {notYet === 1 ? 'One person has' : `${notYet} people have`} not verified yet. They use the link we sent to their
                phone; the application goes to our team once everyone has verified.
              </span>
            </div>
            <ul className="space-y-2">
              {others.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">{p.fullName}</div>
                    <div className="text-xs text-gray-400">{[roleText(p.roles), p.phone].filter(Boolean).join(" · ")}</div>
                  </div>
                  {p.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-600 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 flex-shrink-0">
                      <Clock className="w-3 h-3" /> Waiting
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-600 max-w-md">Our team is reviewing your application. We will send you an SMS when there is news.</p>
        )}

        <p className="text-xs text-gray-400 max-w-md">
          We also sent you an SMS with a link to follow the application. Keep it — it is how you see its progress and
          send documents again if our team asks.
        </p>
      </div>

      <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
        <button onClick={onHome}
          className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
          <Home className="w-4 h-4" /> Home
        </button>
        <button onClick={onOpenStatus}
          className="flex-[2] py-3 text-white font-bold rounded-xl bg-brand shadow-lg shadow-brand-200 hover:bg-brand-dark flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" /> Follow the Application
        </button>
      </div>
    </div>
  );
};

export default SubmittedStep;
