# Actor Empire

Actor Empire is a Hollywood life-sim and career strategy game built by Zeesh. You start as a young aspiring actor and try to build a full entertainment empire through acting jobs, networking, relationships, money management, business expansion, and long-term family legacy.

## What the game includes

- Career progression with auditions, gigs, press tours, awards, and fame growth
- Social systems with partners, marriage, children, and family relationships
- Legacy gameplay where you can continue as your child and carry the bloodline forward
- Lifestyle systems for homes, cars, luxury assets, and personal upgrades
- Business and studio management
- In-game phone apps for social media, stocks, dating, messages, and more

## Tech Stack

- React
- TypeScript
- Vite
- Lucide React

## Run locally

### Prerequisites

- Node.js

### Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Optional local environment variables

If you want to customize local-only behavior, you can use an `.env.local` file.

- `VITE_DEV_TOOLS_PASSCODE` sets a custom developer tools passcode
- `GEMINI_API_KEY` is available if you wire up Gemini-powered features locally

These env files are ignored by git and are not committed to the repository.

## Build

```bash
npm run build
```

## Type check

```bash
npm run lint
```

## Project vision

The goal of Actor Empire is to blend career simulation, celebrity life, wealth building, and dynasty gameplay into one long-form progression game where each generation can shape the future of the family empire.
