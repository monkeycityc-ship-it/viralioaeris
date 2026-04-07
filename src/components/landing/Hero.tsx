import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center hero-gradient-bg pt-16">
      <div className="container px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
            Creează clipuri virale{" "}
            <span className="gradient-text">de 10x mai rapid.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Nu mai pierde ore cu editarea. Folosește infrastructura AI Viralio pentru a genera, curăța și scala conținutul tău direct pentru piața internațională.
          </p>

          <p className="text-base font-semibold text-foreground mb-8">
            Primești 10 credite + 3000 cuvinte gratuite la înregistrare.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gradient-bg text-primary-foreground hover:opacity-90 text-lg px-8 py-6 font-bold glow-primary">
                <Zap className="w-5 h-5 mr-2" />
                Deschide Studio
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-medium border-border">
              ▶ Vezi cum funcționează
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full gradient-bg border-2 border-background" />
              ))}
              <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                1k+
              </div>
            </div>
            <div className="text-left text-sm">
              <p className="text-muted-foreground">Zilnic folosit de creatori</p>
              <p className="text-muted-foreground">cu peste <strong className="text-foreground">500M+</strong> vizualizări.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
