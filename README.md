# StudyLeave

A modern study application for organizing notes, flashcards, and tracking progress.

## Features

- Subject organization with notes
- Flashcards for studying
- Progress tracking
- AI Tutor integration
- Mind maps for visual learning

## Deployment on AWS Amplify

To deploy this project on AWS Amplify with a custom domain:

1. Log in to the [AWS Management Console](https://aws.amazon.com/console/)
2. Search for "Amplify" and navigate to the service
3. Click "New app" > "Host web app"
4. Connect to your GitHub repository and select the main branch
5. Configure build settings (use the provided amplify.yml)
6. Set the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `MODEL_NAME`: The model to use (e.g., gpt-4o)
7. Deploy the application
8. Set up your custom domain through the "Domain Management" section
9. Add the required DNS records at your domain registrar
10. Wait for DNS propagation (can take 24-48 hours)

## Deployment on Vercel

To deploy this project on Vercel:

1. Create a new project on the [Vercel Dashboard](https://vercel.com/new)
2. Link your GitHub repository (or import the code directly)
3. Configure the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `MODEL_NAME`: The model to use (e.g., gpt-4o)
4. Deploy!

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Built With

- Next.js
- React
- OpenAI API
- Tailwind CSS

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

## Security Best Practices

- Always keep your API keys in environment variables
- Use the Next.js API routes to securely make API calls without exposing your keys to the client
- Implement proper rate limiting and usage monitoring for your OpenAI API usage

## Learn More
