export async function generateMetadata(params) {
  return {
    title: params.title != undefined ? params.title + " | Turtle Jr" : "Default",
    description: params.description != undefined ? params.description : "Default Metadata",
  };
}
