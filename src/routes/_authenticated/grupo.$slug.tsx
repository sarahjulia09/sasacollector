import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Layers3, Trash2, Disc3, Gift, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/collection-form";
import { CollectionItem } from "@/components/collection-item";
import {
  deleteEraCascade,
  deleteGroupCascade,
  useCollection,
} from "@/lib/collection";
import { formatBRL } from "@/lib/parse-expense";
import { CoverImage, CoverUploadButton } from "@/components/group-cover";
import { WishlistTab } from "@/components/wishlist-tab";

/** Datas de lançamento conhecidas de álbuns e eventos oficiais */
const EVENT_DATES: Record<string, string> = {
  // Stray Kids — Discografia
  "THIS & THAT": "2026-08-07",
  "DO IT": "2025-11-21",
  "KARMA": "2025-08-22",
  "HOLLOW": "2025-06-18",
  "HOP": "2024-12-13",
  "GIANT": "2024-11-13",
  "ATE": "2024-07-19",
  "ROCK-STAR": "2023-11-10",
  "SOCIAL PATH": "2023-09-06",
  "5-STAR": "2023-06-02",
  "THE SOUND": "2023-02-22",
  "MAXIDENT": "2022-10-07",
  "CIRCUS": "2022-06-22",
  "ODDINARY": "2022-03-18",
  "Christmas EveL": "2021-11-29",
  "NOEASY": "2021-08-23",
  "SKZ2021": "2021-12-23",
  "SKZ2020": "2020-03-18",
  "ALL IN": "2020-11-04",
  "IN LIFE": "2020-09-14",
  "GO LIVE": "2020-06-17",
  "Clé : LEVANTER": "2019-12-09",
  "Clé 2 : Yellow Wood": "2019-06-19",
  "Clé 1 : MIROH": "2019-03-25",
  "I am YOU": "2018-10-22",
  "I am WHO": "2018-08-06",
  "I am NOT": "2018-03-26",
  "Mixtape": "2018-01-08",

  // Stray Kids — Fanmeetings, Tours & Pop-ups
  "ODD & FRESH": "2023-07-22",
  "SKZOO EVERYWHERE ALL AROUND THE WORLD": "2026-04-24",
  "STAY in Our Little House": "2026-03-28",
  "Do It Pop-Up Store": "2025-11-22",
  "Stray Kids World Tour POPUP STORE": "2025-10-11",
  "SKZ 5'CLOCK": "2025-02-14",
  "HOP (pop-up)": "2024-12-14",
  "ATE (pop-up)": "2024-07-20",
  "SKZ TOY WORLD": "2024-04-06",
  "SKZ'S MAGIC SCHOOL": "2024-03-29",
  "SKZOO Magic School": "2024-03-14",
  "PILOT : FOR ★★★★★": "2023-07-01",
  "THE VICTORY (Japão)": "2023-04-07",
  "2nd #LoveSTAY 'SKZ'S CHOCOLATE FACTORY'": "2022-02-12",
  "THE VICTORY": "2022-05-30",
  "STAYing Home Meeting": "2021-03-18",
  "1st #LoveSTAY 'SKZ-X'": "2021-02-20",

  // P1Harmony
  "UNIQUE JAPAN EDITION": "2026-07-29",
  "P1uspace H : Horror Haven": "2026-07-11",
  "UNIQUE": "2026-03-12",
  "P1ustage H : MOST WANTED": "2025-08-09",
  "DUH!": "2025-05-08",
  "SAD SONG": "2024-09-20",
  "Love & P1ece : The Best of P1Harmony": "2024-08-21",
  "hello82 Tour Merch POP-UP": "2024-05-14",
  "P1ustage H : UTOP1A": "2024-04-27",
  "Killin' It": "2024-02-05",
  "P1Harmony : EX POP-UP": "2023-01-14",
  "HARMONY : SET IN": "2022-11-30",
  "HARMONY : ALL IN": "2022-07-20",
  "HARMONY : ZERO IN": "2022-07-20",
  "P1ustage H : PEACE": "2022-02-26",
  "DISHARMONY : FIND OUT": "2022-01-03",
  "DISHARMONY : BREAK OUT": "2021-04-20",
  "DISHARMONY : STAND OUT": "2020-10-28",
};

type EraCategoryKey = "discografia" | "kits_sg" | "eventos" | "outros";

const CATEGORY_CONFIG: Record<
  EraCategoryKey,
  { label: string; icon: typeof Disc3; desc: string }
> = {
  discografia: {
    label: "Discografia",
    icon: Disc3,
    desc: "Álbuns, mini álbuns e lançamentos oficiais",
  },
  kits_sg: {
    label: "Season's Greetings & Kits",
    icon: Gift,
    desc: "Kits de fã-clube oficial e pacotes de ano novo",
  },
  eventos: {
    label: "Eventos, Turnês & Pop-ups",
    icon: Sparkles,
    desc: "Fanmeetings, pop-up stores e turnês",
  },
  outros: {
    label: "Parcerias & Outras Eras",
    icon: Tag,
    desc: "Colaborações, itens avulsos e outras categorias",
  },
};

/** Descobre a data de uma era (case-insensitive ou extraindo ano do texto) */
function getEventDate(name: string): string {
  const norm = name.trim().toLowerCase();
  for (const [key, date] of Object.entries(EVENT_DATES)) {
    if (key.trim().toLowerCase() === norm) return date;
  }
  // Extrai o maior ano de 4 dígitos encontrado (ex: "3rd Gen 2022-2023" => 2023)
  const years = name.match(/\b(20\d\d)\b/g);
  if (years && years.length > 0) {
    const latestYear = Math.max(...years.map(Number));
    return `${latestYear}-01-01`;
  }
  return "";
}

/** Classifica a era em um dos 4 blocos */
function getEraCategory(name: string): EraCategoryKey {
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (
    n.includes("season") ||
    n.includes("greeting") ||
    n.includes("kit") ||
    n.includes("membership") ||
    n.includes("generation") ||
    n.includes("gen") ||
    n.includes("fanclub")
  ) {
    return "kits_sg";
  }

  if (
    n.includes("pop-up") ||
    n.includes("popup") ||
    n.includes("fanmeeting") ||
    n.includes("tour") ||
    n.includes("magic school") ||
    n.includes("toy world") ||
    n.includes("pilot") ||
    n.includes("chocolate factory") ||
    n.includes("skz-x") ||
    n.includes("meeting") ||
    n.includes("victory") ||
    n.includes("5'clock") ||
    n.includes("horror haven") ||
    n.includes("most wanted") ||
    n.includes("utop1a") ||
    n.includes("peace") ||
    n.includes("odd & fresh")
  ) {
    return "eventos";
  }

  const norm = name.trim().toLowerCase();
  for (const [key] of Object.entries(EVENT_DATES)) {
    if (key.trim().toLowerCase() === norm) {
      if (
        key.includes("pop-up") ||
        key.includes("POPUP") ||
        key.includes("Meeting") ||
        key.includes("STAY") ||
        key.includes("VICTORY") ||
        key.includes("SCHOOL") ||
        key.includes("WORLD") ||
        key.includes("PILOT") ||
        key.includes("CLOCK") ||
        key.includes("Haven") ||
        key.includes("WANTED") ||
        key.includes("UTOP1A") ||
        key.includes("PEACE")
      ) {
        return "eventos";
      }
      return "discografia";
    }
  }

  return "outros";
}

export const Route = createFileRoute("/_authenticated/grupo/$slug")({
  head: () => ({
    meta: [
      { title: "Binder do grupo — sasa collector" },
      {
        name: "description",
        content: "Photocards e merchs organizados por álbum, evento ou kit, com valores e prazos.",
      },
      { property: "og:title", content: "Binder do grupo — sasa collector" },
      {
        property: "og:description",
        content: "Photocards e merchs organizados por álbum, evento ou kit, com valores e prazos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupPage,
});

function GroupPage() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const query = useCollection(user.id);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"colecao" | "wishlist">("colecao");
  const data = query.data;
  const group = data?.groups.find((g) => g.slug === slug);
  const deleteEra = useMutation({
    mutationFn: async (eraId: string) => deleteEraCascade(eraId, user.id),
    onSuccess: () => query.refetch(),
  });
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => deleteGroupCascade(groupId, user.id),
    onSuccess: () => {
      query.refetch();
      navigate({ to: "/app" });
    },
  });
  const groupItems = data?.items.filter((i) => i.group_id === group?.id) ?? [];
  const eras = data?.eras.filter((e) => e.group_id === group?.id) ?? [];

  const pendingFirst = (a: (typeof groupItems)[number], b: (typeof groupItems)[number]) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  };

  const sections = eras.map((era) => ({
    id: era.id,
    name: era.name,
    items: groupItems.filter((i) => i.era_id === era.id),
  }));
  const withoutEra = groupItems.filter((i) => !i.era_id);
  if (withoutEra.length)
    sections.push({ id: "other", name: "Sem álbum / evento / kit", items: withoutEra });

  sections.forEach((s) => s.items.sort(pendingFirst));

  const pendingCount = (s: (typeof sections)[number]) => s.items.filter((i) => !i.paid).length;

  const sortSections = (list: typeof sections) => {
    return [...list].sort((a, b) => {
      const pa = pendingCount(a);
      const pb = pendingCount(b);
      if ((pa > 0) !== (pb > 0)) return pa > 0 ? -1 : 1;
      if (pa > 0 && pb > 0 && pa !== pb) return pb - pa;

      const da = getEventDate(a.name);
      const db = getEventDate(b.name);
      if (da && db) return db.localeCompare(da); // Mais recente primeiro
      if (da) return -1;
      if (db) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const categoryKeys: EraCategoryKey[] = ["discografia", "kits_sg", "eventos", "outros"];
  const categorizedSections = categoryKeys
    .map((catKey) => {
      const catSections = sections.filter((s) => getEraCategory(s.name) === catKey);
      return {
        key: catKey,
        config: CATEGORY_CONFIG[catKey],
        sections: sortSections(catSections),
        totalAmount: catSections.reduce(
          (sum, s) => sum + s.items.reduce((n, i) => n + i.amount, 0),
          0
        ),
        totalCount: catSections.reduce((sum, s) => sum + s.items.length, 0),
      };
    })
    .filter((c) => c.sections.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar ao menu principal
        </Link>
        {query.isLoading ? (
          <p className="py-10 text-muted-foreground">Carregando grupo…</p>
        ) : query.isError ? (
          <p role="alert" className="py-10 text-destructive">
            Não foi possível carregar o grupo.{" "}
            <Button variant="link" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </p>
        ) : !group ? (
          <div className="py-16">
            <h1 className="font-display text-3xl">Grupo não encontrado</h1>
          </div>
        ) : (
          <>
            <div className="relative mt-6 overflow-hidden rounded-md">
              <CoverImage path={group.cover_url} className="h-56 w-full sm:h-72" />
              <div className="absolute bottom-3 right-3">
                <CoverUploadButton userId={user.id} groupId={group.id} />
              </div>
            </div>
            <header className="mt-6 border-b border-border pb-7">
              <p className="mb-2 text-xs font-semibold uppercase text-primary">Binder / Grupo</p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
                    {group.name}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {groupItems.length}{" "}
                    {groupItems.length === 1 ? "item cadastrado" : "itens cadastrados"} ·{" "}
                    {eras.length} {eras.length === 1 ? "categoria" : "categorias"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setAdding(true)}>
                    <Plus /> Novo item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir o grupo ${group.name}? Todos os itens e categorias deste grupo serão removidos.`,
                        )
                      )
                        deleteGroup.mutate(group.id);
                    }}
                  >
                    <Trash2 className="size-4" /> Excluir grupo
                  </Button>
                </div>
              </div>
            </header>
            <div className="flex flex-wrap gap-8 border-b border-border py-6">
              <div>
                <p className="text-xs text-muted-foreground">Total no grupo</p>
                <p className="mt-1 font-display text-2xl font-semibold text-primary">
                  {formatBRL(groupItems.reduce((n, i) => n + i.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {formatBRL(groupItems.filter((i) => !i.paid).reduce((n, i) => n + i.amount, 0))}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-1 border-b border-border" role="tablist">
              {(["colecao", "wishlist"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  {t === "colecao" ? "Coleção & Gastos" : "Wishlist"}
                </button>
              ))}
            </div>
            {tab === "wishlist" ? (
              <WishlistTab userId={user.id} groupId={group.id} />
            ) : categorizedSections.length ? (
              <div className="space-y-14 pt-8">
                {categorizedSections.map((cat) => (
                  <div key={cat.key} className="space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-primary/30 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <cat.config.icon className="size-5 text-primary" />
                        <div>
                          <h2 className="font-display text-2xl font-bold text-foreground">
                            {cat.config.label}
                          </h2>
                          <p className="text-xs text-muted-foreground">{cat.config.desc}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {cat.totalCount} {cat.totalCount === 1 ? "item" : "itens"} ·{" "}
                        <strong className="text-foreground">{formatBRL(cat.totalAmount)}</strong>
                      </p>
                    </div>

                    <div className="space-y-10 pl-1 sm:pl-2">
                      {cat.sections.map((section) => (
                        <section key={section.id} className="pt-2">
                          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2.5">
                            <div>
                              <h3 className="font-display text-2xl font-semibold text-foreground">
                                {section.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                {section.items.length} pcs / itens <span aria-hidden>·</span>{" "}
                                <strong className="text-foreground">
                                  {formatBRL(section.items.reduce((n, i) => n + i.amount, 0))}
                                </strong>
                              </p>
                              {section.id !== "other" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Excluir categoria"
                                  aria-label={`Excluir categoria ${section.name}`}
                                  disabled={deleteEra.isPending}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Excluir a categoria ${section.name}? Todos os itens dessa categoria serão removidos.`,
                                      )
                                    )
                                      deleteEra.mutate(section.id);
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {section.items.length ? (
                            section.items.map((i) => (
                              <CollectionItem key={i.id} item={i} userId={user.id} />
                            ))
                          ) : (
                            <p className="py-6 text-sm text-muted-foreground">
                              Nenhum item nesta categoria ainda.
                            </p>
                          )}
                        </section>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16">
                <Layers3 className="mb-3 size-7 text-primary" />
                <h2 className="font-display text-xl font-semibold">
                  Este binder ainda está vazio.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Adicione um item para começar.</p>
              </div>
            )}
            {adding && (
              <CollectionForm
                userId={user.id}
                groups={data?.groups ?? []}
                eras={data?.eras ?? []}
                initialGroupId={group.id}
                onClose={() => setAdding(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
