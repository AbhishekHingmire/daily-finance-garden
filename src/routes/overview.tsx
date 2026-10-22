import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/overview")({
  component: OverviewRoute,
});

function OverviewRoute() {
  return <WealthTrackApp initialSection="Overview" />;
}
