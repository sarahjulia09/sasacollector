ALTER TABLE public.expenses ADD COLUMN item_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN stages jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.expenses SET item_paid = paid WHERE item_paid IS DISTINCT FROM paid;