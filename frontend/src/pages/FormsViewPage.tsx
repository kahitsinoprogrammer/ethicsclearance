import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Pencil,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchManagedForms,
  type FormsPagination,
  type ManagedFormSummary
} from "@/lib/api";

const statusOptions: ComboboxItem[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

export default function FormsViewPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<ManagedFormSummary[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [pagination, setPagination] = useState<FormsPagination>({
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 1
  });
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadForms = async () => {
      if (!token) {
        if (isMounted) {
          setForms([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const formsResult = await fetchManagedForms(token, {
          page: pagination.page,
          search: appliedSearch,
          status: appliedStatus
        });

        if (!isMounted) {
          return;
        }

        setForms(formsResult.forms);
        setPagination(formsResult.pagination);
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(error instanceof Error ? error.message : "Failed to load forms.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadForms();

    return () => {
      isMounted = false;
    };
  }, [appliedSearch, appliedStatus, pagination.page, token]);

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

  return (
    <>
      <LoadingModal
        open={isLoading}
        title="Loading forms"
        description="We are fetching the available forms."
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Forms"
          title="View forms"
          description="Open a saved form in the builder to edit its details, sections, questions, and options, or launch the respondent application view for active forms."
        />

        <Card className="mt-8">
            <CardHeader>
              <CardTitle>Form records</CardTitle>
              <CardDescription>
                Search by form name or description, then edit the record in the
                form builder or start an application using an active form.
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
                  placeholder="Search form name or description"
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
              <table className="w-full min-w-[960px] border-collapse bg-white text-sm">
                <thead className="bg-muted-100 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Form name</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Sections</th>
                    <th className="px-4 py-3 font-semibold">Questions</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.form_id} className="border-t align-top">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {form.form_name}
                      </td>
                      <td className="px-4 py-3">
                        {form.description || "No description"}
                      </td>
                      <td className="px-4 py-3">
                        {form.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-3">{form.section_count}</td>
                      <td className="px-4 py-3">{form.question_count}</td>
                      <td className="px-4 py-3">{formatDateTime(form.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {form.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => navigate(`/forms/apply/${form.form_id}`)}
                            >
                              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                              Apply
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/forms/create/${form.form_id}`)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!forms.length && !isLoading && !pageError ? (
                <div className="bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink-900">
                    No forms found.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search term or filter.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing page {pagination.page} of {pagination.totalPages} (
                {pagination.total} forms)
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

    </>
  );
}
