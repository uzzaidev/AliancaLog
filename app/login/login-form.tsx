"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          required
        />
      </Field>
      <Field label="Senha">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
