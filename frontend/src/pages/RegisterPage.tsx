import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import FormField from "@/components/common/FormField";
import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchPrograms, registerUser } from "@/lib/api";

const classificationOptions: ComboboxItem[] = [
  { label: "GS Student", value: "GS Student" },
  { label: "Faculty", value: "Faculty" },
  { label: "Researcher", value: "Researcher" },
  { label: "Staff", value: "Staff" }
];

const honorificOptions: ComboboxItem[] = [
  { label: "Mr.", value: "Mr." },
  { label: "Ms.", value: "Ms." },
  { label: "Dr.", value: "Dr." },
  { label: "Prof.", value: "Prof." },
  { label: "Mx.", value: "Mx." }
];

type RegisterFormValues = {
  cellphoneNumber: string;
  classification: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  honorifics: string;
  lastName: string;
  middleName: string;
  password: string;
  programId: string;
  studentNo: string;
  username: string;
};

type RegisterPageProps = {
  description?: string;
  eyebrow?: string;
  loadingDescription?: string;
  loadingTitle?: string;
  requireEmailVerification?: boolean;
  submitLabel?: string;
  successMessage?: string;
  title?: string;
};

export default function RegisterPage({
  description = "The form is ready for backend integration once the user endpoints are added.",
  eyebrow = "Applicant registration",
  loadingDescription = "We are saving the user profile. This should only take a moment.",
  loadingTitle = "Creating account",
  requireEmailVerification = true,
  submitLabel = "Create Account",
  successMessage = "Account created successfully.",
  title = "Create a user profile"
}: RegisterPageProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [programOptions, setProgramOptions] = useState<ComboboxItem[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [programError, setProgramError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const toast = useToast();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<RegisterFormValues>({
    defaultValues: {
      cellphoneNumber: "",
      classification: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      honorifics: "",
      lastName: "",
      middleName: "",
      password: "",
      programId: "",
      studentNo: "",
      username: ""
    },
    mode: "onBlur"
  });

  const classification = watch("classification");
  const honorifics = watch("honorifics");
  const password = watch("password");
  const programId = watch("programId");

  const onSubmit = async ({
    confirmPassword: _confirmPassword,
    ...values
  }: RegisterFormValues) => {
    try {
      setSubmitError("");

      const response = await registerUser(
        values,
        requireEmailVerification ? undefined : token ?? undefined
      );

      if (response.requiresEmailVerification) {
        const verificationUrl = `/register/verify?userId=${encodeURIComponent(
          response.user.user_id
        )}&email=${encodeURIComponent(response.user.email)}`;

        toast.success(
          response.emailSent
            ? "Your account was created. Check your email for the OTP."
            : "Your account was created, but the OTP email could not be sent. Please resend it on the verification page.",
          "Verification required"
        );
        navigate(verificationUrl, { replace: true });
        return;
      }

      reset();
      toast.success(successMessage, "User saved");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create account."
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadPrograms = async () => {
      try {
        const programs = await fetchPrograms();

        if (!isMounted) {
          return;
        }

        setProgramOptions(
          programs.map((program) => ({
            label: `${program.program_name} (${program.program_code})`,
            value: program.program_id,
            searchText: `${program.program_name} ${program.program_code}`
          }))
        );
        setProgramError("");
      } catch (error) {
        if (isMounted) {
          setProgramError(
            error instanceof Error ? error.message : "Failed to load programs"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingPrograms(false);
        }
      }
    };

    loadPrograms();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <LoadingModal
        open={isSubmitting}
        title={loadingTitle}
        description={loadingDescription}
      />

      <PageContainer>
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={handleSubmit(onSubmit)}
            >
            <div className="space-y-2">
              <Label>Honorifics</Label>
              <Combobox
                items={honorificOptions}
                placeholder="Select honorific"
                searchPlaceholder="Search honorific"
                value={honorifics}
                onValueChange={(value) =>
                  setValue("honorifics", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true
                  })
                }
              />
              <input
                type="hidden"
                {...register("honorifics", {
                  required: "Honorifics is required"
                })}
              />
              {errors.honorifics ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.honorifics.message}
                </p>
              ) : null}
            </div>
            <FormField
              id="first-name"
              label="First name"
              placeholder="Juan"
              error={errors.firstName?.message}
              {...register("firstName", {
                required: "First name is required"
              })}
            />
            <FormField
              id="middle-name"
              label="Middle name"
              placeholder="Optional"
              helper="Optional"
              {...register("middleName")}
            />
            <FormField
              id="last-name"
              label="Last name"
              placeholder="Dela Cruz"
              error={errors.lastName?.message}
              {...register("lastName", {
                required: "Last name is required"
              })}
            />
            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="name@pup.edu.ph"
              error={errors.email?.message}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address"
                }
              })}
            />
            <FormField
              id="username"
              label="Username"
              placeholder="juan.delacruz"
              error={errors.username?.message}
              {...register("username", {
                required: "Username is required",
                minLength: {
                  value: 4,
                  message: "Username must be at least 4 characters"
                },
                pattern: {
                  value: /^[a-zA-Z0-9._-]+$/,
                  message: "Use only letters, numbers, dots, underscores, or hyphens"
                }
              })}
            />
            <FormField
              id="cellphone"
              label="Cellphone number"
              placeholder="+63"
              error={errors.cellphoneNumber?.message}
              {...register("cellphoneNumber", {
                required: "Cellphone number is required",
                pattern: {
                  value: /^\+?[0-9\s-]{7,20}$/,
                  message: "Enter a valid cellphone number"
                }
              })}
            />
            <FormField
              id="student-no"
              label="Student no. / Employee no."
              placeholder="Student / Employee number"
              error={errors.studentNo?.message}
              {...register("studentNo", {
                required: "Student no. / Employee no. is required"
              })}
            />
            <div className="space-y-2">
              <Label>Classification</Label>
              <Combobox
                items={classificationOptions}
                placeholder="Select classification"
                searchPlaceholder="Search classification"
                value={classification}
                onValueChange={(value) =>
                  setValue("classification", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true
                  })
                }
              />
              <input
                type="hidden"
                {...register("classification", {
                  required: "Classification is required"
                })}
              />
              {errors.classification ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.classification.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Combobox
                disabled={isLoadingPrograms || Boolean(programError)}
                emptyText={
                  isLoadingPrograms ? "Loading programs..." : "No programs found."
                }
                items={programOptions}
                placeholder={
                  isLoadingPrograms ? "Loading programs..." : "Select program"
                }
                searchPlaceholder="Search program name or code"
                value={programId}
                onValueChange={(value) =>
                  setValue("programId", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true
                  })
                }
              />
              <input
                type="hidden"
                {...register("programId", {
                  required: "Program is required"
                })}
              />
              {errors.programId ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.programId.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {programError || "Search by program name or code."}
                </p>
              )}
            </div>
            <FormField
              id="password"
              label="Password"
              type="password"
              placeholder="Create a password"
              error={errors.password?.message}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                }
              })}
            />
            <FormField
              id="confirm-password"
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword", {
                required: "Confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match"
              })}
            />
            <div className="md:col-span-2">
              {submitError ? (
                <p className="mb-3 text-sm font-medium text-destructive">
                  {submitError}
                </p>
              ) : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
