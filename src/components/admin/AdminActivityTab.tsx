import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AdminActivityTab() {
  const [search, setSearch] = useState("");

  const { data: logs } = useQuery({
    queryKey: ["admin-activity-logs", search],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search) {
        query = query.or(`action.ilike.%${search}%,tool.ilike.%${search}%`);
      }
      const { data } = await query;
      return data ?? [];
    },
  });

  const toolColors: Record<string, string> = {
    "text": "bg-blue-500/10 text-blue-500",
    "image": "bg-purple-500/10 text-purple-500",
    "video": "bg-red-500/10 text-red-500",
    "voice": "bg-yellow-500/10 text-yellow-500",
    "caption-eraser": "bg-orange-500/10 text-orange-500",
    "video-downloader": "bg-green-500/10 text-green-500",
    "video-translator": "bg-cyan-500/10 text-cyan-500",
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Caută acțiune sau instrument..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {logs?.map((log: any) => (
          <div key={log.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
            <div className={`px-2 py-1 rounded text-xs font-medium ${toolColors[log.tool] ?? "bg-muted text-muted-foreground"}`}>
              {log.tool ?? "system"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss")} · User: {log.user_id?.slice(0, 8)}...
                {log.credits_used > 0 && ` · ${log.credits_used} cr`}
              </p>
            </div>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-center text-muted-foreground py-8">Niciun log de activitate încă.</p>
        )}
      </div>
    </div>
  );
}
