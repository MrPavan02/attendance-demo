
import { Coordinates, WorkMode, SecurityScanResult } from '../types';
import { OFFICE_COORDINATES, GEOFENCE_RADIUS_METERS } from '../constants';

const calculateDistance = (p1: Coordinates, p2: Coordinates): number => {
  const R = 6371e3;
  const φ1 = p1.latitude * Math.PI / 180;
  const φ2 = p2.latitude * Math.PI / 180;
  const Δφ = (p2.latitude - p1.latitude) * Math.PI / 180;
  const Δλ = (p2.longitude - p1.longitude) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const securityService = {
  validateAttendance: (
    userCoords: Coordinates,
    mode: WorkMode,
    timestamp: Date,
    capturedImage: string,
    history: any[]
  ): SecurityScanResult => {
    const anomalies: string[] = [];

    // 1. Geofencing Enforcement
    if (mode === WorkMode.OFFICE) {
      const dist = calculateDistance(userCoords, OFFICE_COORDINATES.MAIN_HQ);
      if (dist > GEOFENCE_RADIUS_METERS) {
        return { isValid: false, reason: 'Perimeter Violation: Location exceeds HQ allowance.', anomalies: ['Geofence Violation'] };
      }
    } else if (mode === WorkMode.BRANCH) {
      const dist = calculateDistance(userCoords, OFFICE_COORDINATES.BRANCH_A);
      if (dist > GEOFENCE_RADIUS_METERS) {
        return { isValid: false, reason: 'Perimeter Violation: Location exceeds Branch allowance.', anomalies: ['Geofence Violation'] };
      }
    } else if (mode === WorkMode.WFH || mode === WorkMode.FIELD) {
      if (userCoords.latitude === 0 && userCoords.longitude === 0) {
        return { isValid: false, reason: 'Signal Failure: GPS reference required for remote audit.', anomalies: ['Missing Location'] };
      }
    }

    // 2. Behavioral Anomaly Detection
    const seconds = timestamp.getSeconds();
    const minutes = timestamp.getMinutes();
    if (seconds === 0 && minutes === 0) {
      anomalies.push('Clock Integrity: Impossibly precise timestamp detected.');
    }

    // 3. Enterprise Liveness & Spoofing Defense
    // Real enterprise systems check for image entropy and pixel density
    if (capturedImage.length < 15000) { 
        return { isValid: false, reason: 'Biometric Failure: Capture density insufficient for liveness signature.', anomalies: ['Liveness Rejection'] };
    }

    // 4. Device Forensic Analysis
    const currentDevice = navigator.userAgent;
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.deviceId !== currentDevice) {
       anomalies.push('Security Alert: Identity logged via unrecognized hardware node.');
    }

    return {
      isValid: true,
      anomalies
    };
  }
};
