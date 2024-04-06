import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
export default authMiddleware({
  publicRoutes: ["/", "/about", "/contact", "/projects", "/happybirthdaymom"],
  afterAuth(auth, req) {
    if (!auth.userId && !auth.isPublicRoute) {
      const redirectToHome = new URL("/", req.url);
      return NextResponse.redirect(redirectToHome);
    }
  },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
