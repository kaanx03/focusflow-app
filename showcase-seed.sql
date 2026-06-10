-- ============================================================
-- ThothFlow – Showcase Seed Data
-- 1. Create an account in the app first, then find your user_id:
--    SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
-- 2. Replace YOUR_USER_ID_HERE with your actual UUID, then run this.
-- ============================================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_ID_HERE';  -- <-- paste your user UUID here
  d DATE;
  sessions_today INT;
  i INT;
  offset_minutes INT;
BEGIN
  -- 4 months of data, working backwards from today
  FOR day_offset IN 0..119 LOOP
    d := CURRENT_DATE - day_offset;

    -- Vary intensity: weekdays heavier, weekends lighter, occasional rest days
    sessions_today := CASE
      WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN  -- weekend
        CASE WHEN random() < 0.25 THEN 0          -- 25% rest
             WHEN random() < 0.5  THEN 2
             ELSE 4 END
      WHEN day_offset % 17 = 0 THEN 0            -- occasional off-day
      WHEN random() < 0.1       THEN 1            -- low day
      WHEN random() < 0.4       THEN 4
      WHEN random() < 0.75      THEN 6
      ELSE 8
    END;

    FOR i IN 1..sessions_today LOOP
      offset_minutes := (i * 35) + (FLOOR(random() * 10))::INT;

      INSERT INTO pomodoro_sessions
        (id, user_id, duration_minutes, session_type, completed_at, session_token)
      VALUES (
        gen_random_uuid(),
        uid,
        25,
        'pomodoro',
        (d + INTERVAL '9 hours' + (offset_minutes || ' minutes')::INTERVAL),
        'seed-' || day_offset || '-' || i
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
