<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions

- Multi-user app behind the `_authenticated` route gate. Login is username + 4-digit PIN: derive the deterministic synthetic email `<normalized-username>@app.local`, build the auth credential as `sasa::<username>::<pin>::collector` (never send the raw PIN as password), keep the username unique in `public.profiles`, and display it from `user.user_metadata.username`. `public.expenses` is RLS-scoped to `auth.uid() = user_id`; every insert must set `user_id` from the session user. Never add a public/anon policy on `expenses` or `profiles`, and keep all access through the browser Supabase client.

- Keep collection groups and eras as user-owned tables, with expense references constrained to the same user and group; use the browser client under the authenticated gate so RLS protects all collection reads and writes.

- User images (avatars, group covers, wishlist templates) live in the private `media` bucket under `<user_id>/...` and are displayed via short-lived signed URLs; DB columns store the storage path, not a URL. Why: workspace blocks public buckets and paths keep files owner-scoped.

- Keep pending-item ordering in a browser-safe pure helper and reuse CollectionItem for the group mural and binder rows; this shares deadline rules and payment invalidation without duplicating mutations.

- Payment stages: keep base-item payment in `item_paid`, active extra charges in `stages`, and derive aggregate payment, totals and deadlines through browser-safe helpers; ignore unpaid zero-value undated placeholders. Why: unquoted shipping must not create debt or overwrite the base deadline.
- Parse legacy slash origins and canonical ` :: ` origins in the shared community helper, writing only the canonical form. Why: existing users need no recataloging.
- Home-screen installation uses a manifest and static icons only, with no app-shell service worker. Why: installation does not require offline caching and previews must stay fresh.
- Keep app-wide navigation in the authenticated layout with distinct home, collection, wishlist and profile routes; shared collection components preserve one set of mutations.
- Derive transport estimates only from active financial stages in a pure helper; do not store a manual shipping status or claim payment confirms physical delivery.
- Store normalized wishlist marker coordinates and status in owner-scoped rows referencing a private template; RLS checks both marker ownership and template ownership.
- PIN changes must verify the current credential before updating the password, retain the existing username credential convention, and clear PIN fields after success.
