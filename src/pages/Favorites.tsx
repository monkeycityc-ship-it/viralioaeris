import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Copy, Download, PenTool, Image, Film, Mic, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import BatchDownloadButton from "@/components/BatchDownloadButton";

export default function Favorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("*, generations(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const removeFavorite = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("favorites").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Eliminat din favorite!");
    },
  });

  const toggleSelect = (genId: string) => {
    setSelectedIds((prev) => prev.includes(genId) ? prev.filter((i) => i !== genId) : [...prev, genId]);
  };

  const selectAllDownloadable = () => {
    const downloadable = favorites?.filter((f) => (f.generations as any)?.result_url).map((f) => (f.generations as any)?.id) ?? [];
    setSelectedIds(downloadable);
  };

  const typeIcons: Record<string, typeof PenTool> = { text: PenTool, image: Image, video: Film, audio: Mic };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Favorite ⭐</h1>
          {favorites && favorites.filter((f) => (f.generations as any)?.result_url).length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllDownloadable}>
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Selectează tot
            </Button>
          )}
        </div>

        <BatchDownloadButton selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : !favorites?.length ? (
          <div className="text-center py-12 text-muted-foreground">Nu ai favorite încă.</div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => {
              const gen = fav.generations as any;
              if (!gen) return null;
              const Icon = typeIcons[gen.type] ?? PenTool;
              const isSelected = selectedIds.includes(gen.id);
              return (
                <div key={fav.id} className={`bg-card rounded-xl border p-4 flex gap-4 items-start transition-colors ${isSelected ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  {gen.result_url && (
                    <div className="flex items-center pt-1">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(gen.id)} />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gen.prompt}</p>
                    {gen.result_text && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gen.result_text}</p>}
                    {gen.result_url && gen.type === "image" && (
                      <img src={gen.result_url} alt="" className="mt-2 rounded-lg max-h-32 object-cover" />
                    )}
                    {gen.result_url && gen.type === "audio" && (
                      <audio src={gen.result_url} controls className="mt-2 w-full max-w-md" />
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(gen.created_at), "dd.MM.yyyy HH:mm")}</span>
                      <span className="capitalize">{gen.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {gen.result_text && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(gen.result_text!); toast.success("Copiat!"); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {gen.result_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(gen.result_url!, "_blank")}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFavorite.mutate(fav.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
