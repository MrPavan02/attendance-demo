
import React, { useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import { generateId } from '../utils/id';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

const OvertimeModal: React.FC<OvertimeModalProps> = ({ isOpen, onClose, employeeId }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !remarks.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        id: generateId(),
        employeeId,
        date,
        hours,
        reason: remarks,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString()
      };

      await attendanceService.submitOvertimeRequestToApi(request);
      
      onClose();
      alert('Overtime request submitted for HR approval.');
      window.dispatchEvent(new Event('attendance-config-updated'));
    } catch (err: any) {
      alert(`Overtime request failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-[#14274E] tracking-tight">Apply for Overtime</h3>
          <button onClick={onClose} className="text-[#394867] hover:text-[#14274E]">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
              Select Date
            </label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E]"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
              Extra Working Hours
            </label>
            <select
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E] appearance-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
              Reason / Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide justification for overtime work..."
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E] min-h-[100px] resize-none"
            />
          </div>
        </div>
        
        <div className="mt-8 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-4 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold rounded-2xl transition-all text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-4 bg-[#14274E] hover:bg-[#394867] text-white font-bold rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
          >
            {isSubmitting ? 'Processing...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeModal;
