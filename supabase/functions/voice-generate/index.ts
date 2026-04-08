import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICE_MAP: Record<string, string> = {
  "roger": "CwhRBWXzGAHq8TQ4Fs17",
  "sarah": "EXAVITQu4vr4xnSDxMaL",
  "laura": "FGY2WhTYpPnrIDTdsKH5",
  "charlie": "IKne3meq5aSn9XLyUdCD",
  "george": "JBFqnCBsd6RMkjVDRZzb",
  "liam": "TX3LPaxmHKxFdv7VOQHJ",
  "alice": "Xb7hH8MSUJpSbSDYk0k2",
  "matilda": "XrExE9yKIg1WjnnlVkGX",
  "jessica": "cgSgspJ2msm6clMCkdW9",
  "eric": "cjVigY5qzO86Huf0OWal",
  "chris": "iP95p4xoKVk53GoZ742B",
  "brian": "nPczCjzI2devNBz1zQrb",
  "daniel": "onwK4e9ZLuTAKqWW03F9",
  "lily": "pFZP5JQG7iQjIQuC4Bku",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, stability, speed } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: "Text too long (max 5000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
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

    // Check credits (audio costs 2 credits)
    const creditCost = 2;
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, is_banned, voice_characters_remaining")
      .eq("user_id", userId)
      .single();

    if (profile?.is_banned) {
      return new Response(JSON.stringify({ error: "Account suspended" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((profile?.credits ?? 0) < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((profile?.voice_characters_remaining ?? 0) < text.length) {
      return new Response(JSON.stringify({ error: "Voice character limit reached" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve voice ID
    const voiceId = VOICE_MAP[voice ?? "sarah"] ?? VOICE_MAP["sarah"];

    // Call ElevenLabs TTS
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: speed ?? 1.0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("ElevenLabs error:", ttsResponse.status, errText);
      return new Response(JSON.stringify({ error: "Voice generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Upload to storage
    const fileName = `${userId}/audio/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, audioBytes, { contentType: "audio/mpeg" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to store audio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(uploadData.path);

    // Save generation
    await supabase.from("generations").insert({
      user_id: userId,
      type: "audio",
      prompt: text.substring(0, 500),
      result_url: publicUrl,
      result_text: `Voice: ${voice ?? "sarah"} | ${text.length} chars`,
      status: "done",
      credits_used: creditCost,
      metadata: { voice: voice ?? "sarah", stability, speed, char_count: text.length },
    });

    // Deduct credits and voice characters
    await supabase.from("profiles").update({
      credits: (profile?.credits ?? 0) - creditCost,
      voice_characters_remaining: (profile?.voice_characters_remaining ?? 0) - text.length,
    }).eq("user_id", userId);

    return new Response(JSON.stringify({ result_url: publicUrl, voice, chars_used: text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice generate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
