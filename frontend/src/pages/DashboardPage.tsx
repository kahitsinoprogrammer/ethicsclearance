import { ClipboardList, Clock3, FileCheck2, UsersRound } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import StatCard from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const workflowItems = [
  "Create applicant profile",
  "Submit ethics clearance application",
  "Program review and endorsement",
  "GSREC/GSREO clearance decision"
];

export default function DashboardPage() {
  const { user } = useAuth();
  const fullName = user
    ? [user.honorifics, user.firstname, user.middlename, user.lastname]
        .filter(Boolean)
        .join(" ")
    : "User";

  return (
    <PageContainer>
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="rounded-lg border bg-white p-6 shadow-sm sm:p-8">
          <SectionHeader
            eyebrow="Graduate School"
            title={`Welcome, ${fullName}`}
            description="This is your ethics clearance workspace."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Start Application</Button>
            <Button variant="secondary">Review Queue</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>
              Initial screens are ready for routing and component reuse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {workflowItems.map((item, index) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pup-maroon/10 font-semibold text-pup-maroon">
                    {index + 1}
                  </span>
                  <span className="text-ink-900">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Draft Applications" value="0" />
        <StatCard icon={Clock3} label="Pending Review" value="0" tone="gold" />
        <StatCard icon={FileCheck2} label="Cleared" value="0" />
        <StatCard icon={UsersRound} label="Registered Users" value="0" tone="gold" />
      </section>
    </PageContainer>
  );
}
