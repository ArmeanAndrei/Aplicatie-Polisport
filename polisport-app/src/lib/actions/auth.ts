"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SignInState = {
  error: string | null;
  fieldErrors?: { email?: string; password?: string };
};

/**
 * Server Action pentru autentificare.
 * Rulează complet server-side → cookie-urile sunt setate GARANTAT înainte de redirect.
 * Aceasta rezolvă problema de timing când login-ul era client-side.
 */
export async function signInAction(
  prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email    = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  // Validare de bază
  if (!email)    return { error: null, fieldErrors: { email: "Email-ul este obligatoriu." } };
  if (!password) return { error: null, fieldErrors: { password: "Parola este obligatorie." } };

  const cookieStore = await cookies();

  // Creăm clientul Supabase server-side cu acces complet la cookie-uri
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // În Server Actions, setAll funcționează corect (nu aruncă eroare)
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Mai întâi facem sign-out din orice sesiune anterioară
  await supabase.auth.signOut();

  // Autentificare
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[signInAction] Eroare Supabase:", {
      message: error.message,
      status: error.status,
    });

    let msg = error.message;
    if (error.message === "Invalid login credentials")
      msg = "Email sau parolă incorectă.";
    else if (error.message.includes("Email not confirmed"))
      msg = "⚠️ Email-ul nu a fost confirmat. Verifică inbox-ul.";
    else if (error.message.includes("Too many requests"))
      msg = "⚠️ Prea multe încercări. Așteaptă câteva minute.";

    return { error: `${msg} (cod: ${error.status ?? "–"})` };
  }

  // Verificare rol admin
  const role = data.user?.user_metadata?.role as string | undefined;
  if (role !== "admin") {
    console.warn("[signInAction] User fără rol admin. Role:", role);
    await supabase.auth.signOut();
    return {
      error: `Contul nu are permisiuni de admin. Role curent: "${role ?? "nedefinit"}". Setează {"role": "admin"} în User Metadata din Supabase Dashboard.`,
    };
  }

  console.log("[signInAction] ✅ Login reușit pentru:", data.user?.email);

  // Redirect server-side — cookie-urile sunt deja setate la acest punct
  redirect("/admin");
}

/**
 * Server Action pentru deconectare.
 * Șterge sesiunea și redirecționează la pagina principală.
 */
export async function signOutAction() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();
  redirect("/auth/login");
}
