import Link from 'next/link';
import { FileText, Share2, Mail } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center p-6 md:p-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-primary">Welcome to RagVeda</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/pdf-chat" className="block">
            <div className="bg-black border border-border rounded-lg p-6 hover:bg-card/50 transition-colors">
              <div className="flex items-center mb-4">
                <FileText className="mr-2 text-primary" size={24} />
                <h2 className="text-xl font-semibold">PDF Chat</h2>
              </div>
              <p className="text-muted-foreground">
                Upload PDF documents and chat with their contents using AI.
              </p>
            </div>
          </Link>
          
          <div className="bg-black border border-border rounded-lg p-6 opacity-50 cursor-not-allowed">
            <div className="flex items-center mb-4">
              <Share2 className="mr-2" size={24} />
              <h2 className="text-xl font-semibold">Social Connect</h2>
              <span className="ml-2 text-xs bg-secondary px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-muted-foreground">
              Connect with social media platforms and chat with their content.
            </p>
          </div>
          
          <div className="bg-black border border-border rounded-lg p-6 opacity-50 cursor-not-allowed">
            <div className="flex items-center mb-4">
              <Mail className="mr-2" size={24} />
              <h2 className="text-xl font-semibold">Gmail Integration</h2>
              <span className="ml-2 text-xs bg-secondary px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-muted-foreground">
              Connect your Gmail account and chat with your emails.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


