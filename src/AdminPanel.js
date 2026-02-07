import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, MessageSquare, FileText, ArrowLeft, File, Database, Activity } from "lucide-react";
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
      <div className="admin-container-premium">
        <div className="admin-loading">
          <Activity size={40} className="animate-spin" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container-premium">
      <div className="admin-header-premium">
        <Button onClick={onBack} className="back-button-premium" data-testid="back-to-chat-button">
          <ArrowLeft size={18} />
          <span>Back to Chat</span>
        </Button>
        <div className="admin-title-section">
          <h1 className="admin-title-premium">
            <BarChart3 size={32} />
            RootStock Admin Dashboard
          </h1>
          <p className="admin-subtitle-premium">Monitor documents, chats, and usage analytics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-premium">
        <Card className="stat-card-premium">
          <div className="stat-icon-premium documents">
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value-premium">{docStats?.unique_documents || 0}</div>
            <div className="stat-label-premium">Total Documents</div>
          </div>
        </Card>

        <Card className="stat-card-premium">
          <div className="stat-icon-premium chunks">
            <Database size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value-premium">{docStats?.total_chunks || 0}</div>
            <div className="stat-label-premium">Total Chunks</div>
          </div>
        </Card>

        <Card className="stat-card-premium">
          <div className="stat-icon-premium sessions">
            <MessageSquare size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value-premium">{stats?.total_sessions || 0}</div>
            <div className="stat-label-premium">Total Sessions</div>
          </div>
        </Card>

        <Card className="stat-card-premium">
          <div className="stat-icon-premium messages">
            <BarChart3 size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value-premium">{stats?.total_messages || 0}</div>
            <div className="stat-label-premium">Total Messages</div>
          </div>
        </Card>
      </div>

      {/* Documents Section */}
      {docStats?.document_names && docStats.document_names.length > 0 && (
        <div className="admin-section-premium">
          <h2 className="section-header-premium">
            <FileText size={24} />
            Indexed Documents
          </h2>
          <div className="documents-grid-premium">
            {docStats.document_names.map((docName, index) => (
              <div key={index} className="document-card-premium" data-testid={`doc-${index}`}>
                <File size={16} />
                <span>{docName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chats Table */}
      <div className="admin-section-premium">
        <h2 className="section-header-premium">
          <MessageSquare size={24} />
          Recent Chat Sessions
        </h2>
        <div className="table-container-premium">
          <ScrollArea className="table-scroll">
            <table className="admin-table-premium">
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
                    <td className="session-id">{chat.id.substring(0, 8)}...</td>
                    <td className="session-title-col">{chat.title}</td>
                    <td>
                      <span className="message-count-badge">{chat.message_count || 0}</span>
                    </td>
                    <td className="preview-col">{chat.preview}</td>
                    <td className="timestamp-col">
                      {new Date(chat.last_message_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}