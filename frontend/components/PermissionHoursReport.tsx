import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { adminService } from '../services/adminService';

const PermissionHoursReport: React.FC = () => {
  const [reportType, setReportType] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  const departments = useMemo(() => {
    const deptSet = new Set(MOCK_EMPLOYEES.map(emp => emp.department));
    return ['All', ...Array.from(deptSet)];
  }, []);

  const managers = useMemo(() => ['All', 'John Manager', 'Jane Supervisor', 'Mike Lead', 'Sarah Director'], []);
  const teams = useMemo(() => ['All', 'Team A', 'Team B', 'Team C', 'Team D'], []);
  const locations = useMemo(() => ['All', 'Office', 'Field', 'Branch', 'WFH'], []);

  const generateReport = () => {
    setIsGenerating(true);
    setHasGenerated(true);
    
    setTimeout(() => {
      const allRequests = attendanceService.getPermissionRequests();
      let filtered = allRequests.filter(req => {
        const employee = MOCK_EMPLOYEES.find(emp => emp.id === req.employeeId);
        if (!employee) return false;
        if (departmentFilter !== 'All' && employee.department !== departmentFilter) return false;
        if (locationFilter !== 'All' && locationFilter !== 'Office') return false; 
        if (managerFilter !== 'All' && managerFilter !== 'John Manager') return false;
        if (teamFilter !== 'All' && teamFilter !== 'Team A') return false;
        
        if (reportType === 'daily') {
          return req.date === date;
        } else if (reportType === 'range') {
          return req.date >= fromDate && req.date <= toDate;
        } else {
          return req.date.startsWith(month);
        }
      });

      const data = filtered.map((req, idx) => {
        const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
        return {
          sno: idx + 1,
          employeeId: req.employeeId,
          employeeName: emp?.name || 'Unknown',
          department: emp?.department || '-',
          managerName: 'John Manager',
          location: 'Office',
          date: req.date,
          startTime: req.startTime,
          endTime: req.endTime,
          reason: req.reason,
          appliedDate: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
          appliedBy: req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
          approvedDate: req.status === 'APPROVED' ? 'Verified' : '-',
          status: req.status
        };
      });

      setReportData(data);
      setIsGenerating(false);
    }, 500);
  };

  const downloadCSV = () => {
    let csvContent = 'S.no,Employee Id,Employee Name,Department,Manager Name,Location,Date,Start Time,End Time,Reason,Applied Date,Applied By,Approved Date,Status\n';
    
    reportData.forEach(row => {
      const values = [
        row.sno,
        row.employeeId,
        row.employeeName,
        row.department,
        row.managerName,
        row.location,
        row.date,
        row.startTime,
        row.endTime,
        row.reason,
        row.appliedDate,
        row.appliedBy,
        row.approvedDate,
        row.status
      ];
      csvContent += values.map(v => `"${v}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `permission_hours_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = useMemo(() => {
    const approved = reportData.filter(r => r.status === 'APPROVED').length;
    const pending = reportData.filter(r => r.status === 'PENDING').length;
    const rejected = reportData.filter(r => r.status === 'REJECTED').length;
    return { approved, pending, rejected, total: reportData.length };
  }, [reportData]);

  useEffect(() => {
    generateReport();
  }, [departmentFilter, managerFilter, teamFilter, locationFilter, reportType, date, month, fromDate, toDate]);

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
        <h3 className="text-sm font-bold text-[#14274E] mb-3 tracking-tight">Permission Hours Report</h3>
        
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

            <div className="grid grid-cols-2 gap-2">
              {reportType === 'daily' && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={maxDate} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                </div>
              )}
              
              {reportType === 'range' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} max={maxDate} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                  </div>
                </>
              )}

              {reportType === 'monthly' && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Month</label>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Department</label>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Location</label>
                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Team</label>
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Manager</label>
                <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                  {managers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center shadow-lg"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                  Generating...
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
                    <span className="text-xs text-[#394867]">Total Requests:</span>
                    <span className="text-xs font-bold text-[#14274E]">{summary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-emerald-700">Approved:</span>
                    <span className="text-xs font-bold text-emerald-700">{summary.approved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-amber-700">Pending:</span>
                    <span className="text-xs font-bold text-amber-700">{summary.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-red-700">Rejected:</span>
                    <span className="text-xs font-bold text-red-700">{summary.rejected}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#9BA4B4]">
                    <button
                      onClick={downloadCSV}
                      disabled={reportData.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-download mr-1"></i>
                      Download CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="fas fa-file-alt text-xl text-[#9BA4B4] mb-1.5"></i>
                  <p className="text-xs font-bold text-[#394867]">No report generated</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasGenerated && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center bg-[#F1F6F9] p-3 rounded-t-xl border-x border-t border-[#9BA4B4]">
              <h4 className="text-xs font-bold text-[#14274E] uppercase tracking-widest">Report Details</h4>
              <button 
                onClick={downloadCSV}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
              >
                <i className="fas fa-download mr-1.5"></i>
                Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">S.no</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Id</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Employee Name</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Start Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">End Time</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Applied Date</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Applied By</th>
                    <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">Approved Date</th>
                    <th className="py-1.5 px-3 border-b border-[#9BA4B4]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? reportData.map((row, index) => (
                    <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors border-t border-[#F1F6F9]">
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-center font-mono">{row.sno}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-semibold">{row.date}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-mono">{row.employeeId}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-bold">{row.employeeName}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.startTime}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.endTime}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.appliedDate}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-bold">{row.appliedBy}</td>
                      <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.approvedDate}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          row.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-xs text-gray-400 font-bold italic">
                        No permission hour records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionHoursReport;