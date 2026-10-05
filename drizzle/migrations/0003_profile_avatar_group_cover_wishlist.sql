ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.collection_groups ADD COLUMN IF NOT EXISTS cover_url text;

CREATE TABLE public.group_wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  title text NOT NULL,
  image_path text NOT NULL,
  notes text,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (group_id, user_id) REFERENCES public.collection_groups(id, user_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_wishlists TO authenticated;
GRANT ALL ON public.group_wishlists TO service_role;
ALTER TABLE public.group_wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlists_select_own ON public.group_wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY wishlists_insert_own ON public.group_wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY wishlists_update_own ON public.group_wishlists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY wishlists_delete_own ON public.group_wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY media_select_own ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_update_own ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);