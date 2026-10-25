import React, { useState, useEffect } from 'react';
import { api, clearStoredToken } from './services/api.ts';
import { Owner, SalonSettings, Invoice, Appointment } from './types/salon.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { SetupWizard } from './components/SetupWizard.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { POSBillingView } from './components/POSBillingView.tsx';
import { InvoiceDetailModal } from './components/InvoiceDetailModal.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { ServicesView } from './components/ServicesView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { AppointmentsView } from './components/AppointmentsView.tsx';
import { RetentionView } from './components/RetentionView.tsx';
import { ExpensesView } from './components/ExpensesView.tsx';
import { StaffView } from './components/StaffView.tsx';
import { PackagesView } from './components/PackagesView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [salon, setSalon] = useState<SalonSettings | null>(null);

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active Invoice Modal for viewing / printing
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Prefilled appointment for checkout in POS
  const [prefilledAppointment, setPrefilledAppointment] = useState<Appointment | null>(null);

  // Dashboard badge counters
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [revisitCount, setRevisitCount] = useState<number>(0);

  const checkAuthStatus = async () => {
    try {
      const status = await api.getAuthStatus();
      setIsSystemInitialized(status.initialized);
      setIsAuthenticated(status.authenticated);
      if (status.owner) setOwner(status.owner);
      if (status.salon) setSalon(status.salon);

      if (status.authenticated) {
        // Fetch background metrics for navigation badges
        api.getDashboard('today').then((d) => {
          setLowStockCount(d.metrics.lowStockCount || 0);
          setRevisitCount((d.metrics.overdueRevisits || 0) + (d.metrics.dueTodayRevisits || 0));
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to query auth status:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    clearStoredToken();
    setIsAuthenticated(false);
    setOwner(null);
  };

  const handleOpenQuickPOS = () => {
    setPrefilledAppointment(null);
    setActiveTab('pos');
  };

  const handleOpenQuickAppointment = () => {
    setActiveTab('appointments');
  };

  const handleConvertToBill = (appointment: Appointment) => {
    setPrefilledAppointment(appointment);
    setActiveTab('pos');
  };

  const handleViewInvoiceById = async (invoiceId: string) => {
    try {
      const inv = await api.getInvoice(invoiceId);
      setActiveInvoice(inv);
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice');
    }
  };

  // Loading Screen
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#2E0A28] border-t-[#DFB76C] rounded-full animate-spin" />
        <p className="font-serif-luxury text-xl font-bold text-[#2E0A28]">Gild & Glow</p>
        <p className="text-xs text-[#6F5B6A]">Loading Salon ERP Suite...</p>
      </div>
    );
  }

  // Initial First-Time Setup Wizard if no owner exists
  if (!isSystemInitialized) {
    return (
      <SetupWizard
        onSetupSuccess={(newOwner, newSalon) => {
          setIsSystemInitialized(true);
          setIsAuthenticated(true);
          setOwner(newOwner);
          setSalon(newSalon);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Login Modal if not logged in
  if (!isAuthenticated) {
    return (
      <LoginModal
        onLoginSuccess={(loggedOwner, loggedSalon) => {
          setIsAuthenticated(true);
          setOwner(loggedOwner);
          setSalon(loggedSalon);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col text-[#2E0A28]">
      {/* Top Navigation Bar */}
      <Navbar
        owner={owner}
        salon={salon}
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenQuickPOS={handleOpenQuickPOS}
        onOpenQuickAppointment={handleOpenQuickAppointment}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'pos') setPrefilledAppointment(null);
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          lowStockCount={lowStockCount}
          revisitCount={revisitCount}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              salon={salon}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenPOS={handleOpenQuickPOS}
              onOpenAppointment={handleOpenQuickAppointment}
              onViewInvoice={handleViewInvoiceById}
            />
          )}

          {activeTab === 'pos' && (
            <POSBillingView
              salon={salon}
              prefilledAppointment={prefilledAppointment}
              onInvoiceCreated={(invoice) => {
                setActiveInvoice(invoice);
                // Refresh badges
                api.getDashboard('today').then((d) => {
                  setLowStockCount(d.metrics.lowStockCount || 0);
                  setRevisitCount((d.metrics.overdueRevisits || 0) + (d.metrics.dueTodayRevisits || 0));
                }).catch(() => {});
              }}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              salon={salon}
              onConvertToBill={handleConvertToBill}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              salon={salon}
              onViewInvoice={handleViewInvoiceById}
            />
          )}

          {activeTab === 'services' && (
            <ServicesView salon={salon} />
          )}

          {activeTab === 'inventory' && (
            <InventoryView salon={salon} />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              salon={salon}
              onViewInvoice={handleViewInvoiceById}
            />
          )}

          {activeTab === 'retention' && (
            <RetentionView salon={salon} />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView salon={salon} />
          )}

          {activeTab === 'staff' && (
            <StaffView salon={salon} />
          )}

          {activeTab === 'packages' && (
            <PackagesView salon={salon} />
          )}

          {activeTab === 'reports' && (
            <ReportsView salon={salon} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              salon={salon}
              onSettingsUpdated={(updated) => setSalon(updated)}
            />
          )}
        </main>
      </div>

      {/* Luxury Printable Invoice Modal */}
      {activeInvoice && (
        <InvoiceDetailModal
          invoice={activeInvoice}
          salon={salon}
          onClose={() => setActiveInvoice(null)}
          onPaymentSettled={() => {
            if (activeInvoice) {
              handleViewInvoiceById(activeInvoice.id);
            }
          }}
        />
      )}
    </div>
  );
}
