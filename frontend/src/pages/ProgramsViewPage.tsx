import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Search,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import FormField from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchManagedPrograms,
  updateProgram,
  type ManagedProgram,
  type ProgramsPagination
} from "@/lib/api";

const statusOptions: ComboboxItem[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

type EditProgramFormValues = {
  programCode: string;
  programName: string;
  status: string;
};

export default function ProgramsViewPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [programs, setPrograms] = useState<ManagedProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ManagedProgram | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [pagination, setPagination] = useState<ProgramsPagination>({
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 1
  });
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<EditProgramFormValues>({
    defaultValues: {
      programCode: "",
      programName: "",
      status: ""
    },
    mode: "onBlur"
  });

  useEffect(() => {
    let isMounted = true;

    const loadPrograms = async () => {
      if (!token) {
        if (isMounted) {
          setPrograms([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const programsResult = await fetchManagedPrograms(token, {
          page: pagination.page,
          search: appliedSearch,
          status: appliedStatus
        });

        if (!isMounted) {
          return;
        }

        setPrograms(programsResult.programs);
        setPagination(programsResult.pagination);
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error ? error.message : "Failed to load programs"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPrograms();

    return () => {
      isMounted = false;
    };
  }, [appliedSearch, appliedStatus, pagination.page, token]);

  const openEditModal = (program: ManagedProgram) => {
    setSubmitError("");
    setSelectedProgram(program);
    reset({
      programCode: program.program_code,
      programName: program.program_name,
      status: program.is_active ? "active" : "inactive"
    });
  };

  const closeEditModal = () => {
    setSelectedProgram(null);
    setSubmitError("");
  };

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setAppliedStatus(statusFilter);
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: 1
    }));
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setAppliedSearch("");
    setAppliedStatus("");
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: 1
    }));
  };

  const goToPreviousPage = () => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: Math.max(currentPagination.page - 1, 1)
    }));
  };

  const goToNextPage = () => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: Math.min(
        currentPagination.page + 1,
        currentPagination.totalPages
      )
    }));
  };

  const onSubmit = async (values: EditProgramFormValues) => {
    if (!token || !selectedProgram) {
      return;
    }

    try {
      setSubmitError("");
      const updatedProgram = await updateProgram(
        token,
        selectedProgram.program_id,
        values
      );

      setPrograms((currentPrograms) =>
        currentPrograms.map((program) =>
          program.program_id === updatedProgram.program_id
            ? updatedProgram
            : program
        )
      );

      closeEditModal();
      toast.success("Program details updated successfully.", "Program updated");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update program."
      );
    }
  };

  return (
    <>
      <LoadingModal
        open={isLoading || isSubmitting}
        title={isSubmitting ? "Updating program" : "Loading programs"}
        description={
          isSubmitting
            ? "We are saving the revised program details."
            : "We are fetching the active program list."
        }
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Programs"
          title="View programs"
          description="Review the academic programs currently available in the system."
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Program records</CardTitle>
            <CardDescription>
              Review active and inactive programs in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Search program code or program name"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Combobox
                items={statusOptions}
                placeholder="All statuses"
                searchPlaceholder="Search status"
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
              <Button type="button" onClick={applyFilters}>
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>

            {pageError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{pageError}</p>
            ) : null}

            <div className="mt-6 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[820px] border-collapse bg-white text-sm">
                <thead className="bg-muted-100 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Program code</th>
                    <th className="px-4 py-3 font-semibold">Program name</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.program_id} className="border-t">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {program.program_code}
                      </td>
                      <td className="px-4 py-3">{program.program_name}</td>
                      <td className="px-4 py-3">
                        {program.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(program)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!programs.length && !isLoading && !pageError ? (
                <div className="bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink-900">
                    No programs found.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search term or filter.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} programs)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={goToPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={goToNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>

      {selectedProgram ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-pup-maroon">
                  Edit program
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink-900">
                  {selectedProgram.program_name}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeEditModal}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close edit modal</span>
              </Button>
            </div>

            <form
              className="grid gap-4 p-5 md:grid-cols-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormField
                id="edit-program-code"
                label="Program code"
                error={errors.programCode?.message}
                {...register("programCode", {
                  required: "Program code is required"
                })}
              />
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  rules={{ required: "Status is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={statusOptions}
                      placeholder="Select status"
                      searchPlaceholder="Search status"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.status ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.status.message}
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <FormField
                  id="edit-program-name"
                  label="Program name"
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
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
