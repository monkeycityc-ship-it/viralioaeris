import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Plus, Minus, Ban, CheckCircle, Edit3 } from "lucide-react";

export default function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [creditAmount, setCreditAmount] = useState(10);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [manualCredits, setManualCredits] = useState("");
  const [editingChars, setEditingChars] = useState<string | null>(null);
  const [manualChars, setManualChars] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const updateCredits = async (userId: string, currentCredits: number, delta: number) => {
    const newCredits = Math.max(0, currentCredits + delta);
    await supabase.from("profiles").update({ credits: newCredits }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Credite actualizate: ${newCredits}`);
  };

  const setCreditsManual = async (userId: string) => {
    const val = parseInt(manualCredits);
    if (isNaN(val) || val < 0) { toast.error("Valoare invalidă"); return; }
    await supabase.from("profiles").update({ credits: val }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setEditingCredits(null);
    toast.success(`Credite setate: ${val}`);
  };

  const setCharsManual = async (userId: string) => {
    const val = parseInt(manualChars);
    if (isNaN(val) || val < 0) { toast.error("Valoare invalidă"); return; }
    await supabase.from("profiles").update({ characters_limit: val, characters_used: 0 } as any).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setEditingChars(null);
    toast.success(`Limită caractere setată: ${val}`);
  };

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    await supabase.from("profiles").update({ is_banned: !currentBanned }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(currentBanned ? "Utilizator deblocat" : "Utilizator blocat");
  };

  const updatePlan = async (userId: string, plan: string) => {
    // Import plan limits to set correct values
    const { getPlanLimits } = await import("@/lib/plan-limits");
    const limits = getPlanLimits(plan);
    await supabase.from("profiles").update({
      plan,
      credits: limits.credits,
      voice_characters_remaining: limits.voiceCharacters,
      characters_limit: limits.voiceCharacters,
      characters_used: 0,
    } as any).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Plan actualizat: ${plan} (${limits.credits} credite, ${limits.voiceCharacters} caractere)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Caută utilizator..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">±</span>
          <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value))} className="w-20 h-9" min={1} />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{users?.length ?? 0} utilizatori</div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Utilizator</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-center px-4 py-3 font-medium">Credite</th>
                <th className="text-center px-4 py-3 font-medium">Voce (chars)</th>
                <th className="text-center px-4 py-3 font-medium">Plan</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.display_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {editingCredits === u.user_id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input type="number" value={manualCredits} onChange={(e) => setManualCredits(e.target.value)} className="w-20 h-7 text-xs" />
                        <Button size="icon" className="h-7 w-7" onClick={() => setCreditsManual(u.user_id)}><CheckCircle className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCredits(u.user_id, u.credits, -creditAmount)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-bold min-w-[3ch]">{u.credits}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCredits(u.user_id, u.credits, creditAmount)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCredits(u.user_id); setManualCredits(String(u.credits)); }}>
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingChars === u.user_id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input type="number" value={manualChars} onChange={(e) => setManualChars(e.target.value)} className="w-24 h-7 text-xs" />
                        <Button size="icon" className="h-7 w-7" onClick={() => setCharsManual(u.user_id)}><CheckCircle className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs">{u.characters_used ?? 0}/{u.characters_limit ?? u.voice_characters_remaining ?? 3000}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingChars(u.user_id); setManualChars(String(u.characters_limit ?? u.voice_characters_remaining ?? 3000)); }}>
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={u.plan}
                      onChange={(e) => updatePlan(u.user_id, e.target.value)}
                      className="text-xs bg-muted rounded px-2 py-1 border border-border"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="creator_pro">Creator PRO</option>
                      <option value="agency">Agency</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_banned ? (
                      <span className="text-xs text-destructive font-semibold">Blocat</span>
                    ) : (
                      <span className="text-xs text-green-500 font-semibold">Activ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleBan(u.user_id, u.is_banned)}>
                      {u.is_banned ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-destructive" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
