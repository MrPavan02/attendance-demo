
import { WorkMode, Coordinates } from './types';

export const OFFICE_COORDINATES: Record<string, Coordinates> = {
  MAIN_HQ: { latitude: 19.244449, longitude: 83.422297 }, // Backend-configured office
  BRANCH_A: { latitude: 34.0522, longitude: -118.2437 },
};

export const GEOFENCE_RADIUS_METERS = 300; // Slightly relaxed to reduce false negatives

export const MIN_OFFICE_HOURS = 8;

export const PUBLIC_HOLIDAYS = [
  '2024-01-01', '2024-12-25', '2024-07-04'
];

export const WORK_MODES = [
  { value: WorkMode.OFFICE, label: 'Main Office', icon: 'fa-building' },
  { value: WorkMode.BRANCH, label: 'Another Branch', icon: 'fa-code-branch' },
  { value: WorkMode.FIELD, label: 'Field Work', icon: 'fa-person-digging' },
  { value: WorkMode.WFH, label: 'Work From Home', icon: 'fa-house-laptop' },
];

// Add to your constants.ts file

// Update shift IDs and names to use numbers
export const SHIFTS = [
  { id: 'shift_1', name: 'Shift1', startTime: '06:00', endTime: '15:00' },
  { id: 'shift_2', name: 'Shift2', startTime: '09:00', endTime: '18:00' },
  { id: 'shift_3', name: 'Shift3', startTime: '12:00', endTime: '21:00' },
  { id: 'shift_4', name: 'Shift4', startTime: '15:00', endTime: '24:00' },
  { id: 'shift_5', name: 'Shift5', startTime: '21:00', endTime: '06:00' },
];

export const ATTENDANCE_STATUS_COLORS = {
  PRESENT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  ABSENT: 'bg-red-50 border-red-200 text-red-700', // Changed as requested
  LEAVE: 'bg-purple-50 border-purple-200 text-purple-700', // New color
  HOLIDAY: 'bg-amber-50 border-amber-200 text-amber-700', // Changed as requested
  WEEK_OFF: 'bg-blue-50 border-blue-200 text-blue-700', // New color for week off
  NEUTRAL: 'bg-slate-50 border-slate-200 text-slate-600',
};
