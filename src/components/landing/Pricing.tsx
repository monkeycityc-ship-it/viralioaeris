import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "49.90",
    annualPrice: "41.58",
    credits: 150,
    features: ["Acces la toate aplicațiile", "Istoric sesiune (7 zile)", "50.000 Caractere Voce AI"],
    recommended: false,
  },
  {
    name: "Creator PRO",
    price: "99.90",
    annualPrice: "83.25",
    credits: 400,
    features: [
      "Tot ce e inclus în Starter",
      "Istoric Cloud Salvat (30 zile)",
      "150.000 Caractere Voce AI",
      "Procesare Prioritară",
      "Acces Beta noi aplicații",
    ],
    recommended: true,
  },
  {
    name: "Agency",
    price: "249.90",
    annualPrice: "208.25",
    credits: 1500,
    features: [
      "Cel mai mic cost per credit",
      "500.000 Caractere Voce AI",
      "Licență Comercială Extinsă",
      "Suport VIP Dedicat",
    ],
    recommended: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="container px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Abonamente Lunare</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Scalează-ți conținutul.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Alege pachetul care se potrivește volumului tău de muncă.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-8 border relative ${
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
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-muted-foreground text-sm">RON / Lună</span>
              </div>
              <p className="text-sm font-semibold gradient-text mb-6">{plan.credits} Credite Ecosistem</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  className={`w-full font-semibold ${
                    plan.recommended
                      ? "gradient-bg text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Alege {plan.name}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
