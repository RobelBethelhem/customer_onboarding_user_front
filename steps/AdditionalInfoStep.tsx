import React, { useState, useEffect } from 'react';
import { UserCheck, DollarSign, Briefcase, Heart, Building2, Tag, Megaphone, Mail } from 'lucide-react';
import { OnboardingState } from '../types';
import { OCCUPATIONS, INDUSTRIES, WEALTH_SOURCES, MARITAL_STATUSES, PROMOTION_TYPES } from '../constants';

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const AdditionalInfoStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [motherNameError, setMotherNameError] = useState('');
  const [motherNameTouched, setMotherNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const info = state.additionalInfo;

  // Prefill email from the verified Fayda eKYC data when available and not yet set
  useEffect(() => {
    if (!info.email && state.faydaData?.email) {
      onUpdate({ additionalInfo: { ...info, email: state.faydaData.email } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive monthly display value from annual stored value
  const monthlyDisplay = info.annualIncome
    ? String(Math.round(Number(info.annualIncome)))
    : '';

  const validateMotherName = (name: string): string => {
    if (!name || name.trim() === '') {
      return 'Mother\'s maiden name is required';
    }

    const trimmed = name.trim();

    // Check for invalid characters (only letters and spaces allowed)
    if (!/^[a-zA-Z\u1200-\u137F\s]+$/.test(trimmed)) {
      return 'Name can only contain letters and spaces';
    }

    const nameParts = trimmed.split(/\s+/).filter(part => part.length > 0);

    if (nameParts.length < 2) {
      return 'Please enter both first name and last name';
    }

    // Each part must be at least 2 characters
    for (const part of nameParts) {
      if (part.length < 2) {
        return 'Each name must be at least 2 characters long';
      }
    }

    return '';
  };

  const handleMotherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;

    // Prevent leading spaces
    if (value.length > 0 && value[0] === ' ') {
      value = value.trimStart();
    }

    // Prevent consecutive spaces
    value = value.replace(/\s{2,}/g, ' ');

    onUpdate({
      additionalInfo: { ...info, motherMaidenName: value }
    });

    if (motherNameTouched) {
      const error = validateMotherName(value);
      setMotherNameError(error);
    }
  };

  const handleMotherNameBlur = () => {
    setMotherNameTouched(true);
    const error = validateMotherName(info.motherMaidenName || '');
    setMotherNameError(error);
  };

  const handleMonthlyIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const monthlyValue = e.target.value;
    // Allow empty or valid numbers only
    if (monthlyValue === '' || /^\d*\.?\d*$/.test(monthlyValue)) {
      const annualValue = monthlyValue
        ? String(Math.round(Number(monthlyValue) ))
        : '';

      onUpdate({
        additionalInfo: { ...info, annualIncome: annualValue }
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdate({
      additionalInfo: { ...info, [name]: value }
    });
  };

  const isFormValid = (): boolean => {
    const hasAllRequired = !!(
      info.motherMaidenName &&
      info.email &&
      info.annualIncome &&
      info.occupation &&
      info.wealthSource &&
      info.maritalStatus &&
      info.promotionType
    );

    // When "Other" is selected the matching specify field becomes required
    const otherFieldsValid =
      (info.occupation !== 'O' || !!info.otherOccupation) &&
      (info.wealthSource !== 'O' || !!info.otherWealthSource) &&
      (info.industry !== 'O' || !!info.otherIndustry);

    const isMotherNameValid = !validateMotherName(info.motherMaidenName || '');
    const isEmailValid = isValidEmail(info.email || '');

    return hasAllRequired && otherFieldsValid && isMotherNameValid && isEmailValid;
  };

  const handleNext = () => {
    setMotherNameTouched(true);
    setEmailTouched(true);
    const error = validateMotherName(info.motherMaidenName || '');
    if (error) {
      setMotherNameError(error);
      return;
    }
    if (!isValidEmail(info.email || '')) {
      return;
    }
    onNext();
  };

  const emailError = emailTouched && !isValidEmail(info.email || '')
    ? (info.email ? 'Please enter a valid email address' : 'Email address is required')
    : '';

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Additional Information</h2>
        <p className="text-sm text-gray-500">Provide required financial and personal details</p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <InputGroup
              label="Mother's Maiden Name"
              name="motherMaidenName"
              value={info.motherMaidenName}
              onChange={handleMotherNameChange}
              onBlur={handleMotherNameBlur}
              placeholder="e.g. Abeba Kebede"
              required
              icon={<UserCheck className="w-4 h-4" />}
            />
            {motherNameError && motherNameTouched && (
              <p className="text-red-500 text-xs mt-1 ml-1">{motherNameError}</p>
            )}
          </div>

          <div>
            <InputGroup
              label="Email Address"
              name="email"
              value={info.email}
              onChange={handleChange}
              onBlur={() => setEmailTouched(true)}
              type="email"
              placeholder="e.g. name@example.com"
              required
              icon={<Mail className="w-4 h-4" />}
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>
            )}
          </div>

          <InputGroup
            label="Tax Identity Number (TIN)"
            name="taxIdentity"
            value={info.taxIdentity}
            onChange={handleChange}
            placeholder="Optional"
            icon={<Tag className="w-4 h-4" />}
          />

          <InputGroup
            label="Monthly Income (ETB)"
            name="monthlyIncomeDisplay"
            value={monthlyDisplay}
            onChange={handleMonthlyIncomeChange}
            type="number"
            placeholder="Enter your monthly income"
            required
          />

          <SelectGroup
            label="Marital Status"
            name="maritalStatus"
            value={info.maritalStatus}
            onChange={handleChange}
            options={MARITAL_STATUSES}
            placeholder="Select marital status"
            required
            icon={<Heart className="w-4 h-4" />}
          />

          <SelectGroup
            label="Occupation"
            name="occupation"
            value={info.occupation}
            onChange={handleChange}
            options={OCCUPATIONS}
            placeholder="Select occupation"
            required
            icon={<Briefcase className="w-4 h-4" />}
          />

          {info.occupation === 'O' && (
            <InputGroup
              label="Occupation (Specify)"
              name="otherOccupation"
              value={info.otherOccupation}
              onChange={handleChange}
              required
            />
          )}

          <SelectGroup
            label="Industry"
            name="industry"
            value={info.industry}
            onChange={handleChange}
            options={INDUSTRIES}
            placeholder="Select industry"
            icon={<Building2 className="w-4 h-4" />}
          />

          {info.industry === 'O' && (
            <InputGroup
              label="Industry (Specify)"
              name="otherIndustry"
              value={info.otherIndustry}
              onChange={handleChange}
              required
            />
          )}

          <SelectGroup
            label="Source of Wealth"
            name="wealthSource"
            value={info.wealthSource}
            onChange={handleChange}
            options={WEALTH_SOURCES}
            placeholder="Select source of wealth"
            required
            icon={<DollarSign className="w-4 h-4" />}
          />

          {info.wealthSource === 'O' && (
            <InputGroup
              label="Source of Wealth (Specify)"
              name="otherWealthSource"
              value={info.otherWealthSource}
              onChange={handleChange}
              required
            />
          )}

          <SelectGroup
            label="How did you hear about us?"
            name="promotionType"
            value={info.promotionType}
            onChange={handleChange}
            required
            options={PROMOTION_TYPES}
            placeholder="Select option"
            icon={<Megaphone className="w-4 h-4" />}
          />

        </div>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          disabled={!isFormValid()}
          onClick={handleNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl shadow-lg transition-all ${
            isFormValid() ? 'bg-[#ed1c24] shadow-red-200 hover:bg-[#d41920]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const InputGroup = ({ label, name, value, onChange, onBlur, placeholder, type = "text", required, icon }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
      {label} {required && '*'}
    </label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-3 text-gray-400">{icon}</div>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full ${icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ed1c24]/10 font-semibold transition-all`}
      />
    </div>
  </div>
);

const SelectGroup = ({ label, name, value, onChange, options, placeholder, icon, required }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-3 text-gray-400">{icon}</div>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full ${icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ed1c24]/10 font-semibold transition-all appearance-none ${
          !value ? 'text-gray-400' : 'text-gray-800'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);

export default AdditionalInfoStep;