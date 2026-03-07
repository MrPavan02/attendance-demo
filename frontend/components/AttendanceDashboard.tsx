import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceEntry, AttendanceStatus, WorkMode, OvertimeRequest, PermissionRequest, VerificationMethod } from '../types';
import { adminService } from '../services/adminService';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { ATTENDANCE_STATUS_COLORS, SHIFTS, WORK_MODES } from '../constants';
import RegularizationModal from './RegularizationModal';
import ShiftChangeModal from './ShiftChangeModal';
import { generateId } from '../utils/id';

const MAIN_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'attendanceRegister', label: 'Attendance Register' },
  { key: 'settings', label: 'Environment' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'teamApprovals', label: 'Team Approvals' },
  { key: 'applyOnBehalf', label: 'Apply on behalf' },
  { key: 'reports', label: 'Reports' }
] as const;

type MainTabKey = typeof MAIN_TABS[number]['key'];

const REQUEST_TABS = [
  { key: 'regularization', label: 'Regularization', shortLabel: 'Regularization' },
  { key: 'shift', label: 'Shift', shortLabel: 'Shift' },
  { key: 'overtime', label: 'Overtime', shortLabel: 'Overtime' },
  { key: 'permission', label: 'Permission Hours', shortLabel: 'Permission Hrs' }
] as const;

type RequestTabKey = typeof REQUEST_TABS[number]['key'];

const TEAM_APPROVAL_TABS = [
  { key: 'regularization', label: 'Regularization' },
  { key: 'shift', label: 'Shift Swap' },
  { key: 'overtime', label: 'Overtime' },
  { key: 'permission', label: 'Permission Hrs' }
] as const;

type TeamApprovalTabKey = typeof TEAM_APPROVAL_TABS[number]['key'];

const REPORT_TABS = [
  { key: 'summary', label: 'Summary', icon: 'fa-chart-pie' },
  { key: 'attendance', label: 'Attendance', icon: 'fa-calendar-check' },
  { key: 'misPunch', label: 'Mis-Punch', icon: 'fa-exclamation-triangle' },
  { key: 'regularization', label: 'Regularization', icon: 'fa-file-contract' },
  { key: 'shiftRequests', label: 'Shift Requests', icon: 'fa-clock-rotate-left' },
  { key: 'teamReports', label: 'Team Reports', icon: 'fa-users' }
] as const;

type ReportTabKey = typeof REPORT_TABS[number]['key'];

interface DashboardProps {
  entries: AttendanceEntry[];
  status: AttendanceStatus;
  lastCheckIn?: AttendanceEntry;
  employeeId: string;
  workMode: WorkMode;
  setWorkMode: (mode: WorkMode) => void;
  empWeekOffs?: number[];
}

const AttendanceDashboard: React.FC<DashboardProps> = ({ 
  entries, 
  status, 
  lastCheckIn, 
  employeeId,
  workMode,
  setWorkMode,
  empWeekOffs = []
 
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const [activeMainTab, setActiveMainTab] = useState<MainTabKey>('dashboard');
  const [activeReqTab, setActiveReqTab] = useState<RequestTabKey>('regularization');
  const [activeTeamApprovalTab, setActiveTeamApprovalTab] = useState<TeamApprovalTabKey>('regularization');
  const [activeApprovalReviewTab, setActiveApprovalReviewTab] = useState<TeamApprovalTabKey>('regularization');
  const [activeStatisticsView, setActiveStatisticsView] = useState<'monthly' | 'ytd'>('monthly');

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [summaryMonth, setSummaryMonth] = useState<string>(new Date().toISOString().substring(0, 7)); 
  const [summaryYear, setSummaryYear] = useState<string>(new Date().getFullYear().toString());
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [regularizationRequests, setRegularizationRequests] = useState<any[]>([]);
  const [shiftChangeRequests, setShiftChangeRequests] = useState<any[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [misPunchList, setMisPunchList] = useState<any[]>([]);

  // Team Approval States
  const [teamPendingRegularizations, setTeamPendingRegularizations] = useState<any[]>([]);
  const [teamPendingShifts, setTeamPendingShifts] = useState<any[]>([]);
  const [teamPendingOvertime, setTeamPendingOvertime] = useState<any[]>([]);
  const [teamPendingPermissions, setTeamPendingPermissions] = useState<any[]>([]);
  
  // On Behalf Form States
  const [behalfEmployeeId, setBehalfEmployeeId] = useState('');
  const [behalfDate, setBehalfDate] = useState(new Date().toISOString().split('T')[0]);
  const [behalfRegType, setBehalfRegType] = useState<'LOGIN' | 'LOGOUT' | 'BOTH'>('LOGIN');
  const [behalfLoginTime, setBehalfLoginTime] = useState('09:00');
  const [behalfLogoutTime, setBehalfLogoutTime] = useState('18:00');
  const [behalfReason, setBehalfReason] = useState('');
  const [behalfShift, setBehalfShift] = useState('');
  const [behalfShiftTo, setBehalfShiftTo] = useState('');
  const [behalfHours, setBehalfHours] = useState(1);
  const [behalfStartTime, setBehalfStartTime] = useState('09:00');
  const [behalfEndTime, setBehalfEndTime] = useState('11:00');
  const [behalfShiftName, setBehalfShiftName] = useState('');
  const [behalfOTStartTime, setBehalfOTStartTime] = useState('18:00');
  const [behalfOTEndTime, setBehalfOTEndTime] = useState('20:00');
  const [isSubmittingBehalf, setIsSubmittingBehalf] = useState(false);

  const [activeEmployeeReport, setActiveEmployeeReport] = useState<ReportTabKey>('summary');
  
  const [reportType, setReportType] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportFromDate, setReportFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  
  const [teamReportType, setTeamReportType] = useState<'attendance' | 'misPunch' | 'regularization' | 'shiftRequests'>('attendance');
  const [teamReportPeriod, setTeamReportPeriod] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamFromDate, setTeamFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamToDate, setTeamToDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamMonth, setTeamMonth] = useState(new Date().toISOString().substring(0, 7));
  const [teamData, setTeamData] = useState<any[]>([]);
  const [teamSummary, setTeamSummary] = useState<any>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const teamMembers = useMemo(() => {
    const currentEmployee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
    if (!currentEmployee) return [];
    return MOCK_EMPLOYEES.filter(emp => 
        emp.department === currentEmployee.department && emp.id !== employeeId
    );
  }, [employeeId]);

  const loadAllRequests = () => {
    loadRegularizationRequests();
    loadShiftChangeRequests();
    loadOvertimeRequests();
    loadPermissionRequests();
    loadTeamPendingApprovals();
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
      loadAllRequests();
      if (activeEmployeeReport === 'teamReports') {
        loadTeamData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('attendance-config-updated', handleStorageChange);
    
    loadAllRequests();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('attendance-config-updated', handleStorageChange);
    };
  }, [employeeId]);

  useEffect(() => {
    const calculateMisPunches = () => {
      const misPunches = [];
      const today = new Date();
      for(let i=1; i<=30; i++) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const dayEntries = entries.filter(e => e.timestamp.startsWith(dateStr));
          if (dayEntries.length === 0) continue; 

          const login = dayEntries.find(e => e.type === 'IN');
          const logout = dayEntries.find(e => e.type === 'OUT');
          
          if ((login && !logout) || (!login && logout)) {
              misPunches.push({
                  date: dateStr,
                  type: !login ? 'Missing Check-In' : 'Missing Check-Out',
                  status: 'ACTION REQUIRED'
              });
          }
      }
      setMisPunchList(misPunches);
    };
    calculateMisPunches();
  }, [entries]);

  const loadRegularizationRequests = () => {
    const requests = attendanceService.getRegularizationRequests();
    const employeeRequests = requests.filter(req => req.employeeId === employeeId);
    setRegularizationRequests(employeeRequests);
  };

  const loadShiftChangeRequests = () => {
    const requests = attendanceService.getShiftChangeRequests();
    const employeeRequests = requests.filter(req => req.employeeId === employeeId);
    setShiftChangeRequests(employeeRequests);
  };

  const loadOvertimeRequests = () => {
    const requests = attendanceService.getOvertimeRequests();
    const employeeRequests = requests.filter(req => req.employeeId === employeeId);
    setOvertimeRequests(employeeRequests);
  };

  const loadPermissionRequests = () => {
    const requests = attendanceService.getPermissionRequests();
    const employeeRequests = requests.filter(req => req.employeeId === employeeId);
    setPermissionRequests(employeeRequests);
  };

  const loadTeamPendingApprovals = () => {
    const currentEmployee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
    if (!currentEmployee) return;

    const teamMemberIds = MOCK_EMPLOYEES.filter(emp => 
        emp.department === currentEmployee.department && emp.id !== employeeId
    ).map(e => e.id);

    const regReqs = attendanceService.getRegularizationRequests().filter(r => 
        teamMemberIds.includes(r.employeeId) && r.status === 'PENDING'
    );
    const shiftReqs = attendanceService.getShiftChangeRequests().filter(r => 
        teamMemberIds.includes(r.employeeId) && r.status === 'PENDING'
    );
    const otReqs = attendanceService.getOvertimeRequests().filter(r => 
        teamMemberIds.includes(r.employeeId) && r.status === 'PENDING'
    );
    const permReqs = attendanceService.getPermissionRequests().filter(r => 
        teamMemberIds.includes(r.employeeId) && r.status === 'PENDING'
    );

    setTeamPendingRegularizations(regReqs);
    setTeamPendingShifts(shiftReqs);
    setTeamPendingOvertime(otReqs);
    setTeamPendingPermissions(permReqs);
  };

  const handleTeamAction = async (type: 'reg' | 'shift' | 'ot' | 'perm', id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      if (type === 'reg') {
        await attendanceService.updateRegularizationRequestStatusToApi(id, action);
      } else if (type === 'shift') {
        await attendanceService.updateShiftChangeRequestStatusToApi(id, action);
      } else if (type === 'ot') {
        await attendanceService.updateOvertimeRequestStatusToApi(id, action);
      } else if (type === 'perm') {
        await attendanceService.updatePermissionRequestStatusToApi(id, action);
      }
    } catch (err) {
      console.error('[Team Approvals] Update failed:', err);
    } finally {
      loadTeamPendingApprovals();
      window.dispatchEvent(new Event('attendance-config-updated'));
    }
  };

  const handleApplyOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!behalfEmployeeId || !behalfReason.trim()) {
        alert("Please fill all mandatory fields");
        return;
    }

    setIsSubmittingBehalf(true);
    try {
      if (activeTeamApprovalTab === 'regularization') {
        const dateStr = behalfDate;
        if (behalfRegType === 'LOGIN' || behalfRegType === 'BOTH') {
          attendanceService.saveEntry({
            id: generateId(),
            employeeId: behalfEmployeeId,
            timestamp: `${dateStr}T${behalfLoginTime}:00.000Z`,
            type: 'IN',
            mode: WorkMode.OFFICE,
            location: { latitude: 0, longitude: 0 },
            isFlagged: false,
            deviceId: 'Lead Regularization',
            verificationMethod: VerificationMethod.PIN,
            duration: 0
          });
        }
        if (behalfRegType === 'LOGOUT' || behalfRegType === 'BOTH') {
          attendanceService.saveEntry({
            id: generateId(),
            employeeId: behalfEmployeeId,
            timestamp: `${dateStr}T${behalfLogoutTime}:00.000Z`,
            type: 'OUT',
            mode: WorkMode.OFFICE,
            location: { latitude: 0, longitude: 0 },
            isFlagged: false,
            deviceId: 'Lead Regularization',
            verificationMethod: VerificationMethod.PIN,
            duration: 8
          });
        }
        alert('Attendance regularized for team member.');
      } else if (activeTeamApprovalTab === 'shift') {
        const targetShift = behalfShiftTo || behalfShift;
        if (!targetShift) { alert("Select shift"); setIsSubmittingBehalf(false); return; }
        attendanceService.saveShiftAssignment({
          id: generateId(),
          employeeId: behalfEmployeeId,
          shiftId: targetShift,
          date: behalfDate,
          effectiveFrom: new Date().toISOString()
        });
        alert('Shift assigned to team member.');
      } else if (activeTeamApprovalTab === 'overtime') {
        const request = {
          id: generateId(),
          employeeId: behalfEmployeeId,
          date: behalfDate,
          hours: behalfHours,
          reason: behalfReason,
          status: 'APPROVED' as const,
          submittedAt: new Date().toISOString()
        };
        const created = await attendanceService.submitOvertimeRequestToApi(request);
        await attendanceService.updateOvertimeRequestStatusToApi(created.id, 'APPROVED');
        alert('Overtime applied for team member.');
      } else if (activeTeamApprovalTab === 'permission') {
        const request = {
          id: generateId(),
          employeeId: behalfEmployeeId,
          date: behalfDate,
          startTime: behalfStartTime,
          endTime: behalfEndTime,
          reason: behalfReason,
          status: 'APPROVED' as const,
          submittedAt: new Date().toISOString()
        };
        const created = await attendanceService.submitPermissionRequestToApi(request);
        await attendanceService.updatePermissionRequestStatusToApi(created.id, 'APPROVED');
        alert('Permission hours approved for team member.');
      }

      setBehalfReason('');
      setBehalfShiftName('');
      setBehalfOTStartTime('18:00');
      setBehalfOTEndTime('20:00');
      window.dispatchEvent(new Event('attendance-config-updated'));
      loadTeamPendingApprovals();
    } catch (err) {
      alert("Action failed: " + err);
    } finally {
      setIsSubmittingBehalf(false);
    }
  };

  const loadTeamData = () => {
      setIsLoadingTeam(true);
    
      setTimeout(() => {
        const currentEmployee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
        if (!currentEmployee) {
          setTeamData([]);
          setTeamSummary(null);
          setIsLoadingTeam(false);
          return;
        }
        
        const teamMembers = MOCK_EMPLOYEES.filter(emp => 
          emp.department === currentEmployee.department && emp.id !== employeeId
        );
        
        let data: any[] = [];
        const holidays = adminService.getHolidays();
        const allRegularizationRequests = attendanceService.getRegularizationRequests();
        const allShiftChangeRequests = attendanceService.getShiftChangeRequests();
        
        let dateRange: string[] = [];
        
        if (teamReportPeriod === 'daily') {
          dateRange = [teamDate];
        } else if (teamReportPeriod === 'monthly') {
          const [year, month] = teamMonth.split('-').map(Number);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          const current = new Date(startDate);
          
          while (current <= endDate) {
            dateRange.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        } else {
          const start = new Date(teamFromDate);
          const end = new Date(teamToDate);
          const current = new Date(start);
          
          while (current <= end) {
            dateRange.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
        
        if (teamReportType === 'attendance') {
          dateRange.forEach((dateStr) => {
            teamMembers.forEach((emp) => {
              const entries = attendanceService.getAttendanceForDate(dateStr).filter(e => e.employeeId === emp.id);
              const loginEntry = entries.find(e => e.type === 'IN');
              const logoutEntry = entries.find(e => e.type === 'OUT');
              const shift = attendanceService.getEmployeeShift(emp.id, dateStr);
              
              const loginTime = loginEntry ? 
                new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                'Absent';
              const logoutTime = logoutEntry ? 
                new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                'Absent';
              
              let lateComing = 'On Time';
              let earlyGoing = 'On Time';
              
              if (shift && loginEntry) {
                const checkInTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                const lateMinutes = attendanceService.calculateLateArrival(checkInTime, shift.startTime);
                if (lateMinutes > 0) lateComing = `${lateMinutes} min`;
              }
              
              if (shift && logoutEntry) {
                const checkOutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                const earlyMinutes = attendanceService.calculateEarlyGoing(checkOutTime, shift.endTime);
                if (earlyMinutes > 0) earlyGoing = `${earlyMinutes} min`;
              }
              
              const totalHours = loginEntry && logoutEntry 
                ? attendanceService.calculateDurationHours(loginEntry.timestamp, logoutEntry.timestamp).toFixed(1) + ' hrs'
                : '0 hrs';

              const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
              const dayOfWeek = new Date(dateStr).getDay();
              const isWeekOff = weekOffs.includes(dayOfWeek);
              const isHoliday = holidays.some(h => h.date === dateStr);
              
              let status = 'Present';
              if (isHoliday) status = 'Holiday';
              else if (isWeekOff) status = 'Week Off';
              else if (!loginEntry && !logoutEntry) status = 'Absent';
              else if (!logoutEntry) status = 'On Duty';
              
              data.push({
                sno: data.length + 1,
                date: dateStr,
                empId: emp.id,
                empName: emp.name,
                shift: shift?.name || 'Not Assigned',
                loginTime,
                logoutTime,
                lateComing,
                earlyGoing,
                totalHours,
                status
              });
            });
          });
        }
        
        else if (teamReportType === 'misPunch') {
         dateRange.forEach((dateStr) => {
           teamMembers.forEach((emp) => {
             const entries = attendanceService.getAttendanceForDate(dateStr).filter(e => e.employeeId === emp.id);
             const loginEntry = entries.find(e => e.type === 'IN');
             const logoutEntry = entries.find(e => e.type === 'OUT');
             
             const isMissedLogin = !loginEntry;
             const isMissedLogout = !logoutEntry;
             
             if (isMissedLogin || isMissedLogout) {
               const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
               const dayOfWeek = new Date(dateStr).getDay();
               const isWeekOff = weekOffs.includes(dayOfWeek);
               const isHoliday = holidays.some(h => h.date === dateStr);
               
               if (!isWeekOff && !isHoliday) {
                 const regReq = allRegularizationRequests.find(r => r.employeeId === emp.id && r.date === dateStr);
                 data.push({
                   sno: data.length + 1,
                   date: dateStr,
                   employeeId: emp.id,
                   employeeName: emp.name,
                   location: 'Office',
                   loginTime: loginEntry ? 
                     new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                     'Absent',
                   logoutTime: logoutEntry ? 
                     new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                     'Absent',
                   appliedDate: regReq?.submittedAt ? new Date(regReq.submittedAt).toLocaleDateString() : '-',
                   appliedBy: regReq ? (regReq.id.toLowerCase().includes('admin') ? 'Admin' : 'Self') : '-',
                   status: regReq ? regReq.status : 'MIS-PUNCH',
                   approvedDate: regReq?.approvedAt ? new Date(regReq.approvedAt).toLocaleDateString() : '-'
                 });
               }
             }
           });
         });
        }
        else if (teamReportType === 'regularization') {
          dateRange.forEach((dateStr) => {
            teamMembers.forEach((emp) => {
              const empRequests = allRegularizationRequests.filter(req => 
                req.employeeId === emp.id && req.date === dateStr
              );
              
              empRequests.forEach((req) => {
                data.push({
                  sno: data.length + 1,
                  date: req.date,
                  employeeId: emp.id,
                  employeeName: emp.name,
                  location: 'Office',
                  type: req.type.replace('_', ' '),
                  loginTime: req.requestedLoginTime || '-',
                  logoutTime: req.requestedLogoutTime || '-',
                  appliedDate: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
                  appliedBy: req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
                  approvedDate: req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-',
                  status: req.status,
                  remarks: req.remarks || '-'
                });
              });
            });
          });
        }
        
        else if (teamReportType === 'shiftRequests') {
          dateRange.forEach((dateStr) => {
            teamMembers.forEach((emp) => {
              const empRequests = allShiftChangeRequests.filter(req => 
                req.employeeId === emp.id && req.date === dateStr
              );
              
              empRequests.forEach((req) => {
                const currentShift = SHIFTS.find(s => s.id === req.currentShiftId);
                const requestedShift = SHIFTS.find(s => s.id === req.requestedShiftId);
                
                data.push({
                  sno: data.length + 1,
                  id: req.id,
                  date: req.date,
                  employeeId: emp.id,
                  employeeName: emp.name,
                  location: 'Office',
                  shiftAllocated: currentShift?.name || req.currentShiftId,
                  shiftRequested: requestedShift?.name || req.requestedShiftId,
                  appliedDate: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
                  appliedBy: req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
                  approvedDate: req.status === 'APPROVED' ? 'Verified' : '-',
                  status: req.status,
                  remarks: req.reason || '-'
                });
              });
            });
          });
        }

        let presentCount = 0;
        let absentCount = 0;
        let misPunchCount = 0;
        let regularizationCount = 0;
        let shiftRequestCount = 0;
        
        if (teamReportType === 'attendance') {
          data.forEach(row => {
            if (row.status === 'Present') presentCount++;
            else if (row.status === 'Absent') absentCount++;
          });
        } else if (teamReportType === 'misPunch') {
          misPunchCount = data.length;
        } else if (teamReportType === 'regularization') {
          regularizationCount = data.length;
          const approvedCount = data.filter(row => row.status === 'APPROVED').length;
          const pendingCount = data.filter(row => row.status === 'PENDING').length;
          const rejectedCount = data.filter(row => row.status === 'REJECTED').length;
          
          setTeamSummary({
            total: regularizationCount,
            approved: approvedCount,
            pending: pendingCount,
            rejected: rejectedCount
          });
        } else if (teamReportType === 'shiftRequests') {
          shiftRequestCount = data.length;
          const approvedCount = data.filter(row => row.status === 'APPROVED').length;
          const pendingCount = data.filter(row => row.status === 'PENDING').length;
          const rejectedCount = data.filter(row => row.status === 'REJECTED').length;
          
          setTeamSummary({
            total: shiftRequestCount,
            approved: approvedCount,
            pending: pendingCount,
            rejected: rejectedCount
          });
        }
        
        if (teamReportType === 'attendance') {
          setTeamSummary({
            present: presentCount,
            absent: absentCount,
            total: data.length
          });
        } else if (teamReportType === 'misPunch') {
          setTeamSummary({
            total: misPunchCount
          });
        }
        
        setTeamData(data);
        setIsLoadingTeam(false);
      }, 500);
  };

  useEffect(() => {
    if (activeEmployeeReport === 'teamReports') {
      loadTeamData();
    }
  }, [activeEmployeeReport, teamReportType, teamReportPeriod, teamDate, teamFromDate, teamToDate, teamMonth]);

  useEffect(() => {
    const currentMonthEntries = entries.filter(e => e.timestamp.startsWith(summaryMonth));
    const presentDays = new Set(currentMonthEntries.map(e => e.timestamp.split('T')[0])).size;
    
    let totalHours = 0;
    let earlyGoingCount = 0;
    let lateInCount = 0;
    
    currentMonthEntries.forEach(entry => {
        if (entry.type === 'IN') {
             if (new Date(entry.timestamp).getMinutes() > 30 && new Date(entry.timestamp).getHours() >= 9) lateInCount++;
        }
        if (entry.type === 'OUT' && entry.duration) {
            totalHours += entry.duration;
            if (entry.duration < 8.5) earlyGoingCount++;
        }
    });

    // Calculate OT Hours for the summary
    const allOtRequests = attendanceService.getOvertimeRequests().filter(req => 
      req.employeeId === employeeId && 
      req.date.startsWith(summaryMonth) && 
      req.status === 'APPROVED'
    );
    const totalOtHours = allOtRequests.reduce((sum, req) => sum + req.hours, 0);

    setMonthlySummary({
        present: presentDays,
        absent: 26 - presentDays, 
        late: lateInCount,
        earlyGoing: earlyGoingCount, 
        totalHours: Math.floor(totalHours), 
        otHours: totalOtHours,
        leaves: 2, 
        holidays: 4, 
        weekOffs: 8 
    });
  }, [entries, summaryMonth, employeeId]);

  // YTD Statistics Calculation
  const ytdSummary = useMemo(() => {
    const yearEntries = entries.filter(e => e.timestamp.startsWith(summaryYear));
    const presentDays = new Set(yearEntries.map(e => e.timestamp.split('T')[0])).size;
    
    let totalHours = 0;
    let earlyGoingCount = 0;
    let lateInCount = 0;
    
    yearEntries.forEach(entry => {
        if (entry.type === 'IN') {
             const entryDate = new Date(entry.timestamp);
             if (entryDate.getMinutes() > 30 && entryDate.getHours() >= 9) lateInCount++;
        }
        if (entry.type === 'OUT' && entry.duration) {
            totalHours += entry.duration;
            if (entry.duration < 8.5) earlyGoingCount++;
        }
    });

    const allOtRequests = attendanceService.getOvertimeRequests().filter(req => 
      req.employeeId === employeeId && 
      req.date.startsWith(summaryYear) && 
      req.status === 'APPROVED'
    );
    const totalOtHours = allOtRequests.reduce((sum, req) => sum + req.hours, 0);

    return {
        present: presentDays,
        totalHours: Math.floor(totalHours),
        earlyGoing: earlyGoingCount,
        late: lateInCount,
        otHours: totalOtHours,
        absent: Math.max(0, 260 - presentDays), // Placeholder roughly based on 10 months
        leaves: Math.round(presentDays / 10),
        holidays: 12,
        weekOffs: 52
    };
  }, [entries, employeeId, summaryYear]);

  const holidays = adminService.getHolidays();
  const employeeWeekOffs = attendanceService.getEmployeeWeekOffDays(employeeId);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const handleRegularizationClick = (date: string) => {
    const selectedDateObj = new Date(date);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    
    if (selectedDateObj > todayObj) {
      alert('Regularization can only be requested for past dates');
      return;
    }
    
    const existingRequest = regularizationRequests.find(req => req.date === date);
    if (existingRequest) {
      alert(`You already have a ${existingRequest.status.toLowerCase()} regularization request for this date.`);
      return;
    }
    
    setSelectedDate(date);
    setShowRegularizationModal(true);
  };

  const handleRegularizationRequest = () => {
      setSelectedDate(''); 
      setShowRegularizationModal(true);
  };

  const maxDate = new Date().toISOString().split('T')[0];
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getShiftDisplay = (shiftId: string) => {
    if (!shiftId) return 'Not Assigned';
    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return shiftId;
    return shift.name;
  };

  const misPunchDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const allRegRequests = attendanceService.getRegularizationRequests().filter(r => r.employeeId === employeeId);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEntries = entries.filter(e => e.timestamp.startsWith(dateStr));
      
      let loginTime: string | null = null;
      let logoutTime: string | null = null;
      const loginEntry = dayEntries.find(e => e.type === 'IN');
      const logoutEntry = dayEntries.find(e => e.type === 'OUT');
      
      if (loginEntry) loginTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (logoutEntry) logoutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const dayOfWeek = new Date(dateStr).getDay();
      const isWeekOff = employeeWeekOffs.includes(dayOfWeek);
      const isHolidayRecord = holidays.some(h => h.date === dateStr);
      let type = 'neutral';
      if(isWeekOff) type = 'week_off';
      else if(isHolidayRecord) type = 'holiday';

      // Find regularization request for this date
      const regReq = allRegRequests.find(r => r.date === dateStr);

      days.push({ 
        date: dateStr, 
        loginTime, 
        logoutTime, 
        type, 
        isFuture: dateStr > todayStr,
        status: regReq ? regReq.status : 'MIS-PUNCH',
        appliedDate: regReq?.submittedAt ? new Date(regReq.submittedAt).toLocaleDateString() : '-',
        appliedBy: regReq ? (regReq.id.toLowerCase().includes('admin') ? 'Admin' : 'Self') : '-',
        approvedDate: regReq?.approvedAt ? new Date(regReq.approvedAt).toLocaleDateString() : '-'
      });
    }

    let filteredDays = days.filter(day => 
      !day.isFuture && 
      (day.loginTime === null || day.logoutTime === null) &&
      day.type !== 'week_off' && 
      day.type !== 'holiday'
    );

    if (reportType === 'daily') {
      filteredDays = filteredDays.filter(day => day.date === reportDate);
    } else if (reportType === 'range') {
      filteredDays = filteredDays.filter(day => 
        day.date >= reportFromDate && day.date <= reportToDate
      );
    } else if (reportType === 'monthly') {
      const [year, month] = reportMonth.split('-').map(Number);
      filteredDays = filteredDays.filter(day => {
        const date = new Date(day.date);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      });
    }

    return filteredDays;
  }, [currentMonth, reportType, reportDate, reportFromDate, reportToDate, reportMonth, entries, employeeWeekOffs, holidays, todayStr, employeeId]);

  const filteredRegularizationRequests = useMemo(() => {
    let filtered = regularizationRequests;

    if (reportType === 'daily') {
      filtered = filtered.filter(req => req.date === reportDate);
    } else if (reportType === 'range') {
      filtered = filtered.filter(req => 
        req.date >= reportFromDate && req.date <= reportToDate
      );
    } else if (reportType === 'monthly') {
      const [year, month] = reportMonth.split('-').map(Number);
      filtered = filtered.filter(req => {
        const date = new Date(req.date);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      });
    }

    return filtered;
  }, [regularizationRequests, reportType, reportDate, reportFromDate, reportToDate, reportMonth]);

  const filteredShiftChangeRequests = useMemo(() => {
    let filtered = shiftChangeRequests;

    if (reportType === 'daily') {
      filtered = filtered.filter(req => req.date === reportDate);
    } else if (reportType === 'range') {
      filtered = filtered.filter(req => 
        req.date >= reportFromDate && req.date <= reportToDate
      );
    } else if (reportType === 'monthly') {
      const [year, month] = reportMonth.split('-').map(Number);
      filtered = filtered.filter(req => {
        const date = new Date(req.date);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      });
    }

    return filtered;
  }, [shiftChangeRequests, reportType, reportDate, reportFromDate, reportToDate, reportMonth]);

  const attendanceReportData = useMemo(() => {
    const data: any[] = [];
    let dateRange: string[] = [];
    
    if (reportType === 'daily') {
      dateRange = [reportDate];
    } else if (reportType === 'range') {
      const start = new Date(reportFromDate);
      const end = new Date(reportToDate);
      const current = new Date(start);
      
      while (current <= end) {
        dateRange.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else if (reportType === 'monthly') {
      const [year, month] = reportMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const current = new Date(startDate);
      
      while (current <= endDate) {
        dateRange.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
    
    dateRange.forEach(dateStr => {
      const entriesForDate = entries.filter(e => e.timestamp.startsWith(dateStr));
      const loginEntry = entriesForDate.find(e => e.type === 'IN');
      const logoutEntry = entriesForDate.find(e => e.type === 'OUT');
      const shift = attendanceService.getEmployeeShift(employeeId, dateStr);
      const weekOffs = attendanceService.getEmployeeWeekOffDays(employeeId);
      const dayOfWeek = new Date(dateStr).getDay();
      const isWeekOff = weekOffs.includes(dayOfWeek);
      const isHoliday = holidays.some(h => h.date === dateStr);
      
      let status = 'Present';
      if (isHoliday) status = 'Holiday';
      else if (isWeekOff) status = 'Week Off';
      else if (!loginEntry && !logoutEntry) status = 'Absent';
      else if (!logoutEntry) status = 'On Duty';

      const isNonWorkingDay = status === 'Holiday' || status === 'Week Off' || status === 'Leave';

      const loginTime = isNonWorkingDay ? 'NA' : (loginEntry ? 
        new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
        'Absent');
        
      const logoutTime = isNonWorkingDay ? 'NA' : (logoutEntry ? 
        new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
        'Absent');
      
      let lateArrival = isNonWorkingDay ? 'NA' : 'On Time';
      let earlyGoing = isNonWorkingDay ? 'NA' : 'On Time';
      
      if (!isNonWorkingDay) {
          if (shift && loginEntry) {
            const checkInTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const lateMinutes = attendanceService.calculateLateArrival(checkInTime, shift.startTime);
            if (lateMinutes > 0) lateArrival = `${lateMinutes} min`;
          }
          
          if (shift && logoutEntry) {
            const checkOutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const earlyMinutes = attendanceService.calculateEarlyGoing(checkOutTime, shift.endTime);
            if (earlyMinutes > 0) earlyGoing = `${earlyMinutes} min`;
          }
      }
      
      const totalHours = isNonWorkingDay ? 'NA' : (loginEntry && logoutEntry ? 
        attendanceService.calculateDurationHours(loginEntry.timestamp, logoutEntry.timestamp).toFixed(1) + ' hrs' : 
        '0 hrs');
      
      data.push({
        date: dateStr,
        loginTime,
        logoutTime,
        shift: shift?.name || 'Not Assigned',
        lateArrival,
        earlyGoing,
        totalHours,
        status
      });
    });
    
    return data;
  }, [reportType, reportDate, reportFromDate, reportToDate, reportMonth, entries, employeeId, holidays]);

  const downloadTeamCSV = () => {
    let csvContent = '';
    const periodType = teamReportPeriod === 'daily' ? 'daily' : teamReportPeriod === 'range' ? 'range' : 'monthly';
    const periodValue = teamReportPeriod === 'daily' ? teamDate : teamReportPeriod === 'range' ? `${teamFromDate} to ${teamToDate}` : teamMonth;
    
    if (teamReportType === 'attendance') {
      csvContent = `team attendance report\t\t${periodType}\t${periodValue}\n\n`;
      csvContent += 's.no\tdate\temp id\temp name\tshift\tlogin time\tlogout time\tlate coming\tearly going\ttotal hours\tstatus\n';
      teamData.forEach(row => {
        csvContent += `${row.sno}\t${row.date}\t${row.empId}\t${row.empName}\t${row.shift}\t${row.loginTime}\t${row.logoutTime}\t${row.lateComing}\t${row.earlyGoing}\t${row.totalHours}\t${row.status}\n`;
      });
    } else if (teamReportType === 'misPunch') {
      csvContent = `team mis-punch report\t\t${periodType}\t${periodValue}\n\n`;
      csvContent += 'S.no\tdate\tEmployee Id\temployeeName\tloginTime\tlogoutTime\tApplied Date\tApplied By\tStatus\tApproved Date\n';
      teamData.forEach(row => {
        csvContent += `${row.sno}\t${row.date}\t${row.employeeId}\t${row.employeeName}\t${row.loginTime}\t${row.logoutTime}\t${row.appliedDate}\t${row.appliedBy}\t${row.status}\t${row.approvedDate}\n`;
      });
    } else if (teamReportType === 'regularization') {
      csvContent = `Team regularization report\t${periodType}\t${periodValue}\n\n`;
      csvContent += 'S.no\tDate\tEmployee Id\temployeeName\ttype\tRequested In\tRequested Out\tApplied Date\tApplied By\tRemarks\tApproved Date\tStatus\n';
      teamData.forEach(row => {
        csvContent += `${row.sno}\t${row.date}\t${row.employeeId}\t${row.employeeName}\t${row.type}\t${row.loginTime}\t${row.logoutTime}\t${row.appliedDate}\t${row.appliedBy}\t${row.remarks}\t${row.approvedDate}\t${row.status}\n`;
      });
    } else if (teamReportType === 'shiftRequests') {
      csvContent = `team shift change report\t\t${periodType}\t${periodValue}\n\n`;
      csvContent += 'S.no\tRequested ID\tDate\tEmployee Id\temployeeName\tassigned_Shift\tShift_Requested_To\tApplied Date\tApplied By\tRemarks\tApproved Date\tStatus\n';
      teamData.forEach(row => {
        csvContent += `${row.sno}\t${row.id}\t${row.date}\t${row.employeeId}\t${row.employeeName}\t${row.shiftAllocated}\t${row.shiftRequested}\t${row.appliedDate}\t${row.appliedBy}\t${row.remarks}\t${row.approvedDate}\t${row.status}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `team_${teamReportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadShiftRequestsCSV = () => {
    let csvContent = 'S.no,Requested ID,Date,assigned_Shift,Shift_Requested_To,Applied Date,Applied By,Remarks,Approved Date,Status\n';
    
    filteredShiftChangeRequests.forEach((req, index) => {
      const currentShift = SHIFTS.find(s => s.id === req.currentShiftId)?.name || req.currentShiftId;
      const requestedShift = SHIFTS.find(s => s.id === req.requestedShiftId)?.name || req.requestedShiftId;
      const appliedBy = req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self';
      const remarks = (req.reason || '-').replace(/"/g, '""');
      
      const row = [
        index + 1,
        req.id,
        req.date,
        currentShift,
        requestedShift,
        req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
        appliedBy,
        `"${remarks}"`,
        req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-',
        req.status
      ];
      
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_change_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentEmployee = useMemo(() => {
    return MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
  }, [employeeId]);

  const reportMonthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const value = `${year}-${String(month).padStart(2, '0')}`;
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      options.push({ value, label });
    }
    
    return options;
  }, []);

  const reportYearOptions = useMemo(() => {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const monthStartOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const desktopColStartClasses = [
    '',
    'sm:col-start-2',
    'sm:col-start-3',
    'sm:col-start-4',
    'sm:col-start-5',
    'sm:col-start-6',
    'sm:col-start-7',
  ];

  return (
    <div className="py-6 dashboard-shell">
      <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
        <div className="text-lg font-bold text-[#14274E] uppercase tracking-widest">My Attendance</div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#9BA4B4] shadow-sm mb-8 space-y-3 sm:space-y-0">
        <div className="sm:hidden">
          <select
            aria-label="Select attendance section"
            value={activeMainTab}
            onChange={(e) => setActiveMainTab(e.target.value as MainTabKey)}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
          >
            {MAIN_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex gap-3 overflow-x-auto custom-scrollbar flex-nowrap md:flex-wrap">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeMainTab === tab.key
                  ? 'bg-[#14274E] text-white shadow-lg scale-105'
                  : 'bg-[#F8FAFC] text-[#394867] border border-[#E5E7EB] hover:bg-[#F1F6F9] hover:border-[#9BA4B4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeMainTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in pb-6">
          
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#9BA4B4] shadow-sm">
            {/* Switch and Date Picker Row */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
              <div className="flex gap-2 bg-[#F1F6F9] p-1 rounded-lg border border-[#9BA4B4]">
                <button
                  onClick={() => setActiveStatisticsView('monthly')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeStatisticsView === 'monthly'
                      ? 'bg-[#14274E] text-white shadow-md'
                      : 'bg-transparent text-[#9BA4B4] hover:text-[#14274E]'
                  }`}
                >
                  <i className="fas fa-calendar mr-2"></i> Monthly
                </button>
                <button
                  onClick={() => setActiveStatisticsView('ytd')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeStatisticsView === 'ytd'
                      ? 'bg-[#14274E] text-white shadow-md'
                      : 'bg-transparent text-[#9BA4B4] hover:text-[#14274E]'
                  }`}
                >
                  <i className="fas fa-chart-line mr-2"></i> YTD
                </button>
              </div>

              {activeStatisticsView === 'monthly' ? (
                <input 
                  type="month" 
                  value={summaryMonth} 
                  onChange={e => setSummaryMonth(e.target.value)} 
                  className="text-[10px] font-bold text-[#14274E] bg-[#F1F6F9] px-3 py-2 rounded-lg border border-[#9BA4B4] outline-none" 
                />
              ) : (
                <select 
                  value={summaryYear} 
                  onChange={e => setSummaryYear(e.target.value)} 
                  className="text-[10px] font-bold text-[#14274E] bg-[#F1F6F9] px-3 py-2 rounded-lg border border-[#9BA4B4] outline-none"
                >
                  {reportYearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Statistics Content */}
            {activeStatisticsView === 'monthly' && (
              <>
                {monthlySummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-check text-emerald-600 mb-1"></i>
                    <p className="text-lg font-black text-emerald-700">{monthlySummary.present}</p>
                    <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mt-0.5">Present</p>
                  </div>
                  
                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-minus text-blue-600 mb-1"></i>
                    <p className="text-lg font-black text-blue-700">{monthlySummary.weekOffs}</p>
                    <p className="text-[8px] font-black text-blue-700 uppercase tracking-widest mt-0.5">Week-off</p>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-star text-amber-600 mb-1"></i>
                    <p className="text-lg font-black text-amber-700">{monthlySummary.holidays}</p>
                    <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mt-0.5">Holidays</p>
                  </div>

                  <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 flex flex-col items-center justify-center">
                    <i className="fas fa-file-medical text-purple-600 mb-1"></i>
                    <p className="text-lg font-black text-purple-700">{monthlySummary.leaves}</p>
                    <p className="text-[8px] font-black text-purple-700 uppercase tracking-widest mt-0.5">Leaves</p>
                  </div>

                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex flex-col items-center justify-center">
                    <i className="fas fa-clock-arrow-down text-rose-600 mb-1"></i>
                    <p className="text-lg font-black text-rose-700">{monthlySummary.late}</p>
                    <p className="text-[8px] font-black text-rose-700 uppercase tracking-widest mt-0.5 text-center">Late In</p>
                  </div>

                  <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 flex flex-col items-center justify-center">
                    <i className="fas fa-stopwatch text-indigo-600 mb-1"></i>
                    <p className="text-lg font-black text-indigo-700">{monthlySummary.otHours}h</p>
                    <p className="text-[8px] font-black text-indigo-700 uppercase tracking-widest mt-0.5">OT Hours</p>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col items-center justify-center">
                    <i className="fas fa-clock-arrow-up text-amber-600 mb-1"></i>
                    <p className="text-lg font-black text-amber-700">{monthlySummary.earlyGoing}</p>
                    <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mt-0.5">Early Going</p>
                  </div>

                  <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 flex flex-col items-center justify-center">
                    <i className="fas fa-user-xmark text-red-600 mb-1"></i>
                    <p className="text-lg font-black text-red-700">{monthlySummary.absent}</p>
                    <p className="text-[8px] font-black text-red-700 uppercase tracking-widest mt-0.5">Absent</p>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex flex-col items-center justify-center">
                    <i className="fas fa-business-time text-slate-600 mb-1"></i>
                    <p className="text-lg font-black text-slate-700">{monthlySummary.totalHours}h</p>
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">Total Hours</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <i className="fas fa-spinner fa-spin text-2xl text-[#9BA4B4] mb-3"></i>
                  <p className="text-xs font-bold text-[#394867]">Aggregating summary data...</p>
                </div>
              )}
              </>
            )}

            {activeStatisticsView === 'ytd' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex flex-col items-center justify-center">
                  <i className="fas fa-calendar-check text-emerald-600 mb-1"></i>
                  <p className="text-lg font-black text-emerald-700">{ytdSummary.present}</p>
                  <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mt-0.5">Present</p>
                </div>
                
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex flex-col items-center justify-center">
                  <i className="fas fa-calendar-minus text-blue-600 mb-1"></i>
                  <p className="text-lg font-black text-blue-700">{ytdSummary.weekOffs}</p>
                  <p className="text-[8px] font-black text-blue-700 uppercase tracking-widest mt-0.5">Week-off</p>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col items-center justify-center">
                  <i className="fas fa-calendar-star text-amber-600 mb-1"></i>
                  <p className="text-lg font-black text-amber-700">{ytdSummary.holidays}</p>
                  <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mt-0.5">Holidays</p>
                </div>

                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 flex flex-col items-center justify-center">
                  <i className="fas fa-file-medical text-purple-600 mb-1"></i>
                  <p className="text-lg font-black text-purple-700">{ytdSummary.leaves}</p>
                  <p className="text-[8px] font-black text-purple-700 uppercase tracking-widest mt-0.5">Leaves</p>
                </div>

                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex flex-col items-center justify-center">
                  <i className="fas fa-clock-arrow-down text-rose-600 mb-1"></i>
                  <p className="text-lg font-black text-rose-700">{ytdSummary.late}</p>
                  <p className="text-[8px] font-black text-rose-700 uppercase tracking-widest mt-0.5 text-center">Late In</p>
                </div>

                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 flex flex-col items-center justify-center">
                  <i className="fas fa-stopwatch text-indigo-600 mb-1"></i>
                  <p className="text-lg font-black text-indigo-700">{ytdSummary.otHours}h</p>
                  <p className="text-[8px] font-black text-indigo-700 uppercase tracking-widest mt-0.5">OT Hours</p>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col items-center justify-center">
                  <i className="fas fa-clock-arrow-up text-amber-600 mb-1"></i>
                  <p className="text-lg font-black text-amber-700">{ytdSummary.earlyGoing}</p>
                  <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mt-0.5">Early Go</p>
                </div>

                <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 flex flex-col items-center justify-center">
                  <i className="fas fa-user-xmark text-red-600 mb-1"></i>
                  <p className="text-lg font-black text-red-700">{ytdSummary.absent}</p>
                  <p className="text-[8px] font-black text-red-700 uppercase tracking-widest mt-0.5">Absent</p>
                </div>

                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex flex-col items-center justify-center">
                  <i className="fas fa-business-time text-slate-600 mb-1"></i>
                  <p className="text-lg font-black text-slate-700">{ytdSummary.totalHours}h</p>
                  <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">Total Hours</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-[#9BA4B4] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F6F9] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8FAFC]">
                  <h3 className="font-bold text-[#14274E] uppercase tracking-widest text-xs">Activity Log</h3>
                  <div className="w-full sm:w-auto">
                    <select
                      aria-label="Activity log request filter"
                      value={activeReqTab}
                      onChange={(e) => setActiveReqTab(e.target.value as RequestTabKey)}
                      className="sm:hidden w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
                    >
                      {REQUEST_TABS.map((tab) => (
                        <option key={tab.key} value={tab.key}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                    <div className="hidden sm:flex bg-white rounded-lg p-1 border border-[#E2E8F0]">
                        {REQUEST_TABS.map(tab => (
                          <button
                              key={tab.key}
                              onClick={() => setActiveReqTab(tab.key)}
                              className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${activeReqTab === tab.key ? 'bg-[#14274E] text-white shadow-sm' : 'text-[#9BA4B4] hover:text-[#14274E]'}`}
                          >
                            {tab.shortLabel}
                          </button>
                      ))}
                    </div>
                  </div>
              </div>
              
              <div className="p-0">
                    {activeReqTab === 'regularization' && (
                      <div className="table-wrapper custom-scrollbar">
                        <table className="app-table w-full text-left">
                          <thead className="bg-[#F1F6F9] text-[8px] sm:text-[9px] font-bold text-[#9BA4B4] uppercase tracking-widest table-head-responsive">
                              <tr>
                                  <th className="py-3 px-6"><span className="table-head-label">Applied Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Requested Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Details</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Reason</span></th>
                                  <th className="py-3 px-6 text-right"><span className="table-head-label">Status</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F6F9]">
                              {regularizationRequests.length > 0 ? regularizationRequests.map(req => (
                                  <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50">
                                      <td className="py-3 px-6">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                                      <td className="py-3 px-6">{req.date}</td>
                                      <td className="py-3 px-6">
                                        {req.type}{req.requestedLoginTime ? ` | In ${req.requestedLoginTime}` : ''}{req.requestedLogoutTime ? ` | Out ${req.requestedLogoutTime}` : ''}
                                      </td>
                                      <td className="py-3 px-6">{req.reason}</td>
                                      <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold ${
                                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                          'bg-amber-100 text-amber-800'
                                        }`}>
                                          {req.status}
                                        </span>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr><td colSpan={5} className="py-8 text-center text-xs text-[#9BA4B4]">No regularization requests</td></tr>
                              )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeReqTab === 'shift' && (
                      <div className="table-wrapper custom-scrollbar">
                        <table className="app-table w-full text-left">
                          <thead className="bg-[#F1F6F9] text-[8px] sm:text-[9px] font-bold text-[#9BA4B4] uppercase tracking-widest table-head-responsive">
                              <tr>
                                  <th className="py-3 px-6"><span className="table-head-label">Applied Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Requested Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Details</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Reason</span></th>
                                  <th className="py-3 px-6 text-right"><span className="table-head-label">Status</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F6F9]">
                                {shiftChangeRequests.length > 0 ? shiftChangeRequests.map(req => (
                                  <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50">
                                      <td className="py-3 px-6">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                                      <td className="py-3 px-6">{req.date}</td>
                                      <td className="py-3 px-6">{req.currentShiftId} &rarr; {req.requestedShiftId}</td>
                                      <td className="py-3 px-6">{req.reason}</td>
                                      <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold ${
                                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                          'bg-amber-100 text-amber-800'
                                        }`}>
                                          {req.status}
                                        </span>
                                      </td>
                                  </tr>
                                )) : (
                                  <tr><td colSpan={5} className="py-8 text-center text-xs text-[#9BA4B4]">No shift change requests</td></tr>
                                )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeReqTab === 'permission' && (
                      <div className="table-wrapper custom-scrollbar">
                        <table className="app-table w-full text-left">
                          <thead className="bg-[#F1F6F9] text-[8px] sm:text-[9px] font-bold text-[#9BA4B4] uppercase tracking-widest table-head-responsive">
                              <tr>
                                  <th className="py-3 px-6"><span className="table-head-label">Applied Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Requested Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Details</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Reason</span></th>
                                  <th className="py-3 px-6 text-right"><span className="table-head-label">Status</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F6F9]">
                              {permissionRequests.length > 0 ? permissionRequests.map(req => (
                                  <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50">
                                      <td className="py-3 px-6">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                                      <td className="py-3 px-6">{req.date}</td>
                                      <td className="py-3 px-6">{req.startTime} - {req.endTime}</td>
                                      <td className="py-3 px-6">{req.reason}</td>
                                      <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold ${
                                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                          'bg-amber-100 text-amber-800'
                                        }`}>
                                          {req.status}
                                        </span>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr><td colSpan={5} className="py-8 text-center text-xs text-[#9BA4B4]">No permission requests found</td></tr>
                              )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeReqTab === 'overtime' && (
                      <div className="table-wrapper custom-scrollbar">
                        <table className="app-table w-full text-left">
                          <thead className="bg-[#F1F6F9] text-[8px] sm:text-[9px] font-bold text-[#9BA4B4] uppercase tracking-widest table-head-responsive">
                              <tr>
                                  <th className="py-3 px-6"><span className="table-head-label">Applied Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Requested Date</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Details</span></th>
                                  <th className="py-3 px-6"><span className="table-head-label">Reason</span></th>
                                  <th className="py-3 px-6 text-right"><span className="table-head-label">Status</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F6F9]">
                              {overtimeRequests.length > 0 ? overtimeRequests.map(req => (
                                  <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50">
                                      <td className="py-3 px-6">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                                      <td className="py-3 px-6">{req.date}</td>
                                      <td className="py-3 px-6">{req.hours}h</td>
                                      <td className="py-3 px-6">{req.reason}</td>
                                      <td className="py-3 px-6 text-right">
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold ${
                                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                          'bg-amber-100 text-amber-800'
                                        }`}>
                                          {req.status}
                                        </span>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr><td colSpan={5} className="py-8 text-center text-xs text-[#9BA4B4]">No overtime requests found</td></tr>
                              )}
                          </tbody>
                        </table>
                      </div>
                    )}
              </div>
          </div>
      </div>
      )}

      {activeMainTab === 'attendanceRegister' && (
        <div className="bg-white rounded-2xl border border-[#9BA4B4] shadow-sm overflow-hidden">
          <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-[#F1F6F9] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-[#F8FAFC]">
            <h3 className="font-black text-[#14274E] text-[9px] sm:text-[10px] uppercase tracking-[0.25em]">
              <i className="far fa-calendar-alt mr-3 text-[#9BA4B4]"></i> Attendance Register
            </h3>
            <div className="flex bg-white shadow-sm border border-slate-200 rounded-2xl p-1 space-x-1 w-fit mx-auto sm:mx-0 text-xs">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-[#394867] transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
              <span className="px-3 sm:px-5 flex items-center text-[10px] sm:text-[11px] font-black text-[#14274E] uppercase tracking-widest min-w-[110px] sm:min-w-[140px] justify-center text-center">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-[#394867] transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
            </div>
          </div>

          <div className="p-2 sm:p-5 overflow-auto">
            <div className="grid grid-cols-7 mb-2">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                <div key={d} className="text-[7px] sm:text-[9px] font-black text-[#9BA4B4] text-center uppercase tracking-[0.1em] py-1 sm:py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
              {Array.from({ length: monthStartOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="opacity-0 pointer-events-none sm:hidden" />
              ))}
              
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                const dateStr = offsetDate.toISOString().split('T')[0];
                
                const dayEntries = entries.filter(
                  e => e.employeeId === employeeId && e.timestamp.startsWith(dateStr)
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
                const desktopColStartClass = i === 0 ? desktopColStartClasses[monthStartOffset] : '';

                // Re-ordered logic: Work > Week Off > Today > Absence
                if (dayEntries.length > 0) {
                  bgClass = "bg-emerald-50"; borderClass = "border-emerald-100"; textClass = "text-emerald-700";
                } else if (isWeekOff) {
                  bgClass = "bg-slate-50"; borderClass = "border-slate-100"; textClass = "text-slate-400";
                  statusElement = <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter">Week Off</span>;
                } else if (isToday) {
                  if (isWorkingHoursOver) {
                    bgClass = "bg-rose-50"; borderClass = "border-rose-100"; textClass = "text-rose-700";
                    statusElement = <span className="text-[6px] sm:text-[8px] font-black text-rose-400 uppercase tracking-tighter">Absent</span>;
                  } else {
                    bgClass = "bg-[#14274E]"; borderClass = "border-[#14274E]"; textClass = "text-white";
                    statusElement = <span className="text-[6px] sm:text-[8px] font-black text-white/40 uppercase tracking-tighter">Current</span>;
                  }
                } else if (!isFuture) {
                  bgClass = "bg-rose-50"; borderClass = "border-rose-100"; textClass = "text-rose-700";
                  statusElement = <span className="text-[5.5px] sm:text-[8px] font-black text-rose-400 uppercase tracking-tighter">Absent</span>;
                }

                return (
                  <div 
                    key={i} 
                    onClick={() => !isFuture && (setSelectedDate(dateStr), setShowRegularizationModal(true))}
                    className={`min-h-[36px] sm:min-h-[64px] border-2 rounded-xl sm:rounded-2xl p-1 sm:p-2 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 ${desktopColStartClass} ${bgClass} ${borderClass}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[7px] sm:text-[11px] font-black ${textClass}`}>{i + 1}</span>
                      {!isFuture && !isToday && dayEntries.length === 0 && !isWeekOff && (
                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center animate-pulse">
                          <i className="fas fa-clock-rotate-left text-[9px]"></i>
                        </div>
                      )}
                      {dayEntries.length > 0 && <i className="fas fa-check-circle text-[9px] text-emerald-500"></i>}
                    </div>
                    
                    {dayEntries.length > 0 ? (
                      <div className="space-y-0.5 sm:space-y-1 mt-0.5 sm:mt-1">
                        <div className="flex justify-between items-center text-[5px] sm:text-[8px] font-black opacity-60">
                          <span>IN</span>
                          <span>{new Date(checkIn?.timestamp!).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!1})}</span>
                        </div>
                        <div className="flex justify-between items-center text-[5px] sm:text-[8px] font-black opacity-60">
                          <span>OUT</span>
                          <span>{checkOut ? new Date(checkOut.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!1}) : '--:--'}</span>
                        </div>
                        {totalHours > 0 && (
                          <div className="pt-0.5 mt-0.5 sm:pt-1 sm:mt-1 border-t border-black/5 flex justify-between items-center">
                            <span className="text-[5px] sm:text-[7px] font-black uppercase text-[#9BA4B4]">Span</span>
                            <span className="text-[7px] sm:text-[9px] font-black text-emerald-700">{totalHours}h</span>
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
      )}

      {activeMainTab === 'settings' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#9BA4B4] shadow-sm animate-in fade-in">
            <div className="max-w-4xl mx-auto">
               <h3 className="text-sm font-bold text-[#14274E] uppercase tracking-widest mb-8 text-center">Work Environment Configuration</h3>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {WORK_MODES.map((mode) => (
                     <button
                        key={mode.value}
                        onClick={() => setWorkMode(mode.value)}
                        className={`relative p-4 h-32 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-3 ${workMode === mode.value ? 'bg-[#F1F6F9] border-[#14274E] text-[#14274E]' : 'bg-white border-slate-100 text-[#9BA4B4] hover:border-[#9BA4B4] hover:text-[#394867]'}`}
                     >
                        {workMode === mode.value && <div className="absolute top-2 right-2 text-emerald-500"><i className="fas fa-check-circle"></i></div>}
                        <i className={`fas ${mode.icon} text-2xl`}></i>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">{mode.label}</span>
                     </button>
                  ))}
               </div>
               
               {workMode === WorkMode.FIELD && (
                   <div className="bg-[#F1F6F9] p-6 rounded-2xl border border-[#9BA4B4] animate-in slide-in-from-top-2">
                       <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-3 block">Field Activity Narrative</label>
                       <textarea className="w-full p-4 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold h-24 focus:ring-2 focus:ring-[#14274E] outline-none text-[#14274E] resize-none" placeholder="Please describe your field location and purpose..." />
                   </div>
               )}
            </div>
         </div>
      )}

      {activeMainTab === 'holidays' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#9BA4B4] shadow-sm animate-in fade-in">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-sm font-bold text-[#14274E] uppercase tracking-widest mb-8 text-center">Annual Holiday Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holidays.length > 0 ? holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => (
                <div key={h.id} className="flex justify-between items-center p-5 bg-[#F1F6F9] rounded-2xl border border-[#9BA4B4] hover:bg-white transition-all shadow-sm group">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white border border-[#9BA4B4] rounded-xl flex items-center justify-center group-hover:bg-[#14274E] transition-colors">
                      <i className="fas fa-calendar-star text-[#14274E] group-hover:text-white"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#14274E]">{h.name}</p>
                      <p className="text-[10px] font-bold text-[#394867] uppercase tracking-widest mt-1">
                        {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-[#9BA4B4] rounded-full text-[8px] font-black text-[#394867] tracking-widest">OFFICIAL</span>
                </div>
              )) : (
                <div className="col-span-full text-center py-20 bg-[#F1F6F9] rounded-3xl border-2 border-dashed border-[#9BA4B4]">
                  <i className="fas fa-calendar-day text-4xl text-[#9BA4B4] mb-4"></i>
                  <p className="text-xs font-bold text-[#394867] uppercase tracking-[0.2em]">No Holidays Configured</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'teamApprovals' && (
         <div className="space-y-6 animate-in fade-in pb-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#9BA4B4] shadow-sm">
             <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-[#F1F6F9] pb-5">
                <h3 className="text-sm font-bold text-[#14274E] uppercase tracking-widest">
                    <i className="fas fa-user-check mr-2 text-[#9BA4B4]"></i> Team Approvals Gateway
                </h3>
                <div className="w-full sm:w-auto">
                  <select
                    aria-label="Select approval type"
                    value={activeApprovalReviewTab}
                    onChange={(e) => setActiveApprovalReviewTab(e.target.value as TeamApprovalTabKey)}
                    className="sm:hidden w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
                  >
                    {TEAM_APPROVAL_TABS.map((tab) => (
                      <option key={tab.key} value={tab.key}>{tab.label}</option>
                    ))}
                  </select>
                  <div className="hidden sm:flex bg-[#F1F6F9] rounded-xl p-1 border border-[#E2E8F0] space-x-1 overflow-x-auto custom-scrollbar flex-nowrap">
                    {TEAM_APPROVAL_TABS.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveApprovalReviewTab(tab.key)}
                          className={`flex-shrink-0 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${activeApprovalReviewTab === tab.key ? 'bg-[#14274E] text-white shadow-sm' : 'text-[#9BA4B4] hover:text-[#14274E]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                  </div>
                </div>
             </div>

             {/* Regularization Approvals */}
             {activeApprovalReviewTab === 'regularization' && (
               <div className="team-approvals-table-wrapper overflow-x-auto">
                 <table className="app-table team-approvals-table w-full text-left border border-[#9BA4B4] rounded-xl overflow-hidden">
                   <thead className="bg-[#F1F6F9] text-[9px] font-bold text-[#394867] uppercase tracking-widest table-head-responsive">
                     <tr>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Type</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Req Login</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Req Logout</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Reason</span></th>
                       <th className="py-3 px-4 border-b border-[#9BA4B4] text-center"><span className="table-head-label">Action</span></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F1F6F9]">
                     {teamPendingRegularizations.length > 0 ? teamPendingRegularizations.map(req => {
                       const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
                       return (
                         <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-mono text-[10px]">{req.employeeId}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-[#14274E]">{emp?.name}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] whitespace-nowrap">{req.date}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] text-[10px] uppercase tracking-tighter">{req.type.replace('_', ' ')}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.requestedLoginTime || '-'}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.requestedLogoutTime || '-'}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] max-w-xs truncate">{req.reason || '-'}</td>
                           <td className="py-3 px-4 text-center">
                             <div className="flex justify-center space-x-1">
                               <button onClick={() => handleTeamAction('reg', req.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"><i className="fas fa-check text-xs"></i></button>
                               <button onClick={() => handleTeamAction('reg', req.id, 'REJECTED')} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"><i className="fas fa-times text-xs"></i></button>
                             </div>
                           </td>
                         </tr>
                       );
                     }) : <tr><td colSpan={8} className="py-6 text-center text-xs text-[#9BA4B4] font-medium italic">No pending regularization requests</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}

             {/* Shift Swap Approvals */}
             {activeApprovalReviewTab === 'shift' && (
               <div className="team-approvals-table-wrapper overflow-x-auto">
                 <table className="app-table team-approvals-table w-full text-left border border-[#9BA4B4] rounded-xl overflow-hidden">
                   <thead className="bg-[#F1F6F9] text-[9px] font-bold text-[#394867] uppercase tracking-widest table-head-responsive">
                     <tr>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Current Shift</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested Shift</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Reason</span></th>
                       <th className="py-3 px-4 border-b border-[#9BA4B4] text-center"><span className="table-head-label">Action</span></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F1F6F9]">
                     {teamPendingShifts.length > 0 ? teamPendingShifts.map(req => {
                       const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
                       return (
                         <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-mono text-[10px]">{req.employeeId}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-[#14274E]">{emp?.name}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.date}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{getShiftDisplay(req.currentShiftId)}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-[#14274E]">{getShiftDisplay(req.requestedShiftId)}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] max-w-xs truncate">{req.reason || '-'}</td>
                           <td className="py-3 px-4 text-center">
                             <div className="flex justify-center space-x-1">
                               <button onClick={() => handleTeamAction('shift', req.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"><i className="fas fa-check text-xs"></i></button>
                               <button onClick={() => handleTeamAction('shift', req.id, 'REJECTED')} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"><i className="fas fa-times text-xs"></i></button>
                             </div>
                           </td>
                         </tr>
                       );
                     }) : <tr><td colSpan={7} className="py-6 text-center text-xs text-[#9BA4B4] font-medium italic">No pending shift swap requests</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}

             {/* Overtime Approvals */}
             {activeApprovalReviewTab === 'overtime' && (
               <div className="team-approvals-table-wrapper overflow-x-auto">
                 <table className="app-table team-approvals-table w-full text-left border border-[#9BA4B4] rounded-xl overflow-hidden">
                   <thead className="bg-[#F1F6F9] text-[9px] font-bold text-[#394867] uppercase tracking-widest table-head-responsive">
                     <tr>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Work Date</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested Hours</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Justification</span></th>
                       <th className="py-3 px-4 border-b border-[#9BA4B4] text-center"><span className="table-head-label">Action</span></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F1F6F9]">
                     {teamPendingOvertime.length > 0 ? teamPendingOvertime.map(req => {
                       const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
                       return (
                         <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-mono text-[10px]">{req.employeeId}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-[#14274E]">{emp?.name}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.date}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-amber-700">{req.hours} Hours</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] max-w-xs truncate">{req.reason || '-'}</td>
                           <td className="py-3 px-4 text-center">
                             <div className="flex justify-center space-x-1">
                               <button onClick={() => handleTeamAction('ot', req.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"><i className="fas fa-check text-xs"></i></button>
                               <button onClick={() => handleTeamAction('ot', req.id, 'REJECTED')} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"><i className="fas fa-times text-xs"></i></button>
                             </div>
                           </td>
                         </tr>
                       );
                     }) : <tr><td colSpan={6} className="py-6 text-center text-xs text-[#9BA4B4] font-medium italic">No pending overtime requests</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}

             {/* Permission Hours Approvals */}
             {activeApprovalReviewTab === 'permission' && (
               <div className="team-approvals-table-wrapper overflow-x-auto">
                 <table className="app-table team-approvals-table w-full text-left border border-[#9BA4B4] rounded-xl overflow-hidden">
                   <thead className="bg-[#F1F6F9] text-[9px] font-bold text-[#394867] uppercase tracking-widest table-head-responsive">
                     <tr>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Start Time</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">End Time</span></th>
                       <th className="py-3 px-4 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Purpose</span></th>
                       <th className="py-3 px-4 border-b border-[#9BA4B4] text-center"><span className="table-head-label">Action</span></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F1F6F9]">
                     {teamPendingPermissions.length > 0 ? teamPendingPermissions.map(req => {
                       const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
                       return (
                         <tr key={req.id} className="text-xs font-semibold text-[#394867] hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-mono text-[10px]">{req.employeeId}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] font-bold text-[#14274E]">{emp?.name}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.date}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.startTime}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9]">{req.endTime}</td>
                           <td className="py-3 px-4 border-r border-[#F1F6F9] max-w-xs truncate">{req.reason || '-'}</td>
                           <td className="py-3 px-4 text-center">
                             <div className="flex justify-center space-x-1">
                               <button onClick={() => handleTeamAction('perm', req.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"><i className="fas fa-check text-xs"></i></button>
                               <button onClick={() => handleTeamAction('perm', req.id, 'REJECTED')} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"><i className="fas fa-times text-xs"></i></button>
                             </div>
                           </td>
                         </tr>
                       );
                     }) : <tr><td colSpan={7} className="py-6 text-center text-xs text-[#9BA4B4] font-medium italic">No pending permission hour requests</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}

      {activeMainTab === 'applyOnBehalf' && (
        <div className="space-y-6 animate-in fade-in pb-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#9BA4B4] shadow-sm">
             <div className="flex items-center justify-between mb-8 border-b border-[#F1F6F9] pb-5">
                <h3 className="text-sm font-bold text-[#14274E] uppercase tracking-widest">
                    <i className="fas fa-user-plus mr-2 text-[#9BA4B4]"></i> Application on Behalf
                </h3>
                <div className="flex bg-[#F1F6F9] rounded-xl p-1 border border-[#E2E8F0] space-x-1 overflow-x-auto custom-scrollbar flex-nowrap">
                    {TEAM_APPROVAL_TABS.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTeamApprovalTab(tab.key)}
                          className={`flex-shrink-0 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${activeTeamApprovalTab === tab.key ? 'bg-[#14274E] text-white shadow-sm' : 'text-[#9BA4B4] hover:text-[#14274E]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
             </div>

             <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#9BA4B4]/50">
                <h4 className="text-[11px] font-bold text-[#14274E] uppercase tracking-widest mb-4 flex items-center">
                    <i className="fas fa-plus-circle mr-2"></i> Apply on Behalf of Team Member
                </h4>
                <form onSubmit={handleApplyOnBehalf} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Team Member</label>
                        <select 
                            required
                            value={behalfEmployeeId}
                            onChange={e => setBehalfEmployeeId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]"
                        >
                            <option value="">Select Member</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Target Date</label>
                        <input 
                            type="date"
                            required
                            value={behalfDate}
                            onChange={e => setBehalfDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]"
                        />
                    </div>
                    
                    {activeTeamApprovalTab === 'regularization' && (
                        <>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Reg Type</label>
                                <select value={behalfRegType} onChange={e => setBehalfRegType(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]">
                                    <option value="LOGIN">LOGIN</option>
                                    <option value="LOGOUT">LOGOUT</option>
                                    <option value="BOTH">BOTH</option>
                                </select>
                            </div>
                            {(behalfRegType === 'LOGIN' || behalfRegType === 'BOTH') && (
                                <div>
                                    <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Login Time</label>
                                    <input type="time" value={behalfLoginTime} onChange={e => setBehalfLoginTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                                </div>
                            )}
                            {(behalfRegType === 'LOGOUT' || behalfRegType === 'BOTH') && (
                                <div>
                                    <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Logout Time</label>
                                    <input type="time" value={behalfLogoutTime} onChange={e => setBehalfLogoutTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                                </div>
                            )}
                        </>
                    )}

                    {activeTeamApprovalTab === 'shift' && (
                        <>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Assigned Shift Slot</label>
                                <select value={behalfShift} onChange={e => setBehalfShift(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]">
                                    <option value="">Select Shift</option>
                                    <option value="WEEK_OFF">Week Off</option>
                                    {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Shift Changed To</label>
                                <select value={behalfShiftTo} onChange={e => setBehalfShiftTo(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]">
                                    <option value="">Select Shift</option>
                                    <option value="WEEK_OFF">Week Off</option>
                                    {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {activeTeamApprovalTab === 'overtime' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Shift Name</label>
                                <select 
                                    value={behalfShiftName} 
                                    onChange={e => setBehalfShiftName(e.target.value)} 
                                    className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]"
                                >
                                    <option value="">Select Shift</option>
                                    {SHIFTS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Start Time</label>
                                <input type="time" value={behalfOTStartTime} onChange={e => setBehalfOTStartTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">End Time</label>
                                <input type="time" value={behalfOTEndTime} onChange={e => setBehalfOTEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Hours</label>
                                <select value={behalfHours} onChange={e => setBehalfHours(parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]">
                                    {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} hr{h>1?'s':''}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {activeTeamApprovalTab === 'permission' && (
                        <>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Start Time</label>
                                <input type="time" value={behalfStartTime} onChange={e => setBehalfStartTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">End Time</label>
                                <input type="time" value={behalfEndTime} onChange={e => setBehalfEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]" />
                            </div>
                        </>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">Reason / Remarks</label>
                        <input 
                            type="text" 
                            required
                            value={behalfReason}
                            onChange={e => setBehalfReason(e.target.value)}
                            placeholder="Enter justification..."
                            className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            type="submit"
                            disabled={isSubmittingBehalf}
                            className="w-full bg-[#14274E] text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {isSubmittingBehalf ? 'Processing...' : 'Apply & Approve'}
                        </button>
                    </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {activeMainTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in pb-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#9BA4B4] shadow-sm">
        <div className="border-b border-[#E5E7EB] mb-6 pb-3 space-y-3 sm:space-y-0">
          <div className="sm:hidden px-1">
            <select
              aria-label="Select report view"
              value={activeEmployeeReport}
              onChange={(e) => setActiveEmployeeReport(e.target.value as ReportTabKey)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
            >
              {REPORT_TABS.map((tab) => (
                <option key={tab.key} value={tab.key}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:flex space-x-2 overflow-x-auto px-3">
            {REPORT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveEmployeeReport(tab.key)}
                className={`pb-3 px-4 font-bold text-[10px] uppercase tracking-widest transition-all border-b-2 flex items-center space-x-2 whitespace-nowrap ${
                  activeEmployeeReport === tab.key ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6] hover:border-[#9BA4B4]'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeEmployeeReport === 'summary' && (
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-[#14274E] mb-3 tracking-tight uppercase tracking-widest flex items-center">
              <i className="fas fa-chart-line mr-2"></i> Attendance Overview
            </h4>
            
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#9BA4B4]">
              {monthlySummary ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Row 1: Primary Statuses */}
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-check text-emerald-600 mb-2"></i>
                    <p className="text-2xl font-black text-emerald-700">{monthlySummary.present}</p>
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mt-1">Present</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-minus text-blue-600 mb-2"></i>
                    <p className="text-2xl font-black text-blue-700">{monthlySummary.weekOffs}</p>
                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mt-1">Week-off</p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-col items-center justify-center">
                    <i className="fas fa-calendar-star text-amber-600 mb-2"></i>
                    <p className="text-2xl font-black text-amber-700">{monthlySummary.holidays}</p>
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mt-1">Holidays</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex flex-col items-center justify-center">
                    <i className="fas fa-file-medical text-purple-600 mb-2"></i>
                    <p className="text-2xl font-black text-purple-700">{monthlySummary.leaves}</p>
                    <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest mt-1">Leaves</p>
                  </div>

                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 flex flex-col items-center justify-center">
                    <i className="fas fa-clock-arrow-down text-rose-600 mb-2"></i>
                    <p className="text-2xl font-black text-rose-700">{monthlySummary.late}</p>
                    <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest mt-1 text-center">Late Arrivals</p>
                  </div>

                  {/* Row 2: Performance metrics */}
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 flex flex-col items-center justify-center">
                    <i className="fas fa-stopwatch text-indigo-600 mb-2"></i>
                    <p className="text-2xl font-black text-indigo-700">{monthlySummary.otHours}h</p>
                    <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mt-1">OT Hours</p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-col items-center justify-center">
                    <i className="fas fa-clock-arrow-up text-amber-600 mb-2"></i>
                    <p className="text-2xl font-black text-amber-700">{monthlySummary.earlyGoing}</p>
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mt-1">Early Going</p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex flex-col items-center justify-center">
                    <i className="fas fa-user-xmark text-red-600 mb-2"></i>
                    <p className="text-2xl font-black text-red-700">{monthlySummary.absent}</p>
                    <p className="text-[9px] font-black text-red-700 uppercase tracking-widest mt-1">Absent</p>
                  </div>

                  <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 flex flex-col items-center justify-center lg:col-span-2">
                    <i className="fas fa-business-time text-slate-600 mb-2"></i>
                    <p className="text-2xl font-black text-slate-700">{monthlySummary.totalHours}h</p>
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">Total Hours</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <i className="fas fa-spinner fa-spin text-2xl text-[#9BA4B4] mb-3"></i>
                  <p className="text-xs font-bold text-[#394867]">Aggregating summary data...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeEmployeeReport === 'attendance' && (
           <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-[#14274E] tracking-tight">My Attendance Report</h4>
                <button 
                  onClick={() => {
                    let csvContent = 'Date,Login Time,Logout Time,Shift,Late Arrival,Early Going,Total Hours,Status\n';
                    attendanceReportData.forEach(row => {
                      const values = [
                        row.date,
                        row.loginTime,
                        row.logoutTime,
                        row.shift,
                        row.lateArrival,
                        row.earlyGoing,
                        row.totalHours,
                        row.status
                      ];
                      csvContent += values.map(v => `"${v}"`).join(',') + '\n';
                    });
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `my_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
                >
                  <i className="fas fa-download mr-1"></i>
                  Download CSV
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  >
                    <option value="daily">Daily</option>
                    <option value="range">Date Range</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                {reportType === 'daily' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      max={maxDate}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                ) : reportType === 'range' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                        max={maxDate}
                        className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      Month
                    </label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    >
                      {reportMonthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="report-table-wrapper overflow-x-auto custom-scrollbar">
                <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                  <thead className="table-head-responsive">
                    <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Shift</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Login Time</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Logout Time</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Late Arrival</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Early Going</span></th>
                      <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Total Hours</span></th>
                      <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReportData.map((row, index) => (
                      <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{index + 1}</td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.shift}</td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.loginTime === 'Absent' ? 'bg-red-50 text-red-700' : 
                            row.loginTime === 'NA' ? 'bg-gray-100 text-gray-500' :
                            'bg-emerald-50 text-emerald-700'
                          }`}>
                            {row.loginTime}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                             row.logoutTime === 'Absent' ? 'bg-red-50 text-red-700' : 
                             row.logoutTime === 'NA' ? 'bg-gray-100 text-gray-500' :
                             'bg-blue-50 text-blue-700'
                          }`}>
                            {row.logoutTime}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                           <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.lateArrival === 'NA' ? 'bg-gray-100 text-gray-500' :
                            row.lateArrival !== 'On Time' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {row.lateArrival}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.earlyGoing === 'NA' ? 'bg-gray-100 text-gray-500' :
                            row.earlyGoing !== 'On Time' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {row.earlyGoing}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.totalHours}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                            row.status === 'Absent' ? 'bg-red-50 text-red-700' :
                            row.status === 'Holiday' ? 'bg-amber-50 text-amber-700' :
                            row.status === 'Week Off' ? 'bg-blue-50 text-blue-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeEmployeeReport === 'misPunch' && (
           <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-[#14274E] tracking-tight">My Mis-Punch Report</h4>
              <button 
                onClick={() => {
                  let csvContent = 'S.no,Date,Login Time,Logout Time,Applied Date,Applied By,Status,Approved Date\n';
                  misPunchDays.forEach((day, index) => {
                    const values = [
                      index + 1,
                      day.date,
                      day.loginTime || 'Absent',
                      day.logoutTime || 'Absent',
                      day.appliedDate,
                      day.appliedBy,
                      day.status,
                      day.approvedDate
                    ];
                    csvContent += values.map(v => `"${v}"`).join(',') + '\n';
                  });
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', `my_mis_punch_report_${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
              >
                <i className="fas fa-download mr-1"></i>
                Download CSV
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  <option value="daily">Daily</option>
                  <option value="range">Date Range</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              {reportType === 'daily' ? (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={maxDate}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  />
                </div>
              ) : reportType === 'range' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      max={maxDate}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Month
                  </label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  >
                    {reportMonthOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="report-table-wrapper overflow-x-auto custom-scrollbar">
              <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead className="table-head-responsive">
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Login Time</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Logout Time</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                  </tr>
                </thead>
                <tbody>
                  {misPunchDays.length > 0 ? misPunchDays.map((day, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{index + 1}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{day.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          day.type === 'week_off' || day.type === 'holiday' || day.type === 'leave' ? 'bg-gray-100 text-gray-500' :
                          !day.loginTime ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {day.type === 'week_off' || day.type === 'holiday' || day.type === 'leave' ? 'NA' : (day.loginTime || 'Absent')}
                          {!day.loginTime && day.type !== 'week_off' && day.type !== 'holiday' && day.type !== 'leave' && <i className="fas fa-exclamation-triangle ml-1 text-amber-500"></i>}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                           day.type === 'week_off' || day.type === 'holiday' || day.type === 'leave' ? 'bg-gray-100 text-gray-500' :
                          !day.logoutTime ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {day.type === 'week_off' || day.type === 'holiday' || day.type === 'leave' ? 'NA' : (day.logoutTime || 'Absent')}
                          {!day.logoutTime && day.type !== 'week_off' && day.type !== 'holiday' && day.type !== 'leave' && <i className="fas fa-exclamation-triangle ml-1 text-amber-500"></i>}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{day.appliedDate}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center font-bold">{day.appliedBy}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          day.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          day.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                          day.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {day.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center">{day.approvedDate}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">
                        No mis-punch records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeEmployeeReport === 'regularization' && (
           <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
             <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-[#14274E] tracking-tight">My Regularization Requests</h4>
              <button 
                onClick={() => {
                  let csvContent = 'S.no,Date,Type,Requested In,Requested Out,Applied Date,Applied By,Remarks,Approved Date,Status\n';
                  filteredRegularizationRequests.forEach((req, index) => {
                    const values = [
                      index + 1,
                      req.date,
                      req.type.replace('_', ' '),
                      req.requestedLoginTime || '-',
                      req.requestedLogoutTime || '-',
                      req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
                      req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
                      req.remarks || '-',
                      req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-',
                      req.status
                    ];
                    csvContent += values.map(v => `"${v}"`).join(',') + '\n';
                  });
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', `my_regularization_requests_${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
              >
                <i className="fas fa-download mr-1"></i>
                Download CSV
              </button>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  <option value="daily">Daily</option>
                  <option value="range">Date Range</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              {reportType === 'daily' ? (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={maxDate}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  />
                </div>
              ) : reportType === 'range' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      max={maxDate}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Month
                  </label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  >
                    {reportMonthOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="report-table-wrapper overflow-x-auto custom-scrollbar">
              <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead className="table-head-responsive">
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Type</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested In</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested Out</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Remarks</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegularizationRequests.length > 0 ? filteredRegularizationRequests.map((req, index) => (
                    <tr key={req.id} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{index + 1}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{req.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {req.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.requestedLoginTime || '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.requestedLogoutTime || '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.remarks || '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          req.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                          req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">
                        No regularization records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeEmployeeReport === 'shiftRequests' && (
           <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-[#14274E] tracking-tight">My Shift Change Requests</h4>
              <div className="flex space-x-2">
                <button 
                    onClick={downloadShiftRequestsCSV}
                    className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
                >
                    <i className="fas fa-download mr-1.5"></i>
                    Download CSV
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
               <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  <option value="daily">Daily</option>
                  <option value="range">Date Range</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              {reportType === 'daily' ? (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={maxDate}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  />
                </div>
              ) : reportType === 'range' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      max={maxDate}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Month
                  </label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  >
                    {reportMonthOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="report-table-wrapper overflow-x-auto custom-scrollbar">
              <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead className="table-head-responsive">
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested ID</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">assigned_Shift</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Shift_Requested_To</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Remarks</span></th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShiftChangeRequests.length > 0 ? filteredShiftChangeRequests.map((req, index) => (
                    <tr key={req.id} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{index + 1}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono text-[10px]">{req.id}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{req.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{getShiftDisplay(req.currentShiftId)}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{getShiftDisplay(req.requestedShiftId)}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] max-w-xs truncate">{req.reason || '-'}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          req.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                          req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">
                        No shift change records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeEmployeeReport === 'teamReports' && (
           <div className="space-y-4">
             <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
               <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-[#14274E] tracking-tight">My Team Reports</h4>
                {currentEmployee && (
                  <div className="text-xs text-[#394867]">
                    <i className="fas fa-users mr-1"></i>
                    Department: <span className="font-bold text-[#14274E]">{currentEmployee.department}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                 <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Report Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setTeamReportType('attendance')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        teamReportType === 'attendance' ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'
                      }`}
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => setTeamReportType('misPunch')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        teamReportType === 'misPunch' ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'
                      }`}
                    >
                      Mis-Punch
                    </button>
                    <button
                      onClick={() => setTeamReportType('regularization')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        teamReportType === 'regularization' ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'
                      }`}
                    >
                      Regularization
                    </button>
                    <button
                      onClick={() => setTeamReportType('shiftRequests')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        teamReportType === 'shiftRequests' ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'
                      }`}
                    >
                      Shift Requests
                    </button>
                  </div>
                </div>

                 <div>
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                    Period
                  </label>
                  <select
                    value={teamReportPeriod}
                    onChange={(e) => setTeamReportPeriod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                  >
                    <option value="daily">Daily</option>
                    <option value="range">Date Range</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {teamReportPeriod === 'daily' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={teamDate}
                      onChange={(e) => setTeamDate(e.target.value)}
                      max={maxDate}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    />
                  </div>
                ) : teamReportPeriod === 'range' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={teamFromDate}
                        onChange={(e) => setTeamFromDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={teamToDate}
                        onChange={(e) => setTeamToDate(e.target.value)}
                        max={maxDate}
                        className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                      Month
                    </label>
                    <select
                      value={teamMonth}
                      onChange={(e) => setTeamMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                    >
                      {reportMonthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                 <div className="flex items-end">
                  <button
                    onClick={loadTeamData}
                    disabled={isLoadingTeam}
                    className="w-full bg-[#14274E] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoadingTeam ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i>
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt mr-1"></i>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
              </div>

               {teamSummary && (
                  <div className="mb-3 p-3 bg-[#F1F6F9] rounded-lg border border-[#9BA4B4]">
                        <h5 className="text-xs font-bold text-[#14274E] mb-2">Team Summary</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {teamReportType === 'attendance' && (
                                <>
                                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                        <p className="text-lg font-bold text-emerald-700 text-center">{teamSummary.present}</p>
                                        <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest text-center">Present</p>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                                        <p className="text-lg font-bold text-red-700 text-center">{teamSummary.absent}</p>
                                        <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest text-center">Absent</p>
                                    </div>
                                </>
                            )}
                           <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                                <p className="text-lg font-bold text-blue-700 text-center">{teamSummary.total}</p>
                                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-widest text-center">Total</p>
                            </div>
                            {(teamReportType === 'regularization' || teamReportType === 'shiftRequests') && (
                                <>
                                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                        <p className="text-lg font-bold text-emerald-700 text-center">{teamSummary.approved}</p>
                                        <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest text-center">Approved</p>
                                    </div>
                                     <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                                        <p className="text-lg font-bold text-amber-700 text-center">{teamSummary.pending}</p>
                                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest text-center">Pending</p>
                                    </div>
                                </>
                            )}
                        </div>
                  </div>
               )}
               
               <div className="flex justify-between items-center mb-3">
                <div className="text-xs text-[#394867]">
                  Showing {teamData.length} team members
                </div>
                <button
                  onClick={downloadTeamCSV}
                  disabled={teamData.length === 0}
                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>
                  Download CSV
                </button>
              </div>
              
              {isLoadingTeam ? (
                 <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-[#9BA4B4] mb-2"></i>
                  <p className="text-xs font-bold text-[#394867]">Loading team data...</p>
                </div>
              ) : (
                  <div className="report-table-wrapper overflow-x-auto custom-scrollbar">
                    {teamReportType === 'attendance' && (
                        <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                          <thead className="table-head-responsive">
                                <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp Name</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Shift</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Login Time</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Logout Time</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Late Arrival</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Early Going</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Total Hours</span></th>
                                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData.length > 0 ? teamData.map((row, i) => (
                                    <tr key={i} className="text-xs hover:bg-[#F1F6F9]">
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.empId}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.empName}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.shift}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.loginTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.logoutTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-amber-600 font-bold">{row.lateComing !== 'On Time' ? row.lateComing : 'On Time'}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-amber-600 font-bold">{row.earlyGoing !== 'On Time' ? row.earlyGoing : 'On Time'}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.totalHours}</td>
                                        <td className="py-1.5 px-3">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            row.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                            row.status === 'Absent' ? 'bg-red-50 text-red-700' :
                                            row.status === 'Holiday' ? 'bg-amber-50 text-amber-700' :
                                            row.status === 'Week Off' ? 'bg-blue-50 text-blue-700' :
                                            'bg-purple-50 text-purple-700'
                                          }`}>
                                            {row.status}
                                          </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={11} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">No team data found for the selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                    
                    {teamReportType === 'misPunch' && (
                      <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                          <thead className="table-head-responsive">
                                <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp Name</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Login Time</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Logout Time</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData.length > 0 ? teamData.map((row, i) => (
                                    <tr key={i} className="text-xs hover:bg-[#F1F6F9]">
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.employeeName}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-red-600 font-bold">{row.loginTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-red-600 font-bold">{row.logoutTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.appliedDate}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.appliedBy}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                            row.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                            row.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                            'bg-slate-50 text-slate-700'
                                          }`}>
                                            {row.status}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-3">{row.approvedDate}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={10} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">No team data found for the selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                    
                    {teamReportType === 'regularization' && (
                      <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                          <thead className="table-head-responsive">
                                <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp Name</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Type</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested In</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested Out</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Remarks</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData.length > 0 ? teamData.map((row, i) => (
                                    <tr key={i} className="text-xs hover:bg-[#F1F6F9]">
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.employeeName}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.type}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.loginTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.logoutTime}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.appliedDate}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.appliedBy}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.remarks}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.approvedDate}</td>
                                        <td className="py-1.5 px-3 font-bold">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                            row.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                            row.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                            'bg-slate-50 text-slate-700'
                                          }`}>
                                            {row.status}
                                          </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={12} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">No team data found for the selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                    
                    {teamReportType === 'shiftRequests' && (
                      <table className="app-table report-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                          <thead className="table-head-responsive">
                                <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested ID</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp Name</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">assigned_Shift</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Shift_Requested_To</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Remarks</span></th>
                                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData.length > 0 ? teamData.map((row, i) => (
                                    <tr key={i} className="text-xs hover:bg-[#F1F6F9]">
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.id}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.employeeName}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.shiftAllocated}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.shiftRequested}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.appliedDate}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold">{row.appliedBy}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.remarks}</td>
                                        <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.approvedDate}</td>
                                        <td className="py-1.5 px-3">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                            row.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                            row.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                            'bg-slate-50 text-slate-700'
                                          }`}>
                                            {row.status}
                                          </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={12} className="py-10 text-center text-xs text-[#9BA4B4] font-bold italic">No team data found for the selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                  </div>
              )}
             </div>
          </div>
        )}
        </div>
      </div>
      )}

      <RegularizationModal 
        isOpen={showRegularizationModal}
        onClose={() => {
          setShowRegularizationModal(false);
          loadRegularizationRequests();
        }}
        employeeId={employeeId}
        defaultDate={selectedDate}
      />
      
      <ShiftChangeModal 
        isOpen={showShiftChangeModal}
        onClose={() => {
          setShowShiftChangeModal(false);
          loadShiftChangeRequests();
        }}
        employeeId={employeeId}
      />
    </div>
  );
};

export default AttendanceDashboard;
