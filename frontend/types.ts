
export enum WorkMode {
  OFFICE = 'OFFICE',
  FIELD = 'FIELD',
  BRANCH = 'BRANCH',
  WFH = 'WFH'
}

export enum AttendanceStatus {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT'
}

export enum VerificationMethod {
  BIOMETRIC = 'BIOMETRIC',
  PIN = 'PIN',
  FACE_ONLY = 'FACE_ONLY'
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  HR = 'HR'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: UserRole;
  password: string;
}

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  timestamp: string;
  type: 'IN' | 'OUT';
  mode: WorkMode;
  location: Coordinates;
  isFlagged: boolean;
  flagReason?: string;
  fieldWorkReason?: string;
  deviceId: string;
  verificationMethod: VerificationMethod;
  duration?: number;
  imageData?: string;
}

export interface Holiday {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  name: string;
  country: string;
  state: string;
}

export interface UserSession {
  employeeId: string;
  name: string;
  role: UserRole;
  currentStatus: AttendanceStatus;
  lastCheckIn?: string;
  faceImageUrl?: string;
}

export interface SecurityScanResult {
  isValid: boolean;
  reason?: string;
  anomalies: string[];
}

export interface Shift {
  id: string;
  name: string; 
  startTime: string; 
  endTime: string; 
  description?: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string; 
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  date: string;
  type: 'LOGIN' | 'LOGOUT' | 'BOTH' | 'MISSED_CHECKIN' | 'MISSED_CHECKOUT' | 'FULL_DAY';
  actualTime?: string;
  requestedLoginTime?: string;
  requestedLogoutTime?: string;
  reason: string;
  remarks?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
}

export interface ShiftChangeRequest {
  id: string;
  employeeId: string;
  currentShiftId: string;
  requestedShiftId: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  // Added optional submittedAt and approvedAt to ShiftChangeRequest
  submittedAt?: string;
  approvedAt?: string;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
}

export interface EmployeeWeekOff {
  employeeId: string;
  weekOffs: number[]; 
}
