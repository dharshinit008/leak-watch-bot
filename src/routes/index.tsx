import { createFileRoute } from "@tanstack/react-router";
import { FuelDashboard } from "@/components/FuelDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VantGuard — AI Fuel Leak Detection & Fleet Fuel Monitoring" },
      {
        name: "description",
        content:
          "VantGuard monitors vehicle fuel sensor data with AI anomaly detection to catch small leaks early — preventing wastage, financial loss, pollution and safety risk.",
      },
      { property: "og:title", content: "VantGuard — AI Fuel Leak Detection" },
      {
        property: "og:description",
        content:
          "Live fuel telemetry, AI anomaly alerts, and early leak warnings for fleet vehicles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <FuelDashboard />;
}
