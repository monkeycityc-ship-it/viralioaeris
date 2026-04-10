import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download, Loader2, Plus, Trash2, Play, AlertCircle, RotateCcw,
  FileText, Languages,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoResult {
  url: string;
  title?: string;
  downloadUrl?: string;
  translatedText?: string;
  subtitlesUrl?: string;
  error?: string;
  status: "pending" | "processing" | "done" | "failed";
}

const LANGUAGES = [
  { value: "ro", label: "Română" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "ar", label: "العربية" },
  { value: "hi", label: "हिन्दी" },
  { value: "tr", label: "Türkçe" },
  { value: "pl", label: "Polski" },
  { value: "nl", label: "Nederlands" },
];

const QUALITIES = [
  { value: "360p", label: "360p (Mic)" },
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
];

export default function VideoDownloader() {
  const { user, profile, refreshProfile } = useAuth();
  const [urls, setUrls] = useState<string[]>([""]);
  const [quality, setQuality] = useState("720p");
  const [language, setLanguage] = useState("en");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);

  const addUrl = () => {
    if (urls.length >= 5) {
      toast.error("Maximum 5 URL-uri!");
      return;
    }
    setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    if (urls.length <= 1) return;
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleProcess = async () => {
    const validUrls = urls.filter((u) => u.trim());
    if (validUrls.length === 0) {
      toast.error("Adaugă cel puțin un URL!");
      return;
    }

    if (!user || !profile) return;

    const totalCost = validUrls.length * 3;
    if (profile.credits < totalCost) {
      toast.error(`Nu ai suficiente credite. Necesare: ${totalCost}`);
      return;
    }

    setProcessing(true);
    setResults(validUrls.map((url) => ({ url, status: "pending" as const })));

    // Update all to processing
    setResults(validUrls.map((url) => ({ url, status: "processing" as const })));

    try {
      const { data, error } = await supabase.functions.invoke("video-download", {
        body: { urls: validUrls, quality, targetLanguage: language },
      });

      if (error) throw error;

      if (data?.videos) {
        setResults(
          data.videos.map((v: any) => ({
            url: v.url,
            title: v.title,
            downloadUrl: v.downloadUrl,
            translatedText: v.translatedText,
            subtitlesUrl: v.subtitlesUrl,
            error: v.error,
            status: v.error ? ("failed" as const) : ("done" as const),
          }))
        );
      } else if (data?.error) {
        throw new Error(data.error);
      }

      await refreshProfile();
      toast.success("Procesare completă!");
    } catch (err: any) {
      toast.error(err.message || "Eroare la procesare");
      setResults((prev) =>
        prev.map((r) => (r.status === "processing" ? { ...r, status: "failed" as const, error: err.message } : r))
      );
    } finally {
      setProcessing(false);
    }
  };

  const retryOne = async (index: number) => {
    const url = results[index]?.url;
    if (!url) return;
    // Re-run just this one
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, status: "processing" as const, error: undefined } : r)));

    try {
      const { data, error } = await supabase.functions.invoke("video-download", {
        body: { urls: [url], quality, targetLanguage: language },
      });
      if (error) throw error;
      const video = data?.videos?.[0];
      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                title: video?.title,
                downloadUrl: video?.downloadUrl,
                translatedText: video?.translatedText,
                subtitlesUrl: video?.subtitlesUrl,
                error: video?.error,
                status: video?.error ? ("failed" as const) : ("done" as const),
              }
            : r
        )
      );
      await refreshProfile();
    } catch (err: any) {
      setResults((prev) =>
        prev.map((r, i) => (i === index ? { ...r, status: "failed" as const, error: err.message } : r))
      );
    }
  };

  const downloadSubtitles = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black">
            <span className="gradient-text">Video Downloader & Translator</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Descarcă și traduce videouri de pe YouTube, TikTok etc.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cost: 3 credite per video</p>
        </div>

        {/* URL Inputs */}
        <div className="space-y-3">
          <label className="text-sm font-medium">URL-uri video (max 5)</label>
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="https://youtube.com/watch?v=... sau https://tiktok.com/..."
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                disabled={processing}
              />
              {urls.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeUrl(i)} disabled={processing}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {urls.length < 5 && (
            <Button variant="outline" size="sm" onClick={addUrl} disabled={processing}>
              <Plus className="w-4 h-4 mr-1" /> Adaugă URL
            </Button>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Calitate video</label>
            <Select value={quality} onValueChange={setQuality} disabled={processing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUALITIES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Limba traducerii</label>
            <Select value={language} onValueChange={setLanguage} disabled={processing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Process Button */}
        <Button
          onClick={handleProcess}
          disabled={processing || urls.every((u) => !u.trim())}
          className="gradient-bg text-primary-foreground w-full"
          size="lg"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Se procesează...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Procesează ({urls.filter((u) => u.trim()).length * 3} credite)
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Rezultate</h2>
            {results.map((result, i) => (
              <div
                key={i}
                className={`bg-card rounded-2xl border p-4 space-y-3 ${
                  result.status === "failed"
                    ? "border-destructive/40"
                    : result.status === "done"
                    ? "border-primary/40"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title || result.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === "processing" && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Procesare...
                      </span>
                    )}
                    {result.status === "pending" && (
                      <span className="text-xs text-muted-foreground">În așteptare</span>
                    )}
                    {result.status === "done" && (
                      <span className="text-xs text-primary font-medium">✅ Gata</span>
                    )}
                    {result.status === "failed" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Eroare
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => retryOne(i)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {result.error && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{result.error}</p>
                )}

                {result.status === "processing" && <Progress value={50} className="h-1.5" />}

                {result.status === "done" && (
                  <div className="flex flex-wrap gap-2">
                    {result.downloadUrl && (
                      <a href={result.downloadUrl} download target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="gradient-bg text-primary-foreground">
                          <Download className="w-3 h-3 mr-1" /> Descarcă MP4
                        </Button>
                      </a>
                    )}
                    {result.translatedText && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadSubtitles(result.translatedText!, `subtitles-${i}.txt`)}
                      >
                        <FileText className="w-3 h-3 mr-1" /> Descarcă subtitrări
                      </Button>
                    )}
                    {result.translatedText && (
                      <details className="w-full">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          <Languages className="w-3 h-3 inline mr-1" /> Vezi text tradus
                        </summary>
                        <div className="mt-2 p-3 bg-muted rounded-xl text-sm whitespace-pre-wrap max-h-40 overflow-auto">
                          {result.translatedText}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
