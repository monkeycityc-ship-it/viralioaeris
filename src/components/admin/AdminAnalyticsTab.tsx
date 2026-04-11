import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminAnalyticsTab() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: totalGens } = await supabase.from("generations").select("*", { count: "exact", head: true });
      const { count: totalVideos } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("type", "video");
      const { count: totalAudio } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("type", "audio");
      const { count: totalImages } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("type", "image");
      const { count: totalText } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("type", "text");
      const { data: paidUsers } = await supabase.from("profiles").select("id").neq("plan", "free");
      const { count: totalDownloads } = await supabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("tool", "video-downloader");

      return {
        totalUsers: totalUsers ?? 0,
        totalGenerations: totalGens ?? 0,
        totalVideos: totalVideos ?? 0,
        totalAudio: totalAudio ?? 0,
        totalImages: totalImages ?? 0,
        totalText: totalText ?? 0,
        paidUsers: paidUsers?.length ?? 0,
        totalDownloads: totalDownloads ?? 0,
      };
    },
  });

  const cards = [
    { label: "Utilizatori totali", value: stats?.totalUsers ?? 0 },
    { label: "Utilizatori plătitori", value: stats?.paidUsers ?? 0 },
    { label: "Generări totale", value: stats?.totalGenerations ?? 0 },
    { label: "Videouri procesate", value: stats?.totalVideos ?? 0 },
    { label: "Descărcări video", value: stats?.totalDownloads ?? 0 },
    { label: "Generări voce", value: stats?.totalAudio ?? 0 },
    { label: "Imagini generate", value: stats?.totalImages ?? 0 },
    { label: "Texte generate", value: stats?.totalText ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-black gradient-text">{card.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
