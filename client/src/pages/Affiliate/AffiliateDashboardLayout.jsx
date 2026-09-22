import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  History,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../Components/store/authSlice";

const menuItems = [
  { to: "/affiliate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/affiliate/dashboard/players", label: "My Players", icon: Users },
  {
    to: "/affiliate/dashboard/qualified",
    label: "Qualified Players",
    icon: ShieldCheck,
  },
  {
    to: "/affiliate/dashboard/revenue",
    label: "Revenue History",
    icon: BarChart3,
  },
  {
    to: "/affiliate/dashboard/settlements",
    label: "Settlement History",
    icon: History,
  },
  { to: "/affiliate/dashboard/withdraw", label: "Withdraw", icon: Wallet },
  {
    to: "/affiliate/dashboard/referral-link",
    label: "Referral Link",
    icon: LinkIcon,
  },
  {
    to: "/affiliate/dashboard/marketing-tools",
    label: "Marketing Tools",
    icon: Megaphone,
  },
  { to: "/affiliate/dashboard/profile", label: "Profile", icon: CreditCard },
];

export default function AffiliateDashboardLayout() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sidebar = (
    <aside className="h-full w-72 border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <div className="text-lg font-bold text-primary">Affiliate Portal</div>
          <div className="text-xs text-slate-500">ck369 partner console</div>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/affiliate/dashboard"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-[#0f5132] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{sidebar}</div>
        {open && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div className="relative">{sidebar}</div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
            <button
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden text-sm text-slate-500 lg:block">
              Affiliate revenue, players, settlements and withdrawals
            </div>
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => {
                dispatch(logout());
                navigate("/affiliate/login");
              }}
            >
              Logout
            </button>
          </header>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
