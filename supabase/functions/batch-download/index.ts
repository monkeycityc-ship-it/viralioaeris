import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_ids } = await req.json();

    if (!Array.isArray(generation_ids) || generation_ids.length === 0) {
      return new Response(JSON.stringify({ error: "generation_ids array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (generation_ids.length > 20) {
      return new Response(JSON.stringify({ error: "Max 20 files per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch generations owned by the user
    const { data: generations, error } = await supabase
      .from("generations")
      .select("id, result_url, type, prompt, created_at")
      .in("id", generation_ids)
      .eq("user_id", userId);

    if (error || !generations?.length) {
      return new Response(JSON.stringify({ error: "No files found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only items with result_url
    const downloadable = generations.filter((g) => g.result_url);

    if (downloadable.length === 0) {
      return new Response(JSON.stringify({ error: "No downloadable files found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all files
    const files: Record<string, Uint8Array> = {};
    let idx = 0;

    for (const gen of downloadable) {
      try {
        const response = await fetch(gen.result_url!);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const ext = gen.type === "video" ? "mp4" : gen.type === "image" ? "png" : gen.type === "audio" ? "mp3" : "bin";
        const safeName = gen.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `viralio_${gen.type}_${safeName}_${idx}.${ext}`;
        files[fileName] = new Uint8Array(buffer);
        idx++;
      } catch (e) {
        console.error(`Failed to fetch ${gen.result_url}:`, e);
      }
    }

    if (Object.keys(files).length === 0) {
      return new Response(JSON.stringify({ error: "Failed to fetch any files" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create zip
    const zipped = zipSync(files);

    return new Response(zipped, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="viralio-batch-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error("Batch download error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
