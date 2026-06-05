import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import PublicOnlyRoute from "@/components/common/PublicOnlyRoute";
import AppLayout from "@/layouts/AppLayout";
import ApplicationDetailsPage from "@/pages/ApplicationDetailsPage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import DashboardPage from "@/pages/DashboardPage";
import FormsApplyPage from "@/pages/FormsApplyPage";
import FormsApplyStartPage from "@/pages/FormsApplyStartPage";
import FormsCreatePage from "@/pages/FormsCreatePage";
import FormsViewPage from "@/pages/FormsViewPage";
import LoginPage from "@/pages/LoginPage";
import MyApplicationsPage from "@/pages/MyApplicationsPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ProgramsCreatePage from "@/pages/ProgramsCreatePage";
import ProgramsViewPage from "@/pages/ProgramsViewPage";
import RegisterPage from "@/pages/RegisterPage";
import UsersViewPage from "@/pages/UsersViewPage";
import VerifyEmailOtpPage from "@/pages/VerifyEmailOtpPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route
            path="/applications/for-signature"
            element={<ApplicationsPage />}
          />
          <Route
            path="/applications/for-signature/:applicationId"
            element={<ApplicationDetailsPage />}
          />
          <Route path="/applications/my" element={<MyApplicationsPage />} />
          <Route
            path="/applications/my/:applicationId"
            element={<ApplicationDetailsPage />}
          />
          <Route
            path="/applications/:applicationId"
            element={<ApplicationDetailsPage />}
          />
          <Route path="/forms/apply" element={<FormsApplyStartPage />} />
          <Route path="/forms/apply/:formId" element={<FormsApplyPage />} />
          <Route path="/forms/create" element={<FormsCreatePage />} />
          <Route path="/forms/create/:formId" element={<FormsCreatePage />} />
          <Route path="/forms/view" element={<FormsViewPage />} />
          <Route
            path="/users/add"
            element={
              <RegisterPage
                eyebrow="Users"
                title="Add user"
                description="Create a user account and assign their basic profile details."
                loadingTitle="Saving user"
                loadingDescription="We are creating the user account."
                requireEmailVerification={false}
                submitLabel="Save User"
                successMessage="User created successfully."
              />
            }
          />
          <Route path="/users/view" element={<UsersViewPage />} />
          <Route path="/programs/create" element={<ProgramsCreatePage />} />
          <Route path="/programs/view" element={<ProgramsViewPage />} />
        </Route>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/verify" element={<VerifyEmailOtpPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
