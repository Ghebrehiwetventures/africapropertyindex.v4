-- Migration 012: Add rendered translation fields
-- Tactical use case: source-truth content remains in native source language,
-- while rendered/translated UI-layer output is stored separately.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_title_en TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_description_en TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_description_html_en TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_translation_source TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_translation_source_language TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_translation_target_language TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_translation_is_source_truth BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rendered_translation_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN listings.rendered_title_en IS 'English title from rendered frontend translation layer output; not native source truth.';
COMMENT ON COLUMN listings.rendered_description_en IS 'English plain-text description from rendered frontend translation layer output; not native source truth.';
COMMENT ON COLUMN listings.rendered_description_html_en IS 'English sanitized HTML description from rendered frontend translation layer output; not native source truth.';
COMMENT ON COLUMN listings.rendered_translation_source IS 'Translation/rendering source, e.g. gtranslate_headless.';
COMMENT ON COLUMN listings.rendered_translation_source_language IS 'Native source language used as translation input, e.g. it.';
COMMENT ON COLUMN listings.rendered_translation_target_language IS 'Rendered translation output language, e.g. en.';
COMMENT ON COLUMN listings.rendered_translation_is_source_truth IS 'False when the rendered translation is not native source content.';
COMMENT ON COLUMN listings.rendered_translation_updated_at IS 'Last time rendered translation fields were refreshed.';
