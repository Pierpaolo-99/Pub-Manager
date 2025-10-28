import { useAuth } from "../context/Authcontext";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  // Se l'utente non è loggato → torna al login
  if (!user) return <Navigate to="/login" replace />;

  // Se l'utente è loggato ma non ha il ruolo richiesto → homepage
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
