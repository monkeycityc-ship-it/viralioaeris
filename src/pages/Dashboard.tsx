import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, PenTool, Image, Film, Zap, TrendingUp, Mic, Scissors, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { profile, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const { count: textCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "text");
      const { count: imageCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "image");
      const { count: videoCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "video");
      return { text: textCount ?? 0, image: imageCount ?? 0, video: videoCount ?? 0 };
    },
    enabled: !!user,
  });

  const tools = [
    { path: "/studio/text", label: "Text AI", desc: "Generează scripturi și texte virale", icon: PenTool, credits: "1 Credit" },
    { path: "/studio/image", label: "Image AI", desc: "Imagini ultra-realiste cu AI", icon: Image, credits: "2 Credite" },
    { path: "/studio/video", label: "Video AI", desc: "Clipuri cinematice generate", icon: Film, credits: "5 Credite" },
    { path: "/voice-studio", label: "Voice AI", desc: "Transformă text în audio cu voci AI", icon: Mic, credits: "2 Credite" },
    { path: "/caption-eraser", label: "Caption Eraser", desc: "Elimină subtitrările din videouri", icon: Scissors, credits: "5 Credite" },
    { path: "/video-translator", label: "Video Translator", desc: "Traduce audio din video în orice limbă", icon: Languages, credits: "3 Credite" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-black">
            Bine ai venit, <span className="gradient-text">{profile?.display_name ?? "Creator"}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">Alege un instrument și începe să creezi.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-black">{profile?.credits ?? 0}</p>
            <p className="text-xs text-muted-foreground">Credite rămase</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
            </div>
            <p className="text-2xl font-black">{(stats?.text ?? 0) + (stats?.image ?? 0) + (stats?.video ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Total generări</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-2xl font-black capitalize">{profile?.plan ?? "free"}</p>
            <p className="text-xs text-muted-foreground">Plan activ</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-black">{stats?.image ?? 0}</p>
            <p className="text-xs text-muted-foreground">Imagini create</p>
          </div>
        </div>

        {/* Tools */}
        <div>
          <h2 className="text-xl font-bold mb-4">Instrumente AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link key={tool.path} to={tool.path} className="group">
                <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-all hover:shadow-lg">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                    <tool.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{tool.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
                  <span className="text-xs font-semibold gradient-text">{tool.credits}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
