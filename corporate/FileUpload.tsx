import React, { useRef, useState } from 'react';
import { FileText, Upload, Loader2, RefreshCw, Trash2, CheckCircle2, AlertCircle, PenLine } from 'lucide-react';
import { corporateService, UploadAuth } from './api';
import type { UploadedFile } from './types';
import { formatSize } from './constants';

interface Props {
  kind: 'document' | 'signature';
  label: string;
  description?: string;
  required?: boolean;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  auth: UploadAuth;
  maxFileMb: number;
  error?: string;         // e.g. "required"
  note?: React.ReactNode; // e.g. why KYC rejected the previous file
}

// Photos are made smaller on the phone before upload: long side in pixels
const MAX_SIDE = { document: 2000, signature: 1200 };
const PREVIEW_SIDE = 240;

const readAsBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('The file could not be read'));
  reader.readAsDataURL(blob);
});

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image type cannot be opened. Please use a JPG or PNG photo, or a PDF.')); };
  img.src = url;
});

/** Image drawn on a white background (transparent signatures stay readable), as JPEG */
function drawJpeg(img: HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('The image could not be prepared'))), 'image/jpeg', quality));
}

/** One document scan or specimen signature: choose, upload to the bank, replace or remove */
const FileUpload: React.FC<Props> = ({ kind, label, description, required, value, onChange, auth, maxFileMb, error, note }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const maxBytes = maxFileMb * 1024 * 1024;

  const handleFile = async (file: File) => {
    setUploadError('');
    setBusy(true);
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      let data: string;
      let preview: string | undefined;
      let fileName = file.name || `${kind}.jpg`;
      if (isPdf) {
        if (kind === 'signature') throw new Error('Please upload the signature as a photo or scan (JPG or PNG).');
        if (file.size > maxBytes) throw new Error(`The PDF is larger than ${maxFileMb} MB. Please scan it at a lower resolution.`);
        data = await readAsBase64(file);
      } else {
        const img = await loadImage(file);
        let blob = await drawJpeg(img, MAX_SIDE[kind], 0.85);
        if (blob.size > maxBytes) blob = await drawJpeg(img, MAX_SIDE[kind], 0.7);
        if (blob.size > maxBytes) blob = await drawJpeg(img, Math.round(MAX_SIDE[kind] * 0.7), 0.7);
        if (blob.size > maxBytes) throw new Error(`The photo is larger than ${maxFileMb} MB even after making it smaller.`);
        data = await readAsBase64(blob);
        preview = `data:image/jpeg;base64,${await readAsBase64(await drawJpeg(img, PREVIEW_SIDE, 0.7))}`;
        fileName = fileName.replace(/\.[^.]+$/, '') + '.jpg';
      }
      const stored = await corporateService.upload(kind, fileName, data, auth);
      onChange({ ...stored, preview });
    } catch (e: any) {
      setUploadError(e?.message || 'The upload failed. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shownError = uploadError || error;
  const Icon = kind === 'signature' ? PenLine : FileText;

  return (
    <div className={`rounded-2xl border-2 p-4 transition-colors ${
      value ? 'border-green-100 bg-green-50/30' : shownError ? 'border-red-200 bg-red-50/30' : 'border-dashed border-gray-200 bg-gray-50/50'}`}>
      <input ref={inputRef} type="file" className="hidden"
        accept={kind === 'signature' ? 'image/*' : 'image/*,application/pdf'}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${value ? 'bg-green-100 text-green-600' : 'bg-brand/10 text-brand'}`}>
          {value ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 text-sm">
            {label}{required ? <span className="text-brand"> *</span> : <span className="text-gray-400 font-medium"> (optional)</span>}
          </div>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          {note && <div className="mt-2">{note}</div>}

          {value && (
            <div className="mt-3 flex items-center gap-3">
              {value.preview ? (
                <img src={value.preview} alt={label} className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-white" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[10px] font-black text-red-500">PDF</div>
              )}
              <div className="min-w-0 text-xs">
                <div className="font-semibold text-gray-700 truncate">{value.fileName}</div>
                <div className="text-gray-400">{formatSize(value.size)}</div>
              </div>
            </div>
          )}

          {shownError && !busy && (
            <p className="mt-2 text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {shownError}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {busy ? (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-brand py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </span>
            ) : value ? (
              <>
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <RefreshCw className="w-3.5 h-3.5" /> Replace
                </button>
                <button type="button" onClick={() => onChange(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand rounded-lg shadow-sm hover:bg-brand-dark">
                <Upload className="w-3.5 h-3.5" /> {kind === 'signature' ? 'Upload signature' : 'Upload file'}
              </button>
            )}
          </div>
          {!value && !busy && (
            <p className="mt-2 text-[10px] text-gray-400">
              {kind === 'signature'
                ? 'Sign on white paper and take a clear photo. JPG or PNG.'
                : `PDF, JPG or PNG, up to ${maxFileMb} MB. You can take a photo with your phone.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
