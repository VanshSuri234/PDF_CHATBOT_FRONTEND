import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, MessageSquare, FileText, Upload, Trash2,
  Sparkles, Settings, File, ChevronRight, Loader2,
  X, CheckCircle, AlertCircle, Menu, ChevronLeft, Video,
  Cloud, Zap, Brain
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content video-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          <X size={20} />
        </button>
        <video
          key={url}
          className="video-player"
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          autoPlay
          src={url}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <FileText size={20} />
            <span>RootStock Document Viewer</span>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={24} />
          </button>
        </div>
        <div className="pdf-viewer-container" onContextMenu={(e) => e.preventDefault()}>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer fileUrl={url} />
          </Worker>
        </div>
      </div>
    </div>
  );
};

// --- Upload Zone Component ---
const UploadZone = ({ onFileSelect, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      data-testid="upload-zone"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.mp4"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={isProcessing}
      />
      <div className="upload-icon">
        {isProcessing ? (
          <Loader2 size={40} className="animate-spin" />
        ) : (
          <Cloud size={40} />
        )}
      </div>
      <h3 className="upload-title">
        {isProcessing ? 'Processing...' : 'Upload PDF or Video'}
      </h3>
      <p className="upload-subtitle">
        {isProcessing
          ? 'Please wait while we process your file'
          : 'Drag & drop your files here or click to browse'}
      </p>
      <div className="upload-formats">
        <span className="format-badge">PDF</span>
        <span className="format-badge">MP4</span>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSources, setShowSources] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [documents, setDocuments] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

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
      toast.success("New chat created!");
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

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadPDF(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success(
        <div>
          <CheckCircle className="inline mr-2" size={16} />
          {file.name} uploaded successfully!
        </div>
      );
      
      await loadDocuments();
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      setUploadProgress(0);
      setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isProcessing) return;

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
      <div className="chat-container-premium">
        {/* Sidebar */}
        <div className={`sidebar-premium ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header-premium">
            <div className="brand-premium">
              <div className="brand-icon-premium">
                <Brain size={24} />
              </div>
              {!sidebarCollapsed && (
                <div className="brand-text">
                  <h1 className="brand-title-premium">RootStock</h1>
                  <p className="brand-subtitle-premium">Multi-PDF AI Assistant</p>
                </div>
              )}
            </div>
            
            {!sidebarCollapsed && (
              <>
                <Button onClick={createNewSession} className="new-chat-btn-premium" data-testid="new-chat-button">
                  <Plus size={18} />
                  <span>New Chat</span>
                </Button>
                <Button
                  onClick={() => setShowAdmin(true)}
                  className="admin-btn-premium"
                  data-testid="admin-panel-button"
                >
                  <Settings size={16} />
                  <span>Admin Panel</span>
                </Button>
              </>
            )}
          </div>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            data-testid="sidebar-toggle"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {!sidebarCollapsed && (
            <ScrollArea className="sessions-list-premium">
              <div className="sessions-header">
                <MessageSquare size={16} />
                <span>Recent Chats</span>
              </div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-item-premium ${currentSession?.id === session.id ? 'active' : ''}`}
                  onClick={() => selectSession(session)}
                  data-testid={`session-${session.id}`}
                >
                  <MessageSquare size={16} />
                  <span className="session-title-premium">{session.title}</span>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="main-chat-premium">
          {/* Upload Zone - Show when processing */}
          {isProcessing && (
            <div className="processing-overlay">
              <div className="processing-card">
                <Loader2 size={48} className="animate-spin processing-spinner" />
                <h3>Processing Your File</h3>
                <p>Analyzing and indexing content...</p>
                <Progress value={uploadProgress} className="processing-progress" />
                <span className="progress-text">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="welcome-screen-premium">
              <div className="welcome-content-premium">
                <div className="welcome-icon-premium">
                  <Sparkles size={48} />
                  <div className="icon-glow"></div>
                </div>
                <h2 className="welcome-title-premium">Welcome to RootStock AI</h2>
                <p className="welcome-subtitle-premium">
                  Your intelligent multi-PDF assistant powered by advanced RAG technology.
                  Upload documents and ask questions to get instant, accurate answers.
                </p>
                
                <UploadZone onFileSelect={handleFileUpload} isProcessing={isProcessing} />

                {documents.length > 0 && (
                  <div className="documents-list-welcome">
                    <h4><File size={16} /> Indexed Documents ({documents.length})</h4>
                    <div className="doc-badges">
                      {documents.slice(0, 5).map((doc, idx) => (
                        <span key={idx} className="doc-badge">
                          <FileText size={12} />
                          {doc.filename || doc}
                        </span>
                      ))}
                      {documents.length > 5 && (
                        <span className="doc-badge more">+{documents.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="welcome-features">
                  <div className="feature-card-premium">
                    <Upload size={20} />
                    <span>Upload Multiple PDFs</span>
                  </div>
                  <div className="feature-card-premium">
                    <Zap size={20} />
                    <span>Instant AI Responses</span>
                  </div>
                  <div className="feature-card-premium">
                    <FileText size={20} />
                    <span>Source Citations</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-header-premium">
                <div className="chat-header-left">
                  <Zap size={20} />
                  <span>{currentSession?.title || 'Chat Session'}</span>
                </div>
                <div className="chat-header-right">
                  <button
                    className="upload-btn-compact"
                    onClick={() => document.getElementById('file-upload-hidden')?.click()}
                    disabled={isProcessing}
                    data-testid="upload-button"
                  >
                    <Upload size={16} />
                    <span>Upload</span>
                  </button>
                  <input
                    id="file-upload-hidden"
                    type="file"
                    accept=".pdf,.mp4"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <ScrollArea className="messages-area-premium">
                <div className="messages-container-premium">
                  {messages.map((msg, index) => (
                    <div key={index} className={`message-premium ${msg.role}`} data-testid={`message-${index}`}>
                      <div className="message-avatar-premium">
                        {msg.role === "user" ? (
                          <div className="user-avatar-premium">You</div>
                        ) : (
                          <Brain size={20} />
                        )}
                      </div>

                      <div className="message-content-premium">
                        <div className="message-text-premium">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                          <div className="sources-container-premium">
                            <button
                              className="sources-toggle-premium"
                              onClick={() => setShowSources(showSources === index ? null : index)}
                              data-testid={`sources-toggle-${index}`}
                            >
                              <File size={14} />
                              {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                              <ChevronRight
                                size={14}
                                style={{
                                  transform: showSources === index ? "rotate(90deg)" : "none",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>

                            {showSources === index && (
                              <div className="sources-list-premium">
                                {[...msg.sources]
                                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                                  .map((source, idx) => (
                                    <div
                                      key={idx}
                                      className="source-item-premium"
                                      onClick={() => {
                                        if (!source.filename) return;
                                        if (source.filename?.toLowerCase().endsWith(".mp4") || source.s3_url?.toLowerCase().endsWith(".mp4")) {
                                          const videoProxyUrl = `${API}/chat/proxy-video?filename=${encodeURIComponent(source.filename)}`;
                                          setActiveVideoUrl(videoProxyUrl);
                                        } else {
                                          const proxyUrl = `${API}/chat/proxy-pdf?filename=${encodeURIComponent(source.filename)}`;
                                          setActivePdfUrl(proxyUrl);
                                        }
                                      }}
                                      data-testid={`source-${index}-${idx}`}
                                    >
                                      {source.filename?.toLowerCase().endsWith(".mp4") ? (
                                        <Video size={12} />
                                      ) : (
                                        <File size={12} />
                                      )}
                                      <span className="source-name-premium">{source.filename}</span>
                                      {source.page && <span className="source-page-premium">Page {source.page}</span>}
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
                    <div className="message-premium assistant">
                      <div className="message-avatar-premium">
                        <Brain size={20} />
                      </div>
                      <div className="message-content-premium">
                        <div className="typing-indicator-premium">
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
            </>
          )}

          {/* Input Area */}
          <div className={`input-area-premium ${isProcessing ? 'disabled' : ''}`}>
            <div className="input-container-premium">
              <Input
                type="text"
                placeholder={isProcessing ? "Wait for file processing..." : "Ask anything about your documents..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || isProcessing}
                className="chat-input-premium"
                data-testid="chat-input"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || isProcessing}
                className="send-button-premium"
                data-testid="send-button"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Global Modals */}
        <VideoModal url={activeVideoUrl} onClose={() => setActiveVideoUrl(null)} />
        <PdfModal url={activePdfUrl} onClose={() => setActivePdfUrl(null)} />
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