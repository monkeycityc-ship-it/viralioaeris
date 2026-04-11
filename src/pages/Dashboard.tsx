import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, PenTool, Image, Film, Zap, TrendingUp, Mic, Scissors, Languages, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPlanLimits, canUseTool, ROUTE_TO_TOOL } from "@/lib/plan-limits";

export default function Dashboard() {
  const { profile, user } = useAuth();

  const plan = profile?.plan ?? "free";
  const limits = getPlanLimits(plan);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const { count: textCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "text");
      const { count: imageCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "image");
      const { count: videoCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "video");
      const { count: audioCount } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("type", "audio");
      return { text: textCount ?? 0, image: imageCount ?? 0, video: videoCount ?? 0, audio: audioCount ?? 0 };
    },
    enabled: !!user,
  });

  const tools = [
    { path: "/studio/text", label: "Text AI", desc: "Generează scripturi și texte virale", icon: PenTool, credits: "1 Credit", tool: "text" },
    { path: "/studio/image", label: "Image AI", desc: "Imagini ultra-realiste cu AI", icon: Image, credits: "2 Credite", tool: "image" },
    { path: "/studio/video", label: "Video AI", desc: "Clipuri cinematice generate", icon: Film, credits: "5 Credite", tool: "video" },
    { path: "/voice-studio", label: "Voice AI", desc: "Transformă text în audio cu voci AI", icon: Mic, credits: "2 Credite", tool: "voice" },
    { path: "/caption-eraser", label: "Caption Eraser", desc: "Elimină subtitrările din videouri", icon: Scissors, credits: "5 Credite", tool: "caption-eraser" },
    { path: "/video-translator", label: "Video Translator", desc: "Traduce audio din video în orice limbă", icon: Languages, credits: "3 Credite", tool: "video-translator" },
    { path: "/video-downloader", label: "Video Downloader", desc: "Descarcă și traduce videouri de pe YouTube", icon: Download, credits: "3 Credite", tool: "video-downloader" },
  ];

  const voiceCharsUsed = (profile as any)?.characters_used ?? 0;
  const voiceCharsLimit = (profile as any)?.characters_limit ?? profile?.voice_characters_remaining ?? limits.voiceCharacters;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black">
            Bine ai venit, <span className="gradient-text">{profile?.display_name ?? "Creator"}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">Alege un instrument și începe să creezi.</p>
        </div>

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
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-black capitalize">{limits.label}</p>
            <p className="text-xs text-muted-foreground">Plan activ</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-black">{profile?.voice_characters_remaining ?? 0}</p>
            <p className="text-xs text-muted-foreground">Caractere voce rămase</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-black">{(stats?.text ?? 0) + (stats?.image ?? 0) + (stats?.video ?? 0) + (stats?.audio ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Total generări</p>
          </div>
        </div>

        {/* Plan limits summary */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold mb-3">Limitele planului tău ({limits.label})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Credite/lună</p>
              <p className="font-bold">{limits.credits}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Caractere voce</p>
              <p className="font-bold">{limits.voiceCharacters.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Descărcări video/lună</p>
              <p className="font-bold">{limits.maxVideoDownloads === -1 ? "Nelimitat" : limits.maxVideoDownloads}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Instrumente disponibile</p>
              <p className="font-bold">{limits.restricted.length === 0 ? "Toate" : `${limits.tools.length}/${7}`}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Instrumente AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const hasAccess = canUseTool(plan, tool.tool);
              return (
                <Link key={tool.path} to={hasAccess ? tool.path : "/pricing"} className="group relative">
                  <div className={`bg-card rounded-2xl border border-border p-6 transition-all hover:shadow-lg ${
                    hasAccess ? "hover:border-primary/30" : "opacity-60"
                  }`}>
                    {!hasAccess && (
                      <div className="absolute top-3 right-3">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                      <tool.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{tool.label}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
                    <span className="text-xs font-semibold gradient-text">
                      {hasAccess ? tool.credits : "Upgrade necesar"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
