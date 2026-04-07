import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    if (error) toast.error("Eroare la salvare");
    else { toast.success("Profil actualizat!"); await refreshProfile(); }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-black">Setări</h1>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-bold">Profil</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nume</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input value={profile?.email ?? ""} disabled className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-bg text-primary-foreground hover:opacity-90">
              {saving ? "Se salvează..." : "Salvează"}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-bold">Abonament</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{profile?.plan ?? "free"}</p>
              <p className="text-sm text-muted-foreground">{profile?.credits ?? 0} credite rămase</p>
            </div>
            <Button variant="outline" asChild>
              <a href="#pricing">Upgrade</a>
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold text-destructive mb-3">Zona periculoasă</h2>
          <Button variant="destructive" onClick={signOut}>Deconectare</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
