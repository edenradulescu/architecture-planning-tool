<!-- explore the current-issues.md file and deeply analyze the problem. Only when you have the analysis, give it back to me with the idea of how you're planning to solve it, and then wait for me to give you the green light to execute it. -->

I am having this issue when I go to http://localhost:3000/editor/cmsmtg12l0000cq4j04jb2e8q

Clerk - DEPRECATION WARNING: "createRouteMatcher" is deprecated and will be removed in the next major release.
Use resource-based auth checks instead. Move auth checks into each page, layout, API route, or Server Function that accesses protected data. Middleware-based auth checks rely on path matching, which can diverge from how Next.js routes requests and leave protected resources reachable. For a migration guide, see: https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
[browser] ⨯ unhandledRejection: Error: ClerkJS: Network error at "https://moved-earwig-32.clerk.accounts.dev/v1/client/sessions/sess_3HhjpE3ErZIYeqpoEOnHrOxJUdo/touch?__clerk_api_version=2026-05-12&_clerk_js_version=6.26.0&__clerk_db_jwt=dvb_3HhUPqqh1WKaXn4m89Vu1WtMcQO" - TypeError: Failed to fetch. Please try again.
    at Object.o [as request] (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:18:181317)
    at async io._baseFetch (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:17:7978)
    at async ia.execute (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:17:6812)
    at async ny._touchPost (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:18:81310)
    at async ny.touch (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:18:81526)
    at async #eP (https://moved-earwig-32.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js:18:227568)
Attention: Clerk collects telemetry data from its SDKs when connected to development instances.
The data collected is used to inform Clerk's product roadmap.
To learn more, including how to opt-out from the telemetry program, visit: https://clerk.com/docs/telemetry.