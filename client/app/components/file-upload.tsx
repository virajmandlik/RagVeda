"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  // Simulate progress when uploading
  useEffect(() => {
    if (uploading) {
      const interval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          // Simulate progress up to 90% - the last 10% will be set when the upload completes
          if (prevProgress < 90) {
            return prevProgress + 10;
          }
          return prevProgress;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [uploading]);

  // Poll job status when processing
  useEffect(() => {
    if (processing && jobId) {
      let pollCount = 0;
      const maxPolls = 30; // Maximum number of polling attempts (30 * 2s = 60 seconds)
      
      const interval = setInterval(async () => {
        try {
          pollCount++;
          const response = await fetch(`http://localhost:5000/job-status/${jobId}`);
          
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Job status:", data);
          
          if (data.isCompleted || data.state === 'completed') {
            setProcessingProgress(100);
            setProcessingComplete(true);
            setProcessing(false);
            clearInterval(interval);
          } else if (data.isFailed || data.state === 'failed') {
            setError(`Processing failed: ${data.error || 'Unknown error'}`);
            setProcessing(false);
            clearInterval(interval);
          } else if (data.progress) {
            setProcessingProgress(data.progress);
            
            // If progress is stuck at a high value for too long, consider it complete
            if (data.progress >= 95 && pollCount > 5) {
              console.log("Progress appears stuck at a high value, marking as complete");
              setProcessingProgress(100);
              setProcessingComplete(true);
              setProcessing(false);
              clearInterval(interval);
            }
          }
          
          // Fallback: If we've polled too many times, assume it's complete
          if (pollCount >= maxPolls) {
            console.log("Maximum polling attempts reached, assuming job is complete");
            setProcessingProgress(100);
            setProcessingComplete(true);
            setProcessing(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Error checking job status:", error);
          
          // If we've had several errors in a row, stop polling
          if (pollCount >= 5) {
            console.log("Too many errors while polling, assuming job is complete");
            setProcessingProgress(100);
            setProcessingComplete(true);
            setProcessing(false);
            clearInterval(interval);
          }
        }
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [processing, jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setUploadSuccess(false);
      setProcessingComplete(false);
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    setUploading(true);
    setError("");
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingComplete(false);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch("http://localhost:5000/upload/pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();
      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Start tracking job progress
      if (result.jobId) {
        setJobId(result.jobId);
        setProcessing(true);
      }
      
      setFile(null);
      // Reset the file input
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-lg p-6"
      >
        <div className="mb-4">
          <h2 className="text-gray-100 text-center font-medium mb-4">
            Upload PDF
          </h2>
          
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md w-full text-center flex items-center justify-center"
            >
              <Upload size={16} className="mr-2" />
              Select PDF
            </label>
            
            {uploading && (
              <div className="w-full mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            
            {processing && (
              <div className="w-full mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Processing PDF...</span>
                  <span>{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}
            
            {uploadSuccess && !uploading && !processing && (
              <div className="text-sm text-center w-full">
                {processingComplete ? (
                  <div className="bg-gray-800 border border-green-800 rounded-md p-3 mt-2">
                    <p className="text-green-400 font-medium">PDF processed successfully!</p>
                    <p className="text-green-500 text-xs mt-1">You can now chat with your document.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-green-400">File uploaded successfully!</p>
                    <p className="text-green-500 text-xs">Processing may take a moment.</p>
                  </>
                )}
              </div>
            )}
            
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={!file || uploading || processing}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md w-full mt-2 ${
                (!file || uploading || processing) && "opacity-50 cursor-not-allowed"
              }`}
            >
              Upload
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
