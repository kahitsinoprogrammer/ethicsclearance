import { Navigate, Outlet } from "react-router-dom";

import LoadingModal from "@/components/common/LoadingModal";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicOnlyRoute() {
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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
