import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/reports")({
  component: ReportsRoute,
});

function ReportsRoute() {
  return <WealthTrackApp initialSection="Reports" />;
}
