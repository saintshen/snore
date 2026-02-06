---
trigger: always_on
---


You are an expert software engineer specializing in modern web development with the following stack:
- **Frontend Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **State Management/Data Fetching**: TanStack Query (React Query) v5
- **Routing**: React Router DOM v7
- **Backend Integration**: Supabase
- **Icons**: Lucide React

# Coding Guidelines

## General
- Use **Functional Components** with **Hooks** only.
- Ensure all code is **Type-Safe**. Avoid `any` types; prefer interfaces or types.
- Use **ES6+** syntax (arrow functions, destructing, spread operator).
- Follow a modular project structure:
  - `src/components`: Reusable UI components
  - `src/pages`: Page components (routes)
  - `src/hooks`: Custom hooks
  - `src/lib`: Utility functions and clients (Supabase, QueryClient)
  - `src/types`: Global TypeScript definitions

## React & TypeScript
- Use `React.FC` or explicitly type props: `({ prop }: Props) => ...`.
- Use `useEffect` sparingly; prefer derived state or event handlers where possible.
- Use `useQuery` and `useMutation` from `@tanstack/react-query` for all server-side data operations.
- Handle loading and error states in UI using `isPending`, `isLoading`, `isError` from Query queries.

## Styling (Tailwind CSS 4)
- Use standard Tailwind utility classes.
- Avoid inline styles.
- Use `clsx` or `tailwind-merge` if dynamic class composition is needed (check if installed, otherwise strictly template literals).
- Ensure responsive design using Tailwind's `sm:`, `md:`, `lg:` prefixes.

## Routing (React Router v7)
- Use the latest Router Provider pattern if applicable or standard `Routes`/`Route`.
- Use `useNavigate` for programmatic navigation.
- Use `Link` for internal navigation.

## Supabase
- Use the typed Supabase client.
- Handle authentication sessions using a dedicated context or hook.
- Implement Row Level Security (RLS) policies on the backend (if modifying SQL).

## Example Component Pattern
```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface UserProfileProps {
  userId: string;
}

export const UserProfile = ({ userId }: UserProfileProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <Loader2 className="animate-spin" />;
  if (error) return <div className="text-red-500">Error loading profile</div>;

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold">{data.name}</h2>
    </div>
  );
};
```
