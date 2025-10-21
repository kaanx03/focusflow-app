# Database Migration: Persistent Pomodoro Timer

## Overview

This migration adds the `active_pomodoro_sessions` table to enable persistent Pomodoro timer state across devices and browser sessions. Users can now pause their timer and resume it later, even on a different device.

## What This Fixes

- **Timer resets when switching tabs** - Fixed! Timer state is now saved to the database
- **Can't resume on different devices** - Fixed! Session state syncs across all your devices
- **Lost progress when pausing** - Fixed! Exact pause point is saved with timestamp

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-migration.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push --db-url "your-database-url"
```

Or manually execute the SQL file:

```bash
psql "your-database-connection-string" -f supabase-migration.sql
```

## Verify the Migration

After running the migration, verify it worked:

1. Go to **Table Editor** in Supabase dashboard
2. You should see a new table: `active_pomodoro_sessions`
3. Check that RLS (Row Level Security) is enabled on the table
4. Verify the policies are created (4 policies total: SELECT, INSERT, UPDATE, DELETE)

## Testing the Feature

After deploying the code and running the migration:

1. **Start a Pomodoro timer** - Click Start and let it run for a few seconds
2. **Pause the timer** - Click Pause
3. **Switch tabs or close the browser** - Navigate away
4. **Come back** - Refresh the page or open on another device
5. **Verify** - The timer should resume from where you paused it

## Database Schema

The `active_pomodoro_sessions` table stores:

- `session_type` - Type of session (pomodoro, short_break, long_break)
- `total_duration` - Full session duration in seconds
- `time_remaining` - Seconds left when paused
- `is_active` - Whether timer is running (true) or paused (false)
- `started_at` - Timestamp when session started
- `paused_at` - Timestamp when paused (null if running)
- `end_time` - Calculated end time (null if paused)
- `completed_pomodoros` - Count of completed pomodoros in this cycle

## Important Notes

- **One session per user** - Only one active session allowed per user (enforced by unique index)
- **Automatic cleanup** - Sessions are deleted when completed or reset
- **Cross-device sync** - Works seamlessly across all devices logged into the same account
- **RLS enabled** - Users can only access their own sessions (secure by default)

## Rollback (if needed)

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS active_pomodoro_sessions CASCADE;
```

## Troubleshooting

### Timer not resuming after refresh

1. Check browser console for errors
2. Verify the migration ran successfully
3. Check that RLS policies are created correctly
4. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### "Permission denied" errors

1. Verify RLS policies are enabled
2. Check that user is authenticated
3. Ensure policies match `auth.uid()` correctly

### Session not saving

1. Check browser console for Supabase errors
2. Verify network requests in DevTools
3. Ensure database connection is working
4. Check that the user is logged in

## Support

If you encounter issues, check:
- Supabase dashboard logs
- Browser console errors
- Network tab in DevTools
