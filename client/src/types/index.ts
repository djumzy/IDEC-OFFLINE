export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  district: string;
  healthFacility: string;
  lastSync?: number;
}

export interface Child {
  id?: number;
  childId: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  district: string;
  healthFacility: string;
  caretakerName: string;
  caretakerContact: string;
  registeredBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Screening {
  id?: number;
  childId: number;
  date: string;
  weight: number;
  height: number;
  muac: number;
  screenedBy?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tier {
  id?: number;
  name: string;
  district: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Referral {
  id?: number;
  childId: number;
  tierId: number;
  reason: string;
  status: 'pending' | 'completed' | 'cancelled';
  referredBy?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingOperation {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'children' | 'screenings' | 'tiers' | 'referrals';
  data: any;
  timestamp: number;
  userId: number;
}

export interface SyncStatus {
  id: string;
  lastSync: number;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

export type EntityType = 'children' | 'screenings' | 'tiers' | 'referrals';
export type OperationType = 'create' | 'update' | 'delete'; 