import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/loans")({
  component: () => <WealthTrackApp initialSection="Loans" />,
});
