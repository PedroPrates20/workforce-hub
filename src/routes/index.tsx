import { createFileRoute } from "@tanstack/react-router";
import WorkforceApp from "@/workforce/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Workforce Hub — Staff Portal" },
      { name: "description", content: "Workforce Hub staff portal: schedules, teams, sites and leave." },
      { property: "og:title", content: "Workforce Hub — Staff Portal" },
      { property: "og:description", content: "Workforce Hub staff portal: schedules, teams, sites and leave." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkforceApp,
});

