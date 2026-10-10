'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { ROLES, ROLE_SHORT_LABELS, VOCAL_ROLES, type Role } from '@/lib/domain/types'
import type { GeneratorMember } from '@/lib/scheduler/generate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/page-header'
import { cn } from '@/lib/utils'
import {
  createMemberAction,
  deleteMemberAction,
  renameMemberAction,
  setMemberFlagAction,
  toggleMemberRoleAction,
} from './actions'

type Run = (action: () => Promise<void>, sucesso?: string) => void

function iniciais(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

export function MemberList({ members }: { members: GeneratorMember[] }) {
  const [pending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Role | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(true)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)

  const run: Run = (action, sucesso) =>
    startTransition(async () => {
      try {
        await action()
        if (sucesso) toast.success(sucesso)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
      }
    })

  const ativos = members.filter((m) => m.active)
  const gestores = ativos.filter((m) => m.isGestor).length
  const ministros = ativos.filter((m) => m.isMinistro).length

  const cobertura = new Map<Role, number>(
    ROLES.map((role) => [role, ativos.filter((m) => m.roles.includes(role)).length]),
  )

  const termo = busca.trim().toLowerCase()
  const visiveis = members.filter(
    (m) =>
      (mostrarInativos || m.active) &&
      (!filtro || m.roles.includes(filtro)) &&
      (!termo || m.name.toLowerCase().includes(termo)),
  )

  const atual = members.find((m) => m.id === selecionado) ?? null

  return (
    <>
      <PageHeader
        title="Integrantes"
        description={`${plural(ativos.length, 'ativo', 'ativos')} · ${plural(gestores, 'gestor', 'gestores')} · ${plural(ministros, 'ministro', 'ministros')}`}
        actions={
          <Button size="lg" className="hidden md:inline-flex" onClick={() => setNovoAberto(true)}>
            <Plus />
            Novo integrante
          </Button>
        }
      >
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex min-h-11 items-center gap-2 rounded-xl bg-background px-3 md:w-[340px] md:rounded-[10px] md:border md:border-input md:bg-card md:px-3.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar integrante"
              aria-label="Buscar integrante"
              className="min-h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-[15px]"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrar por função"
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:p-0"
          >
            <FilterChip
              label="Todos"
              count={members.length}
              pressed={filtro === null}
              onClick={() => setFiltro(null)}
            />
            {ROLES.map((role) => (
              <FilterChip
                key={role}
                label={ROLE_SHORT_LABELS[role]}
                count={cobertura.get(role) ?? 0}
                pressed={filtro === role}
                alerta={(cobertura.get(role) ?? 0) === 0}
                onClick={() => setFiltro(filtro === role ? null : role)}
              />
            ))}
          </div>
        </div>
      </PageHeader>

      <div className={cn('flex items-start gap-5', pending && 'opacity-80')}>
        <section
          aria-label="Lista de integrantes"
          className="min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-card"
        >
          {visiveis.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {members.length === 0
                ? 'Nenhum integrante ainda. Adicione o primeiro.'
                : 'Ninguém com esse filtro.'}
            </p>
          ) : (
            <ul>
              {visiveis.map((member) => (
                <li key={member.id} className="border-b border-divider last:border-0">
                  <button
                    type="button"
                    onClick={() => setSelecionado(member.id)}
                    aria-current={member.id === selecionado ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-tray focus-visible:bg-tray focus-visible:outline-none md:gap-3.5 md:px-[18px] md:py-3',
                      member.id === selecionado && 'md:bg-background',
                      !member.active && 'opacity-55',
                    )}
                  >
                    <Avatar name={member.name} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        <span className="text-[15px] font-semibold">{member.name}</span>
                        <MemberBadges member={member} />
                      </span>
                      {member.roles.length > 0 && (
                        <>
                          <span className="truncate text-[13px] text-muted-foreground md:hidden">
                            {member.roles.map((r) => ROLE_SHORT_LABELS[r]).join(', ')}
                          </span>
                          <span className="hidden flex-wrap gap-1.5 md:flex">
                            {member.roles.map((r) => (
                              <span
                                key={r}
                                className="rounded-md border border-border px-2 py-0.5 text-xs text-subtle"
                              >
                                {ROLE_SHORT_LABELS[r]}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-[18px] py-3 text-sm text-muted-foreground">
            <span>
              Mostrando {visiveis.length} de {members.length}
            </span>
            <label className="flex min-h-9 cursor-pointer items-center gap-2">
              <Checkbox
                checked={mostrarInativos}
                onCheckedChange={(v) => setMostrarInativos(v)}
              />
              Mostrar inativos
            </label>
          </div>
        </section>

        {atual ? (
          <MemberEditor
            key={atual.id}
            member={atual}
            run={run}
            onClose={() => setSelecionado(null)}
          />
        ) : (
          <aside className="sticky top-8 hidden w-[380px] shrink-0 rounded-card border border-dashed border-input px-5 py-8 text-sm text-muted-foreground md:block">
            Escolha alguém na lista para editar o que toca e se é ministro, gestor ou ativo.
          </aside>
        )}
      </div>

      <button
        type="button"
        aria-label="Novo integrante"
        onClick={() => setNovoAberto(true)}
        className="fixed right-4 bottom-24 z-30 flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(16,24,40,0.2)] md:hidden"
      >
        <Plus className="size-[22px]" />
      </button>

      <NewMemberDialog open={novoAberto} onOpenChange={setNovoAberto} run={run} />
    </>
  )
}

function FilterChip({
  label,
  count,
  pressed,
  alerta,
  onClick,
}: {
  label: string
  count: number
  pressed: boolean
  alerta?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-subtle hover:border-rule-strong',
      )}
    >
      {label}
      <span className={cn('tabular opacity-70', alerta && !pressed && 'text-destructive opacity-100')}>
        {count}
      </span>
    </button>
  )
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-subtle md:size-[38px] md:text-[13px]',
        className,
      )}
    >
      {iniciais(name)}
    </span>
  )
}

function MemberBadges({ member }: { member: GeneratorMember }) {
  return (
    <>
      {member.isMinistro && (
        <span className="rounded-full bg-ministro-soft px-2 py-px text-[11px] font-semibold text-ministro-foreground md:text-xs">
          Ministro
        </span>
      )}
      {member.isGestor && (
        <span className="rounded-full bg-gestor-soft px-2 py-px text-[11px] font-semibold text-gestor-foreground md:text-xs">
          Gestor
        </span>
      )}
      {!member.active && (
        <span className="rounded-full bg-secondary px-2 py-px text-[11px] font-semibold text-subtle md:text-xs">
          Inativo
        </span>
      )}
    </>
  )
}

function MemberEditor({
  member,
  run,
  onClose,
}: {
  member: GeneratorMember
  run: Run
  onClose: () => void
}) {
  const vocal = VOCAL_ROLES.some((role) => member.roles.includes(role))

  const renomear = (value: string) => {
    const nome = value.trim()
    if (nome && nome.toUpperCase() !== member.name) {
      run(() => renameMemberAction(member.id, nome))
    }
  }

  return (
    <aside
      aria-label="Editar integrante"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card md:sticky md:top-8 md:z-auto md:w-[380px] md:shrink-0 md:overflow-visible md:rounded-card md:border md:border-border"
    >
      <header className="flex items-center gap-2 border-b border-border px-2 pt-4 pb-3 md:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="flex size-11 items-center justify-center rounded-lg"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="flex-1 text-[17px] font-semibold">Editar integrante</h2>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 py-5 md:gap-[22px] md:p-5">
        <div className="hidden items-center gap-3 md:flex">
          <Avatar name={member.name} className="size-12 text-base md:size-12 md:text-base" />
          <span className="min-w-0 flex-1 truncate text-lg font-semibold">{member.name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex items-center gap-3.5 md:block">
          <Avatar name={member.name} className="size-14 text-lg md:hidden" />
          <div className="flex flex-1 flex-col gap-1.5 md:gap-2">
            <Label htmlFor="membro-nome" className="text-[13px] font-normal text-muted-foreground md:text-sm md:font-medium md:text-foreground">
              Nome
            </Label>
            <Input
              id="membro-nome"
              defaultValue={member.name}
              onBlur={(e) => renomear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="h-11 rounded-[10px] bg-card px-3 text-base md:text-[15px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold md:font-medium">O que toca</span>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-1.5">
            {ROLES.map((role) => {
              const marcado = member.roles.includes(role)

              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => run(() => toggleMemberRoleAction(member.id, role, !marcado))}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-9 md:rounded-full md:text-[13px]',
                    marcado
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-subtle hover:border-rule-strong',
                  )}
                >
                  {ROLE_SHORT_LABELS[role]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col border-t border-divider">
          {vocal && (
            <FlagSwitch
              nome="Ministro"
              dica="Vocal com mais tempo de casa. A escala leva um por naipe vocal."
              checked={member.isMinistro}
              onChange={(v) => run(() => setMemberFlagAction(member.id, 'isMinistro', v))}
            />
          )}
          <FlagSwitch
            nome="Gestor"
            dica="Pode ser o responsável do culto e aparece com a marca /GESTOR na planilha."
            checked={member.isGestor}
            onChange={(v) => run(() => setMemberFlagAction(member.id, 'isGestor', v))}
          />
          <FlagSwitch
            nome="Ativo"
            dica="Entra no sorteio da escala."
            checked={member.active}
            onChange={(v) => run(() => setMemberFlagAction(member.id, 'active', v))}
          />
        </div>

        <div className="mt-auto flex md:mt-0">
          <Button
            variant="ghost"
            size="lg"
            className="w-full border border-danger-border text-destructive hover:bg-danger-soft hover:text-destructive md:w-auto md:border-transparent"
            onClick={() => {
              run(() => deleteMemberAction(member.id), 'Integrante excluído.')
              onClose()
            }}
          >
            Remover integrante
          </Button>
        </div>
      </div>
    </aside>
  )
}

function FlagSwitch({
  nome,
  dica,
  checked,
  onChange,
}: {
  nome: string
  dica: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b border-divider py-3.5">
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{nome}</span>
        <span className="text-[13px] leading-snug text-muted-foreground">{dica}</span>
      </span>
      <Switch size="lg" checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function NewMemberDialog({
  open,
  onOpenChange,
  run,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: Run
}) {
  const [nome, setNome] = useState('')

  const adicionar = () => {
    if (!nome.trim()) return
    run(async () => {
      await createMemberAction(nome)
      setNome('')
      onOpenChange(false)
    }, 'Integrante adicionado.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5">
        <DialogHeader>
          <DialogTitle className="text-lg">Novo integrante</DialogTitle>
          <DialogDescription>
            Depois de adicionar, escolha na lista o que a pessoa toca.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            adicionar()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              className="h-11 rounded-[10px] bg-card px-3"
            />
          </div>
          <Button type="submit" size="lg" disabled={!nome.trim()}>
            Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
