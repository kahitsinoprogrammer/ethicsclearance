import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessModule,
  getDefaultAuthenticatedRoute,
  type ModuleAccessKey
} from "@/lib/moduleAccess";

type ModuleProtectedRouteProps = {
  module: ModuleAccessKey;
};

export default function ModuleProtectedRoute({
  module
}: ModuleProtectedRouteProps) {
  const location = useLocation();
  const { user } = useAuth();

  if (canAccessModule(user, module)) {
    return <Outlet />;
  }

  return (
    <Navigate
      replace
      state={{ from: location }}
      to={getDefaultAuthenticatedRoute(user)}
    />
  );
}
