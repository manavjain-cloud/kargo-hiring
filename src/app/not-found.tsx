import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="Not found"
        action={<ButtonLink href="/" variant="primary">Back to pipeline</ButtonLink>}
      >
        This candidate or page doesn&apos;t exist, or it may have been removed.
      </EmptyState>
    </Card>
  );
}
