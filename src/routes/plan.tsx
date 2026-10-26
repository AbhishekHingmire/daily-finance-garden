import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/plan")({
  component: PlanRoute,
});

function PlanRoute() {
  return <WealthTrackApp initialSection="Plan" />;
}
