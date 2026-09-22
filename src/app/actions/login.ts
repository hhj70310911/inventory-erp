"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export type LoginState = { ok: boolean; error?: string };

export async function loginAction(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  try {
    // Handle failed credentials here rather than following the auth error redirect.
    const destination = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      redirectTo: "/erp",
    });
    const result = new URL(String(destination), "http://localhost");
    if (result.searchParams.has("error") || result.pathname !== "/erp") {
      return { ok: false, error: "帳號或密碼錯誤" };
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.type === "CredentialsSignin" ? "帳號或密碼錯誤" : "暫時無法登入，請稍後再試" };
    }
    throw err;
  }
  redirect("/erp");
}
