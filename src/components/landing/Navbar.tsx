import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Viralio</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Tehnologie</a>
          <a href="#ecosystem" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Ecosistem</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Acces</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button className="gradient-bg text-primary-foreground hover:opacity-90 font-semibold">
                Deschide Studio
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="text-sm font-medium text-muted-foreground">
                  Intră în cont
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="gradient-bg text-primary-foreground hover:opacity-90 font-semibold">
                  Începe Gratuit →
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
