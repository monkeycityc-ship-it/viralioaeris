import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Viralio</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Viralio. Toate drepturile rezervate.
        </p>
      </div>
    </footer>
  );
}
