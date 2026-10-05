ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_item_type_check;

UPDATE public.expenses
  SET item_type = 'Regular'
  WHERE item_type = 'Álbum PC';

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_item_type_check
  CHECK (item_type IS NULL OR item_type IN ('Regular', 'POB', 'Lucky Draw', 'Merch'));