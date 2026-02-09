# Snore

A React + TypeScript application built with Vite, using Supabase for the backend.

## Features

- **Frontend Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **State Management**: TanStack Query v5
- **Routing**: React Router DOM v7
- **Backend**: Supabase
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm, yarn, or pnpm

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd snore
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**

    Create a `.env` file in the root directory by copying the example file:

    ```bash
    cp .env.example .env
    ```

    Open `.env` and fill in your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

## Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Previews the production build locally.
-   `npm run lint`: Runs ESLint.

## Project Structure

-   `src/components`: Reusable UI components
-   `src/pages`: Page components (routes)
-   `src/hooks`: Custom hooks
-   `src/lib`: Utility functions and clients (Supabase, QueryClient)
-   `src/types`: Global TypeScript definitions
