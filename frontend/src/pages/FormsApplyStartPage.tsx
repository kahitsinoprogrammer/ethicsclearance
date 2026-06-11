import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Search,
  SendHorizontal
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
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchManagedForms,
  type FormsPagination,
  type ManagedFormSummary
} from "@/lib/api";

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

export default function FormsApplyStartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<ManagedFormSummary[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
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
        const result = await fetchManagedForms(token, {
          page: pagination.page,
          search: appliedSearch,
          status: "active"
        });

        if (!isMounted) {
          return;
        }

        setForms(result.forms.filter((form) => form.is_active));
        setPagination(result.pagination);
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load active forms."
          );
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
  }, [appliedSearch, pagination.page, token]);

  const applySearch = () => {
    setAppliedSearch(search.trim());
    setPagination((current) => ({
      ...current,
      page: 1
    }));
  };

  const clearSearch = () => {
    setSearch("");
    setAppliedSearch("");
    setPagination((current) => ({
      ...current,
      page: 1
    }));
  };

  const goToPreviousPage = () => {
    setPagination((current) => ({
      ...current,
      page: Math.max(current.page - 1, 1)
    }));
  };

  const goToNextPage = () => {
    setPagination((current) => ({
      ...current,
      page: Math.min(current.page + 1, current.totalPages)
    }));
  };

  return (
    <>
      <LoadingModal
        open={isLoading}
        title="Loading active forms"
        description="We are preparing the forms that are ready for application."
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Forms"
          title="Start Application"
          description="Choose an active form from the list below to start an application. Applicants only provide the research title and thesis link here, then GSRO assigns signatories and completes the review."
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Available forms</CardTitle>
            <CardDescription>
              Search active forms, then open one to provide the application
              details for GSRO review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Search active form name or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button type="button" onClick={applySearch}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            </div>

            {pageError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{pageError}</p>
            ) : null}

            {forms.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {forms.map((form) => (
                  <Card key={form.form_id} className="border-border/80 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl text-ink-900">
                            {form.form_name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {form.description || "No description provided."}
                          </CardDescription>
                        </div>
                        <span className="rounded-full bg-pup-maroon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pup-maroon">
                          Active
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-ink-900">
                            {form.section_count}
                          </p>
                          <p>Sections</p>
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900">
                            {form.question_count}
                          </p>
                          <p>Questions</p>
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900">
                            {formatDateTime(form.created_at)}
                          </p>
                          <p>Created</p>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <Button
                          type="button"
                          onClick={() => navigate(`/forms/apply/${form.form_id}`)}
                        >
                          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                          Start Application
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !isLoading && !pageError ? (
              <div className="mt-6 rounded-lg border bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-medium text-ink-900">
                  No active forms found.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different search term or come back after a form is
                  activated.
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-pup-maroon" aria-hidden="true" />
                <p>
                  Showing page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} active forms)
                </p>
              </div>

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
