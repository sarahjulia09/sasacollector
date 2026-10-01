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
