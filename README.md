# StudyLeave

A comprehensive study management application with AI tutoring capabilities.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

To use the AI Tutor feature, you need to set up your OpenAI API key:

1. Create a `.env.local` file in the root directory of the project
2. Add your OpenAI API key to the file:

```
OPENAI_API_KEY=your_api_key_here
MODEL_NAME=gpt-4o
```

3. Replace `your_api_key_here` with your actual OpenAI API key
4. Restart the development server if it's already running

> **Important**: Never commit your API keys to version control. The `.env.local` file is included in `.gitignore` by default, but always double-check that your keys are not being exposed.

## Features

- Subject organization with Notion-like nested structure
- Note-taking with rich text editor
- AI Tutor powered by GPT-4o for study assistance
- Quiz and test tracking
- Progress monitoring
- Dark mode support

## Security Best Practices

- Always keep your API keys in environment variables
- Use the Next.js API routes to securely make API calls without exposing your keys to the client
- Implement proper rate limiting and usage monitoring for your OpenAI API usage

## Learn More
