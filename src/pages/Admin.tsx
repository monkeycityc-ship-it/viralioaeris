import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Users, BarChart3, Shield, Clock } from "lucide-react";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminContentTab from "@/components/admin/AdminContentTab";
import AdminActivityTab from "@/components/admin/AdminActivityTab";

type Tab = "users" | "analytics" | "content" | "activity";

export default function Admin() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("users");

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-lg text-destructive font-semibold">⛔ Acces interzis</p>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { value: Tab; label: string; icon: typeof Users }[] = [
    { value: "users", label: "Utilizatori", icon: Users },
    { value: "analytics", label: "Analiză", icon: BarChart3 },
    { value: "content", label: "Conținut", icon: Shield },
    { value: "activity", label: "Activitate", icon: Clock },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-black">Admin Panel 👑</h1>

        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 justify-center ${
                tab === t.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" && <AdminUsersTab />}
        {tab === "analytics" && <AdminAnalyticsTab />}
        {tab === "content" && <AdminContentTab />}
        {tab === "activity" && <AdminActivityTab />}
      </div>
    </DashboardLayout>
  );
}
