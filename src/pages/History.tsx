import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Copy, Download, Star, Search, Filter, PenTool, Image, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

type FilterType = "all" | "text" | "image" | "video";

export default function History() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: generations, isLoading } = useQuery({
    queryKey: ["generations", user?.id, filter, search],
    queryFn: async () => {
      let query = supabase.from("generations").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("type", filter);
      if (search) query = query.ilike("prompt", `%${search}%`);
      const { data } = await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("generations").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      toast.success("Șters!");
    },
  });

  const addFavorite = async (genId: string) => {
    if (!user) return;
    await supabase.from("favorites").insert({ user_id: user.id, generation_id: genId });
    toast.success("Adăugat la favorite!");
  };

  const typeIcons: Record<string, typeof PenTool> = { text: PenTool, image: Image, video: Film };
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "Toate" },
    { value: "text", label: "Text" },
    { value: "image", label: "Imagini" },
    { value: "video", label: "Video" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-black">Istoric Generări</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Caută după prompt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : !generations?.length ? (
          <div className="text-center py-12 text-muted-foreground">Nu ai generări încă. Începe din Studio!</div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => {
              const Icon = typeIcons[gen.type] ?? PenTool;
              return (
                <div key={gen.id} className="bg-card rounded-xl border border-border p-4 flex gap-4 items-start hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gen.prompt}</p>
                    {gen.result_text && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gen.result_text}</p>}
                    {gen.result_url && gen.type === "image" && (
                      <img src={gen.result_url} alt="" className="mt-2 rounded-lg max-h-32 object-cover" />
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(gen.created_at), "dd.MM.yyyy HH:mm")}</span>
                      <span className="capitalize">{gen.type}</span>
                      <span>{gen.credits_used} cr</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {gen.result_text && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(gen.result_text!); toast.success("Copiat!"); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {gen.result_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const a = document.createElement("a"); a.href = gen.result_url!; a.download = "download"; a.target = "_blank"; a.click(); }}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addFavorite(gen.id)}>
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(gen.id)}>
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
