# Supabase Integration Guide

Your TelaPhoria IMS application is now connected to Supabase for authentication!

## Current Setup

Your Supabase credentials are already configured in `.env.local`:
- **Supabase URL**: `https://ligecpalemxczhpfmeid.supabase.co`
- **Anon Key**: Already set up

## How Authentication Works

### 1. **Welcome Page** (`/`)
- User sees the welcome screen
- Clicks "Get Started" button

### 2. **Loading Page** (`/loading`)
- Animated loading screen
- Auto-redirects to login after 10.8 seconds

### 3. **Login Page** (`/login`)
- User enters email and password
- Form is validated
- Credentials are sent to Supabase for authentication
- On success: User is redirected to `/dashboard`
- On failure: Error message is displayed

### 4. **Dashboard** (`/dashboard`)
- Protected route - requires authentication
- Displays user information
- Shows inventory statistics
- Logout button available

## Creating Test Users in Supabase

To test the login functionality, you need to create users in Supabase:

### Step 1: Go to Supabase Dashboard
1. Visit [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your account
3. Select your project: **ligecpalemxczhpfmeid**

### Step 2: Create a Test User
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email**: test@example.com
   - **Password**: Test123456!
   - Check "Auto send sign up confirmation"
4. Click **Create user**

### Step 3: Test Login
1. Run your app: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Get Started"
4. Wait for loading screen or click through
5. Enter credentials:
   - Email: `test@example.com`
   - Password: `Test123456!`
6. Click "Login"

## Features Implemented

### ✅ Email/Password Authentication
- Users can sign up and log in with email and password
- Password validation on Supabase side
- Secure session management

### ✅ Session Management
- Sessions are automatically managed by Supabase
- User stays logged in across page refreshes
- Automatic redirect to login if session expires

### ✅ Protected Routes
- Dashboard is protected - requires authentication
- Unauthenticated users are redirected to login

### ✅ Remember Me
- Optional "Remember me" checkbox
- User email is stored in localStorage if checked

### ✅ Error Handling
- Clear error messages for failed login attempts
- Invalid credentials feedback
- Network error handling

## API Integration Points

### Login Function
Located in `/src/app/login/page.tsx`:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### Session Check
Located in `/src/app/login/page.tsx` and `/src/app/dashboard/page.tsx`:
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Logout Function
Located in `/src/app/dashboard/page.tsx`:
```typescript
await supabase.auth.signOut();
```

## Supabase Client Configuration

The Supabase client is configured in `/src/lib/supabaseClient.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Environment Variables

Your `.env.local` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=https://ligecpalemxczhpfmeid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note**: These are public keys (safe to expose in frontend). Never share your service role key!

## Next Steps

### 1. Add More Authentication Methods
- Google OAuth
- GitHub OAuth
- Magic Link (passwordless)

### 2. Add User Profile Management
- Store additional user data
- Update profile information
- Profile picture upload

### 3. Add Database Tables
- Create inventory tables
- Link to user accounts
- Add real-time subscriptions

### 4. Add Authorization Rules
- Row-level security (RLS)
- User-specific data access
- Admin roles

## Troubleshooting

### "Invalid login credentials"
- Check email and password are correct
- Ensure user exists in Supabase
- Verify user email is confirmed

### "Session not found"
- User may not be logged in
- Session may have expired
- Try logging in again

### "Network error"
- Check internet connection
- Verify Supabase URL is correct
- Check browser console for errors

### "CORS error"
- This shouldn't happen with Supabase
- If it does, check your Supabase project settings

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## Support

For issues with Supabase:
- Check [Supabase Status](https://status.supabase.com)
- Visit [Supabase Discord](https://discord.supabase.com)
- Check [GitHub Issues](https://github.com/supabase/supabase/issues)

Happy coding! 🚀
