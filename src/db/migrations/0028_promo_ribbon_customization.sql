ALTER TABLE promo_banners
  ADD COLUMN IF NOT EXISTS text_color varchar(16) NOT NULL DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS font_size_px integer NOT NULL DEFAULT 13,
  ADD COLUMN IF NOT EXISTS text_animation varchar(16) NOT NULL DEFAULT 'fixed';
