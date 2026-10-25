import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  Users,
  Scissors,
  Package,
  FileText,
  Clock,
  DollarSign,
  UserCheck,
  Award,
  BarChart3,
  Settings,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  lowStockCount?: number;
  revisitCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  lowStockCount = 0,
  revisitCount = 0,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'pos', label: 'Billing / POS', icon: Receipt },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'services', label: 'Services Catalogue', icon: Scissors },
    {
      id: 'inventory',
      label: 'Products & Stock',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'invoices', label: 'Invoices & Receipts', icon: FileText },
    {
      id: 'retention',
      label: 'Retention & WhatsApp',
      icon: Clock,
      badge: revisitCount > 0 ? revisitCount : undefined,
    },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'staff', label: 'Staff & Attendance', icon: UserCheck },
    { id: 'packages', label: 'Packages & Loyalty', icon: Award },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Salon Settings', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-2">
        <p className="text-[11px] font-semibold text-[#8C7A87] uppercase tracking-wider">
          Salon Management
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-[#2E0A28] text-[#FAF8F5] shadow-sm'
                  : 'text-[#4A3845] hover:bg-[#F3EEE6] hover:text-[#2E0A28]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#DFB76C]' : 'text-[#6F5B6A]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-[#DFB76C] text-[#2E0A28]'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer subtle brand badge */}
      <div className="px-4 pt-3 border-t border-[#E8DEC8] text-[11px] text-[#8C7A87]">
        <p className="font-serif-luxury text-xs text-[#2E0A28] font-semibold">Gild & Glow ERP</p>
        <p>Retention & Salon Suite</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print hidden md:block w-64 bg-[#FAF8F5] border-r border-[#E8DEC8] shrink-0 min-h-[calc(100vh-4.5rem)] sticky top-18 self-start">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-full bg-[#FAF8F5] shadow-2xl h-full border-r border-[#E8DEC8]">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
