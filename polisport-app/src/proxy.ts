import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh sesiune (obligatoriu pentru SSR)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage  = request.nextUrl.pathname.startsWith("/auth/login");

  // Protejează rutele /admin
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifică rolul admin din user_metadata
    const role = user.user_metadata?.role as string | undefined;
    if (role !== "admin") {
      // Utilizator autentificat dar nu admin → redirecționează acasă
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirecționează adminii autentificați de pe pagina de login
  if (isLoginPage && user && user.user_metadata?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude fișierele statice Next.js
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
