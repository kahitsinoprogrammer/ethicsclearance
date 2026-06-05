import { Navigate, Outlet, useLocation } from "react-router-dom";

import LoadingModal from "@/components/common/LoadingModal";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <LoadingModal
        open
        title="Checking session"
        description="We are verifying your access token."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
