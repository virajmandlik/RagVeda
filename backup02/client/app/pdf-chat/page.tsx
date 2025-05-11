import FileUpload from '../components/file-upload';
import Chat from '../components/chat';
import { Bot, FileText } from 'lucide-react';
import { DotPattern } from '@/registry/magicui/dot-pattern';

export default function PdfChatPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-950 relative overflow-hidden">
      {/* Dot pattern background */}
      <DotPattern 
        className="[mask-image:radial-gradient(900px_circle_at_center,white,transparent)]"
        dotColor="rgb(59 130 246 / 0.3)" 
        dotSize={1.5}
        dotSpacing={24}
      />
      
      <div className="w-full max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center">
          <div className="flex items-center">
            <Bot size={32} className="text-blue-500 mr-3" />
            <h1 className="text-3xl font-bold text-white">RagVeda</h1>
            <span className="ml-3 text-gray-400 text-lg">PDF Chat Assistant</span>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col md:flex-row gap-8 w-full">
          {/* Left sidebar */}
          <div className="w-full md:w-[350px] space-y-6">
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-800 shadow-lg">
              <div className="flex items-center mb-4">
                <FileText size={18} className="text-blue-400 mr-2" />
                <h2 className="text-gray-100 font-medium">Upload Document</h2>
              </div>
              <FileUpload />
            </div>
            
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-800 hidden md:block">
              <h3 className="text-gray-100 font-medium mb-3">How it works</h3>
              <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                <li>Upload your PDF document</li>
                <li>Wait for processing to complete</li>
                <li>Ask questions about your document</li>
                <li>Get AI-powered answers based on the content</li>
              </ol>
            </div>
          </div>
          
          {/* Chat area */}
          <div className="w-full md:flex-1">
            <div className="backdrop-blur-sm">
              <Chat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



