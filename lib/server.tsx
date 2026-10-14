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
        {
          url: "logo.png",
          type: "image/png",
          sizes: "48x48 72x72 96x96 128x128 192x192 256x256 512x512 1024x1024",
        },
      ],
    },
    manifest: "/manifest.json",
  };
}
