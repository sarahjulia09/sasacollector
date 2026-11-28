import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyRound, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarImage, ProfileAvatarButton } from '@/components/profile-avatar';
import { useProfile } from '@/lib/media';
import { useCollection } from '@/lib/collection';
import { supabase } from '@/integrations/supabase/client';
import { credentialFor, validatePinChange } from '@/lib/account';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/perfil')({ head: () => pageHead('Meu perfil', 'Seu ícone, resumo da coleção e opções de segurança da conta.'), component: ProfilePage });
function ProfilePage() {
  const { user } = Route.useRouteContext();
  const profile = useProfile(user.id);
  const collection = useCollection(user.id);
  const client = useQueryClient();
  const navigate = useNavigate();
  const username = String(user.user_metadata['username'] ?? profile.data?.username ?? 'você');
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const change = useMutation({
    mutationFn: async () => {
      validatePinChange(current, next, confirm);
      const email = user.email;
      if (!email) throw new Error('Não foi possível identificar sua conta. Entre novamente.');
      const verified = await supabase.auth.signInWithPassword({ email, password: credentialFor(username, current) });
      if (verified.error) throw new Error('PIN atual incorreto.');
      if (verified.data.user.id !== user.id) throw new Error('Entre novamente na sua conta.');
      const { error } = await supabase.auth.updateUser({ password: credentialFor(username, next), current_password: credentialFor(username, current) });
      if (error) throw new Error('Não foi possível alterar o PIN. Tente novamente.');
      await supabase.auth.signOut({ scope: 'others' });
    },
    onSuccess: () => { setCurrent(''); setNext(''); setConfirm(''); setChanging(false); },
  });
  const logout = useMutation({ mutationFn: async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; await client.cancelQueries(); client.clear(); await navigate({ to: '/auth', replace: true }); } });
  const items = collection.data?.items ?? [];
  return <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-10 sm:px-8">
    <h1 className="font-display text-4xl font-semibold text-primary">Meu perfil</h1>
    <section className="flex flex-col items-center gap-4 border-b border-border py-8"><AvatarImage value={profile.data?.avatar_url} size={100} /><h2 className="break-all font-display text-2xl font-semibold">@{username}</h2><ProfileAvatarButton userId={user.id} username={username} /></section>
    <section className="grid grid-cols-2 gap-4 border-b border-border py-6" aria-label="Resumo da coleção"><div><p className="text-sm text-muted-foreground">Itens cadastrados</p><strong className="font-display text-3xl text-primary">{collection.isLoading ? '—' : items.length}</strong></div><div><p className="text-sm text-muted-foreground">Itens quitados</p><strong className="font-display text-3xl text-primary">{collection.isLoading ? '—' : items.filter((i) => i.paid).length}</strong></div>{collection.isError && <p role="alert" className="col-span-2 text-sm text-destructive">Não foi possível carregar o resumo.</p>}</section>
    <section className="space-y-4 py-6"><h2 className="font-display text-2xl font-semibold">Minha conta</h2><Button variant="outline" onClick={() => { setChanging(!changing); change.reset(); }}><KeyRound />Alterar PIN</Button>
      {changing && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); change.mutate(); }}>{[{ label: 'PIN atual', value: current, set: setCurrent }, { label: 'Novo PIN', value: next, set: setNext }, { label: 'Confirmar novo PIN', value: confirm, set: setConfirm }].map((field, index) => <label key={field.label} className="block text-sm font-medium">{field.label}<input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete={index === 0 ? 'current-password' : 'new-password'} value={field.value} onChange={(e) => field.set(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" /></label>)}{change.isError && <p role="alert" className="text-sm text-destructive">{change.error.message}</p>}<div className="flex gap-2"><Button disabled={change.isPending} type="submit">{change.isPending ? 'Salvando…' : 'Salvar PIN'}</Button><Button type="button" variant="ghost" onClick={() => { setChanging(false); setCurrent(''); setNext(''); setConfirm(''); }}>Cancelar</Button></div></form>}
      {change.isSuccess && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" />PIN alterado.</p>}
      <div><Button variant="ghost" disabled={logout.isPending} onClick={() => logout.mutate()}><LogOut />Sair da conta</Button>{logout.isError && <p role="alert" className="text-sm text-destructive">Não foi possível sair. Tente novamente.</p>}</div>
    </section>
  </main>;
}
