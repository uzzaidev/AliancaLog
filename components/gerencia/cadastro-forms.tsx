"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  criarEmpresa,
  criarMotorista,
  criarVeiculo,
  type FormState,
} from "@/app/gerencia/cadastros/actions";
import type { VeiculoItem } from "@/lib/data/gerencia";

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  return (
    <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success">
      {state.ok}
    </p>
  );
}

export function EmpresaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    criarEmpresa,
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <Field label="Nome da empresa">
        <Input name="nome" required placeholder="Leite Travizão" />
      </Field>
      <p className="text-xs text-muted">
        Acesso do portal (opcional — pode criar depois):
      </p>
      <Field label="E-mail de acesso">
        <Input name="email" type="email" placeholder="acesso@empresa.com.br" />
      </Field>
      <Field label="Senha inicial">
        <Input name="senha" type="text" placeholder="mín. 6 caracteres" />
      </Field>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar empresa"}
      </Button>
    </form>
  );
}

export function VeiculoForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    criarVeiculo,
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <Field label="Placa">
        <Input name="placa" required placeholder="IVV1A23" />
      </Field>
      <Field label="Tipo">
        <Input name="tipo" placeholder="Fiorino, VUC…" />
      </Field>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar veículo"}
      </Button>
    </form>
  );
}

export function MotoristaForm({ veiculos }: { veiculos: VeiculoItem[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    criarMotorista,
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <Field label="Nome">
        <Input name="nome" required placeholder="João da Silva" />
      </Field>
      <Field label="E-mail (login)">
        <Input name="email" type="email" required placeholder="joao@rotta.com.br" />
      </Field>
      <Field label="Senha inicial">
        <Input name="senha" type="text" required placeholder="mín. 6 caracteres" />
      </Field>
      <Field label="Telefone">
        <Input name="telefone" placeholder="(54) 99999-0000" />
      </Field>
      <Field label="Veículo">
        <select
          name="veiculo_id"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
        >
          <option value="">— sem veículo —</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa} {v.tipo ? `(${v.tipo})` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar motorista"}
      </Button>
    </form>
  );
}
