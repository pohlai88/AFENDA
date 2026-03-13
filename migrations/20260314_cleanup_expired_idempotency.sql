DELETE FROM idempotency
WHERE expires_at IS NOT NULL
  AND expires_at < now()
RETURNING key;
