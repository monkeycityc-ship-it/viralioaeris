import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { urls, quality, targetLanguage } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error("No URLs provided");
    }
    if (urls.length > 5) {
      throw new Error("Maximum 5 URLs allowed");
    }

    // Validate URLs
    const urlPattern = /^https?:\/\/.+/;
    for (const url of urls) {
      if (!urlPattern.test(url)) {
        throw new Error(`Invalid URL: ${url}`);
      }
    }

    // Check credits (3 per video)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    const totalCost = urls.length * 3;
    if (!profile || profile.credits < totalCost) {
      throw new Error(`Nu ai suficiente credite. Necesare: ${totalCost}, Disponibile: ${profile?.credits ?? 0}`);
    }

    // Call external VPS endpoint
    const vpsEndpoint = Deno.env.get("VIDEO_DOWNLOAD_VPS_URL");
    if (!vpsEndpoint) {
      throw new Error("Video download service is not configured. Please set VIDEO_DOWNLOAD_VPS_URL secret.");
    }

    const vpsResponse = await fetch(vpsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, quality: quality || "720p", targetLanguage }),
    });

    if (!vpsResponse.ok) {
      const errBody = await vpsResponse.text();
      throw new Error(`Download service error: ${errBody}`);
    }

    const results = await vpsResponse.json();

    // Deduct credits
    await supabaseClient.from("profiles").update({
      credits: profile.credits - totalCost,
    }).eq("user_id", user.id);

    // Save to generations
    for (const result of results.videos || []) {
      await supabaseClient.from("generations").insert({
        user_id: user.id,
        type: "video",
        prompt: result.url || "Video Download",
        result_url: result.downloadUrl || null,
        result_text: result.translatedText || null,
        status: result.error ? "failed" : "done",
        credits_used: 3,
        metadata: {
          tool: "video-downloader",
          quality,
          targetLanguage,
          originalTitle: result.title,
          subtitlesUrl: result.subtitlesUrl,
          error: result.error,
        },
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
