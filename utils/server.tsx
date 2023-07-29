import { Metadata } from "next";

export async function generateMetadata(params): Promise<Metadata> {
  return {
    title: params.title != undefined ? params.title + " | Turtle Jr" : "Default",
    description: params.description != undefined ? params.description : "Default Metadata",
    icons: {
      icon: [
        {
          url: "turtlejr.png",
          sizes: "48x48",
          type: "image/png",
        },
        {
          url: "maskturtle192.ico",
          sizes: "96x96 128x128 192x192",
        },
      ],
    },
  };
}
