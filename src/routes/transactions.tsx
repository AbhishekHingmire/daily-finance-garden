import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/transactions")({
  component: () => <WealthTrackApp initialSection="Transactions" />,
});
