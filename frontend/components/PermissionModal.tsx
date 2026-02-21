
import React, { useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import { generateId } from '../utils/id';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, onClose, employeeId }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !remarks.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (startTime >= endTime) {
      alert('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        id: generateId(),
        employeeId,
        date,
        startTime,
        endTime,
        reason: remarks,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString()
      };

      await attendanceService.submitPermissionRequestToApi(request);
      
      onClose();
      alert('Permission request submitted for HR approval.');
      window.dispatchEvent(new Event('attendance-config-updated'));
    } catch (err: any) {
      alert(`Permission request failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-[#14274E] tracking-tight">Request Permission Hours</h3>
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
              className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-xl text-sm font-semibold text-[#14274E]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-[0.2em] mb-2">
              Reason / Justification
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain the reason for short-duration absence..."
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

export default PermissionModal;
