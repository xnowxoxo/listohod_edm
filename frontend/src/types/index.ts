export type Role = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'VIEWER';
export type DocumentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SIGNED' | 'REJECTED' | 'NEEDS_REVISION' | 'ARCHIVED';
export type DocumentType = 'CONTRACT' | 'INVOICE' | 'ACT' | 'SPECIFICATION' | 'LETTER' | 'ORDER' | 'OTHER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: Role;
  position?: string;
  department?: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  _count?: { createdDocuments: number };
}

export interface Attachment {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>;
  createdAt: string;
}

export interface Approval {
  id: string;
  decision: string;
  comment?: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>;
  createdAt: string;
}

export interface ApprovalStep {
  id: string;
  order: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  comment?: string;
  decidedAt?: string;
  approver: Pick<User, 'id' | 'firstName' | 'lastName' | 'role'> & { position?: string };
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: Record<string, unknown>;
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
}

export interface Document {
  id: string;
  number: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  description?: string;
  amount?: number;
  currency?: string;
  counterparty?: string;
  dueDate?: string;
  signedAt?: string;
  tags: string[];
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
  attachments: Attachment[];
  comments?: Comment[];
  approvals?: Approval[];
  approvalSteps?: ApprovalStep[];
  activities?: ActivityLog[];
  _count?: { comments: number; approvals: number };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  recentDocuments: Document[];
}

export interface MyTask {
  id: string;
  order: number;
  status: string;
  createdAt: string;
  document: {
    id: string;
    number: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    createdBy: Pick<User, 'firstName' | 'lastName'>;
    approvalSteps: { status: string; order: number }[];
  };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  document?: {
    id: string;
    number: string;
    title: string;
    type: string;
    status: string;
  };
}

export interface ActivityItem {
  id: string;
  action: string;
  details?: Record<string, unknown>;
  document: { id: string; number: string; title: string; status: string };
  user: Pick<User, 'firstName' | 'lastName'>;
  createdAt: string;
}
