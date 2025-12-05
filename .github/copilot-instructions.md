# Copilot Instructions for TelaPhoria IMS

## Project Overview

TelaPhoria IMS is a **Next.js 16 Inventory Management System** with Supabase authentication. The app implements a multi-stage user onboarding flow (welcome → loading → login → dashboard) before accessing the protected dashboard.

**Key Tech Stack**: Next.js 16, React 19, Supabase, Tailwind CSS 4, TypeScript 5, ESLint 9

## Architecture Patterns

### Authentication Flow
- **Protected routes**: Dashboard requires active Supabase session (`src/app/dashboard/page.tsx`)
- **Session checks**: Every protected page calls `supabase.auth.getSession()` on mount and redirects unauthenticated users to `/login`
- **Supabase client**: Centralized at `src/lib/supabaseClient.ts` using environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Remember me**: Login form stores user email in localStorage when checked, retrieved on subsequent visits

### Page Routing Structure
```
/ → Welcome page (redirects to /welcome immediately)
/welcome → Initial landing with "Get Started" button
/loading → Auto-redirects to /login after 10.8 seconds
/login → Authentication entry point
/dashboard → Protected route (requires valid session)
```

### Theme Management
- **Context API pattern**: `ThemeProvider` wraps entire app in `layout.tsx`
- **Theme persistence**: Reads from `localStorage.getItem('theme')` on mount, falls back to OS preference via `prefers-color-scheme` media query
- **DOM manipulation**: Applies `data-theme`, `dark` class, and `dark-mode` class to control CSS variables
- **All pages consume theme**: Pages import `useTheme()` hook to conditionally render dark mode UI

### Styling Approach
- **CSS-in-JS for inline styles**: Login page uses `<style>` tags with CSS variables (e.g., `--accent-color`, `--bg-color`)
- **Tailwind CSS**: Used for utility classes in dashboard and layout (e.g., `bg-zinc-50 dark:bg-black`)
- **Dark mode support**: All text/backgrounds use `dark:` prefixed classes; CSS variables switch values per theme

## Development Workflows

### Local Setup
```powershell
npm install              # Install all dependencies
npm run dev              # Start dev server on localhost:3000
npm run build            # Create production build
npm run lint             # Run ESLint checks
```

### Supabase Testing
- Test users must be created manually in Supabase dashboard (Authentication → Users → Add user)
- Credentials stored in `.env.local` (not version controlled)
- URL: `https://ligecpalemxczhpfmeid.supabase.co`

### Port Configuration
If port 3000 is occupied: `npm run dev -- -p 3001`

## Code Patterns & Conventions

### Client Components
- Pages use `'use client'` directive since they require interactivity (state, event handlers, hooks)
- Root `layout.tsx` is server-side and wraps children with `ThemeProvider`

### State Management
- Minimal state: Component-level useState for form fields, errors, loading states
- No global state library; theme is only shared context via React Context API
- Error messages auto-dismiss after 3 seconds using `setTimeout()`

### Error Handling
- Auth errors return user-friendly messages (e.g., "Invalid login credentials")
- Missing env vars throw immediately in `supabaseClient.ts` to fail fast
- Dashboard guards route access by checking session and redirecting to login

### Component Structure
- **Mounted state check**: Login page uses `useState(false)` mounted flag to prevent hydration mismatches
- **Effect-based auth checks**: Auth validation happens in `useEffect` with cleanup implicit (no cleanup needed for redirects)
- **No intermediate loading screens**: Full component re-renders with conditional loading UI instead of skeleton screens

## File Structure & Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with ThemeProvider, metadata config, Geist fonts |
| `src/app/page.tsx` | Entry point - redirects to welcome page |
| `src/app/login/page.tsx` | 796-line login form with inline CSS, Supabase auth, remember-me feature |
| `src/app/dashboard/page.tsx` | Protected dashboard showing user email, inventory stats (placeholder), logout button |
| `src/lib/themeContext.tsx` | Theme provider with localStorage persistence and OS preference detection |
| `src/lib/supabaseClient.ts` | Supabase client initialization with env var validation |
| `next.config.ts` | React Compiler enabled (`reactCompiler: true`) |
| `tsconfig.json` | Path alias `@/*` → `./src/*` for clean imports |

## When Adding Features

- **New authenticated pages**: Wrap in `'use client'`, add session check in `useEffect`, redirect to login if missing
- **New components**: Prefer `'use client'` by default; mark root layout as server-only
- **Theme support**: Add `dark:` variant classes for all color/background props
- **Form validation**: Keep in component state; can validate before Supabase API call
- **Environment variables**: Use `NEXT_PUBLIC_` prefix if needed in browser; validate in `supabaseClient.ts`

## Testing Checklist

1. Auth flow: Welcome → Loading (delay works?) → Login → Dashboard → Logout → Back to Login ✓
2. Remember me: Clears localStorage if unchecked, persists email if checked ✓
3. Dark mode: Theme persists across page reloads, toggle works on all pages ✓
4. Error handling: Invalid credentials show user-friendly messages that auto-dismiss ✓
5. Hydration: No layout shift on first load (mounted flag in login page) ✓

## Common Pitfalls

- **Supabase env vars missing**: App throws error on initialization—ensure `.env.local` is set
- **Session checks**: Always await `getSession()` before accessing `session.user`
- **Theme hydration**: Must check `mounted` state before rendering theme-dependent UI
- **Redirect timing**: Use `setTimeout` before `window.location.href` to allow UI updates (see login success flow)
- **CSS conflicts**: Inline styles in login may override Tailwind—be explicit with specificity or use `!important`
