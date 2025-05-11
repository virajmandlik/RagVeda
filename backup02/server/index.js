import express from "express";
import cors from "cors";
import multer from "multer";
import {Queue} from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import dotenv from 'dotenv';
import { QdrantClient } from "@qdrant/js-client-rest";
// Make sure we're using the Xenova transformers pipeline
import { pipeline } from '@xenova/transformers';
dotenv.config();

const openai = new OpenAI({
  apiKey: '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',
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5000",
    "X-Title": "PdfChat"
  }
});

const app = express();
const queue = new Queue("file-upload-queue", { 
  connection: {
    host: "localhost",
    port: 6379
  }
});

// Configure CORS properly for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get("/test",(req,res)=>{
    console.log(req.body);
    res.send("Hello World");
})




const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"uploads/");
    },
    filename:function(req,file,cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null,`${uniqueSuffix}-${file.originalname}`);
    }
})
const upload = multer({storage:storage});
app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
    try {
        console.log("PDF upload received:", req.file);
        
        // Ensure we're sending a plain object with primitive values
        const jobData = {
            fileName: req.file.originalname,
            destination: req.file.destination,
            path: req.file.path
        };
        
        console.log("Job data to be queued:", JSON.stringify(jobData));
        
        // Add job to the queue with the correct name and data structure
        const job = await queue.add('process-pdf', jobData, {
            removeOnComplete: true,
            removeOnFail: false
        });
        
        console.log(`PDF uploaded: ${req.file.originalname}, queued for processing with job ID: ${job.id}`);
        res.status(200).json({ 
            success: true, 
            message: "File uploaded successfully and queued for processing",
            jobId: job.id
        });
    } catch (error) {
        console.error("Error queuing PDF for processing:", error);
        res.status(500).json({
            success: false,
            message: "Error processing upload",
            error: error.message
        });
    }
});

// Custom embeddings class that uses local transformers
class LocalTransformersEmbeddings {
  constructor(modelName = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
    this.model = null;
  }

  async init() {
    if (!this.model) {
      console.log(`Loading local embedding model: ${this.modelName}...`);
      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true
      });
      console.log("Local embedding model loaded successfully");
    }
    return true;
  }

  async embedDocuments(texts) {
    await this.init();
    console.log(`Embedding ${texts.length} documents with local model`);
    
    const embeddings = [];
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);
      console.log(`Embedding batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(texts.length/batchSize)}`);
      
      for (const text of batchTexts) {
        try {
          // Truncate very long texts to avoid memory issues
          const truncatedText = text.length > 8192 ? text.substring(0, 8192) : text;
          const result = await this.model(truncatedText, { 
            pooling: 'mean', 
            normalize: true,
            max_length: 512 // Limit token length
          });
          embeddings.push(Array.from(result.data));
        } catch (error) {
          console.error(`Error embedding text: ${text.substring(0, 50)}...`, error);
          // Push a placeholder embedding to maintain array length
          embeddings.push(new Array(384).fill(0));
        }
      }
      
      // Add a delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return embeddings;
  }

  async embedQuery(text) {
    await this.init();
    // Truncate very long queries
    const truncatedText = text.length > 8192 ? text.substring(0, 8192) : text;
    const result = await this.model(truncatedText, { 
      pooling: 'mean', 
      normalize: true,
      max_length: 512 // Limit token length
    });
    return Array.from(result.data);
  }
}

// Add proper logging to debug the chat endpoint
app.all('/chat', async (req, res) => {
  try {
    // Get message from either query params (GET) or request body (POST)
    const userQuery = req.method === 'GET' ? req.query.message : req.body.query;
    console.log(`Chat endpoint called with ${req.method} request:`, userQuery);
    
    if (!userQuery) {
      return res.status(400).json({ error: "No message provided" });
    }
    
    let useVectorSearch = true;
    let result = [];
    
    // Check if Qdrant collection exists before trying to query it
    try {
      const client = new QdrantClient({ url: 'http://localhost:6333' });
      const collections = await client.getCollections();
      console.log("Available collections:", collections);
      
      const collectionExists = collections.collections.some(
        c => c.name === 'langchainjs-testing'
      );
      
      if (!collectionExists) {
        console.log("Collection 'langchainjs-testing' does not exist");
        useVectorSearch = false;
      } else {
        console.log("Collection 'langchainjs-testing' exists, proceeding with vector search");
      }
    } catch (error) {
      console.error("Error checking Qdrant collections:", error);
      useVectorSearch = false;
    }
    
    // Only try to use vector search if the collection exists
    if (useVectorSearch) {
      console.log("Creating local embeddings instance using @xenova/transformers");
      const embeddings = new LocalTransformersEmbeddings();
      
      try {
        console.log("Initializing local embedding model...");
        const initialized = await embeddings.init();
        if (!initialized) {
          console.log("Failed to initialize embeddings, skipping vector search");
          useVectorSearch = false;
        } else {
          console.log("Local embedding model initialized successfully");
          console.log("Connecting to Qdrant vector store");
          try {
            const vectorStore = await QdrantVectorStore.fromExistingCollection(
              embeddings,
              {
                url: 'http://localhost:6333',
                collectionName: 'langchainjs-testing'
              }
            );
            
            console.log("Creating retriever with K=2");
            const retriever = vectorStore.asRetriever({
              k: 2,
            });
            
            console.log("Generating embedding for query using local model");
            console.log("Retrieving relevant documents");
            result = await retriever.getRelevantDocuments(userQuery);
            console.log(`Retrieved ${result.length} documents`);
            
            if (result.length > 0) {
              console.log("First document preview:", result[0].pageContent.substring(0, 100) + "...");
            } else {
              console.log("No relevant documents found");
            }
          } catch (error) {
            console.error("Error retrieving documents:", error);
            useVectorSearch = false;
          }
        }
      } catch (error) {
        console.error("Error initializing embeddings:", error);
        useVectorSearch = false;
      }
    }
    
    // Prepare system prompt with or without context
    const SYSTEM_PROMPT = result.length > 0 
      ? `You are a helpful assistant that answers questions based on the provided PDF content. 
         Use the following context to answer the user's question:
         ${result.map(doc => doc.pageContent).join('\n\n')}`
      : "You are a helpful assistant. If the user asks about PDF content, explain that no documents have been uploaded yet or there was an issue accessing the documents.";
    
    console.log("System prompt length:", SYSTEM_PROMPT.length);
    
    console.log("Sending request to OpenRouter");
    try {
      const chatResult = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userQuery }
        ]
      });
      
      console.log("Received response from OpenRouter");
      
      if (chatResult.choices && chatResult.choices.length > 0) {
        console.log("Sending successful response to client");
        res.json({
          message: chatResult.choices[0].message.content,
          docs: result
        });
      } else {
        console.error("No choices returned from OpenRouter", chatResult);
        res.status(500).json({
          error: "No choices returned from OpenRouter.",
          raw: chatResult
        });
      }
    } catch (error) {
      console.error("Error from OpenRouter API:", error);
      res.status(500).json({
        error: "Error from OpenRouter API",
        details: error.message || error,
      });
    }
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({
      error: "Error from chat processing",
      details: error.message || error,
    });
  }
});

app.get('/check-data', async (req, res) => {
  console.log('the data is being checked now in vector store');
  try {
    console.log('the client is being created now');
    const client = new QdrantClient({ url: 'http://localhost:6333' });
    console.log('the client is created now');
    console.log('the collection info is being fetched now');
    const collectionInfo = await client.getCollection('langchainjs-testing');
    console.log('the collection info is fetched now');
    console.log('Collection info:', collectionInfo);

    const hasData = collectionInfo && collectionInfo.points_count > 0;
    console.log('Has data:', hasData);

    res.json({ hasData });
  } catch (error) {
    console.error('Error checking data:', error);
    res.json({ hasData: false });
  }
});


async function testChat() {
  try {
    const chatResult = await openai.chat.completions.create({
      model: "openai/gpt-4o", // or "openai/gpt-3.5-turbo"
      max_tokens: 128,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, how are you?" }
      ]
    });

    if (chatResult.choices && chatResult.choices.length > 0) {
      console.log("Assistant reply:", chatResult.choices[0].message.content);
    } else {
      console.error("No choices returned from OpenRouter.", chatResult);
    }
  } catch (error) {
    console.error("Error from OpenRouter API:", error.message || error);
  }
}

app.get('/test-embeddings', async (req, res) => {
  try {
    console.log("Testing local embeddings model");
    const embeddings = new LocalTransformersEmbeddings();
    const initialized = await embeddings.init();
    
    if (!initialized) {
      return res.status(500).json({ 
});
    }
    
    const testText = "This is a test sentence to verify embeddings are working.";
    console.log("Generating embedding for test text");
    const embedding = await embeddings.embedQuery(testText);
    
    console.log("Embedding generated successfully");
    res.json({
      success: true,
      embeddingLength: embedding.length,
      embeddingSample: embedding.slice(0, 5) // Just show first 5 values
    });
  } catch (error) {
    console.error("Error testing embeddings:", error);
    res.status(500).json({
      error: "Error testing embeddings",
      details: error.message || error
    });
  }
});

// Add job status endpoint
app.get('/job-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: "No job ID provided" });
    }
    
    console.log(`Checking status for job ${jobId}`);
    
    // Get job from queue
    const job = await queue.getJob(jobId);
    
    if (!job) {
      // Job might have been completed and removed from the queue
      // Check if we can find it in the completed set
      const completedJobs = await queue.getCompleted();
      const completedJob = completedJobs.find(j => j.id === jobId);
      
      if (completedJob) {
        return res.json({
          id: jobId,
          state: 'completed',
          progress: 100,
          isCompleted: true,
          isFailed: false,
          isActive: false,
          isWaiting: false
        });
      }
      
      // Check if the job is in the failed set
      const failedJobs = await queue.getFailed();
      const failedJob = failedJobs.find(j => j.id === jobId);
      
      if (failedJob) {
        return res.json({
          id: jobId,
          state: 'failed',
          progress: 0,
          error: failedJob.failedReason || 'Unknown error',
          isCompleted: false,
          isFailed: true,
          isActive: false,
          isWaiting: false
        });
      }
      
      // If we can't find the job, assume it's completed successfully
      // This is a fallback for jobs that were completed and removed
      return res.json({ 
        id: jobId,
        state: 'completed',
        progress: 100,
        isCompleted: true,
        isFailed: false,
        isActive: false,
        isWaiting: false,
        message: 'Job not found in queue, assuming it completed successfully'
      });
    }
    
    // Get job state
    const state = await job.getState();
    
    let status = {
      id: job.id,
      state: state,
      progress: job.progress || 0,
      data: job.data,
      isCompleted: state === 'completed',
      isFailed: state === 'failed',
      isActive: state === 'active',
      isWaiting: state === 'waiting'
    };
    
    // If job is completed but still in queue, it means it was just completed
    if (state === 'completed') {
      console.log(`Job ${jobId} is completed`);
      status.progress = 100; // Ensure progress is 100% for completed jobs
    } else if (state === 'failed') {
      console.log(`Job ${jobId} failed`);
      if (job.failedReason) {
        status.error = job.failedReason;
      }
    }
    
    res.json(status);
  } catch (error) {
    console.error(`Error checking job status: ${error}`);
    res.status(500).json({ 
      error: "Error checking job status",
      details: error.message
    });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
  console.log("Available endpoints:");
  console.log("- GET /test");
  console.log("- POST /upload/pdf");
  console.log("- GET /chat");
  console.log("- GET /check-data");
  console.log("- GET /test-embeddings");
  console.log("- GET /job-status/:jobId");
});


