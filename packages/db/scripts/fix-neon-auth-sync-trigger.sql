-- Fix: sync_neon_auth_user_to_afenda_identity
--
-- CRITICAL: SECURITY DEFINER + search_path lock required.
-- The neon_auth DB role (which runs OAuth inserts) has no privileges on public schema tables.
-- SECURITY DEFINER makes the trigger execute as neondb_owner (the function owner).
-- SET search_path prevents search_path injection attacks (OWASP best practice for SECURITY DEFINER).
--
-- EXCEPTION handler ensures trigger failure never blocks neon_auth.user INSERT.

CREATE OR REPLACE FUNCTION public.sync_neon_auth_user_to_afenda_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  normalized_email text;
  person_party_id uuid;
  principal_id_var uuid;
  default_org_id uuid;
  pr_id uuid;
BEGIN
  -- Guard: skip if no email
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(btrim(NEW.email));

  -- Wrap in exception handler so trigger failure never blocks auth user creation
  BEGIN
    -- 1. Party for person (external_key = 'person:' || email)
    SELECT p.id INTO person_party_id
    FROM party p
    WHERE p.external_key = 'person:' || normalized_email
    LIMIT 1;

    IF person_party_id IS NULL THEN
      INSERT INTO party (kind, external_key)
      VALUES ('person', 'person:' || normalized_email)
      RETURNING id INTO person_party_id;
    END IF;

    -- 2. Person (id = party id, email, name)
    INSERT INTO person (id, email, name)
    VALUES (person_party_id, normalized_email, NEW.name)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, person.name);

    -- 3. IAM principal (person_id, kind, email)
    INSERT INTO iam_principal (person_id, kind, email)
    VALUES (person_party_id, 'user', normalized_email)
    ON CONFLICT (email) DO UPDATE SET
      person_id = EXCLUDED.person_id,
      kind = 'user'
    RETURNING id INTO principal_id_var;

    -- 4. Default org for new users (use first org by slug 'demo', or any existing org)
    SELECT id INTO default_org_id
    FROM organization
    WHERE slug = 'demo'
    LIMIT 1;

    IF default_org_id IS NULL THEN
      SELECT id INTO default_org_id FROM organization LIMIT 1;
    END IF;

    IF default_org_id IS NULL THEN
      RETURN NEW;  -- No org: user will have no AFENDA session until an org exists
    END IF;

    -- 5. Party role (person's party in default org as 'employee')
    INSERT INTO party_role (org_id, party_id, role_type)
    VALUES (default_org_id, person_party_id, 'employee')
    ON CONFLICT (org_id, party_id, role_type) DO UPDATE SET updated_at = now()
    RETURNING id INTO pr_id;

    -- 6. Membership (principal -> party_role, active)
    INSERT INTO membership (principal_id, party_role_id, status)
    VALUES (principal_id_var, pr_id, 'active')
    ON CONFLICT (principal_id, party_role_id) DO UPDATE SET
      status = 'active',
      revoked_at = NULL;

  EXCEPTION WHEN OTHERS THEN
    -- Log but never block: user creation must always succeed
    RAISE WARNING 'sync_neon_auth_user_to_afenda_identity failed for %: % %',
      normalized_email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- GRANTs: belt-and-suspenders for neon_auth role on public tables used by trigger
GRANT SELECT, INSERT, UPDATE ON public.party TO neon_auth;
GRANT SELECT, INSERT, UPDATE ON public.person TO neon_auth;
GRANT SELECT, INSERT, UPDATE ON public.iam_principal TO neon_auth;
GRANT SELECT, INSERT, UPDATE ON public.party_role TO neon_auth;
GRANT SELECT, INSERT, UPDATE ON public.membership TO neon_auth;
GRANT SELECT ON public.organization TO neon_auth;

-- Trigger is already present; no need to recreate it.
-- Trigger: AFTER INSERT OR UPDATE OF email, name ON neon_auth."user"
--   FOR EACH ROW EXECUTE FUNCTION sync_neon_auth_user_to_afenda_identity()
