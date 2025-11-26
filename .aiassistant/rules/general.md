---
apply: always
---

# Wiki Generator - AI Agent Ruleset

## Project Overview
Building an automatic Wiki Generator for public GitHub repositories using Next.js, React, TypeScript, and OpenAI GPT-4o-mini. Goal: Create user-facing, feature-driven documentation that real engineers want to read.

## Tech Stack
- **Framework**: Next.js 16.0.4 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.2.0, Tailwind CSS 4, shadcn/ui components
- **Database**: SQLite for storing analysis results
- **Deployment**: Vercel
- **AI**: OpenAI GPT-5-mini only
- **GitHub**: Public repositories via GitHub API

## Architecture Principles

### 1. Next.js App Router Structure
```
app/ ├── page.tsx # Landing page with repo input ├── wiki/[repo]/ │ ├── page.tsx # Wiki home/overview │ └── [subsystem]/ │ └── page.tsx # Individual subsystem pages ├── api/ │ ├── analyze/route.ts # Trigger repo analysis │ ├── wiki/route.ts # Fetch wiki data │ └── search/route.ts # Search functionality (bonus) ├── layout.tsx # Root layout └── globals.css # Tailwind imports
lib/ ├── github.ts # GitHub API integration ├── openai.ts # OpenAI API wrapper ├── analyzer.ts # Repository analysis logic ├── db.ts # SQLite database functions └── types.ts # TypeScript interfaces
components/ ├── ui/ # shadcn/ui components ├── WikiSidebar.tsx # Navigation sidebar ├── WikiContent.tsx # Main content area ├── CodeCitation.tsx # Inline code links └── RepoInput.tsx # Repository input form
```

### 2. Data Flow
- User submits GitHub repo URL → API route `/api/analyze`
- Server fetches repo via GitHub API → stores raw data
- OpenAI analyzes repo structure → identifies user-facing features/subsystems
- Results stored in SQLite with JSON structure
- Wiki pages render from database with Server Components
- All AI processing happens server-side in API routes

## Code Style & Standards

### TypeScript
- Use `strict` mode
- Explicit return types for functions
- No `any` types; use `unknown` if necessary
- Prefer interfaces over types for objects
- Export types alongside implementations
-
```
typescript // Good export interface WikiSubsystem { id: string; name: string; description: string; entryPoints: string[]; citations: Citation[]; }
export async function analyzeRepository(repoUrl: string): Promise<WikiSubsystem[]> { // implementation }
// Bad export function analyzeRepository(repoUrl: string) { return data as any; }
```

### React Components
- Use functional components with hooks
- Server Components by default; add `'use client'` only when needed
- Props interfaces named `ComponentNameProps`
- Keep components focused and single-purpose
```
typescript // Server Component (default) interface WikiPageProps { params: { repo: string; subsystem: string }; }
export default async function WikiPage({ params }: WikiPageProps) { const data = await fetchWikiData(params.repo, params.subsystem); return ; }
// Client Component (when needed) 'use client';
interface SearchBarProps { onSearch: (query: string) => void; }
export function SearchBar({ onSearch }: SearchBarProps) { const [query, setQuery] = useState(''); // implementation }```
```

### Naming Conventions
- **Components**: PascalCase (`WikiSidebar.tsx`)
- **Functions**: camelCase (`analyzeRepository`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (`WikiSubsystem`)
- **Files**: kebab-case for routes, PascalCase for components

## Repository Analysis Strategy

### User-Facing Feature Organization
**Goal**: Organize by what the software DOES, not how it's built.
```
typescript // Good structure { subsystems: [ { name: "User Authentication", description: "Handles user login, signup, and session management", features: ["OAuth integration", "Password reset", "Session tokens"], entryPoints: ["src/auth/login.ts", "src/auth/middleware.ts"] }, { name: "Dashboard & Analytics", description: "Real-time data visualization for user metrics", features: ["Chart rendering", "Data aggregation", "Export functionality"] } ] }
// Bad structure (avoid) { subsystems:    }latex_unknown_tag
```

### Analysis Process
1. **Fetch repo structure** via GitHub API (tree, README, key files)
2. **Identify entry points**: main files, package.json scripts, documentation
3. **Prompt OpenAI** with structured request:
   - "Analyze this repository from a user's perspective"
   - "Identify distinct features/capabilities users interact with"
   - "Group related code by functionality, not architecture"
4. **Parse response** into JSON structure
5. **Generate citations**: link descriptions to specific files/lines

## OpenAI Integration

### Configuration
- Model: `gpt-4o-mini` ONLY
- Temperature: 0.3 (balanced between creativity and consistency)
- Max tokens: Adjust based on repo size (start with 2000)
- Use structured outputs when possible

### Prompting Strategy
```
typescript const systemPrompt = `You are a technical documentation expert. Analyze GitHub repositories and create user-facing documentation organized by features and capabilities, not technical architecture.
Focus on:
What users can DO with this software
How features work together
Key entry points and public interfaces
Clear, concise descriptions
Avoid:
Generic technical layers (frontend/backend/utils)
Implementation details without context
Jargon without explanation`;
const userPrompt = `Analyze this repository: ${repoName}
Structure: ${fileTree}
Key files: {readmeContent}{packageJson}
Return JSON with this structure: { "subsystems": }`;
```

## Database Schema (SQLite)
```
sql -- repositories table CREATE TABLE repositories ;
-- subsystems table CREATE TABLE subsystems ;
-- citations table CREATE TABLE citations   ;latex_unknown_tag
```

## UI/UX Guidelines

### Layout Structure
- **Sidebar**: Fixed, scrollable list of subsystems
- **Main content**: Responsive, centered max-width
- **Navigation**: Clear hierarchy, breadcrumbs
- **Citations**: Inline links styled distinctly

### shadcn/ui Components to Use
- `Button` - CTAs, navigation
- `Card` - Subsystem containers
- `ScrollArea` - Sidebar, long content
- `Badge` - Tags, labels
- `Separator` - Visual dividers
- `Skeleton` - Loading states
- `Alert` - Error messages

### Tailwind Patterns
```
typescript // Consistent spacing const spacing = "p-6 md:p-8"; const containers = "max-w-4xl mx-auto";
// Typography hierarchy const headings = { h1: "text-4xl font-bold tracking-tight", h2: "text-2xl font-semibold", h3: "text-xl font-medium" };
// Code citations const citation = "text-blue-600 hover:text-blue-800 underline font-mono text-sm";
```

## Error Handling

### API Routes
```

typescript export async function POST(request: Request) { try { const body = await request.json();
// Validate input
if (!body.repoUrl) {
  return Response.json(
    { error: 'Repository URL is required' },
    { status: 400 }
  );
}

const result = await analyzeRepository(body.repoUrl);
return Response.json(result);
} catch { console.error('Analysis failed:', error); return Response.json; } }
```

### Client-Side
- Show user-friendly error messages
- Provide retry mechanisms
- Display loading states during async operations
- Validate forms before submission

## GitHub API Integration

### Best Practices
- Use authenticated requests (token from env)
- Fetch efficiently: tree API for structure, raw content for specific files
- Handle rate limits gracefully
- Parse repo URLs: extract owner/name
```

typescript const GITHUB_API = 'https://api.github.com';
export async function fetchRepoTree(owner: string, repo: string) { const response = await fetch;
if (!response.ok) { throw new Error(GitHub API error: ${response.status}); }
return response.json(); }
```

## Performance Optimization

### Current Strategy (Speed Priority)
- No caching initially - focus on correctness
- Server-side rendering for instant page loads
- Lazy load subsystem details
- Limit OpenAI context to essential files
- Process repos asynchronously (status: pending → analyzing → complete)

### Future Improvements
- Add caching layer (Vercel KV, Redis)
- Implement request deduplication
- Background job queue for large repos
- Incremental analysis for updates

## Environment Variables
```

bash
.env.local
OPENAI_API_KEY=sk-... # Provided by challenge GITHUB_TOKEN=ghp_... # Personal access token (optional but recommended) DATABASE_URL=file:./wiki.db # SQLite database path
```

## Testing Checklist

Before submitting, verify:
- [ ] Works with all 3 example repos (rich-cli, browser-use, todomvc)
- [ ] Wiki shows user-facing features, not technical layers
- [ ] Citations link correctly to GitHub files
- [ ] Navigation is intuitive
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings
- [ ] Mobile responsive
- [ ] Error states handled gracefully
- [ ] Loading states shown during analysis
- [ ] Deployed successfully to Vercel

## Git Commit Strategy

Write clear, narrative commits:
```

✅ Good commits:
"Add GitHub API integration with tree fetching"
"Implement OpenAI analysis with feature-driven prompts"
"Create wiki sidebar navigation component"
❌ Bad commits:
"updates"
"fix"
"WIP"
```

## Production Readiness Notes

When discussing what's NOT production-ready, consider:
- No authentication/rate limiting
- SQLite won't scale (needs Postgres)
- No caching strategy
- Limited error recovery
- No webhook updates for repo changes
- OpenAI costs not monitored
- No test coverage
- No analytics/monitoring

## Key Success Metrics

1. **Working Demo**: Can paste any public repo URL and get a wiki
2. **Content Quality**: Features are user-facing, descriptions are accurate
3. **Citations**: Every claim links back to code
4. **Navigation**: Easy to explore all subsystems
5. **Code Quality**: Clean TypeScript, no linting errors
6. **Commit History**: Tells the story of your development

---

## Quick Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run lint               # Check for issues

# Database
sqlite3 wiki.db            # Open database
.schema                    # View schema
SELECT * FROM repositories;

# Deployment
vercel                     # Deploy to Vercel
vercel --prod             # Deploy to production
```
