import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/insights")({
  component: InsightsRoute,
});

function InsightsRoute() {
  return <WealthTrackApp initialSection="Insights" />;
}
