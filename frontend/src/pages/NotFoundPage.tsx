import { Link } from "react-router-dom";

import PageContainer from "@/components/common/PageContainer";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-pup-maroon">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The route is not available in the frontend yet.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </PageContainer>
  );
}
