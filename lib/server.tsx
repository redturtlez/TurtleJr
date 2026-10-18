import type { Metadata } from "next";

interface MetadataParams {
  title?: string;
  description?: string;
}

export async function generateMetadata(params: MetadataParams): Promise<Metadata> {
  return {
    title: params.title ? `${params.title} | Turtle Jr` : "Turtle Jr | Software, tools, and experiments",
    description: params.description ?? "The portfolio and personal software workshop of Simonè Mineo.",
    applicationName: "Turtle Jr",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Turtle Jr" },
    icons: {
      icon: [
        { url: "/newlogo-192.png", type: "image/png", sizes: "192x192" },
        { url: "/newlogo-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/newlogo-maskable-512.png", type: "image/png", sizes: "512x512" }],
    },
    manifest: "/manifest.json",
  };
}
