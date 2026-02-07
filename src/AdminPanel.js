import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, MessageSquare, FileText, ArrowLeft, File } from "lucide-react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

export default function AdminPanel({ onBack }) {
  const [stats, setStats] = useState(null);
  const [chats, setChats] = useState([]);
  const [docStats, setDocStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, chatsRes, docStatsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/chats?limit=50`),
        axios.get(`${API}/admin/documents/stats`)
      ]);
      setStats(statsRes.data);
      setChats(chatsRes.data);
      setDocStats(docStatsRes.data);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-secondary)" }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <Button
          onClick={onBack}
          style={{
            marginBottom: "20px",
            background: "var(--definedge-blue)",
            color: "white"
          }}
          data-testid="back-to-chat-button"
        >
          <ArrowLeft size={18} style={{ marginRight: "8px" }} />
          Back to Chat
        </Button>
        <h1 className="admin-title">PDF Assistant - Admin Dashboard</h1>
        <p className="admin-subtitle">Monitor documents, chats, and usage analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-label">
            <FileText size={16} style={{ display: "inline", marginRight: "6px" }} />
            Total Documents
          </div>
          <div className="stat-value">{docStats?.unique_documents || 0}</div>
        </Card>

        <Card className="stat-card">
          <div className="stat-label">
            <File size={16} style={{ display: "inline", marginRight: "6px" }} />
            Total Chunks
          </div>
          <div className="stat-value">{docStats?.total_chunks || 0}</div>
        </Card>

        <Card className="stat-card">
          <div className="stat-label">
            <MessageSquare size={16} style={{ display: "inline", marginRight: "6px" }} />
            Total Sessions
          </div>
          <div className="stat-value">{stats?.total_sessions || 0}</div>
        </Card>

        <Card className="stat-card">
          <div className="stat-label">
            <BarChart3 size={16} style={{ display: "inline", marginRight: "6px" }} />
            Total Messages
          </div>
          <div className="stat-value">{stats?.total_messages || 0}</div>
        </Card>
      </div>

      {/* Documents Section */}
      {docStats?.document_names && docStats.document_names.length > 0 && (
        <div className="admin-section">
          <h2 className="section-header">
            <FileText size={24} style={{ display: "inline", marginRight: "10px", color: "var(--definedge-gold)" }} />
            Indexed Documents
          </h2>
          <div className="stock-mentions-list">
            {docStats.document_names.map((docName, index) => (
              <div key={index} className="stock-mention-badge" data-testid={`doc-${index}`}>
                <File size={14} style={{ marginRight: "6px" }} />
                {docName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chats Table */}
      <div className="admin-section">
        <h2 className="section-header">
          <MessageSquare size={24} style={{ display: "inline", marginRight: "10px", color: "var(--definedge-gold)" }} />
          Recent Chat Sessions
        </h2>
        <ScrollArea style={{ height: "500px", borderRadius: "12px" }}>
          <table className="chat-logs-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Title</th>
                <th>Messages</th>
                <th>Preview</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((chat) => (
                <tr key={chat.id} data-testid={`chat-log-${chat.id}`}>
                  <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {chat.id.substring(0, 8)}...
                  </td>
                  <td style={{ fontWeight: 600 }}>{chat.title}</td>
                  <td>
                    <span style={{
                      padding: "4px 10px",
                      background: "var(--definedge-blue)",
                      color: "white",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700
                    }}>
                      {chat.message_count || 0}
                    </span>
                  </td>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {chat.preview}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    {new Date(chat.last_message_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
