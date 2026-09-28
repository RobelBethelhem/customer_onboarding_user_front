
import React from 'react';
import { User, MapPin, Calendar, Smartphone, Mail, ShieldCheck } from 'lucide-react';
import { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onNext: () => void;
  onBack: () => void;
}

/** Ensure base64 photo string has a proper data URI prefix for <img src> */
const toDataUri = (photo: string | undefined | null): string => {
  if (!photo) return '';
  if (photo.startsWith('data:image')) return photo;
  // Detect JPEG vs PNG by first bytes: /9j/ = JPEG, iVBOR = PNG
  const mime = photo.startsWith('/9j/') ? 'image/jpeg' : photo.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${photo}`;
};

const DataReviewStep: React.FC<Props> = ({ state, onNext, onBack }) => {
  const data = state.faydaData;

  if (!data) return null;

  const photoSrc = toDataUri(data.photo);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Review Data</h2>
          <p className="text-sm text-gray-500">Verified identity information</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase">Identity Verified</span>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 bg-gray-50 rounded-2xl">
          <div className="w-32 h-40 bg-gray-200 rounded-xl overflow-hidden border-4 border-white shadow-sm flex-shrink-0">
            {photoSrc ? (
              <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 leading-tight">{data.fullName.eng}</h3>
              <p className="text-gray-500 font-medium text-lg">{data.fullName.amh}</p>
            </div>
            <div className="inline-block bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
              UIN: {data.uin}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Personal Info
            </h4>
            <div className="space-y-3">
              <DetailRow label="Date of Birth" value={data.dateOfBirth} icon={<Calendar className="w-4 h-4" />} />
              <DetailRow label="Gender" value={data.gender.eng} icon={<User className="w-4 h-4" />} />
              <DetailRow label="Phone Number" value={data.phone} icon={<Smartphone className="w-4 h-4" />} />
              <DetailRow label="Email" value={data.email || 'Not Provided'} icon={<Mail className="w-4 h-4" />} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Address Info
            </h4>
            <div className="space-y-3">
              <DetailRow label="Region" value={data.region.eng} />
              <DetailRow label="Zone" value={data.zone.eng} />
              <DetailRow label="Woreda" value={data.woreda.eng} />
              <DetailRow label="Status" value={data.residenceStatus.eng} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700 leading-relaxed italic">
            "The information above has been verified through the National Fayda ID system and cannot be modified."
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-semibold text-gray-400 uppercase">{label}</span>
    <div className="flex items-center gap-2 text-gray-800 font-bold">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span>{value}</span>
    </div>
  </div>
);

export default DataReviewStep;
