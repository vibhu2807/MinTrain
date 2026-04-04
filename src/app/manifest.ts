import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MinTrain",
    short_name: "MinTrain",
    description: "Household fitness and meal coach by Mintellion.",
    start_url: "/",
    display: "standalone",
    background_color: "#111113",
    theme_color: "#111113",
    icons: [
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
