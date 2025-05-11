"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  MessageSquare, 
  Mail, 
  Share2, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Home
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const navItems = [
    { 
      name: "Home", 
      href: "/", 
      icon: <Home size={20} />, 
      active: pathname === "/" 
    },
    { 
      name: "PDF Chat", 
      href: "/pdf-chat", 
      icon: <FileText size={20} />, 
      active: pathname === "/pdf-chat" 
    },
    { 
      name: "Social Connect", 
      href: "#", 
      icon: <Share2 size={20} />, 
      active: false,
      comingSoon: true
    },
    { 
      name: "Gmail Integration", 
      href: "#", 
      icon: <Mail size={20} />, 
      active: false,
      comingSoon: true
    },
    { 
      name: "Settings", 
      href: "#", 
      icon: <Settings size={20} />, 
      active: false,
      comingSoon: true
    },
  ];

  return (
    <div 
      className={`h-screen bg-black text-white transition-all duration-300 flex flex-col border-r border-gray-800 ${
        collapsed ? "w-16" : "w-64"
      } ${className}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <h2 className="text-xl font-bold">RagVeda</h2>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-md hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 p-2">
        <ul className="space-y-2">
          {navItems.map((item, index) => (
            <li key={index}>
              <Link 
                href={item.href}
                className={`flex items-center p-3 rounded-md transition-colors ${
                  item.active 
                    ? "bg-gray-800 text-white" 
                    : "hover:bg-gray-800"
                } ${item.comingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={(e) => item.comingSoon && e.preventDefault()}
              >
                <span className="mr-3">{item.icon}</span>
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {item.comingSoon && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                        Soon
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="text-xs text-gray-500">
            RagVeda v1.0.0
          </div>
        )}
      </div>
    </div>
  );
}

