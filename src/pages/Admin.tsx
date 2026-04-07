import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Users, CreditCard, Shield, BarChart3, Trash2, Ban, CheckCircle, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

type Tab = "users" | "analytics" | "content";

export default function Admin() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [creditAmount, setCreditAmount] = useState(10);

  const { data: users } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      const { data } = await query;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: allGenerations } = useQuery({
    queryKey: ["admin-generations"],
    queryFn: async () => {
      const { data } = await supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: isAdmin && tab === "content",
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: totalGens } = await supabase.from("generations").select("*", { count: "exact", head: true });
      const { data: paidUsers } = await supabase.from("profiles").select("id").neq("plan", "free");
      return { totalUsers: totalUsers ?? 0, totalGenerations: totalGens ?? 0, paidUsers: paidUsers?.length ?? 0 };
    },
    enabled: isAdmin && tab === "analytics",
  });

  const updateCredits = async (userId: string, currentCredits: number, delta: number) => {
    const newCredits = Math.max(0, currentCredits + delta);
    await supabase.from("profiles").update({ credits: newCredits }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Credite actualizate: ${newCredits}`);
  };

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    await supabase.from("profiles").update({ is_banned: !currentBanned }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(currentBanned ? "Utilizator deblocat" : "Utilizator blocat");
  };

  const updatePlan = async (userId: string, plan: string) => {
    await supabase.from("profiles").update({ plan }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Plan actualizat: ${plan}`);
  };

  const deleteGeneration = async (id: string) => {
    await supabase.from("generations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-generations"] });
    toast.success("Generare ștearsă");
  };

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

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Caută utilizator..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Utilizator</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-center px-4 py-3 font-medium">Credite</th>
                      <th className="text-center px-4 py-3 font-medium">Plan</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{u.display_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCredits(u.user_id, u.credits, -creditAmount)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-bold min-w-[3ch]">{u.credits}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCredits(u.user_id, u.credits, creditAmount)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={u.plan}
                            onChange={(e) => updatePlan(u.user_id, e.target.value)}
                            className="text-xs bg-muted rounded px-2 py-1 border border-border"
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="creator">Creator PRO</option>
                            <option value="agency">Agency</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.is_banned ? (
                            <span className="text-xs text-destructive font-semibold">Blocat</span>
                          ) : (
                            <span className="text-xs text-success font-semibold">Activ</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleBan(u.user_id, u.is_banned)}>
                            {u.is_banned ? <CheckCircle className="w-4 h-4 text-success" /> : <Ban className="w-4 h-4 text-destructive" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "analytics" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-4xl font-black gradient-text">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Utilizatori totali</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-4xl font-black gradient-text">{stats.totalGenerations}</p>
              <p className="text-sm text-muted-foreground mt-1">Generări totale</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-4xl font-black gradient-text">{stats.paidUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Utilizatori plătitori</p>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {tab === "content" && (
          <div className="space-y-3">
            {allGenerations?.map((gen) => (
              <div key={gen.id} className="bg-card rounded-xl border border-border p-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{gen.prompt}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(gen.created_at), "dd.MM.yyyy HH:mm")} · {gen.type} · {gen.credits_used} cr · User: {gen.user_id.slice(0, 8)}...
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteGeneration(gen.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
