import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, Phone, Mail, Clock, Calendar, Check, X, Award } from 'lucide-react';
import { api } from '../services/api.ts';
import { Staff, StaffAttendance, SalonSettings } from '../types/salon.ts';

interface StaffViewProps {
  salon: SalonSettings | null;
}

export const StaffView: React.FC<StaffViewProps> = ({ salon }) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [loading, setLoading] = useState(true);

  // New Staff Modal
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('Senior Stylist');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCommission, setFormCommission] = useState(5.0);
  const [formHours, setFormHours] = useState('09:30 - 20:30');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await api.getStaff();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const data = await api.getAttendance(selectedDate);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, selectedDate]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName || !formTitle) {
      setFormError('Name and job title are required.');
      return;
    }
    setIsSubmitting(true);

    try {
      await api.createStaff({
        name: formName,
        job_title: formTitle,
        phone: formPhone || null,
        email: formEmail || null,
        commission_percent: Number(formCommission),
        working_hours: formHours,
      });
      setShowModal(false);
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAttendance = async (staffId: string, status: 'present' | 'absent' | 'half_day' | 'leave') => {
    try {
      await api.recordAttendance({
        staff_id: staffId,
        date: selectedDate,
        status,
        check_in_time: status === 'present' ? '09:30 AM' : null,
      });
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Staff & Specialists
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Manage salon professionals, commission settings and daily attendance registers.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="inline-flex p-1 bg-[#FAF8F5] border border-[#E8DEC8] rounded-xl">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'directory'
                  ? 'bg-[#2E0A28] text-[#FAF8F5]'
                  : 'text-[#6F5B6A] hover:text-[#2E0A28]'
              }`}
            >
              Directory ({staffList.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-[#2E0A28] text-[#FAF8F5]'
                  : 'text-[#6F5B6A] hover:text-[#2E0A28]'
              }`}
            >
              Daily Attendance
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4 text-[#2E0A28]" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Directory Tab */}
      {activeTab === 'directory' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.length === 0 ? (
            <div className="col-span-full p-12 text-center text-[#8C7A87] bg-white rounded-2xl border border-[#E8DEC8]">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
              <p className="text-sm font-semibold text-[#4A3845]">No staff members added yet</p>
              <p className="text-xs mt-1">
                Add hairstylists, beauticians, therapists and nail technicians to attribute service commissions.
              </p>
            </div>
          ) : (
            staffList.map((stf) => (
              <div
                key={stf.id}
                className="p-5 rounded-2xl border border-[#E8DEC8] bg-white shadow-xs hover:border-[#C59A45] transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2E0A28] text-[#DFB76C] font-bold flex items-center justify-center text-sm border border-[#C59A45]/30">
                      {stf.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">
                        {stf.name}
                      </h4>
                      <p className="text-xs text-[#8C6826] font-semibold">{stf.job_title}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                    {stf.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E8DEC8] space-y-1 text-xs text-[#6F5B6A]">
                  {stf.phone && <p className="font-mono text-[11px]">{stf.phone}</p>}
                  {stf.email && <p className="text-[11px] truncate">{stf.email}</p>}
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span>Commission Rate:</span>
                    <span className="font-bold text-[#2E0A28]">{stf.commission_percent}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Shift Hours:</span>
                    <span>{stf.working_hours}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Attendance Tab */
        <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-[#8C6826]" />
            <span className="text-xs font-semibold text-[#2E0A28]">Attendance Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#D8CCC4] text-xs font-semibold text-[#2E0A28]"
            />
          </div>

          <div className="divide-y divide-[#E8DEC8]">
            {staffList.map((stf) => {
              const record = attendance.find((a) => a.staff_id === stf.id);
              const currentStatus = record?.status || 'unmarked';

              return (
                <div key={stf.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-[#2E0A28]">{stf.name}</p>
                    <p className="text-[10px] text-[#6F5B6A]">{stf.job_title}</p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {(['present', 'half_day', 'absent', 'leave'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleMarkAttendance(stf.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize border transition-all ${
                          currentStatus === s
                            ? s === 'present'
                              ? 'bg-emerald-800 text-white border-emerald-900'
                              : s === 'half_day'
                              ? 'bg-amber-700 text-white border-amber-800'
                              : 'bg-rose-700 text-white border-rose-800'
                            : 'bg-[#FAF8F5] text-[#4A3845] border-[#D8CCC4] hover:bg-white'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                Add Salon Specialist
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Job Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Stylist, Senior Esthetician, Nail Artist"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formCommission}
                    onChange={(e) => setFormCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Shift / Working Hours</label>
                <input
                  type="text"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
