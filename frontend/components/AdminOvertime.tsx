import React, { useState } from 'react';
import { attendanceService, MOCK_EMPLOYEES } from '../services/attendanceService';
import { generateId } from '../utils/id';

const AdminOvertime: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(1);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedDate || !reason.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        id: generateId(),
        employeeId: selectedEmployee,
        date: selectedDate,
        hours,
        reason,
        status: 'APPROVED' as const,
        submittedAt: new Date().toISOString()
      };

      const created = await attendanceService.submitOvertimeRequestToApi(request);
      await attendanceService.updateOvertimeRequestStatusToApi(created.id, 'APPROVED');
      
      setSelectedEmployee('');
      setReason('');
      alert('Overtime applied successfully for ' + selectedEmployee);
      window.dispatchEvent(new Event('attendance-config-updated'));
    } catch (err: any) {
      alert(`Overtime apply failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#9BA4B4]">
      <h3 className="text-lg font-bold text-[#14274E] mb-6 tracking-tight">Apply Overtime on Behalf</h3>
      
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
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
            Extra Hours
          </label>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
              <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
            Reason for Overtime
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for applying overtime on behalf of the employee..."
            className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E] h-32 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-4 rounded-2xl transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {isSubmitting ? 'Applying...' : 'Apply Overtime'}
        </button>
      </form>
    </div>
  );
};

export default AdminOvertime;