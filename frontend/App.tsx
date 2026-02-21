
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import CameraCapture from './components/CameraCapture';
import AttendanceDashboard from './components/AttendanceDashboard';
import HRDashboard from './components/HRDashboard';
import VerificationModal from './components/VerificationModal';
import RegularizationModal from './components/RegularizationModal';
import ShiftChangeModal from './components/ShiftChangeModal';
import OvertimeModal from './components/OvertimeModal';
import PermissionModal from './components/PermissionModal';
import { UserSession, AttendanceStatus, WorkMode, Coordinates, AttendanceEntry, VerificationMethod, UserRole } from './types';
import { attendanceService } from './services/attendanceService';
import { ENDPOINTS, apiCall, safeParseJson } from './services/apiConfig';
import { securityService } from './services/securityService';
import { compareFaces } from './services/faceMatcher';
import { WORK_MODES } from './constants';
import { generateId } from './utils/id';

const App: React.FC = () => {
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, detail?: string } | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>(WorkMode.OFFICE);
  const [fieldReason, setFieldReason] = useState('');
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [pendingCaptureData, setPendingCaptureData] = useState<{ image: string } | null>(null);

  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const allEntries = attendanceService.getEntries();
    setEntries(allEntries);
  }, []);

  useEffect(() => {
    if (!session) return;

    let isActive = true;

    const refreshEntries = async () => {
      try {
        const remoteEntries = await attendanceService.fetchEntriesFromApi();
        if (!isActive) return;
        setEntries(remoteEntries);
        localStorage.setItem('secur_corp_attendance_ledger', JSON.stringify(remoteEntries));
      } catch (err) {
        console.error('[Attendance] Auto-refresh failed:', err);
      }
    };

    const refreshRequests = async () => {
      try {
        if (!session) return;
        if (session.role === UserRole.HR) {
          await attendanceService.refreshRequestsFromApi();
        } else {
          await attendanceService.refreshRequestsFromApi(session.employeeId);
        }
      } catch (err) {
        console.error('[Requests] Auto-refresh failed:', err);
      }
    };

    refreshEntries();
    refreshRequests();
    const intervalId = window.setInterval(() => {
      refreshEntries();
      refreshRequests();
    }, 5000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    document.body.style.overflow = !session ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setFeedback(null);

    try {
      if (!employeeIdInput.trim() || !passwordInput.trim()) {
        throw new Error('Please enter both Employee ID and Password.');
      }

      const loginResp = await apiCall(ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          employee_id: employeeIdInput.trim(),
          password: passwordInput
        })
      });

      const tokenPayload = await safeParseJson(loginResp);
      const tokenData = tokenPayload?.data ?? tokenPayload;
      if (!tokenData?.access_token) {
        throw new Error('Login succeeded but token missing.');
      }

      localStorage.setItem('access_token', tokenData.access_token);

      const meResp = await apiCall(ENDPOINTS.AUTH.ME);
      const mePayload = await safeParseJson(meResp);
      const me = mePayload?.data ?? mePayload;

      // Check if user has permission for selected role
      if (selectedRole === UserRole.HR && me.role !== 'HR') {
        throw new Error('You do not have administrator privileges. Please select Employee role.');
      }

      const statusResp = await apiCall(ENDPOINTS.ATTENDANCE.STATUS(me.employee_id));
      const statusPayload = await safeParseJson(statusResp);
      const statusJson = statusPayload?.data ?? statusPayload;

      const normalizedStatus = statusJson.current_status === 'CHECKED_IN' ? AttendanceStatus.CHECKED_IN : AttendanceStatus.CHECKED_OUT;
      
      // Use the user's selected role from the form, not the database role
      const role = selectedRole;

      const newSession: UserSession = {
        employeeId: me.employee_id,
        name: me.name,
        role,
        currentStatus: normalizedStatus,
        lastCheckIn: statusJson.last_check_in?.timestamp,
        faceImageUrl: me.face_image_url || undefined
      };

      const remoteEntries = await attendanceService.fetchEntriesFromApi();

      setSession(newSession);
      setEntries(remoteEntries);
      localStorage.setItem('secur_corp_attendance_ledger', JSON.stringify(remoteEntries));
      localStorage.setItem('secur_corp_session', JSON.stringify(newSession));
      setFeedback({ type: 'success', message: 'Authenticated', detail: 'Connected to backend' });
    } catch (err: any) {
      let detail = err?.message || 'Authentication failed. Please try again.';
      
      // Clean up raw error messages for better UX
      if (detail.includes('Unexpected token') || detail.includes('DOCTYPE')) {
        detail = 'Server returned invalid response. Please ensure the backend API is running.';
      } else if (detail.includes('HTML instead of JSON')) {
        detail = 'Backend server is not responding correctly. Check if server is running on port 8000.';
      } else if (detail.includes('Network error') || detail.includes('Failed to reach')) {
        detail = 'Cannot reach the backend server. Please ensure it is running on http://localhost:8000';
      }
      
      setFeedback({ type: 'error', message: 'Authentication Failed', detail });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    apiCall(ENDPOINTS.AUTH.LOGOUT, { method: 'POST' })
      .then(async (response) => {
        try {
          await safeParseJson(response);
        } catch (err) {
          console.error('Logout response parsing error:', err);
        }
      })
      .catch((err) => {
        console.error('Logout error:', err);
      });
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('secur_corp_session');
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('secur_corp_attendance_ledger');
    setSession(null);
    setEmployeeIdInput('');
    setPasswordInput('');
    setEntries([]);
    setFeedback(null);
  };

  const initiateAttendance = (capturedImage: string) => {
    setPendingCaptureData({ image: capturedImage });
    setIsVerificationModalOpen(true);
  };

  const finalizeAttendance = useCallback(async (method: VerificationMethod) => {
    if (!session || !pendingCaptureData) return;
    setIsVerificationModalOpen(false);
    setIsProcessing(true);
    setFeedback(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation services unavailable.');
      }

      // Client-side face verification
      if (!session.faceImageUrl) {
        throw new Error('No enrolled face available for this user.');
      }

      console.log('[Attendance] Starting face verification...');
      const faceResult = await compareFaces(pendingCaptureData.image, session.faceImageUrl, 0.5);
      
      if (!faceResult.ok) {
        const detail = faceResult.reason 
          ? `Face verification failed: ${faceResult.reason}` 
          : 'Face did not match enrolled image. Please ensure good lighting and face is clearly visible.';
        console.error('[Attendance] Face verification failed:', detail);
        throw new Error(detail);
      }

      console.log('[Attendance] Face verification passed. Getting location...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const coords: Coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const now = new Date();
      const currentType = session.currentStatus === AttendanceStatus.CHECKED_IN ? 'OUT' : 'IN';
      const securityScan = securityService.validateAttendance(coords, workMode, now, pendingCaptureData.image, entries.filter(e => e.employeeId === session.employeeId));

      if (!securityScan.isValid) {
        setFeedback({ type: 'error', message: 'Security Intercept', detail: securityScan.reason });
        setIsProcessing(false);
        setPendingCaptureData(null);
        return;
      }

      let isFlagged = securityScan.anomalies.length > 0;
      let flagReason = securityScan.anomalies.join(', ');
      let duration: number | undefined;

      if (currentType === 'OUT') {
        const lastIn = attendanceService.getLastCheckIn(session.employeeId);
        if (lastIn) {
          duration = attendanceService.calculateDurationHours(lastIn.timestamp, now.toISOString());
          if (duration < 7.5) { 
            isFlagged = true; 
            flagReason = flagReason ? `${flagReason}, Shift Duration Low` : `Short duration`; 
          }
        }
      }

      const newEntry: AttendanceEntry = {
        id: generateId(),
        employeeId: session.employeeId,
        timestamp: now.toISOString(),
        type: currentType,
        mode: workMode,
        location: coords,
        isFlagged,
        flagReason,
        fieldWorkReason: workMode === WorkMode.FIELD ? fieldReason : undefined,
        deviceId: navigator.userAgent,
        verificationMethod: method,
        duration,
        imageData: pendingCaptureData.image
      };

      console.log('[Attendance] Syncing entry to API...');
      const persistedEntry = await attendanceService.syncEntryToApi(newEntry);
      attendanceService.saveEntry(persistedEntry);
      setEntries(prev => [...prev, persistedEntry]);
      setSession(prev => prev ? { ...prev, currentStatus: currentType === 'IN' ? AttendanceStatus.CHECKED_IN : AttendanceStatus.CHECKED_OUT } : null);
      setFeedback({ type: 'success', message: `Identity ${currentType === 'IN' ? 'Check-in' : 'Check-out'} Verified`, detail: `Face matched; attendance stored via ${method}.` });
    } catch (err: any) {
      console.error('[Attendance] Error during finalization:', err);
      let detail = 'Hardware verification failed.';
      
      // Check for specific error codes from geolocation
      if (err.code === 1) detail = 'Location access denied. Please enable GPS/Location access.';
      if (err.code === 3) detail = 'Location request timeout. Check your internet connection.';
      
      // Handle error messages
      if (err?.message) {
        // Face verification errors
        if (err.message.includes('Face verification failed')) {
          detail = err.message;
        }
        // Geolocation errors
        else if (err.message.includes('Geolocation')) {
          detail = 'Location services not available. Required for verification.';
        }
        // Face enrollment errors
        else if (err.message.includes('No enrolled face')) {
          detail = 'Your face is not enrolled in the system. Contact HR for enrollment.';
        }
        // JSON parsing errors from network response
        else if (err.message.includes('Unexpected token') || err.message.includes('DOCTYPE')) {
          detail = 'Server returned invalid response. Please ensure backend is running.';
        } 
        // Network errors
        else if (err.message.includes('Network error') || err.message.includes('Failed to reach')) {
          detail = 'Cannot reach the backend server. Ensure it is running on http://localhost:8000';
        }
        // HTML error pages
        else if (err.message.includes('HTML instead of JSON')) {
          detail = 'Backend server error. Check if backend is running properly.';
        }
        // Generic HTTP errors
        else if (err.message.startsWith('HTTP ')) {
          detail = `Server error: ${err.message}`;
        }
        // Use actual error message for all other cases
        else {
          detail = err.message;
        }
      }
      
      setFeedback({ type: 'error', message: 'Verification Interrupted', detail });
    } finally {
      setIsProcessing(false);
      setPendingCaptureData(null);
    }
  }, [session, workMode, fieldReason, entries, pendingCaptureData]);

  const handleCalendarClick = (dateStr: string) => {
    const clickedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) setShowRegularizationModal(true);
  };
  const lastCheckIn = session ? attendanceService.getLastCheckIn(session.employeeId) : undefined;
  const empWeekOffs = session ? attendanceService.getEmployeeWeekOffDays(session.employeeId) : [];

  // Keep hook order stable by always declaring hooks before conditional returns
  useEffect(() => {
    if (!session || session.role !== UserRole.EMPLOYEE) return;

    const parseTimeToMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return (h * 60) + m;
    };

    const getResetTime = (dateStr: string, startTime?: string, endTime?: string): Date => {
      const baseDate = new Date(`${dateStr}T00:00:00`);

      if (!startTime || !endTime) {
        baseDate.setDate(baseDate.getDate() + 1);
        return baseDate;
      }

      const startMinutes = parseTimeToMinutes(startTime);
      const normalizedEnd = endTime === '24:00' ? '00:00' : endTime;
      const endMinutes = parseTimeToMinutes(normalizedEnd);
      const isNightShift = endTime === '24:00' || endMinutes <= startMinutes;

      if (isNightShift) {
        baseDate.setDate(baseDate.getDate() + 1);
        baseDate.setHours(12, 0, 0, 0);
        return baseDate;
      }

      baseDate.setDate(baseDate.getDate() + 1);
      return baseDate;
    };

    const autoResetIfOverdue = () => {
      if (session.currentStatus !== AttendanceStatus.CHECKED_IN) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const shift = attendanceService.getEmployeeShift(session.employeeId, todayStr);
      const resetAt = getResetTime(todayStr, shift?.startTime, shift?.endTime);

      if (new Date() >= resetAt) {
        const updatedSession = { ...session, currentStatus: AttendanceStatus.CHECKED_OUT };
        setSession(updatedSession);
        localStorage.setItem('secur_corp_session', JSON.stringify(updatedSession));
      }
    };

    autoResetIfOverdue();
    const intervalId = setInterval(autoResetIfOverdue, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [session]);

  if (!session) {
    return (
      <Layout user={null} onLogout={() => {}}>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] animate-in fade-in zoom-in-95 duration-700">
          <div className="max-w-4xl w-full p-6">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#9BA4B4] flex flex-col md:flex-row">
              <div className="md:w-1/2 bg-[#14274E] p-8 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-[#5C7BA6]/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                    <i className="fas fa-shield-halved text-white text-3xl"></i>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight mb-2">Vayu Puthra<br/>Secured Ecosystem</h2>
                </div>

                <div className="relative z-10 space-y-6">                  
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] text-[#D6E4F0]/60 font-bold uppercase tracking-widest mb-1">Local Time Anchor</p>
                    <p className="text-lg font-mono font-bold tracking-tighter">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
                <div className="mb-8 text-center md:text-left">
                  <h3 className="text-xl font-extrabold text-[#14274E] tracking-tight">Identity Gateway</h3>
                  <p className="text-[#394867] text-[9px] font-black uppercase tracking-[0.3em] mt-1">Authenticate Credentials</p>
                </div>

                <div className="space-y-6">
                  <div className="flex p-1 bg-[#F1F6F9] rounded-xl border border-[#9BA4B4] space-x-1">
                    <button 
                      onClick={() => setSelectedRole(UserRole.EMPLOYEE)}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest border ${selectedRole === UserRole.EMPLOYEE ? 'bg-white shadow-sm text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#14274E]'}`}
                    >
                      Employee
                    </button>
                    <button 
                      onClick={() => setSelectedRole(UserRole.HR)}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest border ${selectedRole === UserRole.HR ? 'bg-white shadow-sm text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#14274E]'}`}
                    >
                      Administrator
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-[#394867] uppercase tracking-[0.2em] ml-1">Reference Identifier</label>
                      <div className="relative group">
                        <i className="fas fa-fingerprint absolute left-4 top-1/2 -translate-y-1/2 text-[#9BA4B4] group-focus-within:text-[#14274E] transition-colors text-sm"></i>
                        <input
                          type="text"
                          required
                          value={employeeIdInput}
                          onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                          placeholder={selectedRole === UserRole.HR ? "EMP001" : "EMP002"}
                          className="w-full pl-11 pr-5 py-3.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl focus:ring-4 focus:ring-[#14274E]/5 focus:border-[#14274E] focus:outline-none transition-all font-bold text-[#14274E] tracking-widest text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-[#394867] uppercase tracking-[0.2em] ml-1">Security Passphrase</label>
                      <div className="relative group">
                        <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#9BA4B4] group-focus-within:text-[#14274E] transition-colors text-sm"></i>
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-11 pr-5 py-3.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl focus:ring-4 focus:ring-[#14274E]/5 focus:border-[#14274E] focus:outline-none transition-all font-bold text-[#14274E] tracking-widest text-xs"
                        />
                      </div>
                    </div>
                    {feedback && !session && (
                      <div className="p-3 rounded-xl border-l-4 border-rose-500 bg-rose-50 animate-in slide-in-from-top-2">
                        <div className="flex items-start space-x-3">
                          <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-exclamation text-rose-600 text-[10px]"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-rose-900 uppercase tracking-wider">{feedback.message}</p>
                            <p className="text-[9px] font-bold text-rose-700 mt-1">{feedback.detail}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-black py-4 rounded-xl shadow-lg shadow-[#14274E]/10 transition-all active:scale-95 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center space-x-3"
                    >
                      <span>Verify Account</span>
                      <i className="fas fa-arrow-right-long text-[9px]"></i>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={{ name: session.name, id: session.employeeId }} onLogout={handleLogout}>
      {session.role === UserRole.HR ? (
        <HRDashboard />
      ) : (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
          <VerificationModal
            isOpen={isVerificationModalOpen}
            onVerified={finalizeAttendance}
            onCancel={() => { setIsVerificationModalOpen(false); setPendingCaptureData(null); }}
            actionLabel={session.currentStatus === AttendanceStatus.CHECKED_IN ? 'Logout' : 'Login'}
          />
          
          <div className="lg:flex h-full gap-6">
            <div className="lg:w-1/3 flex flex-col gap-6">
              <div className="bg-white rounded-3xl border border-[#9BA4B4] shadow-sm overflow-hidden flex-shrink-0">
                <div className="p-3 border-b border-[#F1F6F9] flex justify-between items-center bg-[#F8FAFC]">
                  <h2 className="font-black text-[#14274E] text-[10px] uppercase tracking-[0.2em] flex items-center">
                    <i className="fas fa-video text-[#14274E] mr-3"></i> Security Core
                  </h2>
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest flex items-center animate-pulse">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                    Live Link
                  </span>
                </div>
                
                <div className="p-2 relative">
                  {feedback && feedback.type === 'error' && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white p-6 rounded-3xl shadow-2xl border-t-4 border-rose-600 animate-in zoom-in-95 max-w-[90%] text-center">
                              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="fas fa-shield-xmark text-2xl"></i>
                              </div>
                              <p className="text-xs font-black text-[#14274E] uppercase tracking-[0.1em] mb-2">{feedback.message}</p>
                              <p className="text-[11px] text-[#394867] font-bold leading-relaxed mb-6">{feedback.detail || 'Protocol Breach Detected'}</p>
                              
                              <button 
                                  onClick={() => setFeedback(null)}
                                  className="w-full py-3 bg-[#14274E] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                              >
                                  Retry Identity Verification
                              </button>
                            </div>
                        </div>
                  )}

                  <div className="h-56 rounded-[2rem] overflow-hidden bg-slate-900 relative border border-slate-200 group shadow-inner">
                     <CameraCapture onCapture={initiateAttendance} isProcessing={isProcessing} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-3 border border-[#9BA4B4] shadow-sm flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 ${session.currentStatus === AttendanceStatus.CHECKED_IN ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                       <i className={`fas ${session.currentStatus === AttendanceStatus.CHECKED_IN ? 'fa-user-shield' : 'fa-lock'} text-xl`}></i>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-[#9BA4B4] uppercase tracking-[0.2em] mb-0.5">Authorization</span>
                      <span className={`text-sm font-black ${session.currentStatus === AttendanceStatus.CHECKED_IN ? 'text-emerald-700' : 'text-slate-600'}`}>
                         {session.currentStatus === AttendanceStatus.CHECKED_IN ? 'VERIFIED ACTIVE' : 'SECURED IDLE'}
                      </span>
                    </div>
                 </div>
                 {session.currentStatus === AttendanceStatus.CHECKED_IN && lastCheckIn && (
                     <div className="text-right">
                        <span className="block text-[10px] font-black text-[#9BA4B4] uppercase tracking-[0.2em] mb-0.5">Logged At</span>
                        <span className="text-sm font-black text-[#14274E]">
                          {new Date(lastCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                     </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setShowRegularizationModal(true)}
                    className="bg-white p-2 rounded-3xl border border-[#9BA4B4] hover:border-[#14274E] hover:bg-slate-50 transition-all group text-left shadow-sm min-h-[85px] flex flex-col justify-between"
                 >
                    <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                       <i className="fas fa-clock-rotate-left text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.1em] mb-0">Request</p>
                      <p className="text-[11px] font-black text-[#14274E] uppercase tracking-tighter leading-tight break-words">Regularization</p>
                    </div>
                 </button>

                 <button 
                    onClick={() => setShowShiftChangeModal(true)}
                    className="bg-white p-2 rounded-3xl border border-[#9BA4B4] hover:border-[#14274E] hover:bg-slate-50 transition-all group text-left shadow-sm min-h-[85px] flex flex-col justify-between"
                 >
                    <div className="w-8 h-8 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                       <i className="fas fa-shuffle text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.1em] mb-0">Schedule</p>
                      <p className="text-[11px] font-black text-[#14274E] uppercase tracking-tighter leading-tight break-words">Shift Swap</p>
                    </div>
                 </button>

                 <button 
                    onClick={() => setShowOvertimeModal(true)}
                    className="bg-white p-2 rounded-3xl border border-[#9BA4B4] hover:border-[#14274E] hover:bg-slate-50 transition-all group text-left shadow-sm min-h-[85px] flex flex-col justify-between"
                 >
                    <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                       <i className="fas fa-stopwatch text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.1em] mb-0">Apply</p>
                      <p className="text-[11px] font-black text-[#14274E] uppercase tracking-tighter leading-tight break-words">Overtime</p>
                    </div>
                 </button>

                 <button 
                    onClick={() => setShowPermissionModal(true)}
                    className="bg-white p-2 rounded-3xl border border-[#9BA4B4] hover:border-[#14274E] hover:bg-slate-50 transition-all group text-left shadow-sm min-h-[85px] flex flex-col justify-between"
                 >
                    <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                       <i className="fas fa-clock-arrow-up text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.1em] mb-0">Request</p>
                      <p className="text-[11px] font-black text-[#14274E] uppercase tracking-tighter leading-tight break-words">Permission Hrs</p>
                    </div>
                 </button>
              </div>
            </div>

            <div className="lg:w-2/3 flex flex-col h-full space-y-6">
                {feedback && feedback.type !== 'error' && (
                  <div className={`p-4 rounded-2xl border-l-8 flex items-center space-x-4 shadow-lg animate-in slide-in-from-top-4 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900'}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${feedback.type === 'success' ? 'bg-emerald-200' : 'bg-rose-200'}`}>
                        <i className={`fas ${feedback.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}></i>
                     </div>
                     <div className="flex-1">
                        <span className="text-xs font-black uppercase tracking-widest block">{feedback.message}</span>
                        <span className="text-[10px] font-bold opacity-75">{feedback.detail}</span>
                     </div>
                     <button onClick={() => setFeedback(null)} className="opacity-40 hover:opacity-100 transition-opacity">
                        <i className="fas fa-times"></i>
                     </button>
                  </div>
                )}

                <div className="bg-white rounded-[2.5rem] border border-[#9BA4B4] shadow-sm flex flex-col flex-grow overflow-hidden">
                  <div className="p-4 border-b border-[#F1F6F9] flex items-center justify-between bg-[#F8FAFC]">
                     <h3 className="font-black text-[#14274E] text-[10px] uppercase tracking-[0.3em]">
                       <i className="far fa-calendar-alt mr-3 text-[#9BA4B4]"></i> Attendance Register
                     </h3>
                     <div className="flex bg-white shadow-sm border border-slate-200 rounded-2xl p-1.5 space-x-1">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-[#394867] transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
                        <span className="px-5 flex items-center text-[11px] font-black text-[#14274E] uppercase tracking-widest min-w-[140px] justify-center">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-[#394867] transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
                     </div>
                  </div>

                  <div className="flex-grow p-4 overflow-auto">
                     <div className="grid grid-cols-7 mb-4">
                        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                           <div key={d} className="text-[9px] font-black text-[#9BA4B4] text-center uppercase tracking-[0.2em] py-2">{d}</div>
                        ))}
                     </div>

                     <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                        {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="opacity-0 pointer-events-none" />)}
                        
                        {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                           const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                           const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                           const dateStr = offsetDate.toISOString().split('T')[0];
                           
                           const dayEntries = entries.filter(
                             e => e.employeeId === session.employeeId && e.timestamp.startsWith(dateStr)
                           );
                           const checkIn = dayEntries.find(e => e.type === 'IN');
                           const checkOut = [...dayEntries].reverse().find(e => e.type === 'OUT');
                           
                           let totalHours = 0;
                           if (checkIn && checkOut && checkOut.duration) {
                               totalHours = Math.round(checkOut.duration * 10) / 10;
                           }

                           const today = new Date();
                           const isToday = date.getDate() === today.getDate() && 
                                           date.getMonth() === today.getMonth() && 
                                           date.getFullYear() === today.getFullYear();
                           
                           const isFuture = date > today && !isToday;
                           const isWeekOff = empWeekOffs.includes(date.getDay()); 
                           const isWorkingHoursOver = today.getHours() >= 18; 

                           let bgClass = "bg-white"; 
                           let borderClass = "border-slate-100";
                           let textClass = "text-[#394867]";
                           let statusElement = null;

                           // Re-ordered logic: Work > Week Off > Today > Absence
                           if (dayEntries.length > 0) {
                               bgClass = "bg-emerald-50"; borderClass = "border-emerald-100"; textClass = "text-emerald-700";
                           } else if (isWeekOff) {
                               bgClass = "bg-slate-50"; borderClass = "border-slate-100"; textClass = "text-slate-400";
                               statusElement = <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Week Off</span>;
                           } else if (isToday) {
                               if (isWorkingHoursOver) {
                                   bgClass = "bg-rose-50"; borderClass = "border-rose-100"; textClass = "text-rose-700";
                                   statusElement = <span className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Absent</span>;
                               } else {
                                   bgClass = "bg-[#14274E]"; borderClass = "border-[#14274E]"; textClass = "text-white";
                                   statusElement = <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">Current</span>;
                               }
                           } else if (!isFuture) {
                               bgClass = "bg-rose-50"; borderClass = "border-rose-100"; textClass = "text-rose-700";
                               statusElement = <span className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Absence</span>;
                           }

                           return (
                               <div 
                                   key={i} 
                                   onClick={() => !isFuture && handleCalendarClick(dateStr)}
                                   className={`min-h-[64px] border-2 rounded-2xl p-2 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 ${bgClass} ${borderClass}`}
                               >
                                  <div className="flex justify-between items-start">
                                     <span className={`text-[11px] font-black ${textClass}`}>{i + 1}</span>
                                     {!isFuture && !isToday && dayEntries.length === 0 && !isWeekOff && (
                                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center animate-pulse">
                                          <i className="fas fa-clock-rotate-left text-[9px]"></i>
                                        </div>
                                     )}
                                     {dayEntries.length > 0 && <i className="fas fa-check-circle text-[9px] text-emerald-500"></i>}
                                  </div>
                                  
                                  {dayEntries.length > 0 ? (
                                      <div className="space-y-1 mt-1">
                                         <div className="flex justify-between items-center text-[8px] font-black opacity-60">
                                            <span>IN</span>
                                            <span>{new Date(checkIn?.timestamp!).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!1})}</span>
                                         </div>
                                         <div className="flex justify-between items-center text-[8px] font-black opacity-60">
                                            <span>OUT</span>
                                            <span>{checkOut ? new Date(checkOut.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!1}) : '--:--'}</span>
                                         </div>
                                         {totalHours > 0 && (
                                            <div className="pt-1 mt-1 border-t border-black/5 flex justify-between items-center">
                                               <span className="text-[7px] font-black uppercase text-[#9BA4B4]">Span</span>
                                               <span className="text-[9px] font-black text-emerald-700">{totalHours}h</span>
                                            </div>
                                         )}
                                      </div>
                                  ) : (
                                      <div className="flex items-center justify-center h-full">
                                          {statusElement}
                                      </div>
                                  )}
                               </div>
                           );
                        })}
                     </div>
                  </div>
                </div>
            </div>
          </div>
          
          <AttendanceDashboard 
            entries={entries.filter(e => e.employeeId === session.employeeId)} 
            status={session.currentStatus} 
            lastCheckIn={attendanceService.getLastCheckIn(session.employeeId)}
            employeeId={session.employeeId}
            workMode={workMode} 
            setWorkMode={setWorkMode}
          />

          <RegularizationModal 
            isOpen={showRegularizationModal} 
            onClose={() => setShowRegularizationModal(false)} 
            employeeId={session.employeeId} 
          />
          <ShiftChangeModal 
            isOpen={showShiftChangeModal} 
            onClose={() => setShowShiftChangeModal(false)} 
            employeeId={session.employeeId} 
          />
          <OvertimeModal 
            isOpen={showOvertimeModal} 
            onClose={() => setShowOvertimeModal(false)} 
            employeeId={session.employeeId} 
          />
          <PermissionModal 
            isOpen={showPermissionModal} 
            onClose={() => setShowPermissionModal(false)} 
            employeeId={session.employeeId} 
          />
        </div>
      )}
    </Layout>
  );
};

export default App;
