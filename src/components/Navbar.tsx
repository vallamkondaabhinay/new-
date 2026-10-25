import React from 'react';
import {
  Sparkles,
  Receipt,
  CalendarPlus,
  User,
  LogOut,
  Settings,
  Scissors,
  Menu,
  X,
} from 'lucide-react';
import { Owner, SalonSettings } from '../types/salon.ts';

interface NavbarProps {
  owner: Owner | null;
  salon: SalonSettings | null;
  onNavigate: (tab: string) => void;
  onOpenQuickPOS: () => void;
  onOpenQuickAppointment: () => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  owner,
  salon,
  onNavigate,
  onOpenQuickPOS,
  onOpenQuickAppointment,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  const businessTypes = salon?.business_types || ['Salon & Beauty Parlour'];
  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  return (
    <header className="no-print sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8DEC8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo & Salon Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-[#2E0A28] flex items-center justify-center text-[#DFB76C] shadow-md border border-[#C59A45]/40">
              <Sparkles className="w-5 h-5 text-[#DFB76C] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif-luxury text-2xl font-bold tracking-wide text-[#2E0A28]">
                  Gild & Glow
                </span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C59A45]/15 text-[#8C6826] font-semibold border border-[#C59A45]/30">
                  ERP
                </span>
              </div>
              <p className="text-xs text-[#6F5B6A] truncate max-w-[200px] sm:max-w-xs font-medium">
                {salon?.business_name || 'Salon & Beauty Parlour'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={onOpenQuickPOS}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-semibold text-sm shadow-sm hover:brightness-105 active:scale-95 transition-all"
            >
              <Receipt className="w-4 h-4 text-[#2E0A28]" />
              <span>New POS Bill</span>
            </button>

            <button
              onClick={onOpenQuickAppointment}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#2E0A28] text-[#FAF8F5] text-sm font-medium hover:bg-[#3E1137] active:scale-95 transition-all border border-[#501646]"
            >
              <CalendarPlus className="w-4 h-4 text-[#DFB76C]" />
              <span>Book Appointment</span>
            </button>

            {/* Owner Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#F0E8DC] transition-colors border border-transparent hover:border-[#E8DEC8]"
              >
                <div className="w-8 h-8 rounded-full bg-[#E8DEC8] text-[#2E0A28] font-bold text-xs flex items-center justify-center border border-[#C59A45]/30">
                  {owner?.name ? owner.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="text-left text-xs hidden lg:block">
                  <p className="font-semibold text-[#2E0A28] leading-tight truncate max-w-[100px]">{owner?.name || 'Owner'}</p>
                  <p className="text-[10px] text-[#6F5B6A]">Salon Owner</p>
                </div>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-[#E8DEC8] py-2 z-50 text-xs"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#F0E8DC]">
                    <p className="font-semibold text-[#2E0A28]">{owner?.name}</p>
                    <p className="text-[11px] text-[#6F5B6A] truncate">{owner?.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {businessTypes.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="text-[9px] bg-[#FAF8F5] text-[#2E0A28] px-1.5 py-0.5 rounded border border-[#E8DEC8]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full text-left px-4 py-2 hover:bg-[#FAF8F5] flex items-center space-x-2 text-[#2E0A28]"
                  >
                    <Settings className="w-4 h-4 text-[#6F5B6A]" />
                    <span>Salon Settings</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 flex items-center space-x-2 text-rose-700"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onOpenQuickPOS}
              className="p-2 rounded-lg bg-[#C59A45] text-[#2E0A28]"
              title="Quick POS"
            >
              <Receipt className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#2E0A28] hover:bg-[#F0E8DC]"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
