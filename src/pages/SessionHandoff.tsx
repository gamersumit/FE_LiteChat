import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Share2,
  UserPlus,
  Link2,
  Copy,
  Check,
  Clock,
  Shield,
  AlertTriangle,
  Mail,
  Settings,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Crown
} from 'lucide-react';
// Removed useAuth context import - now using Redux auth
import { useAppSelector } from '../store';
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';

interface TransferData {
  transfer_id: string;
  transfer_token: string;
  transfer_link: string;
  transfer_type: string;
  access_level: string;
  expires_at: string;
  recipient_email?: string;
  notes?: string;
  session_info: {
    session_token: string;
    visitor_id: string;
    website_id: string;
  };
}

const SessionHandoff: React.FC = () => {
  const { sessionToken } = useParams<{ sessionToken?: string }>();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    session_token: sessionToken || '',
    transfer_type: 'share',
    recipient_email: '',
    access_level: 'read',
    expires_in_hours: 24,
    notes: ''
  });

  // Customer service handoff
  const [csHandoffData, setCsHandoffData] = useState({
    agent_id: '',
    priority: 'normal',
    issue_description: ''
  });

  useEffect(() => {
    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) {
      loadExistingTransfers();
    }
  }, [isAuthenticated, isRefreshing, navigate]);

  const loadExistingTransfers = async () => {
    try {
      const response = await fetch('/api/v1/session-handoff/list-transfers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransfers(data.transfers || []);
      }
    } catch (error) {
      console.error('Failed to load transfers:', error);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v1/session-handoff/create-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create transfer');
      }

      const transferData = await response.json();
      setSuccess('Transfer link created successfully!');
      setTransfers(prev => [transferData, ...prev]);
      
      // Reset form
      setFormData({
        ...formData,
        recipient_email: '',
        notes: ''
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerServiceHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v1/session-handoff/customer-service-handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          session_token: formData.session_token,
          ...csHandoffData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create customer service handoff');
      }

      const handoffData = await response.json();
      setSuccess('Customer service handoff created successfully!');
      setTransfers(prev => [handoffData, ...prev]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer service handoff');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const revokeTransfer = async (transferToken: string) => {
    if (!confirm('Are you sure you want to revoke this transfer link?')) {
      return;
    }

    try {
      const response = await fetch('/api/v1/session-handoff/revoke-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ transfer_token: transferToken })
      });

      if (response.ok) {
        setTransfers(prev => prev.filter(t => t.transfer_token !== transferToken));
        setSuccess('Transfer link revoked successfully');
      }
    } catch (error) {
      setError('Failed to revoke transfer link');
    }
  };

  const getAccessLevelColor = (level: string): string => {
    switch (level) {
      case 'read': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'write': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'full': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'share': return <Share2 className="w-4 h-4" />;
      case 'handoff': return <UserPlus className="w-4 h-4" />;
      case 'export': return <Eye className="w-4 h-4" />;
      default: return <Link2 className="w-4 h-4" />;
    }
  };

  return (
    <ResponsiveLayout showNavigation={true} title="Session Handoff">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              Session Sharing & Handoff
            </h1>
            <p className="text-gray-600 mt-1">
              Create secure links to share sessions or handoff to customer service
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Transfer Form */}
          <div className="space-y-6">
            {/* Regular Transfer */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Share2 className="w-5 h-5 text-indigo-600 mr-2" />
                Create Session Transfer
              </h3>
              
              <form onSubmit={handleCreateTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Token
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.session_token}
                    onChange={(e) => setFormData({...formData, session_token: e.target.value})}
                    placeholder="session_..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer Type
                    </label>
                    <select
                      value={formData.transfer_type}
                      onChange={(e) => setFormData({...formData, transfer_type: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="share">Share (Copy)</option>
                      <option value="handoff">Handoff (Transfer)</option>
                      <option value="export">Export Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Level
                    </label>
                    <select
                      value={formData.access_level}
                      onChange={(e) => setFormData({...formData, access_level: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="read">Read Only</option>
                      <option value="write">Read & Write</option>
                      <option value="full">Full Access</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({...formData, recipient_email: e.target.value})}
                    placeholder="recipient@example.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={formData.expires_in_hours}
                    onChange={(e) => setFormData({...formData, expires_in_hours: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Optional notes about this transfer..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span>Create Transfer Link</span>
                </button>
              </form>
            </div>

            {/* Customer Service Handoff */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                Customer Service Handoff
              </h3>
              
              <form onSubmit={handleCustomerServiceHandoff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent ID
                  </label>
                  <input
                    type="text"
                    required
                    value={csHandoffData.agent_id}
                    onChange={(e) => setCsHandoffData({...csHandoffData, agent_id: e.target.value})}
                    placeholder="agent_123"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={csHandoffData.priority}
                    onChange={(e) => setCsHandoffData({...csHandoffData, priority: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Description
                  </label>
                  <textarea
                    value={csHandoffData.issue_description}
                    onChange={(e) => setCsHandoffData({...csHandoffData, issue_description: e.target.value})}
                    placeholder="Describe the customer's issue..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  <span>Create CS Handoff</span>
                </button>
              </form>
            </div>
          </div>

          {/* Active Transfers */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Link2 className="w-5 h-5 text-indigo-600 mr-2" />
              Active Transfers
            </h3>
            
            {transfers.length === 0 ? (
              <div className="text-center py-8">
                <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active transfers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div key={transfer.transfer_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(transfer.transfer_type)}
                        <span className="font-medium capitalize">
                          {transfer.transfer_type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getAccessLevelColor(transfer.access_level)}`}>
                          {transfer.access_level}
                        </span>
                      </div>
                      <button
                        onClick={() => revokeTransfer(transfer.transfer_token)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Revoke
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <p>Expires: {new Date(transfer.expires_at).toLocaleString()}</p>
                      {transfer.recipient_email && (
                        <p>Recipient: {transfer.recipient_email}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={transfer.transfer_link}
                        readOnly
                        className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(transfer.transfer_link, transfer.transfer_id)}
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        {copiedToken === transfer.transfer_id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default SessionHandoff;