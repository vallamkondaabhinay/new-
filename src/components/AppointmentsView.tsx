import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  User,
  Scissors,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowRight,
  Receipt,
  X,
  Search,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Appointment, Customer, Service, Staff, SalonSettings } from '../types/salon.ts';

interface AppointmentsViewProps {
  salon: SalonSettings | null;
  onConvertToBill: (appointment: Appointment) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({ salon, onConvertToBill }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // New Appointment Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('11:00');
  const [formDuration, setFormDuration] = useState(45);
  const [formAdvance, setFormAdvance] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({
        date: selectedDate || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    const loadPrereqs = async () => {
      try {
        const [c, s, stf] = await Promise.all([
          api.getCustomers(),
          api.getServices(),
          api.getStaff(),
        ]);
        setCustomers(c);
        setServices(s.filter((srv) => srv.is_active));
        setStaffList(stf.filter((m) => m.status === 'active'));
      } catch (err) {
        console.error('Failed to load appointment prereqs:', err);
      }
    };
    loadPrereqs();
  }, []);

  const openNewAppointmentModal = () => {
    setSelectedCustomerId(customers.length > 0 ? customers[0].id : '');
    setSelectedStaffId(staffList.length > 0 ? staffList[0].id : '');
    setSelectedServiceIds(services.length > 0 ? [services[0].id] : []);
    setFormDate(selectedDate);
    setFormTime('11:00');
    setFormDuration(45);
    setFormAdvance(0);
    setFormNotes('');
    setFormError(null);
    setShowModal(true);
  };

  const toggleServiceSelection = (srvId: string) => {
    if (selectedServiceIds.includes(srvId)) {
      if (selectedServiceIds.length > 1) {
        const filtered = selectedServiceIds.filter((id) => id !== srvId);
        setSelectedServiceIds(filtered);
        recalcDurationAndPrice(filtered);
      }
    } else {
      const next = [...selectedServiceIds, srvId];
      setSelectedServiceIds(next);
      recalcDurationAndPrice(next);
    }
  };

  const recalcDurationAndPrice = (srvIds: string[]) => {
    let dur = 0;
    srvIds.forEach((id) => {
      const match = services.find((s) => s.id === id);
      if (match) dur += match.duration_mins;
    });
    setFormDuration(Math.max(15, dur));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const totalEst = selectedServiceIds.reduce((sum, id) => {
      const s = services.find((item) => item.id === id);
      return sum + (s?.price || 0);
    }, 0);

    try {
      await api.createAppointment({
        customer_id: selectedCustomerId,
        staff_id: selectedStaffId || null,
        date: formDate,
        start_time: formTime,
        duration_mins: Number(formDuration),
        advance_paid: Number(formAdvance),
        notes: formNotes,
        service_ids: selectedServiceIds,
        total_estimated: totalEst,
      });
      setShowModal(false);
      fetchAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Appointment scheduling failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    try {
      await api.updateAppointmentStatus(id, nextStatus);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Appointment Schedule
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Real-time appointment diary with staff conflict checks and direct POS billing.
          </p>
        </div>

        <button
          onClick={openNewAppointmentModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#2E0A28]" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Date Picker & Status Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-[#8C6826]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#D8CCC4] text-xs font-semibold text-[#2E0A28] focus:ring-2 focus:ring-[#C59A45] outline-none"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-xs font-medium text-[#2E0A28] hover:bg-[#EAE2D5]"
          >
            Today
          </button>
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'booked', 'confirmed', 'checked_in', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize shrink-0 transition-all ${
                statusFilter === s
                  ? 'bg-[#2E0A28] text-[#FAF8F5]'
                  : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87] bg-white rounded-2xl border border-[#E8DEC8]">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No appointments for this selection</p>
            <p className="text-xs mt-1">Click &quot;Book Appointment&quot; to reserve a client slot.</p>
          </div>
        ) : (
          appointments.map((appt) => {
            const isCompleted = appt.status === 'completed';
            const isCancelled = appt.status === 'cancelled' || appt.status === 'no_show';

            return (
              <div
                key={appt.id}
                className="p-5 rounded-2xl border border-[#E8DEC8] bg-white shadow-xs hover:border-[#C59A45] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex flex-col items-center justify-center text-[#2E0A28] shrink-0">
                    <span className="text-xs font-bold font-mono">{appt.start_time}</span>
                    <span className="text-[10px] text-[#8C7A87]">{appt.duration_mins}m</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">
                        {appt.customer_name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          appt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status === 'checked_in'
                            ? 'bg-blue-100 text-blue-800'
                            : appt.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {appt.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-[#6F5B6A] mt-0.5 font-mono">{appt.customer_phone}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      {appt.staff_name && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#2E0A28] border border-[#E8DEC8]">
                          Staff: {appt.staff_name}
                        </span>
                      )}
                      {appt.total_estimated > 0 && (
                        <span className="font-semibold text-[#8C6826]">
                          Est. {currencySymbol}{appt.total_estimated.toLocaleString()}
                        </span>
                      )}
                      {appt.advance_paid > 0 && (
                        <span className="text-emerald-700 font-medium">
                          Advance Paid: {currencySymbol}{appt.advance_paid.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                  {appt.status === 'booked' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-xl border border-[#D8CCC4] bg-[#FAF8F5] text-xs font-semibold hover:bg-white text-[#2E0A28]"
                    >
                      Confirm
                    </button>
                  )}

                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'checked_in')}
                      className="px-3 py-1.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137]"
                    >
                      Check In
                    </button>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      onClick={() => onConvertToBill(appt)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs hover:brightness-105 flex items-center space-x-1 shadow-xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Bill / Checkout</span>
                    </button>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                      className="p-1.5 text-[#8C7A87] hover:text-rose-700"
                      title="Cancel Appointment"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                Book New Appointment
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

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Select Customer *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Services to Perform *</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-[#D8CCC4] rounded-xl bg-[#FAF8F5]">
                  {services.map((s) => {
                    const isSelected = selectedServiceIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleServiceSelection(s.id)}
                        className={`p-2 rounded-lg text-left border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#2E0A28] text-[#FAF8F5] border-[#2E0A28]'
                            : 'bg-white text-[#4A3845] border-[#D8CCC4]'
                        }`}
                      >
                        <p className="font-bold line-clamp-1">{s.name}</p>
                        <div className="flex justify-between text-[10px] mt-1 opacity-80">
                          <span>{s.duration_mins}m</span>
                          <span>{currencySymbol}{s.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Assign Staff</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
                  >
                    <option value="">Any Available Specialist</option>
                    {staffList.map((stf) => (
                      <option key={stf.id} value={stf.id}>
                        {stf.name} ({stf.job_title})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Advance Payment</label>
                  <input
                    type="number"
                    min="0"
                    value={formAdvance}
                    onChange={(e) => setFormAdvance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Special Notes / Request</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding guest makeup, requested Meera specifically"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
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
                  disabled={isSubmitting || !selectedCustomerId || selectedServiceIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
