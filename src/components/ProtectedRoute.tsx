import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canUseTool, ROUTE_TO_TOOL } from "@/lib/plan-limits";
import { toast } from "sonner";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Check if user is banned
  const isBanned = profile?.is_banned === true;

  // Check tool access based on plan
  const toolKey = ROUTE_TO_TOOL[location.pathname];
  const plan = profile?.plan ?? "free";
  const hasAccess = toolKey ? canUseTool(plan, toolKey) : true;

  useEffect(() => {
    if (!loading && user && isBanned) {
      toast.error("Contul tău a fost suspendat. Contactează suportul.");
    }
    if (!loading && user && !hasAccess && toolKey) {
      toast.error(`Planul tău (${plan}) nu include acces la acest instrument. Upgrade necesar!`);
    }
  }, [loading, user, isBanned, hasAccess, toolKey, plan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isBanned) return <Navigate to="/auth" replace />;
  if (!hasAccess && toolKey) return <Navigate to="/pricing" replace />;

  return <>{children}</>;
}
