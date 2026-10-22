import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <WealthTrackApp />;
}
