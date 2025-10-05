# CF_AI_CHAT

An AI chat application that remembers context of the conversation using Cloudflare's worker AI on llama 3.3

## Features

- Real-time chat with Llama 3.3 (70b model)
- Persistent conversation history using Durable Objects
- Context-aware responses that remember previous messages
- Session-based isolation
- Clear conversation functionality

## Components
- **Workers AI**: Runs Llama 3.3 for generating AI responses
- **Durable Objects**: Stores conversation history with persistence
- **Workers**: Routes requests and serves the chat interface

# Prerequisites:
 - Node.js 20+
 - Cloudflare account (free tier works)

# Requirements
- LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice
- Workflow / coordination (recommend using Workflows, Workers or Durable Objects)
- User input via chat or voice (recommend using Pages or Realtime)
- Memory or state

# Setup Instructions

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Start dev server
npm run dev

# Usage
Visit http://localhost:8787 to use the chat interface or press 'b' in the terminal 

