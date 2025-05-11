import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from 'dotenv';
dotenv.config();
const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log("job",job.data);
    const data = JSON.parse(job.data);
    //destructring my things 
    const {fileName,destination,path} = data;
    /*
    I will read the pdf from my path.
    teh i will chunk it,
    call the open ai embedding model fro every chunk,
    after that store that vector embdeeing in qdarant db
    */

    // LOAD MY PDF
    const loader = new PDFLoader(data.path)
    //make docs of this pdf
    const docs = await loader.load()
    console.log("The single converted documentr is :",docs);
    // now to convert this single docs to multiple chunks

    // Use Hugging Face as the embedding provider for LangChain
    const embeddings = new HuggingFaceInferenceEmbeddings({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        apiKey: process.env.HUGGINGFACE_API_KEY
    });

    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: 'http://localhost:6333',
            collectionName: 'langchainjs-testing'
        }
      );
      await vectorStore.addDocuments(docs);
      console.log("The vector store is after adding the docs:", vectorStore);
    } catch (error) {
      console.error("Error during embedding or Qdrant operation:", error);
    }

  },
  { connection:200 ,connection:{
    host:"localhost",
    port:6379
  }},
);


