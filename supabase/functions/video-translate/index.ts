import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const targetLang = (formData.get("targetLang") as string) ?? "en";

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Audio file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const authHeader = req.headers.get("Authorization");
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

    // Check credits (3 credits for translation)
    const { data: profile } = await supabase.from("profiles").select("credits, is_banned").eq("user_id", userId).single();
    if (profile?.is_banned) {
      return new Response(JSON.stringify({ error: "Account suspended" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((profile?.credits ?? 0) < 3) {
      return new Response(JSON.stringify({ error: "Insufficient credits (need 3)" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: Transcribe with ElevenLabs
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sttFormData = new FormData();
    sttFormData.append("file", audioFile);
    sttFormData.append("model_id", "scribe_v2");
    sttFormData.append("tag_audio_events", "false");
    sttFormData.append("diarize", "false");

    const sttResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: sttFormData,
    });

    if (!sttResponse.ok) {
      const errText = await sttResponse.text();
      console.error("STT error:", errText);
      return new Response(JSON.stringify({ error: "Speech-to-text failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const transcription = await sttResponse.json();
    const originalText = transcription.text || "";

    if (!originalText.trim()) {
      return new Response(JSON.stringify({ error: "No speech detected in audio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Translate with AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const langNames: Record<string, string> = {
      en: "English", ro: "Romanian", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ja: "Japanese", ko: "Korean", zh: "Chinese",
      ar: "Arabic", hi: "Hindi", ru: "Russian", tr: "Turkish", pl: "Polish",
    };

    const translateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional translator. Translate the following text accurately while preserving tone and meaning. Return ONLY the translated text, nothing else." },
          { role: "user", content: `Translate the following text to ${langNames[targetLang] ?? targetLang}:\n\n${originalText}` },
        ],
      }),
    });

    if (!translateResponse.ok) {
      return new Response(JSON.stringify({ error: "Translation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const translateData = await translateResponse.json();
    const translatedText = translateData.choices?.[0]?.message?.content ?? "";

    // Step 3: Generate SRT from word timestamps if available
    let srtContent = "";
    const words = transcription.words;
    if (words && words.length > 0) {
      // Group into ~8-word subtitle segments
      const segments: { text: string; start: number; end: number }[] = [];
      for (let i = 0; i < words.length; i += 8) {
        const chunk = words.slice(i, i + 8);
        segments.push({
          text: chunk.map((w: any) => w.text).join(" "),
          start: chunk[0].start,
          end: chunk[chunk.length - 1].end,
        });
      }
      srtContent = segments.map((s, idx) => {
        const fmt = (t: number) => {
          const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60);
          const sec = Math.floor(t % 60); const ms = Math.floor((t % 1) * 1000);
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
        };
        return `${idx + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}\n`;
      }).join("\n");
    }

    // Deduct credits
    await supabase.from("profiles").update({ credits: (profile?.credits ?? 0) - 3 }).eq("user_id", userId);

    // Save generation
    await supabase.from("generations").insert({
      user_id: userId,
      type: "text",
      prompt: `Video Translation to ${langNames[targetLang] ?? targetLang}`,
      result_text: translatedText,
      status: "done",
      credits_used: 3,
      metadata: { feature: "video-translator", targetLang, originalText, srt: srtContent },
    });

    return new Response(JSON.stringify({
      originalText,
      translatedText,
      srt: srtContent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Video translate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
