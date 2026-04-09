import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Copy, Download, RotateCw, Sparkles, Star, Upload, Image as ImageIcon } from "lucide-react";
import { useParams } from "react-router-dom";

const TEMPLATES: Record<string, { label: string; prompt: string }[]> = {
  text: [
    { label: "TikTok Script", prompt: "Scrie un script viral pentru TikTok despre " },
    { label: "YouTube Shorts", prompt: "Creează un script captivant pentru YouTube Shorts despre " },
    { label: "Story Generator", prompt: "Generează o poveste scurtă și captivantă despre " },
    { label: "Hook Generator", prompt: "Scrie 5 hook-uri virale pentru un video despre " },
  ],
  image: [
    { label: "Thumbnail YouTube", prompt: "Create a vibrant YouTube thumbnail showing " },
    { label: "Social Media Post", prompt: "Design a modern social media post image with " },
    { label: "Product Shot", prompt: "Professional product photography of " },
  ],
  video: [
    { label: "Cinematic Intro", prompt: "A cinematic 4K intro sequence showing " },
    { label: "Product Demo", prompt: "A smooth product demonstration video of " },
    { label: "Nature Scene", prompt: "A breathtaking aerial nature scene of " },
  ],
};

const CREDITS_COST: Record<string, number> = { text: 1, image: 2, video: 5 };

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", desc: "Instagram" },
  { label: "9:16", value: "9:16", desc: "TikTok / Reels" },
  { label: "16:9", value: "16:9", desc: "YouTube" },
];

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
};

export default function Studio() {
  const { type = "text" } = useParams<{ type: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creditCost = CREDITS_COST[type] ?? 1;

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/references/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(data.path);
    setReferenceImage(publicUrl);

    await supabase.from("reference_images").insert({
      user_id: user.id,
      file_url: publicUrl,
      file_name: file.name,
      purpose: type === "text" ? "context" : "style_reference",
    });
    toast.success("Imagine de referință încărcată!");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Scrie un prompt!"); return; }
    if (!user || !profile) return;
    if (profile.credits < creditCost) { toast.error("Nu ai suficiente credite!"); return; }

    setLoading(true);
    setResult(null);
    setResultUrl(null);

    try {
      const dims = ASPECT_DIMENSIONS[aspectRatio] ?? ASPECT_DIMENSIONS["1:1"];
      const body: any = { prompt, type, referenceImage, aspectRatio, width: dims.width, height: dims.height };
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      if (type === "text") {
        // Stream text
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setResult(fullText);
              }
            } catch { /* partial */ }
          }
        }

        // Save generation
        await supabase.from("generations").insert({
          user_id: user.id,
          type: "text",
          prompt,
          result_text: fullText,
          status: "done",
          credits_used: creditCost,
        });
      } else {
        const data = await response.json();
        if (data.result_url) {
          setResultUrl(data.result_url);
          setResult(null);
        }
        if (data.result_text) {
          setResult(data.result_text);
        }
      }

      // Deduct credits
      await supabase.from("profiles").update({
        credits: profile.credits - creditCost,
      }).eq("user_id", user.id);
      await refreshProfile();
      toast.success("Generare reușită! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Eroare la generare");
    } finally {
      setLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: `Improve this prompt for better AI results, return ONLY the improved prompt: ${prompt}`, type: "text" }),
        }
      );
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let improved = "";
      let buffer = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) improved += c; } catch {}
        }
      }
      if (improved) setPrompt(improved);
      toast.success("Prompt îmbunătățit!");
    } catch { toast.error("Eroare la îmbunătățire prompt"); }
    finally { setLoading(false); }
  };

  const handleCopy = () => {
    if (result) { navigator.clipboard.writeText(result); toast.success("Copiat!"); }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `viralio-${type}-${Date.now()}.txt`; a.click();
    }
    if (resultUrl) {
      const a = document.createElement("a"); a.href = resultUrl; a.download = `viralio-${type}-${Date.now()}`; a.target = "_blank"; a.click();
    }
  };

  const addToFavorites = async () => {
    if (!user) return;
    // get latest generation
    const { data } = await supabase.from("generations").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
    if (data) {
      await supabase.from("favorites").insert({ user_id: user.id, generation_id: data.id });
      toast.success("Adăugat la favorite! ⭐");
    }
  };

  const titles: Record<string, string> = {
    text: "Text AI Studio",
    image: "Image AI Studio",
    video: "Video AI Studio",
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black">{titles[type] ?? "Studio"}</h1>
          <p className="text-sm text-muted-foreground">Cost: {creditCost} {creditCost === 1 ? "credit" : "credite"} | Rămase: {profile?.credits ?? 0}</p>
        </div>

        {/* Templates */}
        <div className="flex flex-wrap gap-2">
          {(TEMPLATES[type] ?? []).map((t) => (
            <button
              key={t.label}
              onClick={() => setPrompt(t.prompt)}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Reference Image Upload */}
        {(type === "image" || type === "video") && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Imagine de referință (opțional)</label>
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadReference} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Încarcă imagine
              </Button>
              {referenceImage && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                  <button onClick={() => setReferenceImage(null)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive rounded-full text-destructive-foreground text-xs flex items-center justify-center">×</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aspect Ratio Selector */}
        {(type === "image" || type === "video") && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Dimensiune / Aspect Ratio</label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setAspectRatio(r.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    aspectRatio === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="font-bold">{r.label}</span>
                  <span className="text-xs block opacity-70">{r.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Rezoluție: {ASPECT_DIMENSIONS[aspectRatio]?.width} × {ASPECT_DIMENSIONS[aspectRatio]?.height}px
            </p>
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <Textarea
            placeholder={type === "text" ? "Descrie ce vrei să generezi..." : type === "image" ? "Descrie imaginea pe care o vrei..." : "Descrie videoclipul pe care îl vrei..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none text-base"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="gradient-bg text-primary-foreground hover:opacity-90 font-semibold">
              {loading ? (
                <span className="flex items-center gap-2"><RotateCw className="w-4 h-4 animate-spin" /> Se generează...</span>
              ) : (
                <span className="flex items-center gap-2"><Wand2 className="w-4 h-4" /> Generează</span>
              )}
            </Button>
            <Button variant="outline" onClick={handleImprovePrompt} disabled={loading || !prompt.trim()} size="sm">
              <Sparkles className="w-4 h-4 mr-1" /> Îmbunătățește prompt
            </Button>
          </div>
        </div>

        {/* Result */}
        {(result || resultUrl) && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Rezultat</h3>
              <div className="flex items-center gap-2">
                {result && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" /> Copiază
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> Descarcă
                </Button>
                <Button variant="ghost" size="sm" onClick={addToFavorites}>
                  <Star className="w-4 h-4 mr-1" /> Favorit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setResult(null); setResultUrl(null); handleGenerate(); }}>
                  <RotateCw className="w-4 h-4 mr-1" /> Regenerează
                </Button>
              </div>
            </div>
            {result && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                {result}
              </div>
            )}
            {resultUrl && type === "image" && (
              <img src={resultUrl} alt="Generated" className="rounded-xl max-w-full max-h-96 mx-auto" />
            )}
            {resultUrl && type === "video" && (
              <video src={resultUrl} controls className="rounded-xl max-w-full max-h-96 mx-auto" />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
