import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d?: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntil(d?: string | Date | null): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

const LABELS: Record<string, string> = {
  // Task types
  NEW_REGISTRATION: 'New Registration',
  RENEWAL: 'Renewal',
  CHANGE_NOTIFICATION: 'Change Notification',
  REVOCATION: 'Revocation',
  // Commercial status
  ACTIVE: 'Active',
  INACTIVE_LICENSE_PENDING: 'Inactive (License Pending)',
  INACTIVE_LICENSE_REVOKED: 'Inactive (License Revoked)',
  // Workflow status
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  REGISTERED: 'Registered',
  EXPIRED: 'Expired',
  // Task status
  NEW: 'New',
  DOC_COLLECTION: 'Doc Collection',
  DOSSIER_PREP: 'Dossier Prep',
  SUBMITTED: 'Submitted',
  REWORK_REQUIRED: 'Rework Required',
  RESUBMITTED: 'Resubmitted',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  // Document status
  MISSING: 'Missing',
  COLLECTED: 'Collected',
  ACCEPTED: 'Accepted',
  NEED_UPDATE: 'Need Update',
  // Priority
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
  // Roles
  LEGAL_HEAD: 'Legal Head',
  RA_STAFF: 'RA Staff',
  VIEWER: 'Viewer',
  // Ownership type
  VMED_OWNED: 'VMED Owned',
  MONITORED: 'Monitored',
  // Risk class
  PENDING: 'Pending',
  NA: 'N/A',
  // Document types (new names)
  APPLICATION_LETTER: 'Application Letter',
  LETTER_OF_AUTHORIZATION: 'Letter of Authorization (LOA)',
  WARRANTY_CONFIRMATION: 'Warranty Confirmation / No-Warranty Letter',
  CERTIFICATE_OF_FREE_SALE: 'Certificate of Free Sale (CFS)',
  ISO_13485: 'ISO 13485',
  VIETNAMESE_TECHNICAL_DOCUMENT: 'Vietnamese Technical Document',
  CATALOGUE: 'Catalogue',
  PRODUCT_STANDARD_DOC: 'Product Standard / Declaration of Conformity',
  IFU_ENGLISH: 'IFU - English',
  IFU_VIETNAMESE: 'IFU - Vietnamese',
  VIETNAMESE_LABEL: 'Vietnamese Label and Original Label',
  CSDT_DOSSIER: 'CSDT Dossier',
  CE_MDR_FDA: 'CE/MDR/FDA',
  OTHER_DOCUMENTS: 'Other Documents',
  // Virtual doc types used in unified list
  REGISTRATION_CERTIFICATE: 'Registration Certificate',
  CLASSIFICATION_RESULT: 'Classification Result',
  // Entity status
  INACTIVE: 'Inactive',
  // Old doc type names (backward compat)
  LOA: 'Letter of Authorization (LOA)',
  CFS: 'Certificate of Free Sale (CFS)',
  VN_TECHNICAL_DOCUMENT: 'Vietnamese Technical Document',
  IFU_EN: 'IFU - English',
  IFU_VN: 'IFU - Vietnamese',
  VN_LABEL_AND_ORIGINAL: 'Vietnamese Label and Original Label',
  OTHER: 'Other Documents',
};

export function label(key?: string | null): string {
  if (!key) return '—';
  return LABELS[key] ?? key;
}

export const DOCUMENT_TYPES = [
  { value: 'APPLICATION_LETTER', label: 'Application Letter' },
  { value: 'LETTER_OF_AUTHORIZATION', label: 'Letter of Authorization (LOA)' },
  { value: 'WARRANTY_CONFIRMATION', label: 'Warranty Confirmation / No-Warranty Letter' },
  { value: 'CERTIFICATE_OF_FREE_SALE', label: 'Certificate of Free Sale (CFS)' },
  { value: 'ISO_13485', label: 'ISO 13485' },
  { value: 'VIETNAMESE_TECHNICAL_DOCUMENT', label: 'Vietnamese Technical Document' },
  { value: 'CATALOGUE', label: 'Catalogue' },
  { value: 'PRODUCT_STANDARD_DOC', label: 'Product Standard / Declaration of Conformity' },
  { value: 'IFU_ENGLISH', label: 'IFU - English' },
  { value: 'IFU_VIETNAMESE', label: 'IFU - Vietnamese' },
  { value: 'VIETNAMESE_LABEL', label: 'Vietnamese Label and Original Label' },
  { value: 'CSDT_DOSSIER', label: 'CSDT Dossier' },
  { value: 'CE_MDR_FDA', label: 'CE/MDR/FDA' },
  { value: 'OTHER_DOCUMENTS', label: 'Other Documents' },
];
