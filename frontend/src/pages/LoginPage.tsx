import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";

import FormField from "@/components/common/FormField";
import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { type EmailVerificationRequiredErrorData } from "@/lib/api";

type LoginFormValues = {
  password: string;
  username: string;
};

const isVerificationRequiredError = (
  error: unknown
): error is Error & {
  data?: EmailVerificationRequiredErrorData;
} => {
  return (
    error instanceof Error &&
    Boolean(
      (error as { data?: EmailVerificationRequiredErrorData }).data
        ?.requiresEmailVerification
    )
  );
};

export default function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    defaultValues: {
      password: "",
      username: ""
    },
    mode: "onBlur"
  });

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || "/dashboard";

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setSubmitError("");
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      if (isVerificationRequiredError(error) && error.data) {
        const verificationUrl = `/register/verify?userId=${encodeURIComponent(
          error.data.userId
        )}&email=${encodeURIComponent(error.data.email)}`;

        toast.success(
          error.data.emailSent
            ? "A fresh verification code was sent to your email."
            : "Your account still needs verification, but we could not send a new OTP email.",
          "Verification required"
        );

        navigate(verificationUrl, { replace: true });
        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to sign in."
      );
    }
  };

  return (
    <>
      <LoadingModal
        open={isSubmitting}
        title="Signing in"
        description="We are checking your username and password."
      />

      <PageContainer className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Access the ethics clearance workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <FormField
                id="username"
                label="Username"
                placeholder="Enter your username"
                error={errors.username?.message}
                {...register("username", {
                  required: "Username is required"
                })}
              />
              <FormField
                id="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register("password", {
                  required: "Password is required"
                })}
              />
              {submitError ? (
                <p className="text-sm font-medium text-destructive">
                  {submitError}
                </p>
              ) : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            New applicant?{" "}
            <Button asChild variant="ghost" className="ml-1 h-auto px-1 py-0">
              <Link to="/register">Create an account</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageContainer>
    </>
  );
}
