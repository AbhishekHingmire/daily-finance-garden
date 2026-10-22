import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/funds")({
  component: () => <WealthTrackApp initialSection="Funds" />,
});
