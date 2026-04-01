-- Migration: Add 'bulk_import' resource to existing plans
-- Description: Updates the 'resources' JSONB column in 'plans' table to include the 'bulk_import' flag.
-- Date: 2026-03-31

-- 1. Enable bulk_import for Premium plans (Master, Ultra, Family)
UPDATE plans 
SET resources = jsonb_set(
  COALESCE(resources, '{}'::jsonb), 
  '{bulk_import}', 
  'true'::jsonb
)
WHERE slug IN ('master', 'ultra', 'family');

-- 2. Disable bulk_import for Basic plans (Basic, Pro) or any others
UPDATE plans 
SET resources = jsonb_set(
  COALESCE(resources, '{}'::jsonb), 
  '{bulk_import}', 
  'false'::jsonb
)
WHERE slug NOT IN ('master', 'ultra', 'family') 
   OR slug IS NULL;

-- 3. Verification query (run this after applying)
-- SELECT name, slug, resources->>'bulk_import' as can_import FROM plans ORDER BY price ASC;
