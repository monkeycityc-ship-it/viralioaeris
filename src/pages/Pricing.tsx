import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Check, Zap, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "0",
    priceId: null,
    productId: null,
    credits: 10,
    features: [
      "10 credite inițiale",
      "Acces la toate instrumentele",
      "Istoric 24h",
      "Calitate standard",
    ],
    recommended: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: "9.99",
    priceId: "price_1TJYqGQfAp5rAGwinjaUIktA",
    productId: "prod_UI98WvS5cnP7V3",
    credits: 150,
    features: [
      "150 credite / lună",
      "Acces la toate instrumentele",
      "Istoric 7 zile",
      "50.000 caractere voce AI",
      "Procesare standard",
    ],
    recommended: false,
  },
  {
    key: "creator_pro",
    name: "Creator PRO",
    price: "19.99",
    priceId: "price_1TJYqTQfAp5rAGwib6X3OZT0",
    productId: "prod_UI98plezaPFEFI",
    credits: 400,
    features: [
      "400 credite / lună",
      "Tot ce e inclus în Starter",
      "Istoric 30 zile",
      "150.000 caractere voce AI",
      "Procesare prioritară",
      "Acces Beta funcții noi",
    ],
    recommended: true,
  },
  {
    key: "agency",
    name: "Agency",
    price: "49.99",
    priceId: "price_1TJYqUQfAp5rAGwiIhosRsgv",
    productId: "prod_UI987GnQ3bKI3P",
    credits: 1500,
    features: [
      "1500 credite / lună",
      "Tot ce e inclus în Creator PRO",
      "500.000 caractere voce AI",
      "Licență comercială extinsă",
      "Suport VIP dedicat",
      "Cel mai mic cost per credit",
    ],
    recommended: false,
  },
];

export default function Pricing() {
  const { profile, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      toast.error("Trebuie să fii autentificat!");
      return;
    }

    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Eroare la crearea sesiunii de plată");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Eroare la deschiderea portalului");
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlan = profile?.plan ?? "free";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black">
            <span className="gradient-text">Planuri & Prețuri</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Alege planul potrivit pentru nevoile tale de creație.
          </p>
          {currentPlan !== "free" && (
            <Button variant="outline" className="mt-4" onClick={handleManageSubscription} disabled={loadingPlan === "portal"}>
              {loadingPlan === "portal" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Gestionează abonamentul
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrentPlan = currentPlan === plan.key;
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 border relative flex flex-col ${
                  plan.recommended
                    ? "border-primary glow-primary bg-card"
                    : "border-border bg-card"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 gradient-bg text-primary-foreground text-xs font-bold rounded-full">
                    Recomandat
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-success text-success-foreground text-xs font-bold rounded-full">
                    Planul tău
                  </div>
                )}

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black">${plan.price}</span>
                  {plan.price !== "0" && (
                    <span className="text-muted-foreground text-sm">/ lună</span>
                  )}
                </div>
                <p className="text-sm font-semibold gradient-text mb-4">
                  {plan.credits} Credite {plan.price !== "0" ? "/ lună" : ""}
                </p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.priceId ? (
                  <Button
                    onClick={() => handleSubscribe(plan.priceId!)}
                    disabled={isCurrentPlan || loadingPlan === plan.priceId}
                    className={`w-full font-semibold ${
                      plan.recommended
                        ? "gradient-bg text-primary-foreground hover:opacity-90"
                        : ""
                    }`}
                    variant={plan.recommended ? "default" : "outline"}
                  >
                    {loadingPlan === plan.priceId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {isCurrentPlan ? "Plan activ" : "Alege planul"}
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full font-semibold">
                    {isCurrentPlan ? "Plan activ" : "Plan gratuit"}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
