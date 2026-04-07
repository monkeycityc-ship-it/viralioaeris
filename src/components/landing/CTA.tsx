import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="py-24 hero-gradient-bg">
      <div className="container px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Ești gata să devii viral?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Începe acum. Primești 10 credite + 3000 cuvinte la înscriere.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gradient-bg text-primary-foreground hover:opacity-90 text-lg px-10 py-6 font-bold glow-primary">
              <Zap className="w-5 h-5 mr-2" />
              Deblochează Studio
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
