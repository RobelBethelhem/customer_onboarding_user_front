import type { CorporateCatalog, CorporateState, OrganizationForm } from './types';
import { CorporateStep, documentsFor } from './types';
import { EMAIL, normalizeMobile } from './constants';

// Same checks as the bank's server, so the customer sees them on the right screen.
// Each returns field → message; empty means the step is complete.
type Errors = Record<string, string>;

export function validateCategory(org: OrganizationForm, catalog: CorporateCatalog): Errors {
  const category = catalog.categories.find(c => c.id === org.categoryId);
  if (!category) return { categoryId: 'Choose the type of your organization' };
  if (category.subtypes.length && !category.subtypes.some(s => s.id === org.subtypeId)) {
    return { subtypeId: `Choose which kind of ${category.name} it is` };
  }
  return {};
}

export function validateOrganization(org: OrganizationForm): Errors {
  const e: Errors = {};
  if (org.name.trim().length < 2) e.name = 'Enter the name of the organization';
  if (!org.registrationNumber.trim()) e.registrationNumber = 'Enter the registration or license number';
  const tin = org.tin.replace(/\s/g, '');
  if (tin && !/^\d{10}$/.test(tin)) e.tin = 'The TIN has 10 digits';
  if (!org.industry) e.industry = 'Choose the industry';
  else if (org.industry === 'O' && !org.otherIndustry.trim()) e.otherIndustry = 'Describe the industry';
  if (!org.sourceOfFunds) e.sourceOfFunds = 'Choose the source of funds';
  else if (org.sourceOfFunds === 'O' && !org.otherSourceOfFunds.trim()) e.otherSourceOfFunds = 'Describe the source of funds';
  if (org.annualIncome && !(Number(org.annualIncome.replace(/,/g, '')) >= 0)) e.annualIncome = 'Enter an amount in birr';
  return e;
}

export function validateContact(org: OrganizationForm): Errors {
  const e: Errors = {};
  if (org.mobile && !normalizeMobile(org.mobile)) e.mobile = 'Enter a valid mobile number (09… or 07…)';
  if (!org.mobile && org.phone.replace(/[^\d]/g, '').length < 9) e.mobile = 'Enter a mobile or office phone number';
  if (org.phone && org.phone.replace(/[^\d]/g, '').length < 9) e.phone = 'Enter the full phone number with the area code';
  if (org.email && !EMAIL.test(org.email.trim())) e.email = 'Enter a valid email address';
  if (!org.registeredAddress.city.trim()) e['registered.city'] = 'Enter the city';
  if (!org.registeredAddress.subCity.trim()) e['registered.subCity'] = 'Enter the sub-city or zone';
  if (!org.sameCorrespondenceAddress && !org.correspondenceAddress.city.trim()) e['correspondence.city'] = 'Enter the city';
  return e;
}

export function validatePeople(state: CorporateState, catalog: CorporateCatalog): Errors {
  const e: Errors = {};
  const applicantPhone = normalizeMobile(state.applicant.phone);
  if (!applicantPhone) e['applicant.phone'] = 'Enter your mobile number (09… or 07…)';
  if (state.people.length + 1 > catalog.rules.maxPeople) e.people = `At most ${catalog.rules.maxPeople} people, including you`;
  const phones = new Set(applicantPhone ? [applicantPhone] : []);
  state.people.forEach((p, i) => {
    if (p.fullName.trim().split(/\s+/).length < 2) e[`people.${i}.fullName`] = 'Enter the full name (first and father’s name at least)';
    const phone = normalizeMobile(p.phone);
    if (!phone) e[`people.${i}.phone`] = 'Enter a valid mobile number (09… or 07…)';
    else if (phones.has(phone)) e[`people.${i}.phone`] = 'Each person needs their own mobile number — the verification link is sent to it';
    else phones.add(phone);
    if (!p.roles.length) e[`people.${i}.roles`] = 'Choose signatory, director or both';
  });
  const signatories = (state.applicant.roles.includes('signatory') ? 1 : 0) + state.people.filter(p => p.roles.includes('signatory')).length;
  if (!signatories) e.signatories = 'Add at least one person who signs for the account (you can be one)';
  if (state.signingRule === 'any_two' && signatories < 2) e.signingRule = '“Any two signatories jointly” needs at least two signatories';
  if (state.signingRule === 'other' && !state.signingRuleOther.trim()) e.signingRuleOther = 'Describe who signs for the account';
  return e;
}

export function validateDocuments(state: CorporateState, catalog: CorporateCatalog): Errors {
  const e: Errors = {};
  const category = catalog.categories.find(c => c.id === state.organization.categoryId);
  for (const d of documentsFor(category, state.organization.subtypeId)) {
    if (d.required && !state.documents[d.id]) e[`doc.${d.id}`] = 'Please upload this document';
  }
  if (catalog.rules.signatureRequired) {
    if (state.applicant.roles.includes('signatory') && !state.applicant.signature) e['sig.applicant'] = 'Please upload your specimen signature';
    state.people.forEach((p, i) => {
      if (p.roles.includes('signatory') && !p.signature) e[`sig.${i}`] = 'Please upload the specimen signature';
    });
  }
  return e;
}

/** First step that is not complete (before submitting), with its first message */
export function firstIncomplete(state: CorporateState, catalog: CorporateCatalog): { step: CorporateStep; message: string } | null {
  const checks: [CorporateStep, Errors][] = [
    [CorporateStep.Category, validateCategory(state.organization, catalog)],
    [CorporateStep.Organization, validateOrganization(state.organization)],
    [CorporateStep.Contact, validateContact(state.organization)],
    [CorporateStep.Branch, state.identity.selectedBranch ? {} : { branch: 'Choose a branch' }],
    [CorporateStep.Account, state.identity.selectedTier ? {} : { account: 'Choose an account type' }],
    [CorporateStep.People, validatePeople(state, catalog)],
    [CorporateStep.Documents, validateDocuments(state, catalog)],
  ];
  for (const [step, errors] of checks) {
    const message = Object.values(errors)[0];
    if (message) return { step, message };
  }
  return null;
}
