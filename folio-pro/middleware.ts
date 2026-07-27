import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const isPublic = isLogin || pathname.startsWith("/auth/") || pathname.startsWith("/api/");

  if (!url || !key) {
    if (!isPublic) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items: { name: string; value: string; options?: Record<string, unknown> }[]) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const redirectWithSession = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  // The public homepage experience is the sign-in page. Once authenticated,
  // returning to /login takes the user straight to Holdings.
  if (isLogin && user) return redirectWithSession(new URL("/holdings", request.url));
  if (!isPublic && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname === "/" ? "/holdings" : pathname);
    return redirectWithSession(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
