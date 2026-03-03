# Project ECHO — Frontend

**Electronic Collection & Handling Organization**  
A sustainable e-waste initiative by Enactus NSUT.

## Tech Stack

- **React 18** + **Vite** — Fast frontend framework
- **Tailwind CSS** — Utility-first styling
- **React Router v6** — Client-side routing
- **Appwrite** — Backend-as-a-service (auth, database, storage)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Appwrite

```bash
cp .env.example .env
```

Edit `.env` with your Appwrite project credentials:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DB_ID=echo-db
```

### 3. Set up Appwrite

In your Appwrite console:

1. Create a new project
2. Enable **Email/Password** authentication
3. Create a database named `echo-db` with these collections:
   - `users` — stores user profile & points
   - `submissions` — e-waste deposit records
   - `bins` — bin location data
   - `rewards` — redeemable rewards catalog
4. Add your app's domain to **Platforms** (Web platform)

### 4. Run the dev server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx        # Sticky navbar with auth state
│   ├── Footer.jsx        # Footer with links & contact
│   └── ProtectedRoute.jsx
├── lib/
│   ├── appwrite.js       # Appwrite client config
│   └── AuthContext.jsx   # React auth context
├── pages/
│   ├── HomePage.jsx      # Landing page
│   ├── AboutPage.jsx     # About ECHO
│   ├── LoginPage.jsx     # Sign in
│   ├── RegisterPage.jsx  # Sign up
│   └── DashboardPage.jsx # User dashboard (protected)
└── index.css             # Tailwind + custom styles
```

## Design System

**Colors:** Moss green (`#2D4A22`), Leaf (`#4A7C59`), Sage (`#8FAF7E`), Cream (`#F5F0E8`)  
**Fonts:** Syne (display), DM Sans (body), Space Mono (mono/labels)
"# Enac-ECHO" 
