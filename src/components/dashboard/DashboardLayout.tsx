import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Zap, LayoutDashboard, PenTool, Image, Film, Clock, Star,
  Settings, Shield, LogOut, CreditCard, ChevronLeft, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/studio/text", label: "Text AI", icon: PenTool },
  { path: "/studio/image", label: "Image AI", icon: Image },
  { path: "/studio/video", label: "Video AI", icon: Film },
  { path: "/history", label: "Istoric", icon: Clock },
  { path: "/favorites", label: "Favorite", icon: Star },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Viralio</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credits */}
        <div className="p-4 border-b border-border">
          <div className="bg-muted rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Credite</span>
              <span className="text-sm font-bold gradient-text">{profile?.credits ?? 0}</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5">
              <div
                className="gradient-bg h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((profile?.credits ?? 0) / 150) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{profile?.plan ?? "free"}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            Setări
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Deconectare
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
              {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="text-sm font-medium hidden sm:block">{profile?.display_name ?? "User"}</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
