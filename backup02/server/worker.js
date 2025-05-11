import { Worker } from 'bullmq';
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config();

// Custom embeddings class that uses local transformers with optimizations
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

// Function to handle document processing with local embeddings
async function processDocuments(docs, job) {
  try {
    console.log(`Starting document processing for ${docs.length} chunks`);
    
    // Use local transformers embeddings
    const embeddings = new LocalTransformersEmbeddings();
    console.log("Initializing embedding model...");
    await embeddings.init();
    console.log("Embedding model initialized successfully");
    
    if (job) job.updateProgress(65); // Model initialized
    
    console.log("Setting up vector store connection to Qdrant...");
    
    // First, delete the existing collection if it exists
    try {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      const client = new QdrantClient({ url: 'http://localhost:6333' });
      console.log("Attempting to delete existing collection 'langchainjs-testing'");
      await client.deleteCollection('langchainjs-testing');
      console.log("Successfully deleted existing collection");
    } catch (error) {
      console.log("Collection deletion attempt result:", error.message);
    }
    
    if (job) job.updateProgress(70); // Collection prepared
    
    // Use much smaller batch size for processing
    const batchSize = 2; // Reduced from 5
    let processedCount = 0;
    
    // Create a new collection with the first batch
    const firstBatch = docs.slice(0, Math.min(batchSize, docs.length));
    console.log(`Creating vector store with first ${firstBatch.length} chunks`);
    
    const vectorStore = await QdrantVectorStore.fromDocuments(
      firstBatch,
      embeddings,
      {
        url: 'http://localhost:6333',
        collectionName: 'langchainjs-testing',
        collectionConfig: {
          vectors: {
            size: 384, // Dimension for all-MiniLM-L6-v2
            distance: 'Cosine'
          }
        }
      }
    );
    
    processedCount += firstBatch.length;
    console.log(`Processed first batch: ${firstBatch.length} documents`);
    
    if (job) job.updateProgress(75); // First batch processed
    
    // Process remaining documents in smaller batches with longer delays
    for (let i = batchSize; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, Math.min(i + batchSize, docs.length));
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(docs.length/batchSize)}`);
      
      try {
        await vectorStore.addDocuments(batch);
        processedCount += batch.length;
        console.log(`Processed ${processedCount}/${docs.length} documents`);
        
        // Update progress based on how many documents we've processed
        if (job) {
          const progress = 75 + Math.floor(processedCount / docs.length * 20);
          job.updateProgress(Math.min(progress, 95)); // Up to 95% for document processing
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, error);
        // Continue with next batch instead of failing completely
        continue;
      }
      
      // Add a longer delay between batches to prevent overloading
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("All documents successfully added to vector store");
    if (job) job.updateProgress(95); // All documents processed
    
    return true;
  } catch (error) {
    console.error("Error during embedding or Qdrant operation:", error);
    return false;
  }
}

// Create a worker instance
const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    try {
      // Only process jobs with name 'process-pdf'
      if (job.name !== 'process-pdf') {
        console.log(`Skipping job ${job.id} with name ${job.name} - expected 'process-pdf'`);
        return { skipped: true };
      }
      
      console.log("Processing job:", job.id, "Name:", job.name);
      job.updateProgress(10); // Started processing
      
      // More detailed debugging of job.data
      console.log("Raw job.data type:", typeof job.data);
      console.log("Is job.data null?", job.data === null);
      console.log("Is job.data undefined?", job.data === undefined);
      
      try {
        // Safely log job.data
        console.log("Raw job.data:", JSON.stringify(job.data));
      } catch (jsonError) {
        console.error("Error stringifying job.data:", jsonError);
        console.log("job.data keys:", job.data ? Object.keys(job.data) : "No keys (null or undefined)");
      }
      
      // Safely access job.data
      const data = job.data || {};
      
      if (!data.path) {
        throw new Error("Missing file path in job data");
      }

      // Verify the file exists
      if (!fs.existsSync(data.path)) {
        throw new Error(`File does not exist at path: ${data.path}`);
      }

      console.log("Loading PDF from path:", data.path);
      job.updateProgress(20); // Loading PDF
      
      const loader = new PDFLoader(data.path, {
        splitPages: true // Split by pages to reduce memory usage
      });
      
      console.log("Converting PDF to documents");
      const docs = await loader.load();
      console.log(`Loaded ${docs.length} pages from PDF`);
      job.updateProgress(30); // PDF loaded
      
      // Use smaller chunks and larger overlap for better context
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 500,       // Smaller chunks
        chunkOverlap: 100,    // Smaller overlap
      });
      
      // Process pages in batches to avoid memory issues
      let allSplitDocs = [];
      const pagesBatchSize = 5;
      
      for (let i = 0; i < docs.length; i += pagesBatchSize) {
        const pagesBatch = docs.slice(i, i + pagesBatchSize);
        console.log(`Processing pages ${i+1} to ${Math.min(i+pagesBatchSize, docs.length)}`);
        
        const splitDocsForBatch = await textSplitter.splitDocuments(pagesBatch);
        allSplitDocs = allSplitDocs.concat(splitDocsForBatch);
        
        // Small delay to prevent CPU overload
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update progress based on how many pages we've processed
        const progress = 30 + Math.floor((i + pagesBatchSize) / docs.length * 20);
        job.updateProgress(Math.min(progress, 50)); // Up to 50% for text splitting
      }
      
      console.log(`Split into ${allSplitDocs.length} total chunks`);
      job.updateProgress(50); // Text splitting complete
      
      // Process the documents with reduced batch size
      job.updateProgress(60); // Starting embeddings
      const success = await processDocuments(allSplitDocs, job);
      
      if (!success) {
        throw new Error("Failed to process documents");
      }
      
      // Ensure we set 100% before completing
      console.log("Setting final progress to 100%");
      job.updateProgress(100);
      
      // Small delay to ensure progress is updated before job completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true, message: "Document processed successfully" };
    } catch (error) {
      console.error("Worker error:", error);
      throw error;
    }
  },
  { 
    connection: { 
      host: "localhost", 
      port: 6379,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    lockDuration: 300000,        // 5 minutes
    lockRenewTime: 150000,       // 2.5 minutes
    stalledInterval: 300000,     // 5 minutes
    maxStalledCount: 3,
    concurrency: 1               // Process only one job at a time
  }
);

worker.on('completed', job => {
  console.log(`Job ${job.id} completed successfully`);
  console.log(`Processing summary: Job processed document at ${job.data.path}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
  console.error(`Error details: ${err.stack || err}`);
  console.error(`Job data was:`, job?.data ? JSON.stringify(job.data) : 'No data available');
});

worker.on('error', err => {
  console.error('Worker error:', err);
  console.error(`Error stack: ${err.stack || err}`);
});

worker.on('stalled', jobId => {
  console.warn(`Job ${jobId} stalled - will be reprocessed`);
});

console.log("Worker is running and waiting for jobs...");
















