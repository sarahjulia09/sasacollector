CREATE TABLE public.collection_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  slug text NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug),
  UNIQUE (id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_groups TO authenticated;
GRANT ALL ON public.collection_groups TO service_role;
ALTER TABLE public.collection_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_groups_select_own ON public.collection_groups FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY collection_groups_insert_own ON public.collection_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY collection_groups_update_own ON public.collection_groups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY collection_groups_delete_own ON public.collection_groups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.collection_eras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, name),
  UNIQUE (id, user_id, group_id),
  FOREIGN KEY (group_id, user_id) REFERENCES public.collection_groups(id, user_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_eras TO authenticated;
GRANT ALL ON public.collection_eras TO service_role;
ALTER TABLE public.collection_eras ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_eras_select_own ON public.collection_eras FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY collection_eras_insert_own ON public.collection_eras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY collection_eras_update_own ON public.collection_eras FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY collection_eras_delete_own ON public.collection_eras FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.expenses ADD COLUMN group_id uuid, ADD COLUMN era_id uuid, ADD COLUMN item_type text, ADD COLUMN item_detail text, ADD COLUMN origin text;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_group_owner_fk FOREIGN KEY (group_id, user_id) REFERENCES public.collection_groups(id, user_id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_era_owner_group_fk FOREIGN KEY (era_id, user_id, group_id) REFERENCES public.collection_eras(id, user_id, group_id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_item_type_check CHECK (item_type IS NULL OR item_type IN ('Álbum PC', 'POB', 'Lucky Draw', 'Merch'));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_item_detail_length CHECK (item_detail IS NULL OR char_length(item_detail) <= 120);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_origin_length CHECK (origin IS NULL OR char_length(origin) <= 120);
CREATE INDEX expenses_group_id_idx ON public.expenses (group_id);
CREATE INDEX expenses_era_id_idx ON public.expenses (era_id);