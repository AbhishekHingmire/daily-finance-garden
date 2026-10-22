import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/categories")({
  component: CategoriesRoute,
});

function CategoriesRoute() {
  return <WealthTrackApp initialSection="Categories" />;
}
