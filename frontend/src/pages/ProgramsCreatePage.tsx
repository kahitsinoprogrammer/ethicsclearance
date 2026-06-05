import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import FormField from "@/components/common/FormField";
import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createProgram } from "@/lib/api";

const statusOptions: ComboboxItem[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

type ProgramFormValues = {
  programCode: string;
  programName: string;
  status: string;
};

export default function ProgramsCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<ProgramFormValues>({
    defaultValues: {
      programCode: "",
      programName: "",
      status: ""
    },
    mode: "onBlur"
  });
  const status = watch("status");

  const onSubmit = async (values: ProgramFormValues) => {
    if (!token) {
      setSubmitError("You must be signed in to create a program.");
      return;
    }

    try {
      setSubmitError("");
      await createProgram(token, values);
      reset();
      toast.success("Program created successfully.", "Program saved");
      navigate("/programs/view", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create program."
      );
    }
  };

  return (
    <>
      <LoadingModal
        open={isSubmitting}
        title="Saving program"
        description="We are creating the program record."
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Programs"
          title="Create a program"
          description="Provide the program code, program name, and status. The remaining program fields are handled by the backend."
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Program details</CardTitle>
            <CardDescription>
              New program records are created from these three fields only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormField
                id="program-code"
                label="Program code"
                placeholder="MSCS"
                error={errors.programCode?.message}
                {...register("programCode", {
                  required: "Program code is required"
                })}
              />
              <div className="space-y-2">
                <Label>Status</Label>
                <Combobox
                  items={statusOptions}
                  placeholder="Select status"
                  searchPlaceholder="Search status"
                  value={status}
                  onValueChange={(value) =>
                    setValue("status", value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true
                    })
                  }
                />
                <input
                  type="hidden"
                  {...register("status", {
                    required: "Status is required"
                  })}
                />
                {errors.status ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.status.message}
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <FormField
                  id="program-name"
                  label="Program name"
                  placeholder="Master of Science in Computer Science"
                  error={errors.programName?.message}
                  {...register("programName", {
                    required: "Program name is required"
                  })}
                />
              </div>
              <div className="md:col-span-2">
                {submitError ? (
                  <p className="mb-3 text-sm font-medium text-destructive">
                    {submitError}
                  </p>
                ) : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Program"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
