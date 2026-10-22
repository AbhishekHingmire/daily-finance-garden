import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/recurring")({
  component: RecurringRoute,
});

function RecurringRoute() {
  return <WealthTrackApp initialSection="Recurring" />;
}
