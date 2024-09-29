import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtectedRoute = createRouteMatcher(["/todo", "/health", "/proteincost"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});
//   {
//   publicRoutes: ["/", "/about", "/contact", "/projects", "/happybirthdaymom"],
//   afterAuth(auth, req) {
//     if (!auth.userId && !auth.isPublicRoute) {
//       const redirectToHome = new URL("/", req.url);
//       return NextResponse.redirect(redirectToHome);
//     }
//   },
// }

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
