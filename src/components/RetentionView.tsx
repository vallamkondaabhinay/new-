import React, { useState, useEffect } from 'react';
import {
  Clock,
  Cake,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Send,
  SendHorizontal,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { RevisitItem, SalonSettings } from '../types/salon.ts';

interface RetentionViewProps {
  salon: SalonSettings | null;
}

export const RetentionView: React.FC<RetentionViewProps> = ({ salon }) => {
  const [radar, setRadar] = useState<RevisitItem[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Message Composer Modal
  const [selectedRecipient, setSelectedRecipient] = useState<{
    customerId: string;
    customerName: string;
    phone: string;
    reason: string;
  } | null>(null);

  const [templateType, setTemplateType] = useState<'revisit' | 'birthday' | 'custom'>('revisit');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const data = await api.getRetentionRadar();
      setRadar(data.radar || []);
      setBirthdays(data.birthdays || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load retention radar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  const openComposer = (recipient: { customerId: string; customerName: string; phone: string; serviceName?: string; reason: string }, type: 'revisit' | 'birthday' | 'custom') => {
    setSelectedRecipient(recipient);
    setTemplateType(type);
    setSendResult(null);

    const salonName = salon?.business_name || 'Gild & Glow';

    if (type === 'revisit') {
      setMessageBody(
        `Dear ${recipient.customerName}, it has been a while since your last ${recipient.serviceName || 'treatment'} at ${salonName}! Your hair & skin deserve regular care. Would you like us to reserve a pampering slot for you this week? Reply or call us at ${salon?.phone || ''} to book.`
      );
    } else if (type === 'birthday') {
      setMessageBody(
        `Warmest Birthday Wishes from ${salonName}, dear ${recipient.customerName}! 🎂 May your special day glow with happiness. Enjoy an exclusive 15% birthday privilege on any service this month. We look forward to celebrating with you!`
      );
    } else {
      setMessageBody(`Hello ${recipient.customerName}, greeting from ${salonName}!`);
    }
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !messageBody) return;
    setIsSending(true);

    try {
      const res = await api.sendReminder({
        customer_id: selectedRecipient.customerId,
        type: templateType,
        message_body: messageBody,
      });
      setSendResult(res);
      fetchRadar();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
          Retention Suite & WhatsApp Recall Radar
        </h2>
        <p className="text-xs text-[#6F5B6A] mt-0.5">
          Gild & Glow automated revisit interval calculations, birthday privileges, and simulated WhatsApp marketing logs.
        </p>
      </div>

      {/* Honest Simulation Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8DEC8] flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-[#8C6826] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#2E0A28]">
            Transparent Sandbox / Simulation Mode
          </p>
          <p className="text-[#6F5B6A] leading-relaxed mt-0.5">
            Meta Cloud WhatsApp Business API credentials are not yet linked to this environment. All reminder actions are logged with status <strong className="text-[#2E0A28] font-mono">SIMULATED</strong> in your audit ledger. The system never claims fake external message delivery.
          </p>
        </div>
      </div>

      {/* Birthday Radar Row */}
      {birthdays.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-[#FAF8F5] border border-amber-200 space-y-3">
          <div className="flex items-center space-x-2">
            <Cake className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
              Upcoming Birthdays ({birthdays.length} this week)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {birthdays.map((b) => (
              <div
                key={b.customerId}
                className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs"
              >
                <div>
                  <p className="text-xs font-bold text-[#2E0A28]">{b.customerName}</p>
                  <p className="text-[11px] text-[#6F5B6A]">
                    {b.daysUntil === 0 ? 'Today! 🎂' : `In ${b.daysUntil} days (${b.birthday})`}
                  </p>
                </div>
                <button
                  onClick={() =>
                    openComposer(
                      {
                        customerId: b.customerId,
                        customerName: b.customerName,
                        phone: b.phone,
                        reason: 'Birthday Greeting',
                      },
                      'birthday'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#2E0A28] text-[#FAF8F5] text-xs font-medium hover:bg-[#3E1137]"
                >
                  Send Wish
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Revisit Radar Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8DEC8] flex items-center justify-between">
          <div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
              Client Revisit Radar
            </h3>
            <p className="text-xs text-[#6F5B6A]">
              Customers calculated for service recall based on completed invoices and treatment intervals.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E8DEC8] text-[#2E0A28]">
            {radar.length} tracked
          </span>
        </div>

        {radar.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <Clock className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No service revisit records yet</p>
            <p className="text-xs mt-1">
              Once you complete services for customers in the POS billing terminal, their recall dates appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Last Service Received</th>
                  <th className="px-6 py-3.5">Completed On</th>
                  <th className="px-6 py-3.5">Recall Interval</th>
                  <th className="px-6 py-3.5">Target Revisit Date</th>
                  <th className="px-6 py-3.5 text-center">Urgency Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {radar.map((item) => {
                  const isOverdue = item.status === 'overdue';
                  const isToday = item.status === 'due_today';
                  const isSoon = item.status === 'due_soon';

                  return (
                    <tr key={item.customerId} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#2E0A28]">
                        <p>{item.customerName}</p>
                        <span className="text-[10px] text-[#6F5B6A] font-mono">{item.phone}</span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-[#4A3845]">{item.serviceName}</td>
                      <td className="px-6 py-3.5 text-[#6F5B6A]">{item.completedDate}</td>
                      <td className="px-6 py-3.5 text-[#6F5B6A]">{item.intervalDays} days</td>
                      <td className="px-6 py-3.5 font-semibold text-[#2E0A28]">{item.targetDate}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : isToday
                              ? 'bg-amber-100 text-amber-800'
                              : isSoon
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOverdue
                            ? `${Math.abs(item.daysDifference)}d Overdue`
                            : isToday
                            ? 'Due Today'
                            : isSoon
                            ? `In ${item.daysDifference}d (Soon)`
                            : `In ${item.daysDifference}d`}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() =>
                            openComposer(
                              {
                                customerId: item.customerId,
                                customerName: item.customerName,
                                phone: item.phone,
                                serviceName: item.serviceName,
                                reason: 'Service Revisit Reminder',
                              },
                              'revisit'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#2E0A28] text-[#FAF8F5] text-[11px] font-semibold hover:bg-[#3E1137] inline-flex items-center space-x-1"
                        >
                          <SendHorizontal className="w-3 h-3 text-[#DFB76C]" />
                          <span>Recall Notice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reminder Logs Audit Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8DEC8]">
          <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
            Communication Logs & Audit Trail
          </h3>
          <p className="text-xs text-[#6F5B6A]">
            Real historical records of reminder dispatches and simulated messages.
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C7A87]">
            No communication logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Message Body</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-3 font-semibold text-[#2E0A28]">
                      {log.customer_name} ({log.customer_phone})
                    </td>
                    <td className="px-6 py-3 uppercase font-mono text-[10px] text-[#6F5B6A]">
                      {log.channel}
                    </td>
                    <td className="px-6 py-3 capitalize">{log.type}</td>
                    <td className="px-6 py-3 text-[#4A3845] max-w-xs truncate" title={log.message_body}>
                      {log.message_body}
                    </td>
                    <td className="px-6 py-3 text-[#6F5B6A]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Composer Modal */}
      {selectedRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                  Compose Retention Message
                </h3>
                <p className="text-xs text-[#6F5B6A]">
                  Recipient: <strong className="text-[#2E0A28]">{selectedRecipient.customerName}</strong> ({selectedRecipient.phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedRecipient(null)}
                className="text-[#8C7A87] hover:text-[#2E0A28]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sendResult && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-amber-700" />
                  <span>{sendResult.simulated ? 'Simulated Log Recorded' : 'Message Dispatched'}</span>
                </p>
                <p>{sendResult.message}</p>
              </div>
            )}

            <form onSubmit={handleSendReminder} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Message Content</label>
                <textarea
                  rows={5}
                  required
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none text-xs leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-[11px] text-[#6F5B6A]">
                Note: In simulation mode, this message is archived into the database audit trail without live WhatsApp carrier charges or spam triggers.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSending || !messageBody}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>{isSending ? 'Logging...' : 'Record Simulated Reminder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
