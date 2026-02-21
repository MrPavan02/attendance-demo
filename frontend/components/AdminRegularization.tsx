import React, { useState } from 'react';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { SHIFTS } from '../constants';
// Added missing imports for Enums
import { WorkMode, VerificationMethod } from '../types';
import { generateId } from '../utils/id';

const AdminRegularization: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [type, setType] = useState<'LOGIN' | 'LOGOUT' | 'BOTH'>('LOGIN');
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [reason, setReason] = useState('');

  // Calculate constraints
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedDate || !reason.trim()) return;

    // [ADD VALIDATION LOGIC]
    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);
    const reqDate = new Date(selectedDate);
    reqDate.setHours(0,0,0,0);
    
    // 1. Future Check
    if (reqDate > todayObj) {
        alert("Regularization cannot be done for future dates.");
        return;
    }
    
    // 2. Check for dates older than 1 week
    const minDate = new Date(todayObj);
    minDate.setDate(todayObj.getDate() - 7); // Calculate 7 days ago

    if (reqDate < minDate) {
      alert("Regularization is only allowed for the current date and the past 7 days.");
      return;
    }

    // 3. Lock Check
    if (attendanceService.isDateLocked(selectedDate)) {
        alert("Attendance for this date is LOCKED. Regularization not allowed.");
        return;
    }

    // Create attendance entries for regularization
    const dateStr = selectedDate;
    
    if (type === 'LOGIN' || type === 'BOTH') {
      const loginEntry = {
        id: generateId(),
        employeeId: selectedEmployee,
        timestamp: `${dateStr}T${loginTime}:00.000Z`,
        type: 'IN' as const,
        // Fixed: Use WorkMode.OFFICE Enum
        mode: WorkMode.OFFICE,
        location: { latitude: 0, longitude: 0 },
        isFlagged: false,
        deviceId: 'Admin Regularization',
        // Fixed: Use VerificationMethod.PIN Enum
        verificationMethod: VerificationMethod.PIN,
        duration: 0
      };
      attendanceService.saveEntry(loginEntry);
    }
    
    if (type === 'LOGOUT' || type === 'BOTH') {
      const logoutEntry = {
        id: generateId(),
        employeeId: selectedEmployee,
        timestamp: `${dateStr}T${logoutTime}:00.000Z`,
        type: 'OUT' as const,
        // Fixed: Use WorkMode.OFFICE Enum
        mode: WorkMode.OFFICE,
        location: { latitude: 0, longitude: 0 },
        isFlagged: false,
        deviceId: 'Admin Regularization',
        // Fixed: Use VerificationMethod.PIN Enum
        verificationMethod: VerificationMethod.PIN,
        duration: 8 // Assuming 8 hours shift
      };
      attendanceService.saveEntry(logoutEntry);
    }

    alert('Attendance regularized successfully!');
    setSelectedEmployee('');
    setSelectedDate('');
    setLoginTime('');
    setLogoutTime('');
    setReason('');
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#9BA4B4]">
      <h3 className="text-lg font-bold text-[#14274E] mb-6 tracking-tight">Admin Regularization</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
              Select Employee
            </label>
            <select
              required
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
            >
              <option value="">Choose Employee</option>
              {MOCK_EMPLOYEES.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
              Date
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              min={lastWeek}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
            Regularization Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['LOGIN', 'LOGOUT', 'BOTH'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t as any)}
                className={`py-3 rounded-xl text-xs font-bold transition-all ${type === t ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(type === 'LOGIN' || type === 'BOTH') && (
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                Login Time
              </label>
              <input
                type="time"
                required={type === 'LOGIN' || type === 'BOTH'}
                value={loginTime}
                onChange={(e) => setLoginTime(e.target.value)}
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
              />
            </div>
          )}
          
          {(type === 'LOGOUT' || type === 'BOTH') && (
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                Logout Time
              </label>
              <input
                type="time"
                required={type === 'LOGOUT' || type === 'BOTH'}
                value={logoutTime}
                onChange={(e) => setLogoutTime(e.target.value)}
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
            Reason for Regularization
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for regularization..."
            className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E] h-32 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-4 rounded-2xl transition-colors text-xs uppercase tracking-widest"
        >
          Regularize Attendance
        </button>
      </form>
    </div>
  );
};

export default AdminRegularization;