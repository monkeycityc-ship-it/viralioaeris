import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, Download, RotateCw, Play, Pause, Volume2 } from "lucide-react";

const VOICES = [
  { id: "sarah", label: "Sarah", gender: "Female", accent: "American" },
  { id: "alice", label: "Alice", gender: "Female", accent: "British" },
  { id: "laura", label: "Laura", gender: "Female", accent: "American" },
  { id: "jessica", label: "Jessica", gender: "Female", accent: "American" },
  { id: "lily", label: "Lily", gender: "Female", accent: "British" },
  { id: "matilda", label: "Matilda", gender: "Female", accent: "Australian" },
  { id: "roger", label: "Roger", gender: "Male", accent: "American" },
  { id: "charlie", label: "Charlie", gender: "Male", accent: "Australian" },
  { id: "george", label: "George", gender: "Male", accent: "British" },
  { id: "liam", label: "Liam", gender: "Male", accent: "American" },
  { id: "eric", label: "Eric", gender: "Male", accent: "American" },
  { id: "chris", label: "Chris", gender: "Male", accent: "American" },
  { id: "brian", label: "Brian", gender: "Male", accent: "American" },
  { id: "daniel", label: "Daniel", gender: "Male", accent: "British" },
];

const TEMPLATES = [
  { label: "Narration", prompt: "Bună ziua, bine ați venit la podcastul nostru despre " },
  { label: "Ad Script", prompt: "Descoperă noul produs revoluționar care " },
  { label: "Story Intro", prompt: "A fost odată ca niciodată, într-un ținut depărtat " },
  { label: "TikTok VO", prompt: "Atenție! Trebuie să vezi asta: " },
];

export default function VoiceStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("sarah");
  const [stability, setStability] = useState([0.5]);
  const [speed, setSpeed] = useState([1.0]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });

  const creditCost = 2;
  const selectedVoice = VOICES.find((v) => v.id === voice);

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Scrie textul!"); return; }
    if (!user || !profile) return;
    if (profile.credits < creditCost) { toast.error("Nu ai suficiente credite!"); return; }

    setLoading(true);
    setAudioUrl(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            text: text.trim(),
            voice,
            stability: stability[0],
            speed: speed[0],
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Voice generation failed");
      }

      const data = await response.json();
      setAudioUrl(data.result_url);
      await refreshProfile();
      toast.success("Audio generat cu succes! 🎙️");
    } catch (err: any) {
      toast.error(err.message || "Eroare la generare");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!audioUrl) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `viralio-voice-${Date.now()}.mp3`;
    a.target = "_blank";
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Mic className="w-6 h-6" /> Voice AI Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Cost: {creditCost} credite | Rămase: {profile?.credits ?? 0} |
            Caractere voce: {profile?.voice_characters_remaining ?? 0}
          </p>
        </div>

        {/* Templates */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => setText(t.prompt)}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Voice Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Voce</label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label} ({v.gender}, {v.accent})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stabilitate: {stability[0].toFixed(1)}</label>
            <Slider value={stability} onValueChange={setStability} min={0} max={1} step={0.1} />
            <p className="text-xs text-muted-foreground">Mic = expresiv, Mare = consistent</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Viteză: {speed[0].toFixed(1)}x</label>
            <Slider value={speed} onValueChange={setSpeed} min={0.7} max={1.2} step={0.1} />
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Text de citit</label>
            <span className="text-xs text-muted-foreground">{text.length}/5000</span>
          </div>
          <Textarea
            placeholder="Scrie sau lipeste textul pe care vrei să-l transformi în audio..."
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 5000))}
            rows={6}
            className="resize-none text-base"
          />
          <Button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className="gradient-bg text-primary-foreground hover:opacity-90 font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2"><RotateCw className="w-4 h-4 animate-spin" /> Se generează audio...</span>
            ) : (
              <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Generează Audio ({creditCost} credite)</span>
            )}
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Se procesează textul cu vocea {selectedVoice?.label}...</p>
            <Progress value={undefined} className="animate-pulse" />
          </div>
        )}

        {/* Result */}
        {audioUrl && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Mic className="w-4 h-4" /> Audio Generat
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handlePlay}>
                  {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isPlaying ? "Pauză" : "Redă"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> Descarcă MP3
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAudioUrl(null); audioRef.current = null; handleGenerate(); }}>
                  <RotateCw className="w-4 h-4 mr-1" /> Regenerează
                </Button>
              </div>
            </div>
            <audio src={audioUrl} controls className="w-full" />
            <div className="text-xs text-muted-foreground">
              Voce: {selectedVoice?.label} | {text.length} caractere | Stabilitate: {stability[0]}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
