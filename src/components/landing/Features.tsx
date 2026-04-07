import { motion } from "framer-motion";
import { Brain, AudioLines, Eraser, Film } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Extragere Neurală & Traducere",
    description: "Algoritmul descarcă video-ul, izolează subtitrarea originală și aplică o traducere nativă impecabilă.",
  },
  {
    icon: AudioLines,
    title: "Masterizare Audio AI",
    description: "Taie automat spațiile moarte din videoclip și aplică voiceover-uri naturale peste textul tău.",
  },
  {
    icon: Eraser,
    title: "Inpainting Watermarks",
    description: "Șterge perfect logo-urile sau textele lipite. AI-ul reconstruiește pixelii din fundal fără efort.",
  },
  {
    icon: Film,
    title: "Cinema Video Generation",
    description: "Transformă prompturile în clipuri cinematice 4K, perfecte pentru a acoperi cadrele lipsă.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Accelerează-ți fluxul de lucru</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Execuție instantanee.{" "}
            <span className="gradient-text">Fără efort.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Sistemul nostru a fost gândit să reducă 4 ore de editare la doar 4 secunde.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-card p-6 border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
