import { Metadata } from "next";

export async function generateMetadata(params): Promise<Metadata> {
  return {
    title: params.title != undefined ? params.title + " | Turtle Jr" : "Default",
    description: params.description != undefined ? params.description : "Default Metadata",
    icons: {
      icon: [
        {
          url: "logo.svg",
          sizes: "48x48",
          type: "image/png",
        },
        {
          url: "logo.svg",
          sizes: "96x96 128x128 192x192",
        },
      ],
    },
    manifest: '{ "display": "standalone"}',
  };
}
