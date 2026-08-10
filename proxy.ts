import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}(.*)`,
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}(.*)`,
])

const isApiRoute = createRouteMatcher(["/api(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // API routes enforce their own auth() checks and return JSON 401s —
  // auth.protect() here would redirect them to /sign-in like a page request instead.
  if (isApiRoute(req)) {
    return
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next[^?]*|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
