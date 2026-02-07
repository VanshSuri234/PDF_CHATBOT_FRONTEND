import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Send, Plus, MessageSquare, FileText, Upload, Trash2,
  BookOpen, Sparkles, Settings, File, ChevronRight, Loader2,
  X, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import AdminPanel from "./AdminPanel";

// --- PDF Viewer Imports ---
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

// --- Document API Functions ---
async function uploadPDF(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axios.post(`${BACKEND_URL}/documents/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

async function listDocuments() {
  const { data } = await axios.get(`${BACKEND_URL}/documents/list`);
  return data;
}

async function clearDocuments() {
  const { data } = await axios.delete(`${BACKEND_URL}/documents/clear`);
  return data;
}

// --- Video Modal Component ---
const VideoModal = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
        >
          <X size={20} />
        </button>
        <video 
          key={url} // This forces the player to reload when URL changes
          className="w-full h-auto max-h-[85vh]"
          controls 
          controlsList="nodownload" 
          onContextMenu={(e) => e.preventDefault()}
          autoPlay
          src={url} // Use src directly for proxy streams
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

// --- Protected PDF Modal Component ---
const PdfModal = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="relative w-full h-full max-w-5xl bg-gray-100 rounded-xl overflow-hidden shadow-2xl flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-2 text-gray-700">
            <FileText size={20} className="text-blue-600" />
            <span className="font-semibold">Define Edge Document</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* PDF Container - ContextMenu Disabled to prevent "Save Image As" */}
        <div 
          className="flex-1 overflow-y-auto relative p-4"
          onContextMenu={(e) => e.preventDefault()} 
        >
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer fileUrl={url} />
          </Worker>
        </div>
      </div>
    </div>
  );
};

function ChatInterface() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSources, setShowSources] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null); // New state for PDF
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);


  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API}/chat/sessions`);
      setSessions(response.data);
      if (response.data.length === 0) {
        createNewSession();
      } else {
        selectSession(response.data[0]);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post(`${API}/chat/new`);
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create new chat");
    }
  };

  const selectSession = async (session) => {
    setCurrentSession(session);
    try {
      const response = await axios.get(`${API}/chat/history/${session.id}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    const tempUserMsg = {
      role: "user",
      content: userMsg,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, tempUserMsg]);

    try {
      const response = await axios.post(`${API}/chat/message`, {
        session_id: currentSession.id,
        content: userMsg,
      });

      setMessages((prevMessages) => {
        const withoutTemp = prevMessages.slice(0, -1);
        return [...withoutTemp, response.data.user_message, response.data.ai_message];
      });

      loadSessions();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { role: "assistant", content: "Error: Failed to get response. Please try again.", timestamp: new Date().toISOString() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  return (
    <>
      <div className="chat-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="brand">
              <FileText className="brand-icon" />
              <div>
                <h1 className="brand-title">PDF Assistant</h1>
                <p className="brand-subtitle">RAG Chatbot</p>
              </div>
            </div>
            <Button onClick={createNewSession} className="new-chat-btn">
              <Plus size={18} />
              New Chat
            </Button>
            <Button
              onClick={() => setShowAdmin(true)}
              style={{
                width: "100%",
                marginTop: "12px",
                background: "var(--definedge-blue)",
                color: "white",
                height: "40px",
                borderRadius: "10px",
                fontSize: "14px",
              }}
            >
              <Settings size={16} style={{ marginRight: "6px" }} />
              Admin Panel
            </Button>
          </div>

          <ScrollArea className="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${currentSession?.id === session.id ? "active" : ""}`}
                onClick={() => selectSession(session)}
              >
                <MessageSquare size={16} />
                <span className="session-title">{session.title}</span>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="main-chat">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <Sparkles size={48} />
                </div>
                <h2 className="welcome-title">Welcome to PDF Assistant</h2>
                <p className="welcome-subtitle">
                  Upload your PDF documents and ask questions about their content.
                  I'll find relevant information and provide answers with source citations.
                </p>
                <div className="welcome-examples">
                  <div className="example-card">
                    <Upload size={20} />
                    <span>"Upload a PDF to get started"</span>
                  </div>
                  <div className="example-card">
                    <BookOpen size={20} />
                    <span>"What is the main topic?"</span>
                  </div>
                  <div className="example-card">
                    <MessageSquare size={20} />
                    <span>"Summarize the document"</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="messages-area">
              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === "user" ? (
                        <div className="user-avatar">You</div>
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>

                    <div className="message-content">
                      <p className="message-text">{msg.content}</p>

                      {/* Source citations with PDF/Video Protection */}
                      {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                        <div className="sources-container">
                          <button
                            className="sources-toggle"
                            onClick={() =>
                              setShowSources(showSources === index ? null : index)
                            }
                          >
                            <File size={14} />
                            {msg.sources.length} source
                            {msg.sources.length > 1 ? "s" : ""}
                            <ChevronRight
                              size={14}
                              style={{
                                transform:
                                  showSources === index ? "rotate(90deg)" : "none",
                                transition: "transform 0.2s",
                              }}
                            />
                          </button>

                          {showSources === index && (
                            <div className="sources-list">
                              {[...msg.sources]
                                .sort((a, b) => (b.score || 0) - (a.score || 0))
                                .map((source, idx) => (
                                  <div
                                    key={idx}
                                    className="source-item"
                                    onClick={() => {
                                      // If no source info, do nothing
                                      if (!source.filename) return;
                                    
                                      // Check if it's a video (Videos usually don't need the registry proxy yet)
                                      if (source.filename?.toLowerCase().endsWith(".mp4") || source.s3_url?.toLowerCase().endsWith(".mp4")) {
                                        // Construct the proxy URL for the video
                                        const videoProxyUrl = `${API}/chat/proxy-video?filename=${encodeURIComponent(source.filename)}`;
                                        setActiveVideoUrl(videoProxyUrl);
                                      }
                                      // Handle PDFs using the new secure "Blind Proxy"
                                      else {
                                        // We only send the filename. The backend looks up the S3 URL.
                                        const proxyUrl = `${API}/chat/proxy-pdf?filename=${encodeURIComponent(source.filename)}`;
                                        
                                        // Set the state to the proxy endpoint
                                        setActivePdfUrl(proxyUrl);
                                      }
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      transition: "background 0.2s"
                                    }}
                                    title={source.s3_url?.endsWith(".mp4") ? "Play Video" : "View Protected PDF"}
                                  >
                                    <File size={12} />
                                    <span className="source-name">
                                      {source.filename}
                                    </span>
                                    {source.page && (
                                      <span className="source-page">
                                        Page {source.page}
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message assistant">
                    <div className="message-avatar">
                      <FileText size={20} />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="input-area">
            <div className="input-container">
              <Input
                type="text"
                placeholder="Ask about your documents..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="chat-input"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="send-button"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>



        {/* Global Video Modal Overlay */}
        <VideoModal 
          url={activeVideoUrl} 
          onClose={() => setActiveVideoUrl(null)} 
        />

        {/* Global Protected PDF Modal Overlay */}
        <PdfModal 
          url={activePdfUrl}
          onClose={() => setActivePdfUrl(null)}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatInterface />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;