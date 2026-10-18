import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarCheck,
  Crown,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Star,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users, end: false },
  { to: "/categories", label: "Categories", icon: LayoutGrid, end: false },
  { to: "/workers/new", label: "Add Worker", icon: UserPlus, end: false },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck, end: false },
  { to: "/reviews", label: "Reviews", icon: Star, end: false },
  { to: "/feedback", label: "Feedback", icon: BookOpenCheck, end: false },
  { to: "/membership", label: "Membership", icon: Crown, end: false },
  { to: "/referrals", label: "Refer & Earn", icon: Gift, end: false },
  { to: "/discounts", label: "Discounts", icon: Tag, end: false },
  { to: "/reports", label: "Reports", icon: TrendingUp, end: false },
];

export default function Layout() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col bg-white border-r border-slate-200 md:flex">
          <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200">
            <span className="flex h-8 w-8 items-center justify-center bg-brand rounded-sm">
              <ShieldCheck className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                Kazilen
              </p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Admin Panel
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-sm border transition-colors duration-150",
                    isActive
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "text-slate-600 border-transparent hover:bg-slate-100"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <BookOpenCheck className="h-4 w-4 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {email}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-1"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Mobile top bar */}
          <header className="flex h-16 items-center justify-between bg-white border-b border-slate-200 px-4 md:px-6">
            <div className="flex items-center gap-3 md:hidden">
              <span className="flex h-8 w-8 items-center justify-center bg-brand rounded-sm">
                <ShieldCheck className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                Kazilen Admin
              </span>
            </div>
            <nav className="flex items-center gap-1 md:hidden">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "px-2.5 py-1.5 text-xs font-bold rounded-sm transition-colors duration-150",
                      isActive
                        ? "bg-orange-50 text-orange-700"
                        : "text-slate-600 hover:bg-slate-100"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-500 truncate max-w-64">
                {email}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="md:hidden"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
