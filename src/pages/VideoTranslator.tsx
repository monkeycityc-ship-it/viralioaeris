import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Languages, RotateCw, Download, Copy } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ro", label: "Română" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "pl", label: "Polski" },
];

export default function VideoTranslator() {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [srt, setSrt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 50 * 1024 * 1024) {
        toast.error("Fișierul trebuie să fie sub 50MB");
        return;
      }
      setFile(f);
    }
  };

  const handleTranslate = async () => {
    if (!file || !user) return;
    if ((profile?.credits ?? 0) < 3) {
      toast.error("Nu ai suficiente credite! (necesare: 3)");
      return;
    }

    setLoading(true);
    setOriginalText("");
    setTranslatedText("");
    setSrt("");

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("targetLang", targetLang);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-translate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Translation failed");
      }

      const data = await response.json();
      setOriginalText(data.originalText ?? "");
      setTranslatedText(data.translatedText ?? "");
      setSrt(data.srt ?? "");
      await refreshProfile();
      toast.success("Traducere reușită! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Eroare la traducere");
    } finally {
      setLoading(false);
    }
  };

  const downloadSrt = () => {
    if (!srt) return;
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles-${Date.now()}.srt`;
    a.click();
  };

  const downloadTranslation = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation-${targetLang}-${Date.now()}.txt`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Languages className="w-6 h-6" /> Video Translator
          </h1>
          <p className="text-sm text-muted-foreground">
            Cost: 3 credite | Rămase: {profile?.credits ?? 0}
          </p>
        </div>

        {/* Upload */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Încarcă video sau audio</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Alege fișier
              </Button>
              {file && (
                <span className="text-sm text-muted-foreground">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Limba țintă</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setTargetLang(lang.code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    targetLang === lang.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleTranslate}
            disabled={loading || !file}
            className="gradient-bg text-primary-foreground hover:opacity-90 font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin" /> Se procesează...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Languages className="w-4 h-4" /> Traduce
              </span>
            )}
          </Button>
        </div>

        {/* Results */}
        {(originalText || translatedText) && (
          <div className="space-y-4 animate-fade-in">
            {originalText && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Text Original</h3>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(originalText); toast.success("Copiat!"); }}>
                    <Copy className="w-4 h-4 mr-1" /> Copiază
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{originalText}</p>
              </div>
            )}

            {translatedText && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Traducere ({LANGUAGES.find(l => l.code === targetLang)?.label})</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(translatedText); toast.success("Copiat!"); }}>
                      <Copy className="w-4 h-4 mr-1" /> Copiază
                    </Button>
                    <Button variant="ghost" size="sm" onClick={downloadTranslation}>
                      <Download className="w-4 h-4 mr-1" /> Descarcă
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{translatedText}</p>
              </div>
            )}

            {srt && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Subtitrări (SRT)</h3>
                  <Button variant="ghost" size="sm" onClick={downloadSrt}>
                    <Download className="w-4 h-4 mr-1" /> Descarcă SRT
                  </Button>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto bg-muted rounded-lg p-3">{srt}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
