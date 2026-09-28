
import React, { useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DocumentUploadStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {

  const compressAndToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height && width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.75);
          resolve(base64.split(',')[1]); // Strip prefix
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly cast to File[] to avoid 'unknown' type inference from Array.from(FileList)
    const files = Array.from(e.target.files || []) as File[];
    const newDocs = await Promise.all(files.map(async (f, i) => ({
      base64: await compressAndToBase64(f),
      label: `Document ${state.documents.length + i + 1}`
    })));
    onUpdate({ documents: [...state.documents, ...newDocs] });
  };

  const removeDoc = (index: number) => {
    const updated = state.documents.filter((_, i) => i !== index);
    onUpdate({ documents: updated });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Upload Documents</h2>
        <p className="text-sm text-gray-500">Attach ID cards, marriage certificates, etc.</p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-[#ed1c24]/40 hover:bg-red-50/20 transition-all group">
          <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
          <div className="inline-flex p-4 bg-gray-50 rounded-full group-hover:bg-red-50 mb-4 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#ed1c24]" />
          </div>
          <p className="text-gray-600 font-bold">Click to browse or drag & drop</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG supported (Max 5MB per file)</p>
        </label>

        {state.documents.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {state.documents.map((doc, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center">
                <img src={`data:image/jpeg;base64,${doc.base64}`} alt={doc.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => removeDoc(idx)} className="p-2 bg-red-600 text-white rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] font-bold text-white uppercase">{doc.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="w-full text-center text-sm font-bold text-gray-400 py-2 hover:text-[#ed1c24] transition-colors">
          Proceed without documents
        </button>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button 
          onClick={onNext}
          className="flex-[2] py-3 bg-[#ed1c24] text-white font-bold rounded-xl shadow-lg shadow-red-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadStep;
