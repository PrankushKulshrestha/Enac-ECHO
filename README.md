# Project ECHO — Frontend

**E-Waste Collection Hub Operation**  
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
src
│   App.jsx
│   index.css
│   main.jsx
│
├───components
│       AdminRoute.jsx
│       Footer.jsx
│       Navbar.jsx
│       ProtectedRoute.jsx
│
├───lib
│       appwrite.js
│       AuthContext.jsx
│       db.js
│
└───pages
        AboutPage.jsx
        AdminPage.jsx
        DashboardPage.jsx
        GroupsPage.jsx
        HomePage.jsx
        LoginPage.jsx
        RegisterPage.jsx
        UnverifiedPage.jsx
        VerifyCallbackPage.jsx
```

## Design System

**Colors:** Moss green (`#2D4A22`), Leaf (`#4A7C59`), Sage (`#8FAF7E`), Cream (`#F5F0E8`)  
**Fonts:** Syne (display), DM Sans (body), Space Mono (mono/labels)
"# Enac-ECHO" 
