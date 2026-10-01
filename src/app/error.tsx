"use client";

import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<TriangleAlert className="size-5 text-accent-text" />}
        title="Something went wrong loading this page"
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href="/">Back to pipeline</ButtonLink>
          </div>
        }
      >
        Your data is safe. This is usually a temporary connection problem.
      </EmptyState>
    </Card>
  );
}
