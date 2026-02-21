
import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';
import { SHIFTS } from '../constants';
import { generateId } from '../utils/id';

interface ShiftChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

const ShiftChangeModal: React.FC<ShiftChangeModalProps> = ({ isOpen, onClose, employeeId }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [currentShift, setCurrentShift] = useState('');
  const [requestedShift, setRequestedShift] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedDate && isOpen) {
      const shift = attendanceService.getEmployeeShift(employeeId, selectedDate);
      setCurrentShift(shift?.id || '');
    }
  }, [selectedDate, employeeId, isOpen]);

  // Helper function to get shift number for display
  const getShiftNumber = (shiftId: string) => {
    if (!shiftId) return '';
    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return '';
    return shift.name.replace('Shift', '');
  };

  // Helper function to get shift timing display
  const getShiftTiming = (shiftId: string) => {
    if (!shiftId) return '';
    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return '';
    return `${shift.startTime} - ${shift.endTime}`;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    
    // selectedDate comes from the modal state
    if (selectedDate < today) {

      if (!selectedDate || !currentShift || !requestedShift || !reason.trim()) return;

        alert("Shift change requests can only be made for current or future dates.");
        return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        id: generateId(),
        employeeId,
        currentShiftId: currentShift,
        requestedShiftId: requestedShift,
        date: selectedDate,
        reason,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString(),
      };

      await attendanceService.submitShiftChangeRequestToApi(request);
      
      setSelectedDate('');
      setCurrentShift('');
      setRequestedShift('');
      setReason('');
      onClose();
      
      alert('Shift change request submitted successfully!');
      window.dispatchEvent(new Event('attendance-config-updated'));
    } catch (err: any) {
      alert(`Shift change request failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#14274E]/60 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-[#14274E] tracking-tight">Shift Change Request</h2>
            <button onClick={onClose} className="text-[#394867] hover:text-[#14274E]">
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                Select Date
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E] focus:ring-2 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none"
              />
            </div>

            {selectedDate && currentShift && (
              <div>
                <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                  Current Shift
                </label>
                <div className="px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E]">
                  <span className="font-bold">Shift {getShiftNumber(currentShift)}</span>
                  <span className="text-[#394867] text-xs ml-2">
                    ({getShiftTiming(currentShift)})
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                Requested Shift
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SHIFTS.filter(s => s.id !== currentShift).map(shift => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setRequestedShift(shift.id)}
                    className={`p-4 rounded-xl border transition-all ${requestedShift === shift.id ? 'bg-[#14274E] border-[#14274E] text-white' : 'bg-[#F1F6F9] border-[#9BA4B4] text-[#394867] hover:border-[#14274E]'}`}
                  >
                    <div className="text-center">
                      <div className="font-bold text-sm">Shift {getShiftNumber(shift.id)}</div>
                      <div className="text-xs mt-1">{getShiftTiming(shift.id)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-2">
                Reason for Change
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a valid reason for shift change..."
                className="w-full px-4 py-3 bg-[#F1F6F9] border border-[#9BA4B4] rounded-2xl text-sm font-semibold text-[#14274E] h-32 focus:ring-2 focus:ring-[#14274E]/10 focus:border-[#14274E] focus:outline-none resize-none"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold py-3 rounded-xl transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedDate || !requestedShift || !reason.trim()}
                className="flex-1 bg-[#14274E] hover:bg-[#394867] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-xs"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftChangeModal;
