import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, RotateCcw, Loader2, Scissors, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CaptionEraser() {
  const { user, profile, refreshProfile } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "select" | "preview">("upload");
  const [intensity, setIntensity] = useState(50); // 0-100

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Te rog selectează un fișier video.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Fișierul este prea mare (max 100MB).");
      return;
    }
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setSelection(null);
    setProcessedUrl(null);
    setStep("select");
  };

  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== "select") return;
    const coords = getRelativeCoords(e);
    setDrawStart(coords);
    setIsDrawing(true);
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const coords = getRelativeCoords(e);
    setSelection({
      x: Math.min(drawStart.x, coords.x),
      y: Math.min(drawStart.y, coords.y),
      width: Math.abs(coords.x - drawStart.x),
      height: Math.abs(coords.y - drawStart.y),
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDrawStart(null);
  };

  // Get blur settings based on intensity
  const getBlurSettings = (intensityValue: number) => {
    if (intensityValue <= 33) {
      // Low: gentle gaussian blur + color match overlay
      return { blurPx: 8, overlayAlpha: 0.3, method: "soft" as const };
    } else if (intensityValue <= 66) {
      // Medium: moderate blur + semi-transparent fill
      return { blurPx: 15, overlayAlpha: 0.2, method: "medium" as const };
    } else {
      // High: strong blur
      return { blurPx: 25, overlayAlpha: 0.1, method: "strong" as const };
    }
  };

  const handlePreview = () => {
    if (!videoRef.current || !previewCanvasRef.current || !selection) return;
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d")!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const blurX = Math.round(selection.x * video.videoWidth);
    const blurY = Math.round(selection.y * video.videoHeight);
    const blurW = Math.round(selection.width * video.videoWidth);
    const blurH = Math.round(selection.height * video.videoHeight);

    const settings = getBlurSettings(intensity);

    // Draw full frame
    ctx.drawImage(video, 0, 0);

    // Sample surrounding colors for natural fill
    const surroundingData = ctx.getImageData(
      Math.max(0, blurX - 5),
      Math.max(0, blurY - 5),
      Math.min(blurW + 10, canvas.width - blurX + 5),
      Math.min(blurH + 10, canvas.height - blurY + 5)
    );

    // Calculate average color from edges
    let r = 0, g = 0, b = 0, count = 0;
    const d = surroundingData.data;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
    }
    if (count > 0) { r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count); }

    // Apply blur to selected region
    ctx.save();
    ctx.filter = `blur(${settings.blurPx}px)`;
    ctx.beginPath();
    ctx.rect(blurX, blurY, blurW, blurH);
    ctx.clip();
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    // Apply color-matching overlay for natural look
    ctx.save();
    ctx.globalAlpha = settings.overlayAlpha;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(blurX, blurY, blurW, blurH);
    ctx.restore();

    // Feather edges with gradient for softer transition
    const featherSize = Math.min(blurW, blurH) * 0.15;
    // Top edge
    const topGrad = ctx.createLinearGradient(blurX, blurY, blurX, blurY + featherSize);
    topGrad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    ctx.fillRect(blurX, blurY, blurW, featherSize);
    // Bottom edge
    const botGrad = ctx.createLinearGradient(blurX, blurY + blurH, blurX, blurY + blurH - featherSize);
    botGrad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
    botGrad.addColorStop(1, "transparent");
    ctx.fillStyle = botGrad;
    ctx.fillRect(blurX, blurY + blurH - featherSize, blurW, featherSize);
  };

  const processVideo = useCallback(async () => {
    if (!videoFile || !selection || !videoRef.current || !canvasRef.current || !user) return;

    if ((profile?.credits ?? 0) < 5) {
      toast.error("Nu ai suficiente credite (5 necesare).");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const blurX = Math.round(selection.x * video.videoWidth);
      const blurY = Math.round(selection.y * video.videoHeight);
      const blurW = Math.round(selection.width * video.videoWidth);
      const blurH = Math.round(selection.height * video.videoHeight);

      const settings = getBlurSettings(intensity);

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      video.currentTime = 0;
      await new Promise<void>((r) => { video.onseeked = () => r(); video.currentTime = 0; });

      mediaRecorder.start();
      video.muted = true;
      await video.play();

      const duration = video.duration;
      let avgR = 128, avgG = 128, avgB = 128;

      const renderFrame = () => {
        if (video.paused || video.ended) { mediaRecorder.stop(); return; }

        ctx.drawImage(video, 0, 0);

        // Sample surrounding colors every few frames for natural fill
        try {
          const sampleData = ctx.getImageData(
            Math.max(0, blurX - 2), Math.max(0, blurY - 2),
            Math.min(blurW + 4, canvas.width - blurX + 2),
            Math.min(blurH + 4, canvas.height - blurY + 2)
          );
          const d = sampleData.data;
          let sr = 0, sg = 0, sb = 0, sc = 0;
          for (let i = 0; i < d.length; i += 16) {
            sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sc++;
          }
          if (sc > 0) { avgR = Math.round(sr / sc); avgG = Math.round(sg / sc); avgB = Math.round(sb / sc); }
        } catch {}

        // Apply blur
        ctx.save();
        ctx.filter = `blur(${settings.blurPx}px)`;
        ctx.beginPath();
        ctx.rect(blurX, blurY, blurW, blurH);
        ctx.clip();
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        // Color-matching overlay
        ctx.save();
        ctx.globalAlpha = settings.overlayAlpha;
        ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
        ctx.fillRect(blurX, blurY, blurW, blurH);
        ctx.restore();

        setProgress(Math.round((video.currentTime / duration) * 100));
        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);
      const processedBlob = await recordingDone;
      video.pause();

      const fileName = `caption-erased/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, processedBlob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);

      const { error: fnError } = await supabase.functions.invoke("caption-erase", {
        body: {
          resultUrl: urlData.publicUrl,
          originalFileName: videoFile.name,
          selectionArea: selection,
        },
      });

      if (fnError) throw fnError;

      setProcessedUrl(urlData.publicUrl);
      setStep("preview");
      await refreshProfile();
      toast.success("Video procesat cu succes! 5 credite folosite.");
    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error(err.message || "Eroare la procesarea video-ului.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [videoFile, selection, user, profile, refreshProfile, intensity]);

  const reset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setSelection(null);
    setProcessedUrl(null);
    setStep("upload");
    setIntensity(50);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const intensityLabel = intensity <= 33 ? "Ușor" : intensity <= 66 ? "Mediu" : "Puternic";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black">
            <span className="gradient-text">Caption Eraser</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Încarcă un video, selectează zona cu text și elimină subtitrările natural.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cost: 5 credite per video</p>
        </div>

        {/* Upload step */}
        {step === "upload" && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-16 text-center cursor-pointer hover:border-primary/40 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold">Trage sau click pentru a încărca un video</p>
            <p className="text-sm text-muted-foreground mt-1">MP4, WebM, MOV — max 100MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Selection step */}
        {step === "select" && videoUrl && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-medium mb-3">
                🎯 Desenează un dreptunghi peste zona cu subtitrări:
              </p>
              <div className="relative inline-block w-full">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full rounded-xl"
                  controls={false}
                  preload="auto"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = videoRef.current.duration * 0.3;
                    }
                  }}
                />
                <div
                  ref={overlayRef}
                  className="absolute inset-0 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {selection && (
                    <div
                      className="absolute border-2 border-primary/60 bg-primary/10 rounded"
                      style={{
                        left: `${selection.x * 100}%`,
                        top: `${selection.y * 100}%`,
                        width: `${selection.width * 100}%`,
                        height: `${selection.height * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Zonă de ștergere
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Intensity Slider */}
            {selection && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Intensitate ștergere</label>
                  <span className="text-sm font-semibold gradient-text">{intensityLabel}</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={(v) => setIntensity(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ușor (natural)</span>
                  <span>Mediu</span>
                  <span>Puternic</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetare
              </Button>
              {selection && (
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Previzualizare
                </Button>
              )}
              <Button
                onClick={processVideo}
                disabled={!selection || processing}
                className="gradient-bg text-primary-foreground"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesare... {progress}%
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Elimină Subtitrări (5 Credite)
                  </>
                )}
              </Button>
            </div>

            {/* Preview canvas */}
            <canvas ref={previewCanvasRef} className="w-full rounded-xl border border-border" style={{ display: previewCanvasRef.current?.width ? "block" : "none" }} />
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && processedUrl && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-medium mb-3">✅ Video procesat — previzualizare:</p>
              <video src={processedUrl} controls className="w-full rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Video Nou
              </Button>
              <a href={processedUrl} download="caption-erased.webm">
                <Button className="gradient-bg text-primary-foreground">
                  <Download className="w-4 h-4 mr-2" />
                  Descarcă Video
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </DashboardLayout>
  );
}
