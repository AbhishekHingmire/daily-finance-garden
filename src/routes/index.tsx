import { createFileRoute } from "@tanstack/react-router";
import { WealthTrackApp } from "@/components/wealthtrack-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WealthTrack — Personal finance, clearly" },
      { name: "description", content: "Track spending, manage accounts, and understand your money in this private local demo." },
      { property: "og:title", content: "WealthTrack — Personal finance, clearly" },
      { property: "og:description", content: "Track spending, manage accounts, and understand your money in this private local demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <WealthTrackApp />;
}
