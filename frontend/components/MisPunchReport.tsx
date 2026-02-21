import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { adminService } from '../services/adminService';

const MisPunchReport: React.FC = () => {
  const [reportType, setReportType] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  const holidays = adminService.getHolidays();
  const maxDate = new Date().toISOString().split('T')[0];

  const departments = useMemo(() => {
    const deptSet = new Set(MOCK_EMPLOYEES.map(emp => emp.department));
    return ['All', ...Array.from(deptSet)];
  }, []);

  const managers = useMemo(() => {
    const managerSet = new Set(['John Manager', 'Jane Supervisor', 'Mike Lead', 'Sarah Director']);
    return ['All', ...Array.from(managerSet)];
  }, []);

  const teams = useMemo(() => ['All', 'Team A', 'Team B', 'Team C', 'Team D'], []);
  const locations = useMemo(() => ['All', 'Office', 'Field', 'Branch', 'WFH'], []);

  const generateReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      let data = [];
      const employees = MOCK_EMPLOYEES.filter(emp => {
        if (departmentFilter !== 'All' && emp.department !== departmentFilter) return false;
        if (locationFilter !== 'All' && locationFilter !== 'Office') return false; // Mock data is Office
        return true;
      });

      if (reportType === 'daily') {
        employees.forEach((emp, index) => {
          const entries = attendanceService.getAttendanceForDate(date).filter(e => e.employeeId === emp.id);
          const loginEntry = entries.find(e => e.type === 'IN');
          const logoutEntry = entries.find(e => e.type === 'OUT');
          
          const isMissedLogin = !loginEntry;
          const isMissedLogout = !logoutEntry;
          
          if (isMissedLogin || isMissedLogout) {
            const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
            const dayOfWeek = new Date(date).getDay();
            const isWeekOff = weekOffs.includes(dayOfWeek);
            const isHoliday = holidays.some(h => h.date === date);
            
            if (!isWeekOff && !isHoliday) {
              data.push({
                sno: index + 1,
                date,
                employeeId: emp.id,
                employeeName: emp.name,
                dateOfJoining: '2024-01-01',
                employmentStatus: 'Active',
                department: emp.department,
                managerName: 'John Manager',
                location: 'Office',
                loginTime: loginEntry ? 
                  new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                  'Absent',
                logoutTime: logoutEntry ? 
                  new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                  'Absent',
                isMissedLogin,
                isMissedLogout
              });
            }
          }
        });
      } else if (reportType === 'range') {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const current = new Date(start);
        
        while (current <= end) {
          const currentDate = current.toISOString().split('T')[0];
          employees.forEach((emp, empIndex) => {
            const entries = attendanceService.getAttendanceForDate(currentDate).filter(e => e.employeeId === emp.id);
            const loginEntry = entries.find(e => e.type === 'IN');
            const logoutEntry = entries.find(e => e.type === 'OUT');
            
            const isMissedLogin = !loginEntry;
            const isMissedLogout = !logoutEntry;
            
            if (isMissedLogin || isMissedLogout) {
              const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
              const dayOfWeek = current.getDay();
              const isWeekOff = weekOffs.includes(dayOfWeek);
              const isHoliday = holidays.some(h => h.date === currentDate);
              
              if (!isWeekOff && !isHoliday) {
                data.push({
                  sno: data.length + 1,
                  date: currentDate,
                  employeeId: emp.id,
                  employeeName: emp.name,
                  dateOfJoining: '2024-01-01',
                  employmentStatus: 'Active',
                  department: emp.department,
                  managerName: 'John Manager',
                  location: 'Office',
                  loginTime: loginEntry ? 
                    new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                    'Absent',
                  logoutTime: logoutEntry ? 
                    new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                    'Absent',
                  isMissedLogin,
                  isMissedLogout
                });
              }
            }
          });
          current.setDate(current.getDate() + 1);
        }
      } else if (reportType === 'monthly') {
        const [year, monthNum] = month.split('-').map(Number);
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum, 0);
        const current = new Date(start);
        
        while (current <= end) {
          const currentDate = current.toISOString().split('T')[0];
          employees.forEach((emp) => {
            const entries = attendanceService.getAttendanceForDate(currentDate).filter(e => e.employeeId === emp.id);
            const loginEntry = entries.find(e => e.type === 'IN');
            const logoutEntry = entries.find(e => e.type === 'OUT');
            
            const isMissedLogin = !loginEntry;
            const isMissedLogout = !logoutEntry;
            
            if (isMissedLogin || isMissedLogout) {
              const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
              const dayOfWeek = current.getDay();
              const isWeekOff = weekOffs.includes(dayOfWeek);
              const isHoliday = holidays.some(h => h.date === currentDate);
              
              if (!isWeekOff && !isHoliday) {
                data.push({
                  sno: data.length + 1,
                  date: currentDate,
                  employeeId: emp.id,
                  employeeName: emp.name,
                  dateOfJoining: '2024-01-01',
                  employmentStatus: 'Active',
                  department: emp.department,
                  managerName: 'John Manager',
                  location: 'Office',
                  loginTime: loginEntry ? 
                    new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                    'Absent',
                  logoutTime: logoutEntry ? 
                    new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                    'Absent',
                  isMissedLogin,
                  isMissedLogout
                });
              }
            }
          });
          current.setDate(current.getDate() + 1);
        }
      }

      setReportData(data);
      setIsGenerating(false);
    }, 500);
  };

  const downloadCSV = () => {
    let csvContent = 'S.no,Date,Employee Id,Employee Name,Date Of Joining,Employment Status,Department,Manager Name,Location,Login Time,Logout Time\n';
    
    reportData.forEach(row => {
      const values = [
        row.sno,
        row.date,
        row.employeeId,
        row.employeeName,
        row.dateOfJoining || '',
        row.employmentStatus || 'Active',
        row.department,
        row.managerName,
        row.location,
        row.loginTime,
        row.logoutTime
      ];
      csvContent += values.map(v => `"${v}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mis_punch_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    generateReport();
  }, [departmentFilter, managerFilter, teamFilter, locationFilter, reportType, date, month, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
        <h3 className="text-sm font-bold text-[#14274E] mb-3 tracking-tight">Mis-Punch Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">
                Report Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['daily', 'range', 'monthly'].map(type => (
                  <button
                    key={type}
                    onClick={() => setReportType(type as any)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      reportType === type ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {reportType === 'daily' && (
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={maxDate}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                />
              </div>
            )}

            {reportType === 'range' && (
              <div className="grid grid-cols-2 gap-2">
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
              </div>
            )}

            {reportType === 'monthly' && (
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Select Month
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Department
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
                  Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Team
                </label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                  Manager
                </label>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                >
                  {managers.map(manager => (
                    <option key={manager} value={manager}>{manager}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                  Generating Report...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-bar mr-1"></i>
                  Generate Report
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-[#F1F6F9] p-3 rounded-lg border border-[#9BA4B4]">
              <h4 className="text-sm font-bold text-[#14274E] mb-1.5">Report Summary</h4>
              {reportData.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-[#394867]">Total Records:</span>
                    <span className="text-xs font-bold text-[#14274E]">{reportData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#394867]">Report Type:</span>
                    <span className="text-xs font-bold text-[#14274E]">{reportType.charAt(0).toUpperCase() + reportType.slice(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#394867]">Period:</span>
                    <span className="text-xs font-bold text-[#14274E]">
                      {reportType === 'daily' ? date : 
                       reportType === 'range' ? `${fromDate} to ${toDate}` : 
                       month}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-[#9BA4B4]">
                    <button
                      onClick={downloadCSV}
                      disabled={reportData.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-download mr-1"></i>
                      Download as CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="fas fa-file-alt text-xl text-[#9BA4B4] mb-1.5"></i>
                  <p className="text-xs font-bold text-[#394867]">No report generated</p>
                  <p className="text-[10px] text-[#394867]">Generate a report to view summary</p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#394867] space-y-1">
              <p className="font-bold uppercase tracking-widest">Report Includes:</p>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>Employees with missed login</li>
                <li>Employees with missed logout</li>
                <li>Date-wise mis-punch details</li>
                <li>Employee information</li>
                <li>Department and Team filtering</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4] overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-[#14274E] tracking-tight">
              Mis-Punch Report Details
            </h3>
            <div className="flex space-x-1.5">
              <button
                onClick={downloadCSV}
                className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
              >
                <i className="fas fa-download mr-1"></i>
                Download CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
              <thead>
                <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Id</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Name</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date Of Joining</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employment Status</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Department</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Manager Name</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Location</th>
                  <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Login Time</th>
                  <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Logout Time</th>
                </tr>
              </thead>

              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">{row.sno}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.date}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono">{row.employeeId}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold">{row.employeeName}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.dateOfJoining}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.employmentStatus}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.department}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.managerName}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{row.location}</td>
                    <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.loginTime === 'Absent' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {row.loginTime}
                        {row.isMissedLogin && <i className="fas fa-exclamation-triangle ml-1 text-amber-500"></i>}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.logoutTime === 'Absent' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {row.logoutTime}
                        {row.isMissedLogout && <i className="fas fa-exclamation-triangle ml-1 text-amber-500"></i>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F1F6F9] text-center">
            <p className="text-[10px] text-[#394867] font-bold uppercase tracking-widest">
              Report Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPunchReport;