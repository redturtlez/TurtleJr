import { Metadata } from "next";

export async function generateMetadata(params): Promise<Metadata> {
  return {
    title: params.title != undefined ? params.title + " | Turtle Jr" : "Default",
    description: params.description != undefined ? params.description : "Default Metadata",
    icons: {
      icon: "/turtle192.png",
      shortcut: "/maskturtle192.ico",
      other: {
        url: "/maskturtle192.ico",
      },
    },
  };
}
