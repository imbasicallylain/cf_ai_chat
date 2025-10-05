y# CF_AI_CHAT

An AI chat application that remembers context of the conversation using Cloudflare's worker AI on llama 3.3

## Features

- Real-time chat with Llama 3.3 (70b model)
- Persistent conversation history using Durable Objects
- Context-aware responses that remember previous messages
- Session-based isolation
- Clear conversation functionality

## Components
- **Workers AI**: Runs Llama 3.3 for generating AI responses
- **Durable Objects**: Stores conversation history with persistance
- **Workers**: Routes requests and serves the chat interface

# Prerequisites:
 - Node.js 20+
 - Cloudflare account (free tier works)

# Setup Instructions

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Start dev server
npm run dev

# Usage
Visit http://localhost:8787 to use the chat inteface or press 'b' in the terminal 

