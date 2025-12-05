# TelaPhoria IMS - Setup Instructions

Your HTML files have been successfully converted to Next.js pages! Here's how to run the application on localhost.

## Prerequisites

Make sure you have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/)

## Installation & Running

### Step 1: Install Dependencies
Open your terminal/command prompt in the project directory and run:

```bash
npm install
```

### Step 2: Run the Development Server
Start the Next.js development server:

```bash
npm run dev
```

### Step 3: Open in Browser
Once the server is running, open your browser and navigate to:

```
http://localhost:3000
```

## Application Flow

The application follows this flow:

1. **Welcome Page** (`/`) - Welcome screen with "Get Started" button
2. **Loading Page** (`/loading`) - Animated loading screen that redirects to login after 10.8 seconds
3. **Login Page** (`/login`) - User authentication page with Supabase integration
4. **Dashboard** (`/dashboard`) - Main application (protected route, requires authentication)

## File Structure

```
src/app/
├─��� page.tsx           # Main page (redirects to /loading)
├── loading/
│   └── page.tsx       # Loading animation page
├── login/
│   └── page.tsx       # Login form page
├── welcome/
│   └── page.tsx       # Welcome page
├── layout.tsx         # Root layout
└── globals.css        # Global styles
```

## Features

✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
✅ **Dark Mode Support** - Theme toggle switch on all pages
✅ **Smooth Animations** - Loading animations and transitions
✅ **Form Validation** - Email and password validation on login
✅ **Session Management** - Remember me functionality
✅ **Modern UI** - Beautiful gradient buttons and animated backgrounds

## Customization

### Change Logo
Replace the logo image at `public/Logo.jpg` with your own image.

### Update Colors
Edit the CSS variables in each page component:
- `--accent-color: #ff69b4` (Pink)
- `--bg-color: #fff0f5` (Light background)

### Modify Text
Update the welcome messages and headers in each page component.

## Building for Production

To create an optimized production build:

```bash
npm run build
npm start
```

## Troubleshooting

### Port 3000 Already in Use
If port 3000 is already in use, you can specify a different port:

```bash
npm run dev -- -p 3001
```

### Module Not Found Errors
Make sure all dependencies are installed:

```bash
npm install
```

### Clear Cache
If you encounter caching issues:

```bash
rm -rf .next
npm run dev
```

## Notes

- The application uses Next.js 16 with React 19
- All pages are client-side rendered for smooth interactions
- The theme toggle persists across page navigation
- Session data is stored in localStorage

Enjoy your TelaPhoria IMS application! 🎉
