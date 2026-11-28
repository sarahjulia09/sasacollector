import { Link, useLocation } from '@tanstack/react-router';
import { Home, FolderHeart, BookHeart, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
const destinations = [
  { to: '/app', label: 'Início', icon: Home },
  { to: '/colecao', label: 'Coleção', icon: FolderHeart },
  { to: '/wishlist', label: 'Wishlist', icon: BookHeart },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
] as const;
export function BottomNav() {
  const { pathname } = useLocation();
  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"><div className="mx-auto grid max-w-lg grid-cols-4 px-2 py-2">
    {destinations.map(({ to, label, icon: Icon }) => {
      const active = pathname === to || (to === '/colecao' && pathname.startsWith('/grupo/'));
      return <Button key={to} asChild variant="ghost" className={`h-14 flex-col gap-1 rounded-md px-1 text-[11px] ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Link to={to} aria-current={active ? 'page' : undefined}><Icon className="size-5" /><span>{label}</span></Link></Button>;
    })}
  </div></nav>;
}
