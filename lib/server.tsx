import { Metadata } from "next";

export async function generateMetadata(params): Promise<Metadata> {
  return {
    title: params.title != undefined ? params.title + " | Turtle Jr" : "Default",
    description: params.description != undefined ? params.description : "Default Metadata",
    icons: {
      icon: [
        {
          url: "logo.png",
          type: "image/png",
          sizes: "48x48 72x72 96x96 128x128 192x192 256x256 512x512 1024x1024",
        },
      ],
    },
    manifest: '{ "display": "standalone"}',
  };
}
