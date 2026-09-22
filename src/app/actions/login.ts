"use server";

import { CredentialsSignin } from "@auth/core/errors";
import { signIn } from "@/auth";

export type LoginState = { ok: boolean; error?: string };

export async function loginAction(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = "/erp";

  try {
    await signIn("credentials", {
      email: String(email),
      password: String(password),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return { ok: false, error: "\u5e33\u865f\u6216\u5bc6\u78bc\u932f\u8aa4" };
    }
    throw err;
  }
  return { ok: true };
}
