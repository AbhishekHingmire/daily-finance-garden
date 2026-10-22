import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/preferences")({
  component: () => <WealthTrackApp initialSection="Preferences" />,
});
