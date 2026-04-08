import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BatchDownloadButtonProps {
  selectedIds: string[];
  onClear: () => void;
}

export default function BatchDownloadButton({ selectedIds, onClear }: BatchDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleBatchDownload = async () => {
    setDownloading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ generation_ids: selectedIds }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `viralio-batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${selectedIds.length} fișiere descărcate!`);
      onClear();
    } catch (err: any) {
      toast.error(err.message || "Eroare la descărcare");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
      <Package className="w-5 h-5 text-primary" />
      <span className="text-sm font-medium">{selectedIds.length} selectate</span>
      <Button
        size="sm"
        onClick={handleBatchDownload}
        disabled={downloading}
        className="gradient-bg text-primary-foreground"
      >
        {downloading ? (
          <span className="flex items-center gap-2"><span className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" /> Se pregătește...</span>
        ) : (
          <span className="flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Descarcă ZIP</span>
        )}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>Anulează</Button>
    </div>
  );
}
