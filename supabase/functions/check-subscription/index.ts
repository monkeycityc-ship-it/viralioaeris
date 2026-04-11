import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_PLANS: Record<string, { plan: string; credits: number; voiceCharacters: number }> = {
  "prod_UI98WvS5cnP7V3": { plan: "starter", credits: 150, voiceCharacters: 50000 },
  "prod_UI98plezaPFEFI": { plan: "creator_pro", credits: 400, voiceCharacters: 150000 },
  "prod_UI987GnQ3bKI3P": { plan: "agency", credits: 1500, voiceCharacters: 500000 },
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
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // No customer — reset to free
      await supabaseClient.from("profiles").update({
        plan: "free",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active sub — reset to free
      await supabaseClient.from("profiles").update({
        plan: "free",
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0].price.product as string;
    const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

    const planInfo = PRODUCT_PLANS[productId];
    if (planInfo) {
      // Get current profile to check if plan changed
      const { data: currentProfile } = await supabaseClient
        .from("profiles")
        .select("plan, credits")
        .eq("user_id", user.id)
        .single();

      const updateData: Record<string, any> = {
        plan: planInfo.plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
      };

      // If plan changed (upgrade/downgrade), reset credits and voice chars
      if (currentProfile?.plan !== planInfo.plan) {
        updateData.credits = planInfo.credits;
        updateData.voice_characters_remaining = planInfo.voiceCharacters;
        updateData.characters_limit = planInfo.voiceCharacters;
        updateData.characters_used = 0;
      }

      await supabaseClient.from("profiles").update(updateData).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: true,
      product_id: productId,
      subscription_end: subscriptionEnd,
      plan: planInfo?.plan || "unknown",
    }), {
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
