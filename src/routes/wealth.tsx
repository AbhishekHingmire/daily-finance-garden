import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/wealth")({
  component: WealthRoute,
});

function WealthRoute() {
  return <WealthTrackApp initialSection="Wealth" />;
}
