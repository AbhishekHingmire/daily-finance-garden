import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/investments")({
  component: () => <WealthTrackApp initialSection="Investments" />,
});
