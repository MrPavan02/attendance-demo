import React, { useState, useMemo, useEffect, useRef } from 'react';
import { adminService } from '../services/adminService';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { Holiday, WorkMode } from '../types';
import { SHIFTS } from '../constants';
import { generateId } from '../utils/id';
import AdminRegularization from './AdminRegularization';
import AdminOvertime from './AdminOvertime';
import AdminPermission from './AdminPermission';
import Chart from 'chart.js/auto';
import MisPunchReport from './MisPunchReport';
import PermissionHoursReport from './PermissionHoursReport';
import OvertimeReport from './OvertimeReport';

// New Shift Assignment Modal Component
interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignments: any[]) => void;
  onSaveDraft?: (assignments: any[]) => void;
}

// Updated ShiftAssignmentModal component with all requested features
const ShiftAssignmentModal: React.FC<ShiftAssignmentModalProps> = ({ isOpen, onClose, onSave, onSaveDraft }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copyContext, setCopyContext] = useState<{
    employeeId: string;
    date: string;
    shift: string;
    x: number;
    y: number;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<Record<string, string>>({
    empId: '',
    empName: '',
    dept: '',
    shift: ''
  });

  const today = new Date().toISOString().split('T')[0];

  // Generate date range
  const dateRange = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      alert('End date must be after start date');
      setEndDate(startDate);
      return [];
    }
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [startDate, endDate]);
  const filteredEmployees = useMemo(() => {
    let filtered = MOCK_EMPLOYEES;
    
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(query) || 
        emp.id.toLowerCase().includes(query)
      );
    }
    
    // Apply table filters
    if (tableSearch.empId) {
      filtered = filtered.filter(emp => emp.id.toLowerCase().includes(tableSearch.empId.toLowerCase()));
    }
    
    if (tableSearch.empName) {
      filtered = filtered.filter(emp => emp.name.toLowerCase().includes(tableSearch.empName.toLowerCase()));
    }
    
    if (tableSearch.dept) {
      filtered = filtered.filter(emp => emp.department.toLowerCase().includes(tableSearch.dept.toLowerCase()));
    }
    
    return filtered;
  }, [selectedDepartment, searchQuery, tableSearch]);

  // Get unique departments
  const departments = useMemo(() => {
    const deptSet = new Set(MOCK_EMPLOYEES.map(emp => emp.department));
    return ['All', ...Array.from(deptSet)];
  }, []);

  // Initialize assignments when date range changes
  useEffect(() => {
    if (dateRange.length > 0) {
      const initialAssignments: Record<string, Record<string, string>> = {};
      
      filteredEmployees.forEach(emp => {
        const empAssignments: Record<string, string> = {};
        dateRange.forEach(date => {
          // Get existing shift if any
          const existingShift = attendanceService.getEmployeeShift(emp.id, date);
          empAssignments[date] = existingShift?.id || '';
        });
        initialAssignments[emp.id] = empAssignments;
      });
      
      setAssignments(initialAssignments);
    }
  }, [dateRange, filteredEmployees]);

  // Get shift letter for display
  const getShiftLetter = (shiftId: string) => {
    if (shiftId === 'WEEK_OFF') return 'WO';
    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return '';
    
    // Extract letter from shift name (e.g., "ShiftA" -> "A")
    return shift.name.replace('Shift', '');
  };

  const handleShiftChange = (employeeId: string, date: string, shiftId: string, event?: React.MouseEvent) => {
    // Update the shift
    setAssignments(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: shiftId
      }
    }));

    // If shift is selected and user right-clicked or Ctrl+clicked, show copy menu
    if (shiftId && event) {
      event.preventDefault();
      setCopyContext({
        employeeId,
        date,
        shift: shiftId,
        x: event.clientX,
        y: event.clientY
      });
      setShowCopyMenu(true);
    }
  };

  const handleCopyAction = (action: 'thisEmployeeAllDates' | 'thisDateAllEmployees' | 'allEmployeesAllDates') => {
    if (!copyContext) return;

    const updatedAssignments = { ...assignments };
    const { employeeId, date, shift } = copyContext;

    switch (action) {
      case 'thisEmployeeAllDates':
        // Copy to all dates for this employee only
        if (assignments[employeeId]) {
          const empAssignments = { ...updatedAssignments[employeeId] };
          dateRange.forEach(d => {
            empAssignments[d] = shift;
          });
          updatedAssignments[employeeId] = empAssignments;
        }
        break;

      case 'thisDateAllEmployees':
        // Copy to all employees for this date only
        filteredEmployees.forEach(emp => {
          if (assignments[emp.id]) {
            const empAssignments = { ...updatedAssignments[emp.id] };
            empAssignments[date] = shift;
            updatedAssignments[emp.id] = empAssignments;
          }
        });
        break;

      case 'allEmployeesAllDates':
        // Copy to all employees for all dates
        filteredEmployees.forEach(emp => {
          if (assignments[emp.id]) {
            const empAssignments = { ...updatedAssignments[emp.id] };
            empAssignments[date] = shift;
            updatedAssignments[emp.id] = empAssignments;
          }
        });
        break;
    }

    setAssignments(updatedAssignments);
    setShowCopyMenu(false);
    setCopyContext(null);
  };

  const handleClearAll = () => {
    const clearedAssignments: Record<string, Record<string, string>> = {};
    
    filteredEmployees.forEach(emp => {
      const empAssignments: Record<string, string> = {};
      dateRange.forEach(date => {
        empAssignments[date] = '';
      });
      clearedAssignments[emp.id] = empAssignments;
    });
    
    setAssignments(clearedAssignments);
    setShowClearConfirm(false);
  };

  const handleSave = () => {
    // VALIDATION: Prevent past dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (startDate < todayStr) {
       alert("Shift assignments can only be created for current or future dates.");
       return;
    }

    const allAssignments: any[] = [];
    
    Object.entries(assignments).forEach(([employeeId, dateAssignments]) => {
      Object.entries(dateAssignments).forEach(([date, shiftId]) => {
        if (shiftId) {
          allAssignments.push({
            id: generateId(),
            employeeId,
            shiftId,
            date,
            effectiveFrom: new Date().toISOString()
          });
        }
      });
    });

    onSave(allAssignments);
    onClose();
  };

  const handleSaveDraft = () => {
    const allAssignments: any[] = [];
    
    Object.entries(assignments).forEach(([employeeId, dateAssignments]) => {
      Object.entries(dateAssignments).forEach(([date, shiftId]) => {
        if (shiftId) {
          allAssignments.push({
            id: generateId(),
            employeeId,
            shiftId,
            date,
            effectiveFrom: new Date().toISOString(),
            status: 'DRAFT'
          });
        }
      });
    });

    if (onSaveDraft) {
      onSaveDraft(allAssignments);
    }
    onClose();
  };

  // Close copy menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showCopyMenu) {
        setShowCopyMenu(false);
        setCopyContext(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCopyMenu]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-[#14274E]/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-[95vw] h-[90vh] overflow-hidden shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#9BA4B4]">
          <h2 className="text-lg font-bold text-[#14274E] tracking-tight">Manual Shift Assignment</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center"
            >
              <i className="fas fa-trash mr-1.5"></i>
              Clear All
            </button>
            <button onClick={onClose} className="text-[#394867] hover:text-[#14274E]">
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Date Range Selection & Filters */}
        <div className="p-4 border-b border-[#9BA4B4] bg-[#F1F6F9] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E] focus:ring-1 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E] focus:ring-1 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E] focus:ring-1 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                Search Employee
              </label>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#9BA4B4] rounded-xl text-xs font-semibold text-[#14274E] focus:ring-1 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none"
              />
            </div>
          </div>
          <div className="text-xs text-[#394867]">
            <i className="fas fa-info-circle mr-1.5"></i>
            Showing {filteredEmployees.length} employees for {dateRange.length} days
          </div>
        </div>

        {/* Shift Assignment Table */}
        <div className="flex-1 overflow-auto p-3">
          {dateRange.length > 0 ? (
            <div className="overflow-x-auto h-full">
              <div className="min-w-max">
                <table className="app-table w-full border border-[#9BA4B4] rounded-lg overflow-hidden">
                  <thead className="sticky top-0 z-10 table-head-responsive">
                    <tr className="bg-[#14274E] text-white">
                      <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest border-r border-white/20 sticky left-0 bg-[#14274E] z-20">
                        <div className="space-y-1">
                          <div>Employee ID</div>
                          <input
                            type="text"
                            placeholder="Filter ID..."
                            value={tableSearch.empId}
                            onChange={(e) => setTableSearch(prev => ({...prev, empId: e.target.value}))}
                            className="w-full px-1.5 py-0.5 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </th>
                      <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest border-r border-white/20 sticky left-[120px] bg-[#14274E] z-20">
                        <div className="space-y-1">
                          <div>Name</div>
                          <input
                            type="text"
                            placeholder="Filter name..."
                            value={tableSearch.empName}
                            onChange={(e) => setTableSearch(prev => ({...prev, empName: e.target.value}))}
                            className="w-full px-1.5 py-0.5 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </th>
                      <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest border-r border-white/20 sticky left-[240px] bg-[#14274E] z-20">
                        <div className="space-y-1">
                          <div>Department</div>
                          <input
                            type="text"
                            placeholder="Filter dept..."
                            value={tableSearch.dept}
                            onChange={(e) => setTableSearch(prev => ({...prev, dept: e.target.value}))}
                            className="w-full px-1.5 py-0.5 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </th>
                      {dateRange.map(date => (
                        <th key={date} className="py-2 px-2 text-center text-xs font-bold uppercase tracking-widest border-r border-white/20 min-w-[100px]">
                          <span className="table-head-label">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, empIndex) => (
                      <tr 
                        key={emp.id} 
                        className={`hover:bg-[#F1F6F9] transition-colors ${empIndex % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}
                      >
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono text-xs font-bold text-[#14274E] sticky left-0 bg-inherit z-10">
                          {emp.id}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold text-[#14274E] text-sm sticky left-[120px] bg-inherit z-10">
                          {emp.name}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-xs text-[#394867] sticky left-[240px] bg-inherit z-10">
                          {emp.department}
                        </td>
                        {dateRange.map(date => (
                          <td 
                            key={`${emp.id}-${date}`} 
                            className="py-1.5 px-1.5 border-r border-[#9BA4B4]"
                          >
                            <select
                              value={assignments[emp.id]?.[date] || ''}
                              onChange={(e) => handleShiftChange(emp.id, date, e.target.value)}
                              onContextMenu={(e) => {
                                if (assignments[emp.id]?.[date]) {
                                  handleShiftChange(emp.id, date, assignments[emp.id][date], e);
                                }
                              }}
                              onClick={(e) => {
                                if (e.ctrlKey && assignments[emp.id]?.[date]) {
                                  handleShiftChange(emp.id, date, assignments[emp.id][date], e);
                                }
                              }}
                              className="w-full px-1.5 py-1 bg-white border border-[#9BA4B4] rounded-lg text-xs text-[#14274E] focus:ring-1 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none cursor-pointer"
                            >
                              <option value="">Select</option>
                              <option value="WEEK_OFF">Week Off</option>
                              {SHIFTS.map(shift => (
                                <option key={shift.id} value={shift.id}>
                                  {getShiftLetter(shift.id)} ({shift.startTime}-{shift.endTime})
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fas fa-calendar-alt text-2xl text-[#9BA4B4] mb-2"></i>
                <p className="text-xs font-bold text-[#394867]">Select a date range to begin</p>
                <p className="text-xs text-[#394867] mt-1">Choose start and end dates above to generate the shift assignment table</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#9BA4B4] bg-[#F1F6F9]">
          <div className="flex justify-between items-center">
            <div className="text-xs text-[#394867]">
              <i className="fas fa-lightbulb mr-1.5"></i>
              <span className="font-semibold">Tip:</span> 
              <span className="ml-1.5">Right-click or Ctrl+click on any assigned shift to copy to others</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveDraft}
                disabled={dateRange.length === 0}
                className="px-4 py-1.5 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <i className="fas fa-save mr-1.5"></i>
                Save as Draft
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold rounded-xl transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={dateRange.length === 0}
                className="px-4 py-1.5 bg-[#14274E] hover:bg-[#394867] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Menu */}
      {showCopyMenu && copyContext && (
        <div 
          className="fixed z-[1001] bg-white rounded-xl shadow-2xl border border-[#9BA4B4] min-w-[180px]"
          style={{
            top: copyContext.y,
            left: copyContext.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1.5">
            <div className="text-xs font-bold text-[#394867] px-2.5 py-1.5 border-b border-[#F1F6F9]">
              Copy Shift {getShiftLetter(copyContext.shift)}
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleCopyAction('thisEmployeeAllDates')}
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#F1F6F9] rounded-lg text-[#14274E]"
              >
                <i className="fas fa-user mr-1.5"></i>
                Copy to all dates for this employee
              </button>
              <button
                onClick={() => handleCopyAction('thisDateAllEmployees')}
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#F1F6F9] rounded-lg text-[#14274E]"
              >
                <i className="fas fa-calendar-day mr-1.5"></i>
                Copy to all employees for this date
              </button>
              <button
                onClick={() => handleCopyAction('allEmployeesAllDates')}
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#F1F6F9] rounded-lg text-[#14274E]"
              >
                <i className="fas fa-users mr-1.5"></i>
                Copy to all employees for all dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-4 max-md mx-4 shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
            <div className="text-center mb-3">
              <i className="fas fa-exclamation-triangle text-2xl text-amber-500 mb-2"></i>
              <h3 className="text-sm font-bold text-[#14274E] mb-1.5">Clear All Assignments</h3>
              <p className="text-xs text-[#394867]">
                Are you sure you want to clear all shift assignments for the selected date range?
              </p>
            </div>
            
            <div className="space-y-1.5">
              <button
                onClick={handleClearAll}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-2 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type HrMainTabId = 'overview' | 'requests' | 'behalf' | 'reports' | 'holidays' | 'settings';
type HrBehalfTabId = 'regularization' | 'shifts' | 'overtime' | 'permission';
type HrReportTabId = 'attendance' | 'misPunch' | 'regularization' | 'shift' | 'shiftChange' | 'overtime' | 'permission';
type HrSettingsTabId = 'governance' | 'weekoff' | 'locking';

const HR_MAIN_TABS: Array<{ id: HrMainTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'requests', label: 'Requests' },
  { id: 'behalf', label: 'On Behalf' },
  { id: 'reports', label: 'Reports' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'settings', label: 'Settings' }
];

const HR_BEHALF_TABS: Array<{ id: HrBehalfTabId; label: string; description: string }> = [
  { id: 'regularization', label: 'Regularization', description: 'Correct attendance events' },
  { id: 'shifts', label: 'Shift Planner', description: 'Assign and audit shifts' },
  { id: 'overtime', label: 'Overtime', description: 'Authorize OT payouts' },
  { id: 'permission', label: 'Permissions', description: 'Review short-leave requests' }
];

const HR_REPORT_TABS: Array<{ id: HrReportTabId; label: string }> = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'misPunch', label: 'Mis Punch' },
  { id: 'regularization', label: 'Regularization' },
  { id: 'shift', label: 'Shift Planner' },
  { id: 'shiftChange', label: 'Shift Change' },
  { id: 'overtime', label: 'Overtime' },
  { id: 'permission', label: 'Permission Hours' }
];

const HR_SETTINGS_TABS: Array<{ id: HrSettingsTabId; label: string }> = [
  { id: 'governance', label: 'Corporate Governance' },
  { id: 'weekoff', label: 'Interval & Week Off' },
  { id: 'locking', label: 'Attendance Locking' }
];

const HRDashboard: React.FC = () => {
  // REFACTORED STATE
  const [activeTab, setActiveTab] = useState<HrMainTabId>('overview');
  const [activeBehalfTab, setActiveBehalfTab] = useState<HrBehalfTabId>('regularization');
  const [activeReportSubTab, setActiveReportSubTab] = useState<HrReportTabId>('attendance');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<HrSettingsTabId>('governance');
  
  const [selectedCountry, setSelectedCountry] = useState('India'); // Default to India
  const [selectedState, setSelectedState] = useState('All States');
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [regularizationRequests, setRegularizationRequests] = useState<any[]>([]);
  const [shiftChangeRequests, setShiftChangeRequests] = useState<any[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<any[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<any[]>([]);
  const [employeeWeekOffsData, setEmployeeWeekOffsData] = useState<Record<string, { primary: string; secondary: string }>>({});
  const [showShiftAssignmentModal, setShowShiftAssignmentModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // LOCKING STATE
  const [lockedDates, setLockedDates] = useState<string[]>(attendanceService.getLockedDates());
  const [lockFromDate, setLockFromDate] = useState('');
  const [lockToDate, setLockToDate] = useState('');
  
  // Report state
  const [reportType, setReportType] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [reportFromDate, setReportFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatedReport, setGeneratedReport] = useState<any[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Added filters for Attendance Report
  const [reportDept, setReportDept] = useState('All');
  const [reportManager, setReportManager] = useState('All');
  const [reportTeam, setReportTeam] = useState('All');
  const [reportLocation, setReportLocation] = useState('All');

  // Regularization Report State
  const [regReportData, setRegReportData] = useState<any[]>([]);
  const [isGeneratingRegReport, setIsGeneratingRegReport] = useState(false);
  const [hasGeneratedRegReport, setHasGeneratedRegReport] = useState(false);

  // Shift Change Report State
  const [shiftChangeReportData, setShiftChangeReportData] = useState<any[]>([]);
  const [isGeneratingShiftChangeReport, setIsGeneratingShiftChangeReport] = useState(false);
  const [hasGeneratedShiftChangeReport, setHasGeneratedShiftChangeReport] = useState(false);

  // Week off configuration for "Apply to All"
  const [applyToAllConfig, setApplyToAllConfig] = useState<{ primary: string; secondary: string }>({ 
    primary: '', 
    secondary: '' 
  });

  // Employee tab filters
  const [empStartDate, setEmpStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [empEndDate, setEmpEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [empSearch, setEmpSearch] = useState('');
  const [empDept, setEmpDept] = useState('All');
  const [empLocationFilter, setEmpLocationFilter] = useState('All');
  const [empShiftFilter, setEmpShiftFilter] = useState('All');
  const [empManagerFilter, setEmpManagerFilter] = useState('');

  // Table filters
  const [employeeTableFilters, setEmployeeTableFilters] = useState({
    empId: '',
    empName: '',
    dept: '',
    shift: '',
    manager: '',
    status: '',
    date: '',
    location: ''
  });

  // Shift table filters
  const [shiftTableFilters, setShiftTableFilters] = useState({
    empId: '',
    empName: '',
    dept: '',
    shift: '',
    date: '',
    location: ''
  });

  // Week off search
  const [weekOffSearch, setWeekOffSearch] = useState('');

  // Chart refs
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const [pieChartInstance, setPieChartInstance] = useState<Chart | null>(null);

  const holidays = adminService.getHolidays();
  const weekOffs = adminService.getWeekOffs();
  const countries = adminService.getCountries();
  const states = adminService.getStatesByCountry(selectedCountry);

  const locations = useMemo(() => ['All', 'Office', 'Field', 'Branch', 'WFH'], []);

  // Helper for matrix view
  const matrixStates = useMemo(() => {
    if (selectedCountry === 'India') {
      const INDIAN_STATES = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
      ];
      return INDIAN_STATES;
    }
    return states.filter(s => s !== 'All States');
  }, [selectedCountry, states]);

  const countryHolidays = useMemo(() => {
    return holidays.filter(h => h.country === selectedCountry);
  }, [holidays, selectedCountry]);

  const uniqueHolidays = useMemo(() => {
    const map = new Map<string, { name: string; date: string }>();
    countryHolidays.forEach(h => {
      map.set(`${h.name}|${h.date}`, { name: h.name, date: h.date });
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [countryHolidays]);

  const handleToggleMatrixHoliday = (state: string, name: string, date: string) => {
    const currentHolidays = adminService.getHolidays();
    const existing = currentHolidays.find(h => 
      h.state === state && 
      h.date === date && 
      h.name === name && 
      h.country === selectedCountry
    );

    if (existing) {
      adminService.removeHoliday(existing.id);
    } else {
      adminService.addHoliday({
        id: generateId(),
        name,
        date,
        country: selectedCountry,
        state
      });
    }
    setRefreshTrigger(prev => prev + 1);
    window.dispatchEvent(new Event('attendance-config-updated'));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Load regularization requests
    const regRequests = attendanceService.getRegularizationRequests();
    setRegularizationRequests(regRequests.filter(r => r.status === 'PENDING'));

    // Load shift change requests
    const shiftReqs = attendanceService.getShiftChangeRequests();
    setShiftChangeRequests(shiftReqs.filter(r => r.status === 'PENDING'));

    // Load overtime requests
    const otRequests = attendanceService.getOvertimeRequests();
    setOvertimeRequests(otRequests.filter(r => r.status === 'PENDING'));

    // Load permission requests
    const pRequests = attendanceService.getPermissionRequests();
    setPermissionRequests(pRequests.filter(r => r.status === 'PENDING'));
    
    // Initialize employee week offs data
    const initialWeekOffsData: Record<string, { primary: string; secondary: string }> = {};
    MOCK_EMPLOYEES.forEach(emp => {
      const employeeWeekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
      const primary = employeeWeekOffs.length > 0 ? employeeWeekOffs[0].toString() : '';
      const secondary = employeeWeekOffs.length > 1 ? employeeWeekOffs[1].toString() : '';
      initialWeekOffsData[emp.id] = { primary, secondary };
    });
    setEmployeeWeekOffsData(initialWeekOffsData);
  }, [refreshTrigger]);

  // Combined requests list
  const combinedPendingRequests = useMemo(() => {
    const list: any[] = [];
    
    regularizationRequests.forEach(r => list.push({ ...r, category: 'REGULARIZATION' }));
    shiftChangeRequests.forEach(r => list.push({ ...r, category: 'SHIFT_SWAP' }));
    overtimeRequests.forEach(r => list.push({ ...r, category: 'OVERTIME' }));
    permissionRequests.forEach(r => list.push({ ...r, category: 'PERMISSION' }));
    
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [regularizationRequests, shiftChangeRequests, overtimeRequests, permissionRequests]);

  // Unified action handler for combined tab
  const handleRequestAction = async (request: any, action: 'APPROVE' | 'REJECT') => {
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    
    try {
      switch (request.category) {
        case 'REGULARIZATION':
          await attendanceService.updateRegularizationRequestStatusToApi(request.id, status);
          break;
        case 'SHIFT_SWAP':
          await attendanceService.updateShiftChangeRequestStatusToApi(request.id, status);
          break;
        case 'OVERTIME':
          await attendanceService.updateOvertimeRequestStatusToApi(request.id, status);
          break;
        case 'PERMISSION':
          await attendanceService.updatePermissionRequestStatusToApi(request.id, status);
          break;
      }
    } catch (err) {
      console.error('[HR Requests] Update failed:', err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
      window.dispatchEvent(new Event('attendance-config-updated'));
    }
  };

  // LOCKING Functionality
  const handleToggleLock = (dateStr: string) => {
     if(attendanceService.isDateLocked(dateStr)) {
         attendanceService.unlockDate(dateStr);
     } else {
         attendanceService.lockDate(dateStr);
     }
     setLockedDates(attendanceService.getLockedDates());
     window.dispatchEvent(new Event('attendance-config-updated')); // Notify other components
  };

  const handleRangeLock = () => {
    if (!lockFromDate || !lockToDate) {
      alert("Please select both From and To dates.");
      return;
    }
    const start = new Date(lockFromDate + 'T00:00:00');
    const end = new Date(lockToDate + 'T00:00:00');
    if (start > end) {
      alert("Invalid range: From date is after To date");
      return;
    }
    const current = new Date(start);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      attendanceService.lockDate(dStr);
      current.setDate(current.getDate() + 1);
    }
    setLockedDates(attendanceService.getLockedDates());
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert(`Successfully locked attendance for the specified range.`);
  };

  const handleRangeUnlock = () => {
    if (!lockFromDate || !lockToDate) {
      alert("Please select both From and To dates.");
      return;
    }
    const start = new Date(lockFromDate + 'T00:00:00');
    const end = new Date(lockToDate + 'T00:00:00');
    if (start > end) {
      alert("Invalid range: From date is after To date");
      return;
    }
    const current = new Date(start);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      attendanceService.unlockDate(dStr);
      current.setDate(current.getDate() + 1);
    }
    setLockedDates(attendanceService.getLockedDates());
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert(`Successfully unlocked attendance for the specified range.`);
  };

  // Initialize pie chart
  useEffect(() => {
    if (activeTab === 'behalf' && activeBehalfTab === 'shifts' && pieChartRef.current) {
      // Destroy existing chart instance if it exists
      if (pieChartInstance) {
        pieChartInstance.destroy();
      }

      // Get shift distribution data
      const shiftAssignments = attendanceService.getShiftAssignments();
      const shiftCounts: Record<string, number> = {};
      
      SHIFTS.forEach(shift => {
        shiftCounts[shift.name] = 0;
      });
      shiftCounts['Week Off'] = 0;

      shiftAssignments.forEach(assignment => {
        if (assignment.shiftId === 'WEEK_OFF') {
          shiftCounts['Week Off']++;
        } else {
          const shift = SHIFTS.find(s => s.id === assignment.shiftId);
          if (shift) {
            shiftCounts[shift.name]++;
          }
        }
      });

      // Create pie chart
      const ctx = pieChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: Object.keys(shiftCounts),
            datasets: [{
              data: Object.values(shiftCounts),
              backgroundColor: [
                '#14274E',
                '#394867',
                '#9BA4B4',
                '#F1F6F9',
                '#D6E4F0',
                '#FF6B6B'
              ],
              borderColor: '#fff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: {
                    size: 10
                  },
                  padding: 15
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = Math.round((value as number / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        
        setPieChartInstance(chart);
      }
    }

    // Cleanup on unmount
    return () => {
      if (pieChartInstance) {
        pieChartInstance.destroy();
      }
    };
  }, [activeTab, activeBehalfTab, pieChartRef.current]);

  const prevWorkDayStr = useMemo(() => {
    return attendanceService.getPreviousWorkingDay(new Date(), holidays.map(h => h.date), weekOffs);
  }, [holidays, weekOffs]);

  const todayAttendance = attendanceService.getAttendanceForDate(todayStr);
  const prevAttendance = attendanceService.getAttendanceForDate(prevWorkDayStr);

  const todayLoginSet = useMemo(() => {
    const ids = new Set<string>();
    todayAttendance.forEach(entry => {
      if (entry.type === 'IN') {
        ids.add(entry.employeeId);
      }
    });
    return ids;
  }, [todayAttendance]);

  const todayLogoutSet = useMemo(() => {
    const ids = new Set<string>();
    todayAttendance.forEach(entry => {
      if (entry.type === 'OUT') {
        ids.add(entry.employeeId);
      }
    });
    return ids;
  }, [todayAttendance]);

  const employeeStatusList = useMemo(() => {
    return MOCK_EMPLOYEES.map(emp => {
      const isPresentToday = todayLoginSet.has(emp.id);
      const isPresentPrev = prevAttendance.some(e => e.employeeId === emp.id && e.type === 'IN');
      return { ...emp, isPresentToday, isPresentPrev };
    });
  }, [todayLoginSet, prevAttendance]);

  const activeEmployeeCount = employeeStatusList.length;
  const loginCount = todayLoginSet.size;
  const logoutCount = todayLogoutSet.size;
  const absentCount = Math.max(0, activeEmployeeCount - loginCount);

  const leaveCount = useMemo(() => {
    const leaveRequests = attendanceService.getRegularizationRequests();
    return employeeStatusList.filter(emp =>
      leaveRequests.some(req => req.employeeId === emp.id && req.date === todayStr && req.status === 'APPROVED')
    ).length;
  }, [employeeStatusList, todayStr]);

  const workforceCards = useMemo(() => ([
    {
      label: 'Active Employee',
      value: activeEmployeeCount,
      icon: 'fa-users',
      iconBg: 'bg-[#14274E]/10',
      iconColor: 'text-[#14274E]',
      valueColor: 'text-[#14274E]'
    },
    {
      label: 'Log IN',
      value: loginCount,
      icon: 'fa-right-to-bracket',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700'
    },
    {
      label: 'Log OUT',
      value: logoutCount,
      icon: 'fa-right-from-bracket',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueColor: 'text-slate-700'
    },
    {
      label: 'Leave',
      value: leaveCount,
      icon: 'fa-calendar-check',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700'
    },
    {
      label: 'Absent',
      value: absentCount,
      icon: 'fa-user-xmark',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-700'
    }
  ]), [activeEmployeeCount, loginCount, logoutCount, leaveCount, absentCount]);

  // Filter employees for employee tab
  const filteredEmployeeStatusList = useMemo(() => {
    let filtered = employeeStatusList;
    
    // Filter by search
    if (empSearch) {
      const query = empSearch.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(query) || 
        emp.id.toLowerCase().includes(query)
      );
    }
    
    // Filter by department
    if (empDept !== 'All') {
      filtered = filtered.filter(emp => emp.department === empDept);
    }
    
    return filtered;
  }, [employeeStatusList, empSearch, empDept]);

  // Get attendance data for employee tab with date range
  const employeeAttendanceData = useMemo(() => {
    const data: any[] = [];
    const start = new Date(empStartDate);
    const end = new Date(empEndDate);
    
    filteredEmployeeStatusList.forEach(emp => {
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const entries = attendanceService.getAttendanceForDate(dateStr).filter(e => e.employeeId === emp.id);
        const loginEntry = entries.find(e => e.type === 'IN');
        const logoutEntry = entries.find(e => e.type === 'OUT');
        const shift = attendanceService.getEmployeeShift(emp.id, dateStr);
        
        const loginTime = loginEntry ? new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
        const logoutTime = logoutEntry ? new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
        const entryLocation = loginEntry ? loginEntry.mode : (logoutEntry ? logoutEntry.mode : '-');

        let lateArrival = '-';
        // Fixed: Defined 'earlyGoing' variable to resolve the "Cannot find name 'earlyGoing'" error.
        let earlyGoing = '-';
        
        if (shift && shift.id !== 'WEEK_OFF' && loginEntry) {
          const checkInTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          lateArrival = attendanceService.calculateLateArrival(checkInTime, shift.startTime).toString();
        }
        
        if (shift && shift.id !== 'WEEK_OFF' && logoutEntry) {
          const checkOutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          // Fixed: Assigned calculated value to 'earlyGoing'.
          earlyGoing = attendanceService.calculateEarlyGoing(checkOutTime, shift.endTime).toString();
        }
        
        const totalHours = loginEntry && logoutEntry 
          ? attendanceService.calculateDurationHours(loginEntry.timestamp, logoutEntry.timestamp)
          : '-';

        // Determine status
        let status = 'Absent';
        const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
        const dayOfWeek = currentDate.getDay();
        const isWeekOff = weekOffs.includes(dayOfWeek);
        const isHoliday = holidays.some(h => h.date === dateStr);
        
        if (isHoliday) {
          status = 'Holiday';
        } else if (isWeekOff) {
          status = 'Week Off';
        } else if (loginEntry || logoutEntry) {
          if (loginEntry && logoutEntry) {
            status = 'Present';
          } else if (loginEntry) {
            status = 'On Duty';
          }
        }

        const managerName = 'John Manager';

        data.push({
          ...emp,
          date: dateStr,
          loginTime,
          logoutTime,
          lateArrival,
          earlyGoing,
          totalHours,
          shift: shift?.name || '-',
          status,
          managerName,
          location: entryLocation
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Apply main filters
    let filtered = data;
    if (empLocationFilter !== 'All') {
      filtered = filtered.filter(row => row.location === empLocationFilter);
    }
    if (empShiftFilter !== 'All') {
      filtered = filtered.filter(row => row.shift === empShiftFilter);
    }
    if (empManagerFilter !== 'All' && empManagerFilter !== '') {
       filtered = filtered.filter(row => row.managerName === empManagerFilter);
    }

    // Apply table filters
    return filtered.filter(row => {
      if (employeeTableFilters.empId && !row.id.toLowerCase().includes(employeeTableFilters.empId.toLowerCase())) return false;
      if (employeeTableFilters.empName && !row.name.toLowerCase().includes(employeeTableFilters.empName.toLowerCase())) return false;
      if (employeeTableFilters.dept && !row.department.toLowerCase().includes(employeeTableFilters.dept.toLowerCase())) return false;
      if (employeeTableFilters.shift && !row.shift.toLowerCase().includes(employeeTableFilters.shift.toLowerCase())) return false;
      if (employeeTableFilters.manager && !row.managerName.toLowerCase().includes(employeeTableFilters.manager.toLowerCase())) return false;
      if (employeeTableFilters.status && !row.status.toLowerCase().includes(employeeTableFilters.status.toLowerCase())) return false;
      if (employeeTableFilters.date && !row.date.toLowerCase().includes(employeeTableFilters.date.toLowerCase())) return false;
      if (employeeTableFilters.location && !row.location.toLowerCase().includes(employeeTableFilters.location.toLowerCase())) return false;
      return true;
    });
  }, [filteredEmployeeStatusList, empStartDate, empEndDate, employeeTableFilters, holidays, empLocationFilter, empShiftFilter, empManagerFilter]);

  // Get unique departments
  const uniqueDepts = useMemo(() => {
    const deptSet = new Set(MOCK_EMPLOYEES.map(emp => emp.department));
    return ['All', ...Array.from(deptSet)];
  }, []);

  // Get unique shifts
  const uniqueShifts = useMemo(() => {
    const shiftSet = new Set(SHIFTS.map(shift => shift.name));
    return ['All', ...Array.from(shiftSet), 'Week Off'];
  }, []);

  // Filter employees for week off configuration
  const filteredWeekOffEmployees = useMemo(() => {
    if (!weekOffSearch) return MOCK_EMPLOYEES.slice(0, 5);
    
    const query = weekOffSearch.toLowerCase();
    return MOCK_EMPLOYEES.filter(emp => 
      emp.name.toLowerCase().includes(query) || 
      emp.id.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [weekOffSearch]);

  const generateDailyReport = (date: string) => {
    const reportData = [];
    
    for (const emp of MOCK_EMPLOYEES) {
      // Filter logic for Dept, Manager, Team, Location
      if (reportDept !== 'All' && emp.department !== reportDept) continue;
      if (reportManager !== 'All' && reportManager !== 'John Manager') continue;
      if (reportTeam !== 'All' && reportTeam !== 'Team A') continue;
      if (reportLocation !== 'All' && reportLocation !== 'Office') continue;

      const entries = attendanceService.getAttendanceForDate(date).filter(e => e.employeeId === emp.id);
      const loginEntry = entries.find(e => e.type === 'IN');
      const logoutEntry = entries.find(e => e.type === 'OUT');
      const shift = attendanceService.getEmployeeShift(emp.id, date);
      
      const loginTime = loginEntry ? new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Absent';
      const logoutTime = logoutEntry ? new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Absent';
      
      let lateArrival = 0;
      let earlyGoing = 0;
      
      if (shift && shift.id !== 'WEEK_OFF' && loginEntry) {
        const checkInTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        lateArrival = attendanceService.calculateLateArrival(checkInTime, shift.startTime);
      }
      
      if (shift && shift.id !== 'WEEK_OFF' && logoutEntry) {
        const checkOutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        earlyGoing = attendanceService.calculateEarlyGoing(checkOutTime, shift.endTime);
      }
      
      const totalHours = loginEntry && logoutEntry 
        ? attendanceService.calculateDurationHours(loginEntry.timestamp, logoutEntry.timestamp)
        : 0;
      
      const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
      const dayOfWeek = new Date(date).getDay();
      const isWeekOff = weekOffs.includes(dayOfWeek);
      const isHoliday = holidays.some(h => h.date === date);
      
      let status = 'Present';
      if (isHoliday) status = 'Holiday';
      else if (isWeekOff) status = 'Week Off';
      else if (!loginEntry && !logoutEntry) status = 'Absent';
      else if (!logoutEntry) status = 'Half Day';
      
      const dateOfJoining = '2024-01-01';
      const employmentStatus = 'Active';
      const managerName = 'John Manager';
      const location = loginEntry ? loginEntry.mode : (logoutEntry ? logoutEntry.mode : 'Office');
      
      reportData.push({
        date,
        employeeId: emp.id,
        employeeName: emp.name,
        dateOfJoining,
        employmentStatus,
        department: emp.department,
        managerName,
        location,
        loginTime,
        logoutTime,
        shift: shift?.name || 'Not Assigned',
        lateArrival: lateArrival > 0 ? `${lateArrival} min` : 'On Time',
        earlyGoing: earlyGoing > 0 ? `${earlyGoing} min` : 'On Time',
        totalHours: totalHours > 0 ? `${totalHours.toFixed(1)} hrs` : '0 hrs',
        status,
        overtime: totalHours > 8 ? `${(totalHours - 8).toFixed(1)} hrs` : '0 hrs'
      });
    }
    
    return reportData;
  };

  const generateMonthlyReport = (startDate: string, endDate: string) => {
    const reportData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (const emp of MOCK_EMPLOYEES) {
      if (reportDept !== 'All' && emp.department !== reportDept) continue;
      if (reportManager !== 'All' && reportManager !== 'John Manager') continue;
      if (reportTeam !== 'All' && reportTeam !== 'Team A') continue;
      if (reportLocation !== 'All' && reportLocation !== 'Office') continue;

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalHolidays = 0;
      let totalWeekOffs = 0;
      let totalHours = 0;
      let totalLateArrival = 0;
      let totalEarlyGoing = 0;
      let totalOvertime = 0;
      
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const entries = attendanceService.getAttendanceForDate(dateStr).filter(e => e.employeeId === emp.id);
        const loginEntry = entries.find(e => e.type === 'IN');
        const logoutEntry = entries.find(e => e.type === 'OUT');
        const shift = attendanceService.getEmployeeShift(emp.id, dateStr);
        
        const weekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
        const dayOfWeek = currentDate.getDay();
        const isWeekOff = weekOffs.includes(dayOfWeek);
        const isHoliday = holidays.some(h => h.date === dateStr);
        
        if (isHoliday) {
          totalHolidays++;
        } else if (isWeekOff) {
          totalWeekOffs++;
        } else if (loginEntry || logoutEntry) {
          totalPresent++;
          
          if (loginEntry && shift && shift.id !== 'WEEK_OFF' && loginEntry) {
            const checkInTime = new Date(loginEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            totalLateArrival += attendanceService.calculateLateArrival(checkInTime, shift.startTime);
          }
          
          if (logoutEntry && shift && shift.id !== 'WEEK_OFF' && logoutEntry) {
            const checkOutTime = new Date(logoutEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            // Fixed: Use totalEarlyGoing instead of undefined earlyGoing in generateMonthlyReport.
            totalEarlyGoing += attendanceService.calculateEarlyGoing(checkOutTime, shift.endTime);
          }
          
          if (loginEntry && logoutEntry) {
            const hours = attendanceService.calculateDurationHours(loginEntry.timestamp, logoutEntry.timestamp);
            totalHours += hours;
            if (hours > 8) totalOvertime += (hours - 8);
          }
        } else {
          totalAbsent++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const dateOfJoining = '2024-01-01';
      const employmentStatus = 'Active';
      const managerName = 'John Manager';
      const location = 'Office';
      
      reportData.push({
        period: `${startDate} to ${endDate}`,
        employeeId: emp.id,
        employeeName: emp.name,
        dateOfJoining,
        employmentStatus,
        department: emp.department,
        managerName,
        location,
        totalPresent,
        totalAbsent,
        totalHolidays,
        totalWeekOffs,
        totalHours: totalHours.toFixed(1),
        averageHours: (totalPresent > 0 ? (totalHours / totalPresent) : 0).toFixed(1),
        totalLateArrival: `${totalLateArrival} min`,
        totalEarlyGoing: `${totalEarlyGoing} min`,
        totalOvertime: `${totalOvertime.toFixed(1)} hrs`
      });
    }
    
    return reportData;
  };

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    
    setTimeout(() => {
      let reportData = [];
      
      if (reportType === 'daily') {
        reportData = generateDailyReport(reportDate);
      } else {
        reportData = generateMonthlyReport(reportFromDate, reportToDate);
      }
      
      setGeneratedReport(reportData);
      setIsGeneratingReport(false);
    }, 500);
  };

  const handleGenerateRegReport = () => {
    setIsGeneratingRegReport(true);
    setHasGeneratedRegReport(true);
    setTimeout(() => {
        const allRequests = attendanceService.getRegularizationRequests();
        let filtered = allRequests.filter(req => {
            const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
            if (!emp) return false;
            
            // Employee identity filters
            if (reportDept !== 'All' && emp.department !== reportDept) return false;
            if (reportManager !== 'All' && reportManager !== 'John Manager') return false;
            if (reportTeam !== 'All' && reportTeam !== 'Team A') return false;
            if (reportLocation !== 'All' && reportLocation !== 'Office') return false;

            // Date/Period filters
            if (reportType === 'daily') {
                return req.date === reportDate;
            } else if (reportType === 'range') {
                return req.date >= reportFromDate && req.date <= reportToDate;
            } else { // monthly
                 const [y, m] = reportMonth.split('-');
                 return req.date.startsWith(`${y}-${m}`);
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
                type: req.type,
                loginTime: req.requestedLoginTime || '-',
                logoutTime: req.requestedLogoutTime || '-',
                reason: req.remarks || '-',
                appliedDate: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '-',
                appliedBy: req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
                approvedDate: req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-',
                status: req.status
            };
        });
        setRegReportData(data);
        setIsGeneratingRegReport(false);
    }, 500);
  };

  const handleGenerateShiftChangeReport = () => {
    setIsGeneratingShiftChangeReport(true);
    setHasGeneratedShiftChangeReport(true);
    setTimeout(() => {
      const allRequests = attendanceService.getShiftChangeRequests();
      let filtered = allRequests.filter(req => {
        const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
        if (!emp) return false;
        
        if (reportDept !== 'All' && emp.department !== reportDept) return false;
        if (reportManager !== 'All' && reportManager !== 'John Manager') return false;
        if (reportTeam !== 'All' && reportTeam !== 'Team A') return false;
        if (reportLocation !== 'All' && reportLocation !== 'Office') return false;

        if (reportType === 'daily') {
          return req.date === reportDate;
        } else if (reportType === 'range') {
          return req.date >= reportFromDate && req.date <= reportToDate;
        } else { // monthly
          const [y, m] = reportMonth.split('-');
          return req.date.startsWith(`${y}-${m}`);
        }
      });
      
      const data = filtered.map((req, idx) => {
        const emp = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
        return {
          sno: idx + 1,
          ...req,
          employeeName: emp?.name || 'Unknown',
          department: emp?.department || '-',
          managerName: 'John Manager',
          location: 'Office',
          appliedDate: '-', // Mocking values if not present in interface
          appliedBy: req.id.toLowerCase().includes('admin') ? 'Admin' : 'Self',
          approvedDate: req.status === 'APPROVED' ? 'Verified' : '-'
        };
      });
      setShiftChangeReportData(data);
      setIsGeneratingShiftChangeReport(false);
    }, 500);
  };

  const handleDownloadReport = () => {
    if (generatedReport.length === 0) {
      alert('Please generate a report first');
      return;
    }
    
    let csvContent = '';
    
    // Standardized header sequence
    if (reportType === 'daily') {
      csvContent += 'S.no,Employee Id,Employee Name,Department,Location,Manager Name,Date,Login Time,Logout Time,OT Hours,Total Hours\n';
    } else {
      csvContent += 'S.no,Employee Id,Employee Name,Department,Location,Manager Name,Date,Login,Logout,OT Hours,Total Days\n';
    }
    
    // Add data rows
    generatedReport.forEach((row, index) => {
      const values = [
        index + 1,
        row.employeeId,
        row.employeeName,
        row.department,
        row.location || 'Office',
        row.managerName || 'John Manager',
        reportType === 'daily' ? row.date : row.period,
        reportType === 'daily' ? row.loginTime : 'Aggregated',
        reportType === 'daily' ? row.logoutTime : 'Aggregated',
        reportType === 'daily' ? (row.overtime || '0 hrs') : row.totalOvertime,
        reportType === 'daily' ? row.totalHours : row.totalPresent
      ];
      csvContent += values.map(v => `"${v}"`).join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRegReport = () => {
    let csvContent = 'S.no,Employee Id,Employee Name,Department,Manager Name,Location,Date,Type,Login Time,Logout Time,Reason,Applied Date,Applied By,Approved Date,Status\n';
    regReportData.forEach(row => {
      const values = [
        row.sno,
        row.employeeId,
        row.employeeName,
        row.department,
        row.managerName,
        row.location,
        row.date,
        row.type.replace('_', ' '),
        row.loginTime,
        row.logoutTime,
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
    link.setAttribute('download', `regularization_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadShiftChangeReport = () => {
    let csvContent = 'S.no,Date,Employee ID,Employee Name,Department,Manager Name,Location,Current Shift,Requested Shift,Reason,Applied Date,Applied By,Approved Date,Status\n';
    shiftChangeReportData.forEach(row => {
      const curShift = SHIFTS.find(s => s.id === row.currentShiftId)?.name || row.currentShiftId;
      const reqShift = SHIFTS.find(s => s.id === row.requestedShiftId)?.name || row.requestedShiftId;
      csvContent += `"${row.sno}","${row.date}","${row.employeeId}","${row.employeeName}","${row.department}","${row.managerName}","${row.location}","${curShift}","${reqShift}","${row.reason}","${row.appliedDate}","${row.appliedBy}","${row.approvedDate}","${row.status}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_change_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCSV = () => {
    // Get date range from modal or default to next 7 days
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    
    let csvContent = 'EMPLOYEE ID,EMPLOYEE NAME';
    
    // Add date headers
    const current = new Date(start);
    while (current <= end) {
      const month = current.toLocaleString('en-US', { month: 'short' });
      const day = current.getDate();
      csvContent += `,${month} ${day}`;
      current.setDate(current.getDate() + 1);
    }
    csvContent += '\n';
    
    // Add employee data
    MOCK_EMPLOYEES.forEach(emp => {
      const row = [emp.id, emp.name];
      // Add empty shift cells for each date
      const dateCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < dateCount; i++) {
        row.push('');
      }
      csvContent += row.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_assignment_sample_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    adminService.addHoliday({
      ...newHoliday,
      id: generateId(),
      country: selectedCountry,
      state: selectedState,
    });
    setNewHoliday({ name: '', date: '' });
    window.dispatchEvent(new Event('attendance-config-updated'));
  };

  const handleAutoPopulateHolidays = () => {
    if (!selectedCountry || selectedCountry === "All Countries" || !selectedState || selectedState === "All States") {
      alert("Designate specific Jurisdiction.");
      return;
    }
    const defaults = adminService.getDefaultHolidaysForState(selectedCountry, selectedState);
    defaults.forEach(h => {
      if (!holidays.some(existing => existing.date === h.date)) {
        adminService.addHoliday({ ...h, id: generateId() });
      }
    });
    window.dispatchEvent(new Event("attendance-config-updated"));
    setActiveSettingsSubTab("governance");
  };

  const toggleWeekOff = (day: number) => {
    const current = adminService.getWeekOffs();
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    adminService.setWeekOffs(next);
    window.dispatchEvent(new Event('attendance-config-updated'));
    setActiveSettingsSubTab('weekoff');
  };

  // Handle CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      const rows = csvData.split('\n');
      
      const filteredRows = rows.filter(row => row.trim() !== '');
      
      if (filteredRows.length < 2) {
        alert('CSV file must have at least one data row after header');
        return;
      }
      
      const headers = filteredRows[0].split(',').map(h => h.trim());
      const dateRegex = /^[A-Z][a-z]{2} \d{1,2}$/;
      
      const dateColumns = headers.slice(2).filter(header => dateRegex.test(header));
      
      if (headers.length < 3 || dateColumns.length === 0) {
        alert('CSV format must match Manual Shift Assignment table format:\nEMPLOYEE ID, EMPLOYEE NAME, Date1, Date2, ...');
        return;
      }
      
      const newAssignments: any[] = [];
      let successCount = 0;
      
      for (let i = 1; i < filteredRows.length; i++) {
        const columns = filteredRows[i].split(',').map(col => col.trim());
        
        if (columns.length >= 3) {
          const employeeId = columns[0];
          
          const employee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
          if (!employee) {
            console.warn(`Employee ${employeeId} not found, skipping...`);
            continue;
          }
          
          for (let j = 2; j < Math.min(columns.length, headers.length); j++) {
            const shiftValue = columns[j];
            const dateHeader = headers[j];
            
            const [monthAbbr, day] = dateHeader.split(' ');
            const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              .findIndex(m => m.toLowerCase() === monthAbbr.toLowerCase());
            
            if (monthIndex === -1) continue;
            
            const currentYear = new Date().getFullYear();
            const date = new Date(currentYear, monthIndex, parseInt(day));
            const dateStr = date.toISOString().split('T')[0];
            
            if (shiftValue) {
              let shiftNumber = shiftValue.replace('Shift', '').replace(/\(.*\)/, '').trim();
              
              if (shiftNumber.toLowerCase() === 'wo' || shiftNumber.toLowerCase() === 'week off') {
                shiftNumber = 'WEEK_OFF';
              } else {
                const numberMatch = shiftNumber.match(/\d+/);
                if (numberMatch) {
                  shiftNumber = numberMatch[0];
                }
              }
              
              const shiftId = shiftNumber === 'WEEK_OFF' ? 'WEEK_OFF' : `shift_${shiftNumber}`;
              const shiftExists = shiftId === 'WEEK_OFF' || SHIFTS.find(s => s.id === shiftId);
              
              if (shiftExists) {
                newAssignments.push({
                  id: generateId(),
                  employeeId,
                  shiftId,
                  date: dateStr,
                  effectiveFrom: new Date().toISOString()
                });
                successCount++;
              }
            }
          }
        }
      }
      
      newAssignments.forEach(assignment => {
        attendanceService.saveShiftAssignment(assignment);
      });
      
      window.dispatchEvent(new Event('attendance-config-updated'));
      alert(`Successfully uploaded ${successCount} shift assignments from CSV!`);
    };
    
    reader.readAsText(file);
  };

  // Handle shift assignment save
  const handleSaveShiftAssignments = (assignments: any[]) => {
    assignments.forEach(assignment => {
      attendanceService.saveShiftAssignment(assignment);
    });
    
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert(`Successfully assigned ${assignments.length} shift(s)!`);
  };

  // Handle shift assignment save as draft
  const handleSaveShiftAssignmentsDraft = (assignments: any[]) => {
    assignments.forEach(assignment => {
      attendanceService.saveShiftAssignment({
        ...assignment,
        status: 'DRAFT'
      });
    });
    
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert(`Saved ${assignments.length} shift(s) as draft!`);
  };

  // Update employee week offs
  const updateEmployeeWeekOffs = (employeeId: string, primary: string, secondary: string) => {
    const days: number[] = [];
    if (primary) days.push(parseInt(primary));
    if (secondary && secondary !== primary) days.push(parseInt(secondary));
    
    attendanceService.saveEmployeeWeekOff({
      employeeId,
      weekOffs: days
    });
    
    setEmployeeWeekOffsData(prev => ({
      ...prev,
      [employeeId]: { primary, secondary }
    }));
    
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert('Employee week offs updated successfully!');
  };

  // Handle week off dropdown change
  const handleWeekOffChange = (employeeId: string, field: 'primary' | 'secondary', value: string) => {
    setEmployeeWeekOffsData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  // Handle "Apply to All" configuration change
  const handleApplyToAllChange = (field: 'primary' | 'secondary', value: string) => {
    setApplyToAllConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply week offs to all employees
  const handleApplyToAll = () => {
    const primary = applyToAllConfig.primary;
    const secondary = applyToAllConfig.secondary;
    
    if (!primary) {
      alert('Please select at least a primary day off');
      return;
    }

    const days: number[] = [];
    if (primary) days.push(parseInt(primary));
    if (secondary && secondary !== primary) days.push(parseInt(secondary));

    MOCK_EMPLOYEES.forEach(emp => {
      attendanceService.saveEmployeeWeekOff({
        employeeId: emp.id,
        weekOffs: days
      });
    });

    const updatedWeekOffsData: Record<string, { primary: string; secondary: string }> = {};
    MOCK_EMPLOYEES.forEach(emp => {
      updatedWeekOffsData[emp.id] = { primary, secondary };
    });
    
    setEmployeeWeekOffsData(updatedWeekOffsData);
    window.dispatchEvent(new Event('attendance-config-updated'));
    alert(`Week off configuration applied to all ${MOCK_EMPLOYEES.length} employees successfully!`);
  };

  // Reset all employee week offs
  const handleResetAllWeekOffs = () => {
    if (window.confirm('Are you sure you want to reset week offs for all employees? This will remove all existing week off configurations.')) {
      MOCK_EMPLOYEES.forEach(emp => {
        attendanceService.saveEmployeeWeekOff({
          employeeId: emp.id,
          weekOffs: []
        });
      });

      const resetWeekOffsData: Record<string, { primary: string; secondary: string }> = {};
      MOCK_EMPLOYEES.forEach(emp => {
        resetWeekOffsData[emp.id] = { primary: '', secondary: '' };
      });
      
      setEmployeeWeekOffsData(resetWeekOffsData);
      setApplyToAllConfig({ primary: '', secondary: '' });
      window.dispatchEvent(new Event('attendance-config-updated'));
      alert('All employee week offs have been reset successfully!');
    }
  };

  // Filter shift assignments for table
  const filteredShiftAssignments = useMemo(() => {
    let assignments = attendanceService.getShiftAssignments();
    
    if (shiftTableFilters.empId) {
      assignments = assignments.filter(a => a.employeeId.toLowerCase().includes(shiftTableFilters.empId.toLowerCase()));
    }
    
    if (shiftTableFilters.empName) {
      assignments = assignments.filter(a => {
        const employee = MOCK_EMPLOYEES.find(emp => emp.id === a.employeeId);
        return employee?.name.toLowerCase().includes(shiftTableFilters.empName.toLowerCase());
      });
    }
    
    if (shiftTableFilters.dept) {
      assignments = assignments.filter(a => {
        const employee = MOCK_EMPLOYEES.find(emp => emp.id === a.employeeId);
        return employee?.department.toLowerCase().includes(shiftTableFilters.dept.toLowerCase());
      });
    }
    
    if (shiftTableFilters.shift) {
      assignments = assignments.filter(a => {
        const shift = SHIFTS.find(s => s.id === a.shiftId);
        const shiftName = shift ? shift.name : (a.shiftId === 'WEEK_OFF' ? 'Week Off' : '');
        return shiftName.toLowerCase().includes(shiftTableFilters.shift.toLowerCase());
      });
    }
    
    if (shiftTableFilters.date) {
      assignments = assignments.filter(a => a.date.includes(shiftTableFilters.date));
    }

    if (shiftTableFilters.location && shiftTableFilters.location !== 'All') {
      // Since mock data is mostly 'Office', we filter against it
      if (shiftTableFilters.location !== 'Office') {
        return [];
      }
    }
    
    return assignments.slice(0, 10); // Limit to 10 for better performance
  }, [shiftTableFilters]);

  // Get max date for report (today)
  const maxDate = new Date().toISOString().split('T')[0];
  
  // Get unique managers (placeholder)
  const uniqueManagers = useMemo(() => {
    return ['All', 'John Manager', 'Jane Supervisor', 'Mike Lead', 'Sarah Director'];
  }, []);

  const uniqueTeams = useMemo(() => {
    return ['All', 'Team A', 'Team B', 'Team C', 'Team D'];
  }, []);

  // Helper for Shift History range
  const shiftHistoryData = useMemo(() => {
    const data: any[] = [];
    
    let start, end;
    if (reportType === 'daily') {
      start = new Date(reportDate);
      end = new Date(reportDate);
    } else if (reportType === 'monthly') {
      const [year, month] = reportMonth.split('-').map(Number);
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    } else { // range
      start = new Date(reportFromDate);
      end = new Date(reportToDate);
    }

    const current = new Date(start);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      MOCK_EMPLOYEES.forEach(emp => {
        // Apply UI Filters
        if (reportDept !== 'All' && emp.department !== reportDept) return;
        if (reportLocation !== 'All' && reportLocation !== 'Office') return;
        if (reportTeam !== 'All' && reportTeam !== 'Team A') return;
        if (reportManager !== 'All' && reportManager !== 'John Manager') return;

        const shift = attendanceService.getEmployeeShift(emp.id, dStr);
        data.push({
          date: dStr,
          empId: emp.id,
          name: emp.name,
          shift: shift?.name || 'Week Off',
          timings: shift ? `${shift.startTime} - ${shift.endTime}` : 'N/A'
        });
      });
      current.setDate(current.getDate() + 1);
    }

    return data;
  }, [reportType, reportDate, reportMonth, reportFromDate, reportToDate, reportDept, reportLocation, reportTeam, reportManager]);

  const handleDownloadShiftHistory = () => {
    let csvContent = 'Date,Employee ID,Employee Name,Assigned Shift,Timings\n';
    shiftHistoryData.forEach(row => {
      csvContent += `"${row.date}","${row.empId}","${row.name}","${row.shift}","${row.timings}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_history_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendanceSummary = useMemo(() => {
    const present = generatedReport.filter(r => r.status === 'Present' || r.status === 'Half Day').length;
    const absent = generatedReport.filter(r => r.status === 'Absent').length;
    return { present, absent, total: generatedReport.length };
  }, [generatedReport]);

  const regSummary = useMemo(() => {
    const approved = regReportData.filter(r => r.status === 'APPROVED').length;
    const pending = regReportData.filter(r => r.status === 'PENDING').length;
    const rejected = regReportData.filter(r => r.status === 'REJECTED').length;
    return { approved, pending, rejected, total: regReportData.length };
  }, [regReportData]);

  const shiftChangeSummary = useMemo(() => {
    const approved = shiftChangeReportData.filter(r => r.status === 'APPROVED').length;
    const pending = shiftChangeReportData.filter(r => r.status === 'PENDING').length;
    const rejected = shiftChangeReportData.filter(r => r.status === 'REJECTED').length;
    return { approved, pending, rejected, total: shiftChangeReportData.length };
  }, [shiftChangeReportData]);

  const shiftHistorySummary = useMemo(() => {
    const assigned = shiftHistoryData.filter(r => r.shift !== 'Week Off').length;
    const weekOff = shiftHistoryData.filter(r => r.shift === 'Week Off').length;
    return { assigned, weekOff, total: shiftHistoryData.length };
  }, [shiftHistoryData]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div className="border-b border-[#9BA4B4] px-1 space-y-2 sm:space-y-0">
        <div className="sm:hidden">
          <select
            aria-label="Select admin section"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as HrMainTabId)}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
          >
            {HR_MAIN_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex flex-wrap gap-2">
          {HR_MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-10 lg:gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB] space-y-4 lg:col-span-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-[#14274E] font-black text-xs uppercase tracking-[0.3em]">Workforce Status</h3>
                  <p className="text-[10px] font-semibold text-[#6B7280]">Today · {todayStr}</p>
                </div>
                <span className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.35em]">Live</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workforceCards.map(card => (
                  <div key={card.label} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] shadow-sm">
                    <div>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.3em]">{card.label}</p>
                      <p className={`text-xl font-black mt-1 ${card.valueColor}`}>{card.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
                      <i className={`fas ${card.icon} text-sm ${card.iconColor}`}></i>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB] lg:col-span-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-[#14274E] font-black text-xs uppercase tracking-[0.3em]">Identity Registry</h3>
                  <p className="text-[10px] font-semibold text-[#6B7280]">Presence overview</p>
                </div>
                <span className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.35em]">{employeeStatusList.length} Employees</span>
              </div>
              <div className="mt-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar divide-y divide-[#EEF2FF]">
                {employeeStatusList.length === 0 && (
                  <div className="py-5 text-center text-[11px] font-semibold text-[#9BA4B4]">No employee records available.</div>
                )}
                {employeeStatusList.map(emp => (
                  <div key={emp.id} className="py-2.5 px-2 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] rounded-xl transition-colors">
                    <div>
                      <p className="text-sm font-bold text-[#14274E]">{emp.name}</p>
                      <p className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-[0.35em]">{emp.id}</p>
                    </div>
                    <span className={`text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-[0.25em] border ${emp.isPresentToday ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {emp.isPresentToday ? 'Online' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-bold text-[#14274E] tracking-tight border-b border-[#9BA4B4] pb-2">
                Employee Attendance Overview
             </h3>
             <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                 <div className="flex items-center space-x-3">
                   <h3 className="text-sm font-bold text-[#14274E] tracking-tight">Employee Attendance Details</h3>
                   <div className="text-[10px] font-bold text-[#394867] bg-[#F1F6F9] px-2 py-1 rounded-lg border border-[#9BA4B4]">
                     {employeeAttendanceData.length} records
                   </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                   <div className="flex items-center space-x-1.5">
                     <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest">Start Date:</label>
                     <input 
                       type="date" 
                       value={empStartDate}
                       onChange={(e) => setEmpStartDate(e.target.value)}
                       className="px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                     />
                   </div>
                   <div className="flex items-center space-x-1.5">
                     <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest">End Date:</label>
                     <input 
                       type="date" 
                       value={empEndDate}
                       onChange={(e) => setEmpEndDate(e.target.value)}
                       className="px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                     />
                   </div>
                   <div className="flex items-center space-x-2">
                     <button 
                       onClick={() => window.dispatchEvent(new Event('attendance-config-updated'))}
                       className="bg-[#14274E] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors"
                     >
                       Filter
                     </button>
                     <button
                       onClick={() => {
                         // Export to CSV logic
                         let csvContent = 'Date,Employee ID,Employee Name,Department,Manager,Shift,Location,Login Time,Logout Time,Late Arrival,Early Going,Total Hours,Status\n';
                         employeeAttendanceData.forEach(row => {
                           const values = [
                             row.date,
                             row.id,
                             row.name,
                             row.department,
                             row.managerName,
                             row.shift,
                             row.location,
                             row.loginTime,
                             row.logoutTime,
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
                         link.setAttribute('download', `employee_attendance_${new Date().toISOString().split('T')[0]}.csv`);
                         link.style.visibility = 'hidden';
                         document.body.appendChild(link);
                         link.click();
                         document.body.removeChild(link);
                       }}
                       className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center"
                     >
                       <i className="fas fa-download mr-1"></i>
                       Export to CSV
                     </button>
                   </div>
                 </div>
               </div>
               
               {/* Filters */}
               <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
                 <div>
                   <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                     Search Employee
                   </label>
                   <input
                     type="text"
                     placeholder="Search by name or ID..."
                     value={empSearch}
                     onChange={(e) => setEmpSearch(e.target.value)}
                     className="w-full px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                     Department
                   </label>
                   <select
                     value={empDept}
                     onChange={(e) => setEmpDept(e.target.value)}
                     className="w-full px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                   >
                     {uniqueDepts.map(dept => (
                       <option key={dept} value={dept}>{dept}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                     Location
                   </label>
                   <select
                     value={empLocationFilter}
                     onChange={(e) => setEmpLocationFilter(e.target.value)}
                     className="w-full px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                   >
                     {locations.map(loc => (
                       <option key={loc} value={loc}>{loc}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                     Shift
                   </label>
                   <select
                     value={empShiftFilter}
                     onChange={(e) => setEmpShiftFilter(e.target.value)}
                     className="w-full px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                   >
                     {uniqueShifts.map(shift => (
                       <option key={shift} value={shift}>{shift}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                     Manager
                   </label>
                   <select
                     value={empManagerFilter}
                     onChange={(e) => setEmpManagerFilter(e.target.value)}
                     className="w-full px-2.5 py-1 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]"
                   >
                     {uniqueManagers.map(manager => (
                       <option key={manager} value={manager}>{manager}</option>
                     ))}
                   </select>
                 </div>
               </div>
             </div>

             <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4] overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                   <thead className="table-head-responsive">
                     <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Date</div>
                           <input
                             type="text"
                             placeholder="Filter..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, date: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Emp ID</div>
                           <input
                             type="text"
                             placeholder="Filter ID..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, empId: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Name</div>
                           <input
                             type="text"
                             placeholder="Filter name..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, empName: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Department</div>
                           <input
                             type="text"
                             placeholder="Filter dept..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, dept: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Manager</div>
                           <input
                             type="text"
                             placeholder="Filter manager..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, manager: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Shift</div>
                           <input
                             type="text"
                             placeholder="Filter shift..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, shift: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Location</div>
                           <input
                             type="text"
                             placeholder="Filter location..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, location: e.target.value}))}
                           />
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Logged In</div>
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Logged Out</div>
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Late Arrival</div>
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Early Going</div>
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Total Hours</div>
                         </div>
                       </th>
                       <th className="py-1.5 px-3 border-b border-[#9BA4B4]">
                         <div className="space-y-1">
                           <div>Status</div>
                           <input
                             type="text"
                             placeholder="Filter status..."
                             className="w-full px-1 py-0.5 text-xs bg-white/50 border border-[#9BA4B4] rounded text-[#14274E]"
                             onChange={(e) => setEmployeeTableFilters(prev => ({...prev, status: e.target.value}))}
                           />
                         </div>
                       </th>
                     </tr>
                   </thead>

                   <tbody className="divide-y divide-[#9BA4B4]">
                     {employeeAttendanceData.map((emp, index) => (
                       <tr key={`${emp.id}-${index}`} className="text-xs hover:bg-[#D6E4F0]/20 transition-colors">
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold text-[#14274E]">
                           {emp.date}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono text-xs text-[#394867] font-bold uppercase">
                           {emp.id}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-bold text-[#14274E]">
                           {emp.name}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-[#394867]">
                           {emp.department}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-[#394867]">
                           {emp.managerName}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                           <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                             {emp.shift}
                           </span>
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-[#394867] font-semibold">
                           {emp.location}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">
                           <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${emp.loginTime !== '-' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                             {emp.loginTime}
                           </span>
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">
                           <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${emp.logoutTime !== '-' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                             {emp.logoutTime}
                           </span>
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">
                           {emp.lateArrival !== '-' && parseInt(emp.lateArrival) > 0 ? (
                             <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                               {emp.lateArrival} min
                             </span>
                           ) : (
                             <span className="text-[#394867] text-[10px] font-medium">On Time</span>
                           )}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">
                           {emp.earlyGoing !== '-' && parseInt(emp.earlyGoing) > 0 ? (
                             <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                               {emp.earlyGoing} min
                             </span>
                           ) : (
                             <span className="text-[#394867] text-[10px] font-medium">On Time</span>
                           )}
                         </td>
                         <td className="py-1.5 px-3 border-r border-[#9BA4B4] text-center">
                           <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${emp.totalHours !== '-' ? 'bg-[#14274E] text-white' : 'bg-slate-100 text-slate-500'}`}>
                             {emp.totalHours !== '-' ? `${emp.totalHours} hrs` : '-'}
                           </span>
                         </td>
                         <td className="py-1.5 px-3 text-center">
                           <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                             emp.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                             emp.status === 'Absent' ? 'bg-red-50 text-red-700' :
                             emp.status === 'Holiday' ? 'bg-amber-50 text-amber-700' :
                             emp.status === 'Week Off' ? 'bg-blue-50 text-blue-700' :
                             'bg-purple-50 text-purple-700'
                           }`}>
                             {emp.status}
                           </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[#14274E] tracking-tight">Unified Pending Requests</h3>
              <div className="flex space-x-2">
                <span className="px-2 py-1 rounded-lg bg-[#F1F6F9] text-[10px] font-bold text-[#394867] border border-[#9BA4B4]">
                  Total Pending: {combinedPendingRequests.length}
                </span>
              </div>
            </div>
            
            {combinedPendingRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                  <thead className="table-head-responsive">
                    <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                      <th className="py-2 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                      <th className="py-2 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                      <th className="py-2 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Type</span></th>
                      <th className="py-2 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                      <th className="py-2 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Details</span></th>
                      <th className="py-2 px-3 border-b border-[#9BA4B4] text-center"><span className="table-head-label">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedPendingRequests.map((req) => {
                      const employee = MOCK_EMPLOYEES.find(e => e.id === req.employeeId);
                      let typeLabel = '';
                      let typeColor = '';
                      let details = '';
                      
                      switch(req.category) {
                        case 'REGULARIZATION':
                          typeLabel = 'Regularization';
                          typeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                          details = `${req.type} (${req.requestedLoginTime || ''}-${req.requestedLogoutTime || ''})`;
                          break;
                        case 'SHIFT_SWAP':
                          typeLabel = 'Shift Swap';
                          typeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                          details = `Swap to ${SHIFTS.find(s => s.id === req.requestedShiftId)?.name || req.requestedShiftId}`;
                          break;
                        case 'OVERTIME':
                          typeLabel = 'Overtime';
                          typeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                          details = `${req.hours} hours`;
                          break;
                        case 'PERMISSION':
                          typeLabel = 'Permission';
                          typeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          details = `${req.startTime} - ${req.endTime}`;
                          break;
                      }

                      return (
                        <tr key={req.id} className="text-xs hover:bg-[#F1F6F9] transition-colors border-b border-[#F1F6F9]">
                          <td className="py-2 px-3 border-r border-[#F1F6F9] font-mono">{req.employeeId}</td>
                          <td className="py-2 px-3 border-r border-[#F1F6F9] font-bold text-[#14274E]">{employee?.name}</td>
                          <td className="py-2 px-3 border-r border-[#F1F6F9]">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-[#F1F6F9]">{req.date}</td>
                          <td className="py-2 px-3 border-r border-[#F1F6F9] max-w-xs truncate">{details}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex justify-center space-x-1.5">
                              <button
                                onClick={() => handleRequestAction(req, 'APPROVE')}
                                className="w-7 h-7 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center shadow-sm"
                                title="Approve"
                              >
                                <i className="fas fa-check text-[10px]"></i>
                              </button>
                              <button
                                onClick={() => handleRequestAction(req, 'REJECT')}
                                className="w-7 h-7 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center shadow-sm"
                                title="Reject"
                              >
                                <i className="fas fa-times text-[10px]"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-[#F1F6F9] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#9BA4B4]">
                  <i className="fas fa-clipboard-check text-2xl text-[#9BA4B4] NY"></i>
                </div>
                <p className="text-sm font-bold text-[#14274E]">No pending requests</p>
                <p className="text-xs text-[#394867] mt-1">All employee applications have been processed.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'behalf' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="border-b border-[#9BA4B4] px-1 space-y-2 sm:space-y-0">
            <div className="sm:hidden">
              <select
                aria-label="Select admin request type"
                value={activeBehalfTab}
                onChange={(e) => setActiveBehalfTab(e.target.value as HrBehalfTabId)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
              >
                {HR_BEHALF_TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex space-x-4 overflow-x-auto">
              {HR_BEHALF_TABS.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setActiveBehalfTab(subTab.id)}
                  className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeBehalfTab === subTab.id ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6]'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {activeBehalfTab === 'regularization' && (
              <div className="max-w-4xl mx-auto">
                <AdminRegularization />
              </div>
            )}

            {activeBehalfTab === 'shifts' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="border-2 border-[#9BA4B4] rounded-lg p-4 hover:border-[#14274E] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-[#14274E] tracking-tight">Manual Shift Assignment</h4>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setShowShiftAssignmentModal(true)}
                              className="bg-[#14274E] text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors flex items-center"
                            >
                              <i className="fas fa-users-gear mr-1.5"></i>
                              Assign Shifts
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {SHIFTS.slice(0, 6).map(shift => (
                            <div key={shift.id} className="bg-[#F1F6F9] p-2 rounded-lg border border-[#9BA4B4]">
                              <div className="text-center">
                                <div className="font-bold text-sm text-[#14274E]">{shift.name}</div>
                                <div className="text-[10px] text-[#394867]">{shift.startTime}-{shift.endTime}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => setShowShiftAssignmentModal(true)}
                          className="w-full bg-[#14274E] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors flex items-center justify-center"
                        >
                          <i className="fas fa-calendar-alt mr-1.5"></i>
                          Open Shift Assignment Panel
                        </button>
                      </div>
                      <div className="bg-[#F1F6F9] rounded-lg p-4 border border-[#9BA4B4]">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-bold text-[#14274E]">Shift Distribution</h5>
                        </div>
                        <div className="h-64">
                          <canvas ref={pieChartRef}></canvas>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-[#9BA4B4] rounded-lg p-6 text-center hover:border-[#14274E] transition-colors">
                        <i className="fas fa-file-csv text-3xl text-[#9BA4B4] mb-3"></i>
                        <h4 className="text-sm font-bold text-[#14274E] mb-1">Upload Shift Roster</h4>
                        <div className="space-y-3">
                          <button 
                            onClick={handleDownloadSampleCSV}
                            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center"
                          >
                            <i className="fas fa-download mr-1.5"></i>
                            Download Sample CSV
                          </button>
                          <div className="relative">
                            <input 
                              type="file" 
                              accept=".csv"
                              className="hidden"
                              id="csvUpload"
                              onChange={handleCSVUpload}
                            />
                            <label 
                              htmlFor="csvUpload"
                              className="inline-block w-full bg-[#14274E] text-white px-4 py-3 rounded-lg text-xs font-bold hover:bg-[#394867] transition-colors cursor-pointer"
                            >
                              <i className="fas fa-upload mr-1.5"></i>
                              Choose CSV File to Upload
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                  <h3 className="text-sm font-bold text-[#14274E] tracking-tight mb-3">Current Shift Assignments</h3>
                  <div className="overflow-x-auto">
                    <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                      <thead className="table-head-responsive">
                        <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                          <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                          <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                          <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                          <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Shift</span></th>
                          <th className="py-1.5 px-3 border-b border-btn"><span className="table-head-label">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShiftAssignments.map(assignment => {
                          const employee = MOCK_EMPLOYEES.find(emp => emp.id === assignment.employeeId);
                          const shift = SHIFTS.find(s => s.id === assignment.shiftId);
                          return (
                            <tr key={assignment.id} className="hover:bg-[#F1F6F9]">
                              <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-mono text-xs">{assignment.employeeId}</td>
                              <td className="py-1.5 px-3 border-r border-[#9BA4B4] font-semibold text-sm">{employee?.name}</td>
                              <td className="py-1.5 px-3 border-r border-[#9BA4B4]">{assignment.date}</td>
                              <td className="py-1.5 px-3 border-r border-[#9BA4B4]">
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  {assignment.shiftId === 'WEEK_OFF' ? 'Week Off' : shift?.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-3">
                                <button 
                                  onClick={() => {
                                    const assignments = attendanceService.getShiftAssignments();
                                    const filtered = assignments.filter(a => a.id !== assignment.id);
                                    localStorage.setItem('secur_corp_shift_assignments', JSON.stringify(filtered));
                                    window.dispatchEvent(new Event('attendance-config-updated'));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <i className="fas fa-trash text-xs"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeBehalfTab === 'overtime' && (
              <div className="max-w-4xl mx-auto">
                <AdminOvertime />
              </div>
            )}

            {activeBehalfTab === 'permission' && (
              <div className="max-w-4xl mx-auto">
                <AdminPermission />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="border-b border-[#9BA4B4] px-1 space-y-2 sm:space-y-0">
            <div className="sm:hidden">
              <select
                aria-label="Select admin report type"
                value={activeReportSubTab}
                onChange={(e) => setActiveReportSubTab(e.target.value as HrReportTabId)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
              >
                {HR_REPORT_TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex space-x-4 overflow-x-auto">
              {HR_REPORT_TABS.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setActiveReportSubTab(subTab.id)}
                  className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeReportSubTab === subTab.id ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6]'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {activeReportSubTab === 'attendance' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-[#14274E] tracking-tight">Generate Attendance Report</h4>
                    <button 
                      onClick={handleDownloadReport}
                      disabled={generatedReport.length === 0}
                      className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <i className="fas fa-download mr-1"></i>
                      Download CSV
                    </button>
                  </div>
                  
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
                            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                        
                        {reportType === 'range' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">From</label>
                              <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">To</label>
                              <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} max={maxDate} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                          </>
                        )}

                        {reportType === 'monthly' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Month</label>
                            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Department</label>
                          <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Location</label>
                          <select value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Team</label>
                          <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Manager</label>
                          <select value={reportManager} onChange={(e) => setReportManager(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center shadow-lg"
                      >
                        {isGeneratingReport ? (
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
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-[#394867]">Total Records:</span>
                            <span className="text-xs font-bold text-[#14274E]">{generatedReport.length}</span>
                          </div>
                          {generatedReport.length > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-xs text-emerald-700">Present:</span>
                                <span className="text-xs font-bold text-emerald-700">{attendanceSummary.present}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-red-700">Absent:</span>
                                <span className="text-xs font-bold text-red-700">{attendanceSummary.absent}</span>
                              </div>
                            </>
                          )}
                          <div className="pt-1.5 border-t border-[#9BA4B4]">
                            <button
                              onClick={handleDownloadReport}
                              disabled={generatedReport.length === 0}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center disabled:opacity-50"
                            >
                              <i className="fas fa-download mr-1"></i>
                              Download CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {generatedReport.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                         <thead className="table-head-responsive">
                          <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Employee Id</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Employee Name</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Department</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Location</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Login</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Logout</span></th>
                            <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">{reportType === 'daily' ? 'Total Hours' : 'Total Days'}</span></th>
                          </tr>
                         </thead>
                         <tbody>
                            {generatedReport.map((row, index) => (
                              <tr key={index} className="text-xs hover:bg-[#F1F6F9] transition-colors">
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-[#394867] font-mono">{index + 1}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-mono">{row.employeeId}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-bold text-[#14274E]">{row.employeeName}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-[#394867]">{row.department}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-[#394867]">{row.location || 'Office'}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{reportType === 'daily' ? row.date : row.period}</td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9]">
                                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.loginTime === 'Absent' ? 'text-red-600' : 'text-emerald-700'}`}>
                                     {reportType === 'daily' ? row.loginTime : 'Aggregated'}
                                   </span>
                                 </td>
                                 <td className="py-1.5 px-3 border-r border-[#F1F6F9]">
                                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.logoutTime === 'Absent' ? 'text-red-600' : 'text-blue-700'}`}>
                                     {reportType === 'daily' ? row.logoutTime : 'Aggregated'}
                                   </span>
                                 </td>
                                 <td className="py-1.5 px-3 font-bold text-[#394867]">{reportType === 'daily' ? row.totalHours : row.totalPresent}</td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeReportSubTab === 'misPunch' && <MisPunchReport />}

            {activeReportSubTab === 'regularization' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-[#14274E] tracking-tight">Regularization Report</h3>
                    <button 
                      onClick={handleDownloadRegReport}
                      disabled={regReportData.length === 0}
                      className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <i className="fas fa-download mr-1"></i>
                      Download CSV
                    </button>
                  </div>
                  
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
                            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                        
                        {reportType === 'range' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">From</label>
                              <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">To</label>
                              <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                          </>
                        )}

                        {reportType === 'monthly' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Month</label>
                            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Department</label>
                          <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Location</label>
                          <select value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Team</label>
                          <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Manager</label>
                          <select value={reportManager} onChange={(e) => setReportManager(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleGenerateRegReport}
                        disabled={isGeneratingRegReport}
                        className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center shadow-lg"
                      >
                        {isGeneratingRegReport ? (
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
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-[#394867]">Total Requests:</span>
                            <span className="text-xs font-bold text-[#14274E]">{regReportData.length}</span>
                          </div>
                          {regReportData.length > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-xs text-emerald-700">Approved:</span>
                                <span className="text-xs font-bold text-emerald-700">{regSummary.approved}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-amber-700">Pending:</span>
                                <span className="text-xs font-bold text-amber-700">{regSummary.pending}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-red-700">Rejected:</span>
                                <span className="text-xs font-bold text-red-700">{regSummary.rejected}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Regularization Table */}
                  {hasGeneratedRegReport && (
                    <div className="overflow-x-auto">
                      <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                        <thead className="table-head-responsive">
                          <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.No</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Name</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Type</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Req In</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Req Out</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                            <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {regReportData.length > 0 ? regReportData.map((row, i) => (
                            <tr key={i} className="text-xs border-t border-[#F1F6F9] hover:bg-[#F1F6F9]">
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-center font-mono">{row.sno}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-mono">{row.employeeId}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-bold">{row.employeeName}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.date}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-semibold">{row.type.replace('_', ' ')}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.loginTime}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.logoutTime}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.appliedDate}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-bold">{row.appliedBy}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">{row.approvedDate}</td>
                              <td className="py-1.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : row.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={11} className="py-10 text-center text-xs text-gray-400 font-bold italic">
                                No regularization records found for the selected criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeReportSubTab === 'shift' && (
              <div className="space-y-4">
                 <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                    <h3 className="text-sm font-bold text-[#14274E] tracking-tight mb-3">Worked Shift History</h3>
                    
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
                                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                              </div>
                          )}
                          
                          {reportType === 'range' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">From</label>
                                  <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">To</label>
                                  <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                                </div>
                              </>
                          )}

                          {reportType === 'monthly' && (
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Month</label>
                                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                              </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Department</label>
                            <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Location</label>
                            <select value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Team</label>
                          <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Manager</label>
                          <select value={reportManager} onChange={(e) => setReportManager(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={handleDownloadShiftHistory}
                          className="w-full bg-[#14274E] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#394867] transition-all flex items-center justify-center shadow-md"
                        >
                          <i className="fas fa-chart-bar mr-1"></i>
                          View Shift List
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-[#F1F6F9] p-3 rounded-lg border border-[#9BA4B4]">
                        <h4 className="text-sm font-bold text-[#14274E] mb-1.5">Report Summary</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-[#394867]">Total Entries:</span>
                            <span className="text-xs font-bold text-[#14274E]">{shiftHistoryData.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-blue-700">Work Shifts:</span>
                            <span className="text-xs font-bold text-blue-700">{shiftHistorySummary.assigned}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-700">Week Offs:</span>
                            <span className="text-xs font-bold text-slate-700">{shiftHistorySummary.weekOff}</span>
                          </div>
                          <div className="pt-1.5 border-t border-[#9BA4B4]">
                            <button
                              onClick={handleDownloadShiftHistory}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center"
                            >
                              <i className="fas fa-download mr-1"></i>
                              Download CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg">
                       <thead className="bg-[#D6E4F0] text-[#14274E] text-[10px] font-bold uppercase table-head-responsive">
                          <tr>
                            <th className="p-2 border-r border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                            <th className="p-2 border-r border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                            <th className="p-2 border-r border-[#9BA4B4]"><span className="table-head-label">Employee</span></th>
                            <th className="p-2 border-r border-[#9BA4B4]"><span className="table-head-label">Assigned Shift</span></th>
                            <th className="p-2"><span className="table-head-label">Actual Timing</span></th>
                          </tr>
                       </thead>
                       <tbody>
                          {shiftHistoryData.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-[#F1F6F9] transition-colors">
                               <td className="p-2 text-xs border-r border-[#9BA4B4]">{row.date}</td>
                               <td className="p-2 text-xs font-mono border-r border-[#9BA4B4]">{row.empId}</td>
                               <td className="p-2 text-xs font-bold border-r border-[#9BA4B4]">{row.name}</td>
                               <td className="p-2 text-xs border-r border-[#9BA4B4]">
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.shift === 'Week Off' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                                   {row.shift}
                                 </span>
                               </td>
                               <td className="p-2 text-xs">{row.timings}</td>
                            </tr>
                          ))}
                          {shiftHistoryData.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-xs text-[#9BA4B4] font-bold">No shift data found for this range</td></tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeReportSubTab === 'shiftChange' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4]">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-[#14274E] tracking-tight">Shift Change Request Report</h3>
                    <button 
                      onClick={handleDownloadShiftChangeReport}
                      disabled={shiftChangeReportData.length === 0}
                      className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <i className="fas fa-download mr-1"></i>
                      Download CSV
                    </button>
                  </div>
                  
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
                            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                        
                        {reportType === 'range' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">From</label>
                              <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">To</label>
                              <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                            </div>
                          </>
                        )}

                        {reportType === 'monthly' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Select Month</label>
                            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Department</label>
                          <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Location</label>
                          <select value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Team</label>
                          <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">Manager</label>
                          <select value={reportManager} onChange={(e) => setReportManager(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs font-semibold text-[#14274E]">
                            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleGenerateShiftChangeReport}
                        disabled={isGeneratingShiftChangeReport}
                        className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center shadow-lg"
                      >
                        {isGeneratingShiftChangeReport ? (
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
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-[#394867]">Total Requests:</span>
                            <span className="text-xs font-bold text-[#14274E]">{shiftChangeReportData.length}</span>
                          </div>
                          {shiftChangeReportData.length > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-xs text-emerald-700">Approved:</span>
                                <span className="text-xs font-bold text-emerald-700">{shiftChangeSummary.approved}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-amber-700">Pending:</span>
                                <span className="text-xs font-bold text-amber-700">{shiftChangeSummary.pending}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-red-700">Rejected:</span>
                                <span className="text-xs font-bold text-red-700">{shiftChangeSummary.rejected}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasGeneratedShiftChangeReport && (
                    <div className="overflow-x-auto">
                      <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg overflow-hidden">
                        <thead className="table-head-responsive">
                          <tr className="text-[10px] font-bold uppercase text-[#14274E] tracking-widest bg-[#D6E4F0]">
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">S.no</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Date</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Emp ID</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Current Shift</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Requested Shift</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied Date</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Applied By</span></th>
                            <th className="py-1.5 px-3 border-r border-b border-[#9BA4B4]"><span className="table-head-label">Approved Date</span></th>
                            <th className="py-1.5 px-3 border-b border-[#9BA4B4]"><span className="table-head-label">Status</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftChangeReportData.length > 0 ? shiftChangeReportData.map((row, index) => (
                            <tr key={index} className="text-xs border-t border-[#F1F6F9] hover:bg-[#F1F6F9]">
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] text-center font-mono">{row.sno}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-semibold">{row.date}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9] font-mono">{row.employeeId}</td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {SHIFTS.find(s => s.id === row.currentShiftId)?.name || row.currentShiftId}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 border-r border-[#F1F6F9]">
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                  {SHIFTS.find(s => s.id === row.requestedShiftId)?.name || row.requestedShiftId}
                                </span>
                              </td>
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
                              <td colSpan={9} className="py-10 text-center text-xs text-gray-400 font-bold italic">
                                No shift change records found for the selected criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeReportSubTab === 'overtime' && <OvertimeReport />}

            {activeReportSubTab === 'permission' && <PermissionHoursReport />}
          </div>
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BA4B4] overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-[#F1F6F9] pb-4">
            <h3 className="text-sm font-bold text-[#14274E] tracking-tight">Enterprise Holiday Matrix</h3>
            <div className="flex items-center space-x-3">
              <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest whitespace-nowrap">Target Country:</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedState('All States');
                }}
                className="min-w-[150px] px-4 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs font-bold text-[#14274E] outline-none focus:ring-1 focus:ring-[#14274E] appearance-none cursor-pointer"
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <h4 className="text-[10px] font-bold text-[#394867] mb-4 uppercase tracking-[0.2em]">
            Schedule for: <span className="text-[#14274E]">{selectedCountry}</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="app-table w-full text-left border border-[#9BA4B4] rounded-lg border-collapse">
              <thead className="table-head-responsive">
                <tr className="bg-[#D6E4F0] text-[#14274E] text-[10px] font-bold uppercase tracking-widest text-center">
                  <th className="py-2 px-3 border border-[#9BA4B4]" rowSpan={2}><span className="table-head-label">S.No.</span></th>
                  <th className="py-2 px-3 border border-[#9BA4B4]" rowSpan={2}><span className="table-head-label">State</span></th>
                  {uniqueHolidays.map((h, i) => (
                    <th key={`name-${i}`} className="py-2 px-3 border border-[#9BA4B4]">
                      <span className="table-head-label">{h.name}</span>
                    </th>
                  ))}
                  {uniqueHolidays.length === 0 && (
                    <th className="py-2 px-3 border border-[#9BA4B4]"><span className="table-head-label">No Declared Holidays</span></th>
                  )}
                </tr>
                <tr className="bg-[#D6E4F0] text-[#14274E] text-[10px] font-bold uppercase tracking-widest text-center">
                  {uniqueHolidays.map((h, i) => (
                    <th key={`date-${i}`} className="py-2 px-3 border border-[#9BA4B4]">
                      <span className="table-head-label">{h.date}</span>
                    </th>
                  ))}
                  {uniqueHolidays.length === 0 && (
                    <th className="py-2 px-3 border border-[#9BA4B4]"><span className="table-head-label">-</span></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {matrixStates.map((state, index) => (
                  <tr key={state} className="hover:bg-[#F1F6F9] transition-colors h-10">
                    <td className="py-1.5 px-3 border border-[#9BA4B4] text-center text-xs font-bold text-[#394867]">{index + 1}</td>
                    <td className="py-1.5 px-4 border border-[#9BA4B4] text-xs font-semibold text-[#14274E]">{state}</td>
                    {uniqueHolidays.map((h, i) => (
                      <td key={`${state}-${i}`} className="py-1.5 px-3 border border-[#9BA4B4] text-center">
                        <input 
                          type="checkbox" 
                          checked={countryHolidays.some(ch => ch.state === state && ch.name === h.name && ch.date === h.date)}
                          onChange={() => handleToggleMatrixHoliday(state, h.name, h.date)}
                          className="w-4 h-4 rounded border-[#9BA4B4] text-[#14274E] focus:ring-[#14274E] cursor-pointer"
                        />
                      </td>
                    ))}
                    {uniqueHolidays.length === 0 && (
                      <td className="py-1.5 px-3 border border-[#9BA4B4] text-center text-[10px] text-gray-400 italic">
                        Configure holidays in Settings to populate matrix columns
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Settings Sub-Tabs */}
          <div className="border-b border-[#9BA4B4] px-1 space-y-2 sm:space-y-0">
            <div className="sm:hidden">
              <select
                aria-label="Select settings section"
                value={activeSettingsSubTab}
                onChange={(e) => setActiveSettingsSubTab(e.target.value as HrSettingsTabId)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#14274E] bg-white focus:outline-none focus:ring-2 focus:ring-[#14274E]/20"
              >
                {HR_SETTINGS_TABS.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex space-x-4 overflow-x-auto">
              {HR_SETTINGS_TABS.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSettingsSubTab(sub.id)}
                  className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeSettingsSubTab === sub.id ? 'text-[#14274E] border-[#14274E]' : 'text-[#394867] border-transparent hover:text-[#5C7BA6]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {activeSettingsSubTab === 'governance' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl p-8 shadow-sm border border-[#9BA4B4]">
                  <h3 className="text-sm font-bold text-[#14274E] mb-6 flex items-center tracking-tight">
                    Corporate Governance
                  </h3>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest ml-1">Jurisdiction</label>
                        <select
                          className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs font-bold focus:ring-1 focus:ring-[#14274E] outline-none appearance-none cursor-pointer text-[#14274E]"
                          value={selectedCountry}
                          onChange={e => { setSelectedCountry(e.target.value); setSelectedState('All States'); }}
                        >
                          {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#394867] uppercase tracking-widest ml-1">Scope</label>
                        <select
                          className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs font-bold focus:ring-1 focus:ring-[#14274E] outline-none disabled:opacity-30 appearance-none cursor-pointer text-[#14274E]"
                          value={selectedState}
                          onChange={e => setSelectedState(e.target.value)}
                          disabled={selectedCountry === "All Countries"}
                        >
                          {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleAutoPopulateHolidays}
                      disabled={selectedState === "All States"}
                      className="w-full py-3 bg-[#14274E] text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-[#394867] transition-all disabled:opacity-30 shadow border border-[#14274E]"
                    >
                      Sync Enterprise Calendar
                    </button>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#9BA4B4]"></div></div>
                      <div className="relative flex justify-center"><span className="bg-white px-2.5 text-[10px] font-bold text-[#394867] uppercase tracking-widest">Declared Holiday</span></div>
                    </div>

                    <form onSubmit={handleAddHoliday} className="space-y-4">
                      <input type="text" placeholder="Holiday Name" className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs font-bold outline-none text-[#14274E] placeholder-[#394867]/50" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                      <input type="date" className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs font-bold outline-none text-[#14274E]" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                      <button className="w-full bg-white border border-[#14274E] text-[#14274E] font-bold py-3 rounded-xl hover:bg-[#D6E4F0] transition-all text-[10px] uppercase tracking-[0.15em]">Add Holiday Node</button>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 border-t border-[#F1F6F9] pt-6">
                      <h4 className="text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-4">Calendar Nodes</h4>
                      {holidays.map(h => (
                        <div key={h.id} className="flex justify-between items-center p-3 bg-[#F1F6F9] rounded-lg border border-[#9BA4B4] hover:bg-white transition-colors group">
                          <div>
                            <p className="text-xs font-bold text-[#14274E]">{h.name}</p>
                            <p className="text-[9px] text-[#394867] font-bold uppercase tracking-widest mt-0.5 opacity-70">{h.date} • {h.state}</p>
                          </div>
                          <button onClick={() => { adminService.removeHoliday(h.id); window.dispatchEvent(new Event('attendance-config-updated')); }} className="text-[#394867] hover:text-[#14274E] p-2 transition-colors">
                            <i className="fas fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsSubTab === 'weekoff' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-xl p-8 shadow-sm border border-[#9BA4B4]">
                  <h3 className="text-sm font-bold text-[#14274E] mb-6 tracking-tight">Interval Parameters</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                      <button
                        key={day}
                        onClick={() => toggleWeekOff(i)}
                        className={`flex justify-between items-center px-4 py-3 rounded-lg border transition-all ${weekOffs.includes(i) ? 'bg-[#D6E4F0] border-[#14274E] text-[#14274E] shadow-inner' : 'bg-white border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9]'
                          }`}
                      >
                        <span className="font-bold text-[10px] uppercase tracking-[0.15em]">{day}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${weekOffs.includes(i) ? 'bg-[#14274E] text-white' : 'bg-[#9BA4B4] text-[#F1F6F9]'
                          }`}>
                          <i className={`fas ${weekOffs.includes(i) ? 'fa-check' : 'fa-minus'} text-[7px]`}></i>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 bg-[#F1F6F9] p-4 rounded-xl border border-[#9BA4B4]">
                    <p className="text-[10px] leading-relaxed text-[#394867] font-bold uppercase tracking-wider text-center">
                      System marks <span className="text-[#14274E]">Off-Duty</span> for designated weekly intervals.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-8 shadow-sm border border-[#9BA4B4]">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-bold text-[#14274E] tracking-tight">Employee Week Off Configuration</h4>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={weekOffSearch}
                        onChange={(e) => setWeekOffSearch(e.target.value)}
                        className="pl-8 pr-4 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-xs text-[#14274E] w-48"
                      />
                      <i className="fas fa-search absolute left-3 top-2.5 text-xs text-[#394867]"></i>
                    </div>
                  </div>
                  
                  <div className="bg-[#F1F6F9] rounded-xl p-6 mb-8 border border-[#9BA4B4]">
                    <h5 className="text-xs font-bold text-[#14274E] mb-4 flex items-center">
                      <i className="fas fa-users mr-2"></i>
                      Apply to All Employees
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">
                          Primary Day Off
                        </label>
                        <select
                          value={applyToAllConfig.primary}
                          onChange={(e) => handleApplyToAllChange('primary', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-lg text-xs text-[#14274E]"
                        >
                          <option value="">Select Day</option>
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1.5">
                          Secondary Day Off
                        </label>
                        <select
                          value={applyToAllConfig.secondary}
                          onChange={(e) => handleApplyToAllChange('secondary', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#9BA4B4] rounded-lg text-xs text-[#14274E]"
                        >
                          <option value="">Select Day (Optional)</option>
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] text-[#394867] font-semibold">
                        Impacts {MOCK_EMPLOYEES.length} employees
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleApplyToAll}
                          disabled={!applyToAllConfig.primary}
                          className="bg-[#14274E] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#394867] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                        >
                          Apply to All
                        </button>
                        <button
                          onClick={handleResetAllWeekOffs}
                          className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors uppercase tracking-widest"
                        >
                          Reset All
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    <h5 className="text-xs font-bold text-[#14274E] flex items-center mb-4">
                      <i className="fas fa-user-edit mr-2"></i>
                      Individual Employee Configuration
                    </h5>
                    
                    {filteredWeekOffEmployees.map(emp => {
                      const employeeWeekOffs = attendanceService.getEmployeeWeekOffDays(emp.id);
                      const weekOffData = employeeWeekOffsData[emp.id] || { primary: '', secondary: '' };

                      return (
                        <div key={emp.id} className="p-4 bg-white rounded-xl border border-[#9BA4B4] hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-sm font-bold text-[#14274E]">{emp.name}</p>
                              <div className="flex space-x-3 mt-0.5">
                                <p className="text-[10px] text-[#394867] font-bold uppercase tracking-widest">{emp.id}</p>
                                <span className="text-[10px] text-[#394867] font-medium">• {emp.department}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black text-[#9BA4B4] uppercase tracking-widest block mb-1">Current Off-Days</span>
                              <span className="text-[10px] font-bold text-[#14274E]">
                                {employeeWeekOffs.map(d => 
                                  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
                                ).join(', ') || 'None'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                            <div>
                              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                                Primary
                              </label>
                              <select
                                value={weekOffData.primary}
                                onChange={(e) => handleWeekOffChange(emp.id, 'primary', e.target.value)}
                                className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs text-[#14274E]"
                              >
                                <option value="">Select Day</option>
                                <option value="0">Sunday</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-[9px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                                Secondary
                              </label>
                              <select
                                value={weekOffData.secondary}
                                onChange={(e) => handleWeekOffChange(emp.id, 'secondary', e.target.value)}
                                className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-xs text-[#14274E]"
                              >
                                <option value="">Select Day</option>
                                <option value="0">Sunday</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                              </select>
                            </div>
                            
                            <button
                              onClick={() => updateEmployeeWeekOffs(emp.id, weekOffData.primary, weekOffData.secondary)}
                              className="bg-[#14274E] text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-[#394867] transition-all uppercase tracking-widest"
                            >
                              Update Schedule
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeSettingsSubTab === 'locking' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl p-8 shadow-sm border border-[#9BA4B4]">
                  <h3 className="text-sm font-bold text-[#14274E] mb-6 flex items-center tracking-tight">
                     <i className="fas fa-lock mr-2"></i> Attendance Locking
                  </h3>
                  <p className="text-xs text-[#394867] mb-6 font-medium leading-relaxed">
                      Secure a range of dates to manage regularization availability. Once locked, standard employees cannot request adjustments for those nodes.
                  </p>
                  
                  <div className="space-y-6 mb-10 bg-[#F1F6F9] p-8 rounded-2xl border border-[#9BA4B4]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest ml-1">From Date</label>
                          <input 
                            type="date" 
                            value={lockFromDate} 
                            onChange={(e) => setLockFromDate(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-[#9BA4B4] rounded-xl text-sm font-bold text-[#14274E]"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest ml-1">To Date</label>
                          <input 
                            type="date" 
                            value={lockToDate} 
                            onChange={(e) => setLockToDate(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-[#9BA4B4] rounded-xl text-sm font-bold text-[#14274E]"
                          />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button 
                         onClick={handleRangeLock}
                         disabled={!lockFromDate || !lockToDate}
                         className="bg-[#14274E] text-white px-6 py-4 rounded-xl text-[10px] font-bold hover:bg-[#394867] transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg"
                       >
                         Lock Node Range
                       </button>
                       <button 
                         onClick={handleRangeUnlock}
                         disabled={!lockFromDate || !lockToDate}
                         className="bg-white border border-[#14274E] text-[#14274E] px-6 py-4 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all disabled:opacity-50 uppercase tracking-widest"
                       >
                         Unlock Node Range
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto border-t border-[#F1F6F9] pt-8">
                     <h4 className="text-[10px] font-bold uppercase text-[#394867] tracking-[0.2em] mb-4">Locked Dates Ledger</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {lockedDates.length > 0 ? [...lockedDates].sort((a, b) => b.localeCompare(a)).map(d => (
                           <div key={d} className="flex justify-between items-center bg-rose-50 p-3 rounded-xl border border-rose-200 group">
                              <span className="text-xs font-bold text-rose-700">{d}</span>
                              <button onClick={() => handleToggleLock(d)} className="text-rose-500 hover:text-rose-700 p-1.5 transition-colors" title="Unlock Date">
                                 <i className="fas fa-unlock text-xs"></i>
                              </button>
                           </div>
                        )) : (
                           <div className="col-span-full py-10 text-center">
                              <i className="fas fa-shield-slash text-2xl text-gray-300 mb-2"></i>
                              <p className="text-[10px] text-gray-400 italic font-bold uppercase tracking-widest">No locked dates currently</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Assignment Modal */}
      <ShiftAssignmentModal
        isOpen={showShiftAssignmentModal}
        onClose={() => setShowShiftAssignmentModal(false)}
        onSave={handleSaveShiftAssignments}
        onSaveDraft={handleSaveShiftAssignmentsDraft}
      />
    </div>
  );
};

export default HRDashboard;
