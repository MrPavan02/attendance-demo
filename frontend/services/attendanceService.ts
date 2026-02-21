
import { AttendanceEntry, AttendanceStatus, UserRole, Shift, ShiftAssignment, RegularizationRequest, ShiftChangeRequest, OvertimeRequest, PermissionRequest, EmployeeWeekOff, WorkMode, VerificationMethod, Employee } from '../types';
import { SHIFTS } from '../constants';
import { generateId } from '../utils/id';
import { ENDPOINTS, apiCall, safeParseJson } from './apiConfig';

const STORAGE_KEY = 'secur_corp_attendance_ledger';
const SHIFT_ASSIGNMENTS_KEY = 'secur_corp_shift_assignments';
const REGULARIZATION_REQUESTS_KEY = 'secur_corp_regularization_requests';
const SHIFT_CHANGE_REQUESTS_KEY = 'secur_corp_shift_change_requests';
const OVERTIME_REQUESTS_KEY = 'secur_corp_overtime_requests';
const PERMISSION_REQUESTS_KEY = 'secur_corp_permission_requests';
const EMPLOYEE_WEEK_OFFS_KEY = 'secur_corp_employee_week_offs';
const ATTENDANCE_LOCKS_KEY = 'secur_corp_attendance_locks';

const getListFromPayload = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getItemFromPayload = (payload: any): any => {
  if (payload?.data) return payload.data;
  return payload;
};

const upsertLocalList = <T extends { id: string }>(storageKey: string, item: T): T[] => {
  const raw = localStorage.getItem(storageKey);
  const list: T[] = raw ? JSON.parse(raw) : [];
  const index = list.findIndex(entry => entry.id === item.id);
  if (index >= 0) list[index] = item;
  else list.push(item);
  localStorage.setItem(storageKey, JSON.stringify(list));
  return list;
};

const replaceLocalList = <T>(storageKey: string, list: T[]): void => {
  localStorage.setItem(storageKey, JSON.stringify(list));
};

const mapApiEntryToClient = (api: any): AttendanceEntry => ({
  id: api.id ?? api.entry_id,
  employeeId: api.employee_id ?? api.employeeId,
  timestamp: api.timestamp,
  type: api.type ?? api.entry_type,
  mode: api.mode ?? api.work_mode,
  location: { latitude: api.latitude, longitude: api.longitude },
  isFlagged: api.is_flagged ?? api.isFlagged ?? false,
  flagReason: api.flag_reason || api.flagReason || undefined,
  fieldWorkReason: api.field_work_reason || api.fieldWorkReason || undefined,
  deviceId: api.device_id ?? api.deviceId,
  verificationMethod: api.verification_method ?? api.verificationMethod,
  duration: api.duration ?? undefined,
  imageData: api.image_data ?? api.imageData ?? undefined
});

const mapApiRegularizationToClient = (api: any): RegularizationRequest => ({
  id: api.id,
  employeeId: api.employeeId ?? api.employee_id,
  date: api.date,
  type: api.type,
  reason: api.reason ?? api.remarks ?? '',
  remarks: api.remarks ?? api.reason,
  requestedLoginTime: api.requestedLoginTime ?? api.requested_login_time,
  requestedLogoutTime: api.requestedLogoutTime ?? api.requested_logout_time,
  status: api.status,
  submittedAt: api.submittedAt ?? api.submittedDate ?? api.submitted_date,
  approvedAt: api.approvedAt ?? api.decisionDate ?? api.decision_date,
  approvedBy: api.approvedBy ?? api.managerName
});

const mapApiShiftChangeToClient = (api: any): ShiftChangeRequest => ({
  id: api.id,
  employeeId: api.employeeId ?? api.employee_id,
  date: api.date,
  currentShiftId: api.currentShiftId ?? api.current_shift_id,
  requestedShiftId: api.requestedShiftId ?? api.requested_shift_id,
  reason: api.reason ?? '',
  status: api.status,
  submittedAt: api.submittedAt ?? api.submittedDate ?? api.submitted_date,
  approvedAt: api.approvedAt ?? api.decisionDate ?? api.decision_date
});

const mapApiOvertimeToClient = (api: any): OvertimeRequest => ({
  id: api.id,
  employeeId: api.employeeId ?? api.employee_id,
  date: api.date,
  hours: api.hours,
  reason: api.reason ?? '',
  status: api.status,
  submittedAt: api.submittedAt ?? api.submittedDate ?? api.submitted_date
});

const mapApiPermissionToClient = (api: any): PermissionRequest => ({
  id: api.id,
  employeeId: api.employeeId ?? api.employee_id,
  date: api.date,
  startTime: api.startTime ?? api.fromTime ?? api.start_time ?? api.from_time,
  endTime: api.endTime ?? api.toTime ?? api.end_time ?? api.to_time,
  reason: api.reason ?? '',
  status: api.status,
  submittedAt: api.submittedAt ?? api.submittedDate ?? api.submitted_date
});

export const MOCK_EMPLOYEES: Employee[] = [
  // Updated to align with DB rename from EMP001 -> ADM001
  { id: 'ADM001', name: 'HR Admin', department: 'Human Resources', role: UserRole.HR, password: 'admin123' },
  { id: 'EMP002', name: 'Alice Johnson', department: 'Engineering', role: UserRole.EMPLOYEE, password: 'emp123' },
  { id: 'EMP003', name: 'Bob Smith', department: 'Engineering', role: UserRole.EMPLOYEE, password: 'emp123' },
  { id: 'EMP004', name: 'Charlie Davis', department: 'Sales', role: UserRole.EMPLOYEE, password: 'emp123' },
  { id: 'EMP005', name: 'Diana Prince', department: 'Marketing', role: UserRole.EMPLOYEE, password: 'emp123' },
  { id: 'EMP006', name: 'Ethan Hunt', department: 'Engineering', role: UserRole.EMPLOYEE, password: 'emp123' },
];

export const attendanceService = {
  getEntries: (): AttendanceEntry[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveEntry: (entry: AttendanceEntry) => {
    const entries = attendanceService.getEntries();
    if (!entry.employeeId || !entry.timestamp) throw new Error('Incomplete attendance node data.');
    entries.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  },

  fetchEntriesFromApi: async (): Promise<AttendanceEntry[]> => {
    const response = await apiCall(ENDPOINTS.ATTENDANCE.ENTRIES, { method: 'GET' });
    const payload = await safeParseJson(response);
    return getListFromPayload(payload).map(mapApiEntryToClient);
  },

  syncEntryToApi: async (entry: AttendanceEntry): Promise<AttendanceEntry> => {
    try {
      const url = entry.type === 'IN' ? ENDPOINTS.ATTENDANCE.CHECK_IN : ENDPOINTS.ATTENDANCE.CHECK_OUT;
      const payload = {
        employee_id: entry.employeeId,
        timestamp: entry.timestamp,
        type: entry.type,
        mode: entry.mode,
        latitude: entry.location.latitude,
        longitude: entry.location.longitude,
        device_id: entry.deviceId,
        verification_method: entry.verificationMethod,
        field_work_reason: entry.fieldWorkReason || null,
        image_data: entry.imageData || null
      };

      const response = await apiCall(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const responsePayload = await safeParseJson(response);
      const apiEntry = getItemFromPayload(responsePayload);
      return mapApiEntryToClient(apiEntry);
    } catch (err) {
      console.error('Failed to sync attendance to API', err);
      throw err;
    }
  },

  getEmployeeStatus: (employeeId: string): AttendanceStatus => {
    const entries = attendanceService.getEntries().filter(e => e.employeeId === employeeId);
    if (entries.length === 0) return AttendanceStatus.CHECKED_OUT;
    const last = entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return last.type === 'IN' ? AttendanceStatus.CHECKED_IN : AttendanceStatus.CHECKED_OUT;
  },

  getLastCheckIn: (employeeId: string): AttendanceEntry | undefined => {
    const entries = attendanceService.getEntries().filter(e => e.employeeId === employeeId && e.type === 'IN');
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  },

  calculateDurationHours: (start: string, end: string): number => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  },

  getAttendanceForDate: (dateStr: string) => {
    const entries = attendanceService.getEntries();
    return entries.filter(e => e.timestamp.startsWith(dateStr));
  },

  getPreviousWorkingDay: (date: Date, holidays: string[], weekOffs: number[]): string => {
    let d = new Date(date);
    d.setDate(d.getDate() - 1);
    while (weekOffs.includes(d.getDay()) || holidays.includes(d.toISOString().split('T')[0])) {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  },

  getShiftAssignments: (): ShiftAssignment[] => {
    const data = localStorage.getItem(SHIFT_ASSIGNMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShiftAssignment: (assignment: ShiftAssignment) => {
    const assignments = attendanceService.getShiftAssignments();
    const filtered = assignments.filter(a => !(a.employeeId === assignment.employeeId && a.date === assignment.date));
    filtered.push(assignment);
    localStorage.setItem(SHIFT_ASSIGNMENTS_KEY, JSON.stringify(filtered));
  },

  getEmployeeShift: (employeeId: string, date: string): Shift | null => {
    const assignments = attendanceService.getShiftAssignments();
    const assignment = assignments.find(a => a.employeeId === employeeId && a.date === date);
    if (!assignment) return null;
    return SHIFTS.find(s => s.id === assignment.shiftId) || null;
  },

  getRegularizationRequests: (): RegularizationRequest[] => {
    const data = localStorage.getItem(REGULARIZATION_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  submitRegularizationRequest: (request: RegularizationRequest) => {
    const requests = attendanceService.getRegularizationRequests();
    const exists = requests.some(r => r.employeeId === request.employeeId && r.date === request.date && r.status === 'PENDING');
    if (exists) throw new Error('Duplicate pending request exists for this date.');
    requests.push(request);
    localStorage.setItem(REGULARIZATION_REQUESTS_KEY, JSON.stringify(requests));
  },

  getOvertimeRequests: (): OvertimeRequest[] => {
    const data = localStorage.getItem(OVERTIME_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  submitOvertimeRequest: (request: OvertimeRequest) => {
    const requests = attendanceService.getOvertimeRequests();
    requests.push(request);
    localStorage.setItem(OVERTIME_REQUESTS_KEY, JSON.stringify(requests));
  },

  getPermissionRequests: (): PermissionRequest[] => {
    const data = localStorage.getItem(PERMISSION_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  submitPermissionRequest: (request: PermissionRequest) => {
    const requests = attendanceService.getPermissionRequests();
    requests.push(request);
    localStorage.setItem(PERMISSION_REQUESTS_KEY, JSON.stringify(requests));
  },

  refreshRegularizationRequestsFromApi: async (employeeId?: string, status?: string): Promise<RegularizationRequest[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status_filter', status);
    const url = `${ENDPOINTS.REQUESTS.REGULARIZATION}${params.toString() ? `?${params}` : ''}`;
    const response = await apiCall(url, { method: 'GET' });
    const payload = await safeParseJson(response);
    const list = getListFromPayload(payload).map(mapApiRegularizationToClient);
    replaceLocalList(REGULARIZATION_REQUESTS_KEY, list);
    return list;
  },

  refreshShiftChangeRequestsFromApi: async (employeeId?: string, status?: string): Promise<ShiftChangeRequest[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status_filter', status);
    const url = `${ENDPOINTS.REQUESTS.SHIFT_CHANGE}${params.toString() ? `?${params}` : ''}`;
    const response = await apiCall(url, { method: 'GET' });
    const payload = await safeParseJson(response);
    const list = getListFromPayload(payload).map(mapApiShiftChangeToClient);
    replaceLocalList(SHIFT_CHANGE_REQUESTS_KEY, list);
    return list;
  },

  refreshOvertimeRequestsFromApi: async (employeeId?: string, status?: string): Promise<OvertimeRequest[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status_filter', status);
    const url = `${ENDPOINTS.REQUESTS.OVERTIME}${params.toString() ? `?${params}` : ''}`;
    const response = await apiCall(url, { method: 'GET' });
    const payload = await safeParseJson(response);
    const list = getListFromPayload(payload).map(mapApiOvertimeToClient);
    replaceLocalList(OVERTIME_REQUESTS_KEY, list);
    return list;
  },

  refreshPermissionRequestsFromApi: async (employeeId?: string, status?: string): Promise<PermissionRequest[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status_filter', status);
    const url = `${ENDPOINTS.REQUESTS.PERMISSION}${params.toString() ? `?${params}` : ''}`;
    const response = await apiCall(url, { method: 'GET' });
    const payload = await safeParseJson(response);
    const list = getListFromPayload(payload).map(mapApiPermissionToClient);
    replaceLocalList(PERMISSION_REQUESTS_KEY, list);
    return list;
  },

  refreshRequestsFromApi: async (employeeId?: string, status?: string) => {
    await Promise.all([
      attendanceService.refreshRegularizationRequestsFromApi(employeeId, status),
      attendanceService.refreshShiftChangeRequestsFromApi(employeeId, status),
      attendanceService.refreshOvertimeRequestsFromApi(employeeId, status),
      attendanceService.refreshPermissionRequestsFromApi(employeeId, status)
    ]);
  },

  submitRegularizationRequestToApi: async (request: RegularizationRequest): Promise<RegularizationRequest> => {
    const payload = {
      employeeId: request.employeeId,
      date: request.date,
      type: request.type,
      reason: request.reason || request.remarks || '',
      requestedLoginTime: request.requestedLoginTime,
      requestedLogoutTime: request.requestedLogoutTime
    };
    const response = await apiCall(ENDPOINTS.REQUESTS.REGULARIZATION, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await safeParseJson(response);
    const stored: RegularizationRequest = {
      ...request,
      id: result?.id ?? request.id,
      status: 'PENDING'
    };
    upsertLocalList(REGULARIZATION_REQUESTS_KEY, stored);
    return stored;
  },

  submitShiftChangeRequestToApi: async (request: ShiftChangeRequest): Promise<ShiftChangeRequest> => {
    const payload = {
      employeeId: request.employeeId,
      date: request.date,
      currentShiftId: request.currentShiftId,
      requestedShiftId: request.requestedShiftId,
      reason: request.reason
    };
    const response = await apiCall(ENDPOINTS.REQUESTS.SHIFT_CHANGE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await safeParseJson(response);
    const stored: ShiftChangeRequest = {
      ...request,
      id: result?.id ?? request.id,
      status: 'PENDING'
    };
    upsertLocalList(SHIFT_CHANGE_REQUESTS_KEY, stored);
    return stored;
  },

  submitOvertimeRequestToApi: async (request: OvertimeRequest): Promise<OvertimeRequest> => {
    const payload = {
      employeeId: request.employeeId,
      date: request.date,
      hours: request.hours,
      reason: request.reason
    };
    const response = await apiCall(ENDPOINTS.REQUESTS.OVERTIME, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await safeParseJson(response);
    const stored: OvertimeRequest = {
      ...request,
      id: result?.id ?? request.id,
      status: 'PENDING'
    };
    upsertLocalList(OVERTIME_REQUESTS_KEY, stored);
    return stored;
  },

  submitPermissionRequestToApi: async (request: PermissionRequest): Promise<PermissionRequest> => {
    const payload = {
      employeeId: request.employeeId,
      date: request.date,
      startTime: request.startTime,
      endTime: request.endTime,
      reason: request.reason
    };
    const response = await apiCall(ENDPOINTS.REQUESTS.PERMISSION, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await safeParseJson(response);
    const stored: PermissionRequest = {
      ...request,
      id: result?.id ?? request.id,
      status: 'PENDING'
    };
    upsertLocalList(PERMISSION_REQUESTS_KEY, stored);
    return stored;
  },

  updateRegularizationRequestStatusToApi: async (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED'): Promise<void> => {
    await apiCall(`${ENDPOINTS.REQUESTS.REGULARIZATION}/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const requests = attendanceService.getRegularizationRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index !== -1) {
      requests[index].status = status;
      requests[index].approvedAt = status === 'APPROVED' ? new Date().toISOString() : undefined;
      replaceLocalList(REGULARIZATION_REQUESTS_KEY, requests);
    }
  },

  updateShiftChangeRequestStatusToApi: async (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED'): Promise<void> => {
    await apiCall(`${ENDPOINTS.REQUESTS.SHIFT_CHANGE}/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const requests = attendanceService.getShiftChangeRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index !== -1) {
      requests[index].status = status;
      requests[index].approvedAt = status === 'APPROVED' ? new Date().toISOString() : undefined;
      replaceLocalList(SHIFT_CHANGE_REQUESTS_KEY, requests);
    }
  },

  updateOvertimeRequestStatusToApi: async (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED'): Promise<void> => {
    await apiCall(`${ENDPOINTS.REQUESTS.OVERTIME}/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const requests = attendanceService.getOvertimeRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index !== -1) {
      requests[index].status = status;
      replaceLocalList(OVERTIME_REQUESTS_KEY, requests);
    }
  },

  updatePermissionRequestStatusToApi: async (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED'): Promise<void> => {
    await apiCall(`${ENDPOINTS.REQUESTS.PERMISSION}/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const requests = attendanceService.getPermissionRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index !== -1) {
      requests[index].status = status;
      replaceLocalList(PERMISSION_REQUESTS_KEY, requests);
    }
  },

  updatePermissionRequest: (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const requests = attendanceService.getPermissionRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index === -1) return;
    requests[index].status = status;
    localStorage.setItem(PERMISSION_REQUESTS_KEY, JSON.stringify(requests));
  },

  updateRegularizationRequest: (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const requests = attendanceService.getRegularizationRequests();
    const index = requests.findIndex(req => req.id === requestId);
    if (index === -1) return;

    requests[index].status = status;
    requests[index].approvedAt = status === 'APPROVED' ? new Date().toISOString() : undefined;
    
    if (status === 'APPROVED') {
      const request = requests[index];
      const { employeeId, date, type, requestedLoginTime, requestedLogoutTime } = request;
      
      if (type === 'MISSED_CHECKIN' || type === 'FULL_DAY' || type === 'LOGIN' || type === 'BOTH') {
        attendanceService.saveEntry({
          id: generateId(),
          employeeId,
          timestamp: `${date}T${requestedLoginTime || '09:00'}:00.000Z`,
          type: 'IN',
          mode: WorkMode.OFFICE,
          location: { latitude: 0, longitude: 0 },
          isFlagged: false,
          deviceId: 'SECURE-GATEWAY-REG',
          verificationMethod: VerificationMethod.PIN,
          duration: 0
        });
      }
      
      if (type === 'MISSED_CHECKOUT' || type === 'FULL_DAY' || type === 'LOGOUT' || type === 'BOTH') {
        attendanceService.saveEntry({
          id: generateId(),
          employeeId,
          timestamp: `${date}T${requestedLogoutTime || '18:00'}:00.000Z`,
          type: 'OUT',
          mode: WorkMode.OFFICE,
          location: { latitude: 0, longitude: 0 },
          isFlagged: false,
          deviceId: 'SECURE-GATEWAY-REG',
          verificationMethod: VerificationMethod.PIN,
          duration: 8
        });
      }
    }
    localStorage.setItem(REGULARIZATION_REQUESTS_KEY, JSON.stringify(requests));
  },

  getShiftChangeRequests: (): ShiftChangeRequest[] => {
    const data = localStorage.getItem(SHIFT_CHANGE_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShiftChangeRequest: (request: ShiftChangeRequest) => {
    const requests = attendanceService.getShiftChangeRequests();
    requests.push(request);
    localStorage.setItem(SHIFT_CHANGE_REQUESTS_KEY, JSON.stringify(requests));
  },

  updateShiftChangeRequest: (requestId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const requests = attendanceService.getShiftChangeRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) return;

    requests[index].status = status;
    // Fixed: Added approvedAt timestamp when shift change request is processed
    requests[index].approvedAt = status === 'APPROVED' ? new Date().toISOString() : undefined;
    if (status === 'APPROVED') {
      const req = requests[index];
      attendanceService.saveShiftAssignment({
        id: generateId(),
        employeeId: req.employeeId,
        shiftId: req.requestedShiftId,
        date: req.date,
        effectiveFrom: new Date().toISOString()
      });
    }
    localStorage.setItem(SHIFT_CHANGE_REQUESTS_KEY, JSON.stringify(requests));
  },

  getEmployeeWeekOffs: (): EmployeeWeekOff[] => {
    const data = localStorage.getItem(EMPLOYEE_WEEK_OFFS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveEmployeeWeekOff: (weekOff: EmployeeWeekOff) => {
    const weekOffs = attendanceService.getEmployeeWeekOffs();
    const existingIndex = weekOffs.findIndex(w => w.employeeId === weekOff.employeeId);
    if (existingIndex >= 0) weekOffs[existingIndex] = weekOff;
    else weekOffs.push(weekOff);
    localStorage.setItem(EMPLOYEE_WEEK_OFFS_KEY, JSON.stringify(weekOffs));
  },

  getEmployeeWeekOffDays: (employeeId: string): number[] => {
    const weekOffs = attendanceService.getEmployeeWeekOffs();
    const employeeWeekOff = weekOffs.find(w => w.employeeId === employeeId);
    return employeeWeekOff?.weekOffs || [0, 6];
  },

  calculateLateArrival: (checkInTime: string, shiftStartTime: string): number => {
    const checkIn = new Date(`2000-01-01T${checkInTime}`);
    const shiftStart = new Date(`2000-01-01T${shiftStartTime}`);
    const diffMinutes = (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60);
    return diffMinutes > 15 ? Math.round(diffMinutes) : 0; 
  },

  calculateEarlyGoing: (checkOutTime: string, shiftEndTime: string): number => {
    const checkOut = new Date(`2000-01-01T${checkOutTime}`);
    const shiftEnd = new Date(`2000-01-01T${shiftEndTime}`);
    const diffMinutes = (shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60);
    return diffMinutes > 15 ? Math.round(diffMinutes) : 0;
  },

  getLockedDates: (): string[] => {
    const data = localStorage.getItem(ATTENDANCE_LOCKS_KEY);
    return data ? JSON.parse(data) : [];
  },

  lockDate: (date: string) => {
    const locks = attendanceService.getLockedDates();
    if (!locks.includes(date)) {
      locks.push(date);
      localStorage.setItem(ATTENDANCE_LOCKS_KEY, JSON.stringify(locks));
    }
  },

  unlockDate: (date: string) => {
    const locks = attendanceService.getLockedDates().filter(d => d !== date);
    localStorage.setItem(ATTENDANCE_LOCKS_KEY, JSON.stringify(locks));
  },

  isDateLocked: (date: string): boolean => {
    return attendanceService.getLockedDates().includes(date);
  }
};
