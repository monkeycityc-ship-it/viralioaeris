import { useState, useRef, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Upload, Play, Download, RotateCcw, Loader2, Scissors } from "lucide-react";
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

      // Set canvas to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const blurX = Math.round(selection.x * video.videoWidth);
      const blurY = Math.round(selection.y * video.videoHeight);
      const blurW = Math.round(selection.width * video.videoWidth);
      const blurH = Math.round(selection.height * video.videoHeight);

      // Use MediaRecorder to capture canvas as video
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
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });

      // Play video and render frames with blur applied
      video.currentTime = 0;
      await new Promise<void>((r) => {
        video.onseeked = () => r();
        video.currentTime = 0;
      });

      mediaRecorder.start();
      video.muted = true;
      await video.play();

      const duration = video.duration;
      const renderFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }

        // Draw full frame
        ctx.drawImage(video, 0, 0);

        // Apply blur to selected region
        ctx.save();
        ctx.filter = "blur(20px)";
        ctx.beginPath();
        ctx.rect(blurX, blurY, blurW, blurH);
        ctx.clip();
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        // Draw a subtle overlay on blurred area for extra coverage
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = "#000";
        ctx.fillRect(blurX, blurY, blurW, blurH);
        ctx.restore();

        setProgress(Math.round((video.currentTime / duration) * 100));
        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);

      const processedBlob = await recordingDone;
      video.pause();

      // Upload to storage
      const fileName = `caption-erased/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, processedBlob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);

      // Deduct credits & save generation record via edge function
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
  }, [videoFile, selection, user, profile, refreshProfile]);

  const reset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setSelection(null);
    setProcessedUrl(null);
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black">
            <span className="gradient-text">Caption Eraser</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Încarcă un video, selectează zona cu text și elimină subtitrările automat.
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
                🎯 Desenează un dreptunghi peste zona cu subtitrări pe care vrei să o elimini:
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
                      className="absolute border-2 border-primary bg-primary/20 rounded"
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetare
              </Button>
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
