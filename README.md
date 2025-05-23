# PdfChat

<p align="center">
  <img src="https://i.imgur.com/your-logo-url-here.png" alt="PdfChat Logo" width="200"/>
</p>

<p align="center">
  A modern RAG (Retrieval-Augmented Generation) application for interactive PDF document querying
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#development">Development</a> •
  <a href="#license">License</a>
</p>

## Overview

PdfChat is a full-stack PDF chat application that allows users to upload PDF files, process them into vector embeddings, store them in a Qdrant vector database, and interact with the content through a conversational AI interface. The system leverages local machine learning models for embeddings and integrates with OpenRouter for chat completions.

## Features

- 📄 **PDF Management:** Upload and process multiple PDFs with streamlined interface
- 🔍 **Semantic Search:** AI-powered search through your documents using natural language questions
- 💬 **Conversational AI:** Chat with your documents using OpenRouter's GPT-4o integration
- 🧠 **Local Embeddings:** Generate vector embeddings locally using Xenova Transformers
- 🚀 **Real-time Updates:** Track PDF processing with visual progress indicators
- 🔐 **Authentication:** Secure user management through Clerk authentication
- 🎨 **Modern UI:** Clean, responsive design with glassmorphism and dark mode

## Architecture

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Frontend  │ ◄──────► │   Backend   │ ◄──────► │ Vector Store│
│  (Next.js)  │          │   (Node.js) │          │   (Qdrant)  │
└─────────────┘          └─────────────┘          └─────────────┘
       ▲                        │                        ▲
       │                        ▼                        │
       │                 ┌─────────────┐                 │
       │                 │  Job Queue  │                 │
       │                 │  (BullMQ)   │                 │
       │                 └─────────────┘                 │
       │                        │                        │
       │                        ▼                        │
       │                 ┌─────────────┐                 │
       └───────────────►│    LLM API   │◄────────────────┘
                        │ (OpenRouter) │
                        └─────────────┘
```

### Data Flow

1. User uploads a PDF through the frontend
2. Backend queues the PDF for processing using BullMQ
3. Worker processes the PDF:
   - Extracts text
   - Splits into chunks
   - Generates embeddings using Xenova Transformers
   - Stores vectors in Qdrant
4. User asks questions through the chat interface
5. Backend retrieves relevant document chunks from Qdrant
6. Retrieved context is sent to OpenRouter along with the query
7. AI-generated response is displayed to the user

## Tech Stack

### Frontend
- **Framework:** Next.js 15 with App Router and React 19
- **UI Components:** Custom components with Tailwind CSS
- **Authentication:** Clerk integration
- **State Management:** React hooks

### Backend
- **Runtime:** Node.js with Express 5
- **Vector Database:** Qdrant (via Docker)
- **Queue System:** BullMQ with Valkey (Redis alternative)
- **Document Processing:** LangChain document loaders and text splitters
- **Embeddings:** Local Xenova Transformers (all-MiniLM-L6-v2)
- **LLM Provider:** OpenRouter with GPT-4o

## Installation

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- OpenRouter API key
- Hugging Face API key (optional)

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/pdfchat.git
cd pdfchat
```

### Step 2: Start Infrastructure with Docker
```bash
docker-compose up -d
```

This starts:
- **Qdrant** on port 6333 (UI dashboard available at http://localhost:6333/dashboard)
- **Valkey** (Redis alternative) on port 6379

### Step 3: Configure Environment Variables
For the server:
```bash
cd server
# Create .env file with necessary API keys and configuration
```

Required server environment variables:
- `OPENAI_API_KEY`: Your OpenRouter API key
- `HUGGINGFACE_API_KEY`: Your Hugging Face API key (optional)

For the client (if using authentication):
```bash
cd client
# Create .env.local with Clerk credentials
```

### Step 4: Install Dependencies & Start Services

Backend:
```bash
cd server
npm install
npm run dev       # Start the main server
npm run dev:worker # In a separate terminal, start the worker
```

Frontend:
```bash
cd client
npm install
npm run dev
```

## Usage

1. Navigate to http://localhost:3000 in your browser
2. Upload a PDF document
3. Wait for processing to complete (observe the progress indicator)
4. Start asking questions about your document in the chat interface
5. View AI-generated responses with source references

## Development

### Project Structure
```
pdfchat/
├── client/                  # Frontend (Next.js)
│   ├── app/                 # App router structure
│   ├── components/          # Reusable UI components
│   └── lib/                 # Utility functions
├── server/                  # Backend (Node.js)
│   ├── index.js             # Express server
│   ├── worker.js            # BullMQ worker for PDF processing
│   └── uploads/             # Temporary PDF storage
└── docker-compose.yml       # Docker config for infrastructure
```

### Adding Features
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgements
- [LangChain](https://js.langchain.com/) for document processing
- [Qdrant](https://qdrant.tech/) for vector storage
- [OpenRouter](https://openrouter.ai/) for AI completions
- [Xenova Transformers](https://huggingface.co/Xenova) for local embeddings
- [Next.js](https://nextjs.org/) for the frontend framework
- [Clerk](https://clerk.com/) for authentication