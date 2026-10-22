import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/accounts")({
  component: AccountsRoute,
});

function AccountsRoute() {
  return <WealthTrackApp initialSection="Accounts" />;
}
