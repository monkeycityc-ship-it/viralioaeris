import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminContentTab() {
  const queryClient = useQueryClient();

  const { data: allGenerations } = useQuery({
    queryKey: ["admin-generations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const deleteGeneration = async (id: string) => {
    await supabase.from("generations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-generations"] });
    toast.success("Generare ștearsă");
  };

  return (
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
      {(!allGenerations || allGenerations.length === 0) && (
        <p className="text-center text-muted-foreground py-8">Nicio generare.</p>
      )}
    </div>
  );
}
