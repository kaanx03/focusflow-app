# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThothFlow (FocusFlow) is a Next.js 15 productivity application focused on the Pomodoro technique with productivity statistics and streak tracking. The app uses Supabase for authentication and data persistence.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

Development server runs at: http://localhost:3000

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.7 with App Router and Turbopack
- **UI**: React 19, TailwindCSS with dark mode support
- **State Management**: Zustand for Pomodoro timer state
- **Authentication**: Supabase Auth with context provider
- **Database**: Supabase (PostgreSQL)
- **TypeScript**: Strict mode enabled

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── dashboard/                # Main dashboard (protected)
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   └── layout.tsx                # Root layout with providers
├── components/
│   ├── pomodoro/                 # PomodoroTimer component
│   ├── stats/                    # StatsPanel component
│   ├── layout/                   # Navbar and layout components
│   ├── RainSoundPlayer.tsx       # Ambient rain sound player
│   ├── StreakTracker.tsx         # Pomodoro streak tracking
│   └── ui/                       # ThemeToggle and shared UI
├── lib/
│   ├── supabase.ts               # Supabase client instances
│   ├── auth-context.tsx          # Auth context provider
│   └── theme-provider.tsx        # Theme management
├── store/
│   ├── pomodoro-store.ts         # Zustand store for timer state
│   └── theme-store.ts            # Theme state management
└── types/
    └── index.ts                  # TypeScript type definitions
```

### Key Data Models (see src/types/index.ts)

- **User**: User profile with email and optional metadata
- **PomodoroSession**: Completed focus/break sessions with duration and type
- **UserSettings**: User-specific timer settings (durations, auto-start preferences)
- **ActivePomodoroSession**: Tracks currently running or paused timer sessions

### State Management

**Zustand Store (src/store/pomodoro-store.ts)**:
- Manages Pomodoro timer state (timeLeft, isActive, sessionType)
- Handles timer settings (pomodoro, shortBreak, longBreak durations in seconds)
- Uses time-based calculations: stores startTime and endTime timestamps
- Timer ticks every 100ms to calculate remaining time from endTime
- Auto-syncs on visibility change to handle tab switching

**Auth Context (src/lib/auth-context.tsx)**:
- Wraps app with authentication state
- Provides user, loading, signIn, signUp, signOut functions
- Listens to Supabase auth state changes

### Supabase Integration

**Client Setup (src/lib/supabase.ts)**:
- `supabase`: Client-side auth helper for components
- `supabaseAdmin`: Service client for API routes (requires SUPABASE_SERVICE_ROLE_KEY)

**Authentication Flow**:
1. AuthProvider wraps app in layout.tsx
2. Protected routes check user state and redirect to /login if not authenticated
3. User metadata (full_name) stored during signup

**Database Operations**:
- Pomodoro sessions saved on completion (not on skip for breaks)
- User settings and active sessions managed via direct Supabase queries
- All queries scoped to user_id for security

### Theme System

**Dark Mode Implementation**:
- Uses Tailwind's class-based dark mode (`darkMode: "class"`)
- Theme toggle managed by ThemeToggle component
- Custom color palette defined in tailwind.config.js:
  - Light: white backgrounds, gray text
  - Dark: #1A1F2E (bg), #252B3B (cards), custom text colors
- Theme persisted in localStorage
- Applied to document.documentElement classList

### Component Patterns

**PomodoroTimer** (src/components/pomodoro/PomodoroTimer.tsx):
- Displays session type tabs (pomodoro/short break/long break)
- SVG progress ring visualization
- Timer logic uses setInterval every 100ms for smooth countdown
- Handles visibility change events to sync time when user returns to tab
- Browser notifications on session completion (requires permission)
- Confetti animation on completion
- Skip button: marks pomodoro as complete, just switches session for breaks
- Settings modal for customizing durations
- Saves sessions to Supabase on completion

**Dashboard Layout** (src/app/dashboard/page.tsx):
- Responsive 2-column grid layout
- Components: PomodoroTimer, StatsPanel, RainSoundPlayer, StreakTracker
- Fixed navbar with theme toggle and sign out
- Mobile hamburger menu with full-screen overlay

### Responsive Design

- Breakpoints: xs (400px), sm, md, lg, xl
- Mobile-first approach with xs: prefix for very small screens
- Components use responsive classes (text-sm xs:text-base lg:text-xl)
- Mobile menu with full-screen overlay and backdrop blur

## Environment Variables

Required for full functionality:

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
```

## Important Implementation Notes

1. **Timer Accuracy**: The Pomodoro timer uses timestamp-based calculations (startTime + endTime) instead of decrementing seconds. This ensures accuracy even if the browser throttles intervals or the user switches tabs.

2. **Session Completion**: Only pomodoro sessions are saved when using the Skip button. Break sessions are just skipped without database entries.

3. **Authentication Guard**: The dashboard checks `loading` and `user` state. Show loading spinner while `loading === true`, redirect to /login if `!user && !loading`.

4. **Supabase Client Usage**:
   - Use `supabase` from lib/supabase.ts in client components
   - Use `supabaseAdmin` or create new client with service role key in API routes
   - Never expose service role key to client

5. **Dark Mode**: Always add dark: variant classes for consistent theming. Use predefined colors from tailwind.config.js (dark-bg, dark-card, dark-text-primary, dark-text-secondary, dark-border).

6. **Path Aliases**: Import from `@/` for src directory (configured in tsconfig.json)

7. **TypeScript**: Project uses strict mode. All types defined in src/types/index.ts.

8. **ESLint**: Configured with Next.js defaults. Some strict rules disabled for production builds.
