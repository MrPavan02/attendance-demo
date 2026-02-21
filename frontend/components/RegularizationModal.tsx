import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';
import { generateId } from '../utils/id';

interface RegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  defaultDate?: string; // Changed from fixed date to optional default
}

const RegularizationModal: React.FC<RegularizationModalProps> = ({ isOpen, onClose, employeeId, defaultDate }) => {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [regularizationType, setRegularizationType] = useState<'MISSED_CHECKIN' | 'MISSED_CHECKOUT' | 'FULL_DAY'>('MISSED_CHECKIN');
  const [remarks, setRemarks] = useState('');
  const [requestedLoginTime, setRequestedLoginTime] = useState('09:00');
  const [requestedLogoutTime, setRequestedLogoutTime] = useState('18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local date state when defaultDate prop changes
  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  const handleSubmit = async () => {
    if (!date) {
      alert('Please select a date');
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0,0,0,0);

    // 1. Future Date
    if (selectedDateObj > today) {
        alert("Cannot raise request for future dates.");
        return;
    }

    // 2. Past 7 Days Limit
    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 7);
    
    if (selectedDateObj < minDate) {
        alert("Regularization requests are only allowed for the past 7 days.");
        return;
    }

    // 3. Locked Date Check
    if (attendanceService.isDateLocked(date)) {
        alert("This date has been locked by HR. Cannot request regularization.");
        return;
    }

    setIsSubmitting(true);
    try {
      const regularizationRequest = {
        id: generateId(),
        employeeId,
        date,
        type: regularizationType,
        requestedLoginTime: regularizationType === 'MISSED_CHECKOUT' || regularizationType === 'FULL_DAY' ? requestedLoginTime : undefined,
        requestedLogoutTime: regularizationType === 'MISSED_CHECKIN' || regularizationType === 'FULL_DAY' ? requestedLogoutTime : undefined,
        reason: remarks,
        remarks: remarks,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString()
      };

      await attendanceService.submitRegularizationRequestToApi(regularizationRequest as any);
      
      onClose();
      alert('Regularization request submitted successfully!');
      window.dispatchEvent(new Event('attendance-config-updated'));
    } catch (err: any) {
      alert(`Regularization request failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-md w-full mx-4 shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#14274E]">Regularization Request</h3>
          <button onClick={onClose} className="text-[#394867] hover:text-[#14274E]">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
              Date
            </label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-sm font-semibold text-[#14274E]"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
              Regularization Type
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'MISSED_CHECKIN', label: 'Missed Check-in', icon: 'fa-sign-in-alt' },
                { value: 'MISSED_CHECKOUT', label: 'Missed Check-out', icon: 'fa-sign-out-alt' },
                { value: 'FULL_DAY', label: 'Full Day', icon: 'fa-calendar-day' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setRegularizationType(type.value as any)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${regularizationType === type.value ? 'bg-[#14274E] text-white' : 'bg-[#F1F6F9] text-[#394867] hover:bg-[#D6E4F0]'}`}
                >
                  <i className={`fas ${type.icon} mb-1`}></i>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {(regularizationType === 'MISSED_CHECKOUT' || regularizationType === 'FULL_DAY') && (
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                Requested Login Time
              </label>
              <input
                type="time"
                value={requestedLoginTime}
                onChange={(e) => setRequestedLoginTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-sm font-semibold text-[#14274E]"
              />
            </div>
          )}
          
          {(regularizationType === 'MISSED_CHECKIN' || regularizationType === 'FULL_DAY') && (
            <div>
              <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
                Requested Logout Time
              </label>
              <input
                type="time"
                value={requestedLogoutTime}
                onChange={(e) => setRequestedLogoutTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-sm font-semibold text-[#14274E]"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-[#394867] uppercase tracking-widest mb-1">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for regularization..."
              className="w-full px-3 py-2 bg-[#F1F6F9] border border-[#9BA4B4] rounded-lg text-sm font-semibold text-[#14274E] min-h-[80px]"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#9BA4B4] text-[#394867] hover:bg-[#F1F6F9] font-bold rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#14274E] hover:bg-[#394867] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegularizationModal;