import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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
import { useToast } from "@/contexts/ToastContext";
import { resendEmailVerificationOtp, verifyEmailVerificationOtp } from "@/lib/api";

type VerifyOtpFormValues = {
  otp: string;
};

export default function VerifyEmailOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [isResending, setIsResending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const userId = searchParams.get("userId") ?? "";
  const email = searchParams.get("email") ?? "";
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<VerifyOtpFormValues>({
    defaultValues: {
      otp: ""
    },
    mode: "onBlur"
  });

  const handleResendOtp = async () => {
    if (!userId) {
      setSubmitError("Registration details are missing. Please register again.");
      return;
    }

    try {
      setIsResending(true);
      setSubmitError("");
      const result = await resendEmailVerificationOtp({ userId });

      toast.success(
        result.emailSent
          ? "A new verification code has been sent to your email."
          : "A new OTP was generated, but the email could not be sent.",
        "OTP resent"
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to resend OTP."
      );
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async ({ otp }: VerifyOtpFormValues) => {
    if (!userId) {
      setSubmitError("Registration details are missing. Please register again.");
      return;
    }

    try {
      setSubmitError("");
      await verifyEmailVerificationOtp({ otp, userId });
      toast.success(
        "Your email has been verified. You can now sign in.",
        "Verification complete"
      );
      navigate("/login", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to verify OTP."
      );
    }
  };

  return (
    <>
      <LoadingModal
        open={isSubmitting || isResending}
        title={isSubmitting ? "Verifying code" : "Resending code"}
        description={
          isSubmitting
            ? "We are checking your verification code."
            : "We are generating a new OTP for your account."
        }
      />

      <PageContainer className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              {email
                ? `Enter the 6-digit OTP sent to ${email}.`
                : "Enter the 6-digit OTP sent to your email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <FormField
                id="otp"
                label="Verification code"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                error={errors.otp?.message}
                {...register("otp", {
                  required: "OTP is required",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Enter a valid 6-digit OTP"
                  }
                })}
              />
              {submitError ? (
                <p className="text-sm font-medium text-destructive">
                  {submitError}
                </p>
              ) : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                Verify OTP
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendOtp}
              disabled={isResending}
            >
              {isResending ? "Resending..." : "Resend OTP"}
            </Button>
            <Button asChild variant="ghost" className="h-auto px-0 py-0">
              <Link to="/register">Back to registration</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageContainer>
    </>
  );
}
