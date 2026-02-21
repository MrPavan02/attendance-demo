
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_EMPLOYEES } from '../services/attendanceService';
import { attendanceService } from '../services/attendanceService';
import { adminService } from '../services/adminService';

const TeamReports: React.FC = () => {
  const [activeTeamReport, setActiveTeamReport] = useState<
    'attendance' | 'misPunch' | 'regularization' | 'teamShiftReport'
  >('attendance');
  
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [reportType, setReportType] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const departments = useMemo(() => {
    const deptSet = new Set(MOCK_EMPLOYEES.map(emp => emp.department));
    return ['All', ...Array.from(deptSet)];
  }, []);
  
  const holidays = adminService.getHolidays();
  const maxDate = new Date().toISOString().split('T')[0];

  const loadTeamData = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      let data = [];
      const filteredEmployees = MOCK_EMPLOYEES.filter(emp => {
        if (departmentFilter !== 'All' && emp.department !== departmentFilter) return false;
        return true;
      });

      // Determine date range based on report type
      let dateRange: string[] = [];
      
      if (reportType === 'daily') {
        dateRange = [date];
      } else if (reportType === 'range') {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const current = new Date(start);
        
        while (current <= end) {
          dateRange.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      } else if (reportType === 'monthly') {
        const [year, monthNum] = month.split('-').map(Number);
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum + 1, 0);
        const current = new Date(start);
        
        while (current <= end) {
          if (current.getMonth() + 1 === monthNum) {
             dateRange.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
        }
      }

      if (activeTeamReport === 'attendance') {
        dateRange.forEach((dateStr) => {
          filteredEmployees.forEach((emp, empIndex) => {
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
              status
            });
          });
        });
      }
      
      else if (activeTeamReport === 'misPunch') {
        dateRange.forEach((dateStr) => {
          filteredEmployees.forEach((emp) => {
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
                    'Absent'
                });
              }
            }
          });
        });
      }
      
      else if (activeTeamReport === 'regularization') {
        const allRequests = attendanceService.getRegularizationRequests();
        const filteredRequests = allRequests.filter(req => {
          const isInDateRange = dateRange.some(rangeDate => rangeDate === req.date);
          if (!isInDateRange) return false;
          
          const employee = MOCK_EMPLOYEES.find(emp => emp.id === req.employeeId);
          if (!employee) return false;
          if (departmentFilter !== 'All' && employee.department !== departmentFilter) return false;
          return true;
        });
        
        filteredRequests.forEach((req, index) => {
          const employee = MOCK_EMPLOYEES.find(emp => emp.id === req.employeeId);
          if (employee) {
            data.push({
              sno: index + 1,
              date: req.date,
              employeeId: req.employeeId,
              employeeName: employee.name,
              location: 'Office',
              loginTime: req.requestedLoginTime || '-',
              logoutTime: req.requestedLogoutTime || '-',
              regularizeTime: req.type === 'FULL_DAY' ? '09:00 to 18:00' : 
                           req.requestedLoginTime || req.requestedLogoutTime || '-',
              approveReject: req.status === 'PENDING' ? 'checkbox' : req.status,
              remarks: req.remarks || '-'
            });
          }
        });
      }

      else if (activeTeamReport === 'teamShiftReport') {
        dateRange.forEach((dateStr) => {
          filteredEmployees.forEach((emp) => {
            const shift = attendanceService.getEmployeeShift(emp.id, dateStr);
            data.push({
              sno: data.length + 1,
              date: dateStr,
              empId: emp.id,
              empName: emp.name,
              department: emp.department,
              shift: shift?.name || 'Week Off',
              timings: shift ? `${shift.startTime} - ${shift.endTime}` : 'N/A'
            });
          });
        });
      }
      
      setTeamData(data);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadTeamData();
  }, [activeTeamReport, departmentFilter, reportType, date, month, fromDate, toDate]);

  const handleApproveReject = (index: number, action: 'approve' | 'reject') => {
    const newData = [...teamData];
    if (activeTeamReport === 'regularization') {
      newData[index].approveReject = action === 'approve' ? 'APPROVED' : 'REJECTED';
    }
    setTeamData(newData);
  };

  const downloadCSV = () => {
    let csvContent = '';
    const reportPeriod = reportType === 'daily' ? date : 
                        reportType === 'range' ? `${fromDate} to ${toDate}` : 
                        month;
    
    if (activeTeamReport === 'attendance') {
      csvContent = `team attendance report\t\t\t${reportType}\t\t\t\t\n`;
      csvContent += 'S.no\tDate\tEmp ID\tEmp Name\tShift\tLogin Time\tLogout Time\tLate Coming\tEarly Going\tStatus\n';
      teamData.forEach(row => {
        const values = [row.sno, row.date, row.empId, row.empName, row.shift, row.loginTime, row.logoutTime, row.lateComing, row.earlyGoing, row.status];
        csvContent += values.join('\t') + '\n';
      });
    }
    else if (activeTeamReport === 'misPunch') {
      csvContent = `team mis-punch report\t\t\t${reportType}\t\t\t\t\n`;
      csvContent += 'S.no\tDate\tEmployee Id\tEmployee Name\tLocation\tLogin Time\tLogout Time\n';
      teamData.forEach(row => {
        const values = [row.sno, row.date, row.employeeId, row.employeeName, row.location, row.loginTime, row.logoutTime];
        csvContent += values.join('\t') + '\n';
      });
    }
    else if (activeTeamReport === 'regularization') {
      csvContent = `team regularization request\t\t${reportType}\t\t\t\t\t\n`;
      csvContent += 'S.no\tDate\tEmployee Id\tEmployee Name\tLocation\tLogin Time\tLogout Time\tRegularize Time\tApprove/Reject\tRemarks\n';
      teamData.forEach(row => {
        const values = [row.sno, row.date, row.employeeId, row.employeeName, row.location, row.loginTime, row.logoutTime, row.regularizeTime, row.approveReject, row.remarks];
        csvContent += values.join('\t') + '\n';
      });
    }
    else if (activeTeamReport === 'teamShiftReport') {
      csvContent = `team shift report\t\t\t${reportType}\t\t\t\t\n`;
      csvContent += 'S.no\tDate\tEmp ID\tEmp Name\tDepartment\tShift\tTimings\n';
      teamData.forEach(row => {
        const values = [row.sno, row.date, row.empId, row.empName, row.department, row.shift, row.timings];
        csvContent += values.join('\t') + '\n';
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `team_${activeTeamReport}_report_${reportPeriod.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
        <h3 className="text-sm font-bold text-[#14274E] mb-3 tracking-tight">Team Reports</h3>
        
        <div className="flex space-x-4 border-b border-[#9BA4B4] px-1 mb-4 overflow-x-auto">
          {[
            { id: 'attendance', label: 'Attendance', icon: 'fa-users' },
            { id: 'misPunch', label: 'Mis-Punch', icon: 'fa-exclamation-triangle' },
            { id: 'regularization', label: 'Regularization', icon: 'fa-file-contract' },
            { id: 'teamShiftReport', label: 'Shift List', icon: 'fa-calendar-days' }
          ].map(report => (
            <button
              key={report.id}
              onClick={() => setActiveTeamReport(report.id as any)}
              className={`pb-2 px-2 font-bold text-xs uppercase tracking-[0.15em] transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
                activeTeamReport === report.id ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6]'
              }`}
            >
              <i className={`fas ${report.icon}`}></i>
              <span>{report.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
              Select Team
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
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
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                max={maxDate.substring(0, 7)}
                className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
              />
            </div>
          )}
          
          <div className="flex items-end">
            <button
              onClick={loadTeamData}
              disabled={isLoading}
              className="w-full bg-[#14274E] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
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

        <div className="flex justify-between items-center mb-3">
          <div className="text-xs text-[#394867]">
            Showing {teamData.length} records
          </div>
          <button
            onClick={downloadCSV}
            disabled={teamData.length === 0}
            className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
          >
            <i className="fas fa-download mr-1"></i>
            Download CSV
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-[#9BA4B4] mb-2"></i>
            <p className="text-xs font-bold text-[#394867]">Loading team data...</p>
          </div>
        ) : teamData.length > 0 ? (
          <div className="overflow-x-auto">
            {activeTeamReport === 'attendance' && (
              <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Emp ID</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Emp Name</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Shift</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Login Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Logout Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Late Coming</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Early Going</th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((row, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.empId}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.empName}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.shift}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.loginTime === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {row.loginTime}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.logoutTime === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {row.logoutTime}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.lateComing !== 'On Time' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {row.lateComing}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.earlyGoing !== 'On Time' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {row.earlyGoing}
                        </span>
                      </td>
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
            )}

            {activeTeamReport === 'misPunch' && (
              <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Id</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Name</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Location</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Login Time</th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Logout Time</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((row, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.employeeName}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.location}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.loginTime === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {row.loginTime}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.logoutTime === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {row.logoutTime}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTeamReport === 'regularization' && (
              <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Id</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Name</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Location</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Login Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Logout Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Regularize Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Approve/Reject</th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((row, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.employeeName}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.location}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.loginTime}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.logoutTime}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.regularizeTime}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        {row.approveReject === 'checkbox' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveReject(index, 'approve')}
                              className="bg-emerald-500 text-white px-2 py-0.5 rounded text-xs font-bold hover:bg-emerald-600 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveReject(index, 'reject')}
                              className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.approveReject === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                            row.approveReject === 'REJECTED' ? 'bg-red-50 text-red-700' :
                            'bg-slate-50 text-slate-700'
                          }`}>
                            {row.approveReject}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTeamReport === 'teamShiftReport' && (
              <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Emp ID</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Emp Name</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Dept</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Assigned Shift</th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Timings</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((row, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.empId}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.empName}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.department}</td>
                      <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.shift === 'Week Off' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {row.shift}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">{row.timings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-clipboard-list text-3xl text-[#9BA4B4] mb-2"></i>
            <p className="text-xs font-bold text-[#394867]">No data found</p>
            <p className="text-[10px] text-[#394867]">Try changing filters or generate new data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamReports;
