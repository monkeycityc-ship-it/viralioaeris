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
    const { prompt, type, referenceImage, aspectRatio, width, height } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!type || !["text", "image", "video"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user credits
    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits, is_banned")
        .eq("user_id", userId)
        .single();

      if (profile?.is_banned) {
        return new Response(JSON.stringify({ error: "Account suspended" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const creditCost = type === "text" ? 1 : type === "image" ? 2 : 5;
      if ((profile?.credits ?? 0) < creditCost) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // TEXT GENERATION - streaming
    if (type === "text") {
      const systemPrompt = "You are Viralio AI, a creative content assistant specializing in viral social media content. Write in Romanian when the prompt is in Romanian. Be creative, engaging and concise.";

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // IMAGE GENERATION
    if (type === "image") {
      const imgWidth = width ?? 1024;
      const imgHeight = height ?? 1024;
      const sizeInstruction = `Generate the image at ${imgWidth}x${imgHeight} pixels (aspect ratio: ${aspectRatio ?? "1:1"}).`;

      const imageMessages: any[] = [
        {
          role: "user",
          content: referenceImage
            ? [
                { type: "text", text: `${sizeInstruction} ${prompt}` },
                { type: "image_url", image_url: { url: referenceImage } },
              ]
            : `${sizeInstruction} ${prompt}`,
        },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: imageMessages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        return new Response(JSON.stringify({ error: "Image generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const resultText = data.choices?.[0]?.message?.content;

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: "No image generated", result_text: resultText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upload base64 to storage
      let storedUrl = imageUrl;
      if (imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.split(",")[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${userId ?? "anon"}/${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, binaryData, { contentType: "image/png" });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(uploadData.path);
          storedUrl = publicUrl;
        }
      }

      // Save to DB
      if (userId) {
        await supabase.from("generations").insert({
          user_id: userId,
          type: "image",
          prompt,
          result_url: storedUrl,
          result_text: resultText,
          status: "done",
          credits_used: 2,
          metadata: { aspectRatio: aspectRatio ?? "1:1", width: width ?? 1024, height: height ?? 1024 },
        });

        const { data: profile } = await supabase.from("profiles").select("credits").eq("user_id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ credits: profile.credits - 2 }).eq("user_id", userId);
        }
      }

      return new Response(JSON.stringify({ result_url: storedUrl, result_text: resultText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VIDEO GENERATION
    if (type === "video") {
      // Create pending generation
      let generationId: string | null = null;
      if (userId) {
        const { data: gen } = await supabase.from("generations").insert({
          user_id: userId,
          type: "video",
          prompt,
          status: "processing",
          credits_used: 5,
        }).select("id").single();
        generationId = gen?.id ?? null;
      }

      // Use image generation as frames, then describe the video concept
      const videoMessages: any[] = [
        {
          role: "user",
          content: referenceImage
            ? [
                { type: "text", text: `Create a key frame image for this video concept: ${prompt}` },
                { type: "image_url", image_url: { url: referenceImage } },
              ]
            : `Create a key frame image for this video concept: ${prompt}`,
        },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: videoMessages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (generationId) {
          await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
        }
        return new Response(JSON.stringify({ error: "Video generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const frameUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const description = data.choices?.[0]?.message?.content;

      let storedUrl = frameUrl ?? "";
      if (frameUrl?.startsWith("data:image")) {
        const base64Data = frameUrl.split(",")[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${userId ?? "anon"}/video-frame-${Date.now()}.png`;
        const { data: uploadData } = await supabase.storage.from("media").upload(fileName, binaryData, { contentType: "image/png" });
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(uploadData.path);
          storedUrl = publicUrl;
        }
      }

      if (generationId) {
        await supabase.from("generations").update({
          status: "done",
          result_url: storedUrl,
          result_text: description,
          thumbnail_url: storedUrl,
        }).eq("id", generationId);

        const { data: profile } = await supabase.from("profiles").select("credits").eq("user_id", userId!).single();
        if (profile) {
          await supabase.from("profiles").update({ credits: profile.credits - 5 }).eq("user_id", userId!);
        }
      }

      return new Response(JSON.stringify({ result_url: storedUrl, result_text: description, status: "done" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
