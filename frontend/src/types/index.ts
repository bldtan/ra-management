export type Role = 'LEGAL_HEAD' | 'RA_STAFF' | 'VIEWER';
export type ProductType = 'MEDICAL_DEVICE' | 'BIOCIDE' | 'COSMETIC' | 'SPARE_PARTS_ACCESSORIES' | 'GENERAL_GOODS';
export type RiskClass = 'A' | 'B' | 'C' | 'D' | 'NA' | 'PENDING';
export type OwnershipType = 'VMED_OWNED' | 'MONITORED';
export type CommercialStatus = 'ACTIVE' | 'INACTIVE_LICENSE_PENDING' | 'INACTIVE_LICENSE_REVOKED';
export type WorkflowStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'REGISTERED' | 'EXPIRED';
export type DocumentType =
  | 'APPLICATION_LETTER'
  | 'LETTER_OF_AUTHORIZATION'
  | 'WARRANTY_CONFIRMATION'
  | 'CERTIFICATE_OF_FREE_SALE'
  | 'ISO_13485'
  | 'VIETNAMESE_TECHNICAL_DOCUMENT'
  | 'CATALOGUE'
  | 'PRODUCT_STANDARD_DOC'
  | 'IFU_ENGLISH'
  | 'IFU_VIETNAMESE'
  | 'VIETNAMESE_LABEL'
  | 'CSDT_DOSSIER'
  | 'CE_MDR_FDA'
  | 'OTHER_DOCUMENTS';
export type DocumentStatus = 'MISSING' | 'COLLECTED' | 'ACCEPTED' | 'NEED_UPDATE' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  shortName?: string | null;
  country?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  duplicateCheckStatus?: string | null;
  duplicateCheckNotes?: string | null;
  plants?: ManufacturingPlant[];
  _count?: { plants: number; products: number };
}

export interface ManufacturingPlant {
  id: string;
  manufacturerId: string;
  plantName: string;
  country?: string | null;
  address?: string | null;
  iso13485CertNo?: string | null;
  iso13485Expiry?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  manufacturer?: { id: string; name: string };
}

export interface ProductRegistration {
  id: string;
  productId: string;
  licenseHolderId: string;
  licenseHolder: { id: string; name: string };
  ownershipType: OwnershipType;
  registrationNo: string | null;
  registrationExpiry: string | null;
  approvalDate: string | null;
  applicationNo: string | null;
  classificationNumber: string | null;
  commercialStatus: CommercialStatus;
  workflowStatus: WorkflowStatus;
  isActive: boolean;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  tasks?: Array<{ id: string; taskCode: string; status: string; taskType: string }>;
}

export interface ProductPlant {
  plant: { id: string; plantName: string; country?: string | null };
}

export interface ProductCountry {
  country: string;
}

export interface Product {
  id: string;
  manufacturerProductCode: string;
  productNameEn: string;
  productNameVn: string;
  manufacturerId: string;
  riskClass: RiskClass;
  productType?: ProductType | null;
  commercialStatus?: CommercialStatus | null;
  erpProductCode?: string | null;
  sourceSheet?: string | null;
  manufacturer: { id: string; name: string };
  plants: ProductPlant[];
  countries: ProductCountry[];
  registrations: ProductRegistration[];
  licenseHolders?: { licenseHolder: { id: string; name: string } }[];
  classificationHistory?: ClassificationResultHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export type TaskStatus =
  | 'NEW'
  | 'DOC_COLLECTION'
  | 'DOSSIER_PREP'
  | 'SUBMITTED'
  | 'REWORK_REQUIRED'
  | 'RESUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskType = 'NEW_REGISTRATION' | 'RENEWAL' | 'CHANGE_NOTIFICATION' | 'REVOCATION';

export interface RegistrationTask {
  id: string;
  taskCode: string;
  taskType: TaskType;
  title: string;
  status: TaskStatus;
  statusStepNo: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  responsibleId?: string | null;
  supervisorId?: string | null;
  productRegistrationId?: string | null;
  startDate?: string | null;
  targetDeadline?: string | null;
  completedDate?: string | null;
  reworkCount: number;
  remarks?: string | null;
  responsible?: User | null;
  supervisor?: User | null;
  observers?: { user: { id: string; fullName: string } }[];
  productRegistration?: ProductRegistrationWithContext | null;
  case?: RegistrationCase | null;
  statusHistory?: StatusHistory[];
  comments?: TaskComment[];
  documents?: RegistrationDocument[];
  certificateUploads?: RegistrationCertificateHistory[];
  classificationUploads?: ClassificationResultHistory[];
  taskProducts?: { product: Product }[];
}

export interface ProductRegistrationWithContext extends ProductRegistration {
  product: Product & {
    manufacturer: { id: string; name: string };
  };
}

export interface RegistrationCase {
  id: string;
  taskId: string;
  productRegistrationId?: string | null;
  caseStatus: 'OPEN' | 'CLOSED';
  submissionDate?: string | null;
  applicationNo?: string | null;
  registrationNo?: string | null;
  registrationExpiry?: string | null;
  classificationNumber?: string | null;
  approvalDate?: string | null;
  completionNotes?: string | null;
  caseNotes?: string | null;
}

export interface StatusHistory {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  changedAt: string;
  note?: string | null;
  changedBy?: { fullName: string } | null;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; fullName: string };
}

export interface RegistrationDocument {
  id: string;
  taskId?: string | null;
  documentType: DocumentType | string;
  documentNumber?: string | null;
  appliesTo: string;
  fileName?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  status: DocumentStatus;
  hasHardcopy: boolean;
  hasOriginal: boolean;
  hardcopyReceivedDate?: string | null;
  originalReceivedDate?: string | null;
  hardcopyNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  task?: { id: string; taskCode: string } | null;
  uploadedBy?: { id: string; fullName: string } | null;
  _source?: string;
  _version?: string;
}

export interface RegistrationCertificateHistory {
  id: string;
  productRegistrationId: string;
  taskId?: string | null;
  uploadedById: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  documentNumber?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  hasHardcopy: boolean;
  hasOriginal: boolean;
  hardcopyReceivedDate?: string | null;
  originalReceivedDate?: string | null;
  hardcopyNotes?: string | null;
  status: DocumentStatus;
  isCurrent: boolean;
  notes?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string } | null;
  task?: { id: string; taskCode: string } | null;
}

export interface ClassificationResultHistory {
  id: string;
  productId: string;
  taskId?: string | null;
  uploadedById: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  documentNumber?: string | null;
  classificationNumber?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  hasHardcopy: boolean;
  hasOriginal: boolean;
  hardcopyReceivedDate?: string | null;
  originalReceivedDate?: string | null;
  hardcopyNotes?: string | null;
  status: DocumentStatus;
  isCurrent: boolean;
  notes?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string } | null;
  task?: { id: string; taskCode: string } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ViewerDocumentTypePermission {
  id: string;
  userId: string;
  manufacturerId: string;
  documentType: DocumentType;
  canView: boolean;
}

export interface ViewerManufacturerPermission {
  manufacturerId: string;
  manufacturerName: string;
  canViewProducts: boolean;
  canViewDocuments: boolean;
  canDownloadDocuments: boolean;
  canViewKpi: boolean;
}
