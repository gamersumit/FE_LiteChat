import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { config as envConfig } from '../../config/env';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectWebsites, fetchWebsitesWithMetrics, selectWebsitesLoading } from '../../store/dashboardSlice';
import { useTokenRefresh } from '../../hooks/useTokenRefresh';
import type { Website as ReduxWebsite } from '../../services/centralizedApi';
import { apiService } from '../../services/centralizedApi';

// TypeScript declarations for window.ChatLite
declare global {
  interface Window {
    ChatLite?: {
      init: (config: any) => void;
      destroy?: () => void;
      open?: () => void;
      close?: () => void;
      toggle?: () => void;
    };
  }
}

import {
  Code,
  Copy,
  Download,
  Check,
  Globe,
  Settings,
  Zap,
  BookOpen,
  Maximize2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  MessageSquare,
  ArrowLeft,
  Sparkles,
  Palette,
  HelpCircle,
  List,
  Wrench,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  RefreshCw,
  X,
  Loader2,
  User,
  Image
} from 'lucide-react';

interface Website extends ReduxWebsite {
  widgetId?: string; // Optional since Redux Website doesn't have this
}

interface WidgetConfiguration {
  widget_color: string;
  widget_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  widget_size: 'small' | 'medium' | 'large';
  widget_theme: 'light' | 'dark' | 'auto';
  show_avatar: boolean;
  enable_sound: boolean;
  auto_open_delay?: number;
  show_online_status: boolean;
  welcome_message: string;
  placeholder_text: string;
  offline_message: string;
  thanks_message: string;
  show_branding: boolean;
  custom_logo_url?: string;
  company_name: string;
  support_email?: string;
  custom_css?: string;
  font_family?: string;
  border_radius: number;
  chatbot_name?: string;
  ai_logo_url?: string;
  button_logo_url?: string;
  ai_avatar_url?: string;
  user_avatar_url?: string;
}

interface ScriptConfig extends WidgetConfiguration {
  websiteId: string;
  asyncLoading: boolean;
}

const ScriptGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const websites = useAppSelector(selectWebsites);
  const websitesLoading = useAppSelector(selectWebsitesLoading);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

  // Enable automatic token refresh
  useTokenRefresh();
  const [config, setConfig] = useState<ScriptConfig>({
    websiteId: '',
    widget_color: '#0066CC',
    widget_position: 'bottom-right',
    widget_size: 'small',
    widget_theme: 'auto',
    show_avatar: true,
    enable_sound: true,
    auto_open_delay: undefined,
    show_online_status: true,
    welcome_message: 'Hi! How can I help you today?',
    placeholder_text: 'Type your message...',
    offline_message: "We're currently offline. We'll get back to you soon!",
    thanks_message: 'Thank you for your message!',
    show_branding: true,
    custom_logo_url: undefined,
    company_name: 'Support',
    support_email: undefined,
    custom_css: undefined,
    font_family: undefined,
    border_radius: 13,
    chatbot_name: undefined,
    ai_logo_url: undefined,
    button_logo_url: undefined,
    ai_avatar_url: undefined,
    user_avatar_url: undefined,
    asyncLoading: true
  });

  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [activeScriptType, setActiveScriptType] = useState<'html' | 'wordpress' | 'react' | 'nextjs'>('html');
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewChatOpen, setPreviewChatOpen] = useState(true);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const iframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeLoadedRef = useRef(false);

  // Separate state for fullscreen modal iframe
  const [fullscreenIframeError, setFullscreenIframeError] = useState(false);
  const [fullscreenIframeLoading, setFullscreenIframeLoading] = useState(true);
  const fullscreenIframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenIframeLoadedRef = useRef(false);

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [showGeneratedSection, setShowGeneratedSection] = useState(false);
  const [scriptNeedsRegeneration, setScriptNeedsRegeneration] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [expandedInstallationSection, setExpandedInstallationSection] = useState<Set<string>>(new Set(['html']));

  // Refs for scrolling
  const generatedSectionRef = useRef<HTMLDivElement>(null);
  const integrationGuideRef = useRef<HTMLDivElement>(null);
  const troubleshootRef = useRef<HTMLDivElement>(null);

  // Preview chat functionality
  const [previewMessages, setPreviewMessages] = useState<Array<{ id: string; content: string; type: 'user' | 'assistant'; timestamp: Date }>>([
    {
      id: '1',
      content: config.welcome_message || 'Hi! How can I help you today?',
      type: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [previewInputValue, setPreviewInputValue] = useState('');
  const [isPreviewTyping, setIsPreviewTyping] = useState(false);
  const previewMessagesContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenMessagesContainerRef = useRef<HTMLDivElement>(null);

  // First page crawl status
  const [firstPageStatus, setFirstPageStatus] = useState<any>(null);
  const [loadingFirstPageStatus, setLoadingFirstPageStatus] = useState(false);

  // F5 refresh: Check auth and load websites
  useEffect(() => {
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }

    // Always load websites on mount/F5 refresh to ensure fresh data
    if (isAuthenticated) {
      dispatch(fetchWebsitesWithMetrics({ page: 1, limit: 1000 }));
    }
  }, [isAuthenticated, isRefreshing, dispatch, navigate]);

  useEffect(() => {
    initializeWebsiteSelection();
  }, [websites, searchParams]);

  // Reset iframe state when website URL changes
  useEffect(() => {
    // Clear any existing timeout
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
      iframeTimeoutRef.current = null;
    }

    // Only proceed if we have a website URL
    if (selectedWebsite?.url) {
      console.log('Resetting iframe state for:', selectedWebsite.url);
      setIframeError(false);
      setIframeLoading(true);
      iframeLoadedRef.current = false;
    }

    return () => {
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
        iframeTimeoutRef.current = null;
      }
    };
  }, [selectedWebsite?.url]); // Only depend on URL, not the whole object

  // Reset fullscreen iframe state when modal opens or website URL changes
  useEffect(() => {
    // Clear any existing timeout
    if (fullscreenIframeTimeoutRef.current) {
      clearTimeout(fullscreenIframeTimeoutRef.current);
      fullscreenIframeTimeoutRef.current = null;
    }

    if (showFullscreenPreview && selectedWebsite?.url) {
      console.log('Resetting fullscreen iframe state for:', selectedWebsite.url);
      setFullscreenIframeError(false);
      setFullscreenIframeLoading(true);
      fullscreenIframeLoadedRef.current = false;
    }

    return () => {
      if (fullscreenIframeTimeoutRef.current) {
        clearTimeout(fullscreenIframeTimeoutRef.current);
        fullscreenIframeTimeoutRef.current = null;
      }
    };
  }, [showFullscreenPreview, selectedWebsite?.url]); // Only depend on URL, not the whole object

  const toggleInstallationSection = (section: string) => {
    setExpandedInstallationSection(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const initializeWebsiteSelection = () => {
    // Handle URL parameter for pre-selecting website
    const websiteId = searchParams.get('websiteId');
    if (websiteId && websites.length > 0) {
      const targetWebsite = websites.find((w: any) => w.id === websiteId);
      if (targetWebsite) {
        setSelectedWebsite(targetWebsite);
        setConfig((prev: typeof config) => ({ ...prev, websiteId: targetWebsite.id }));
        return;
      }
    }

    // If no specific website selected and websites available, select the first one
    if (websites.length > 0 && !selectedWebsite) {
      setSelectedWebsite(websites[0]);
      setConfig((prev: typeof config) => ({ ...prev, websiteId: websites[0].id }));
    }
  };

  // Fetch first page status when website changes
  useEffect(() => {
    const fetchFirstPageStatus = async () => {
      if (!selectedWebsite?.id) return;

      setLoadingFirstPageStatus(true);
      try {
        const response = await apiService.getFirstPageStatus(selectedWebsite.id);
        if (response.success && response.data) {
          setFirstPageStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch first page status:', error);
      } finally {
        setLoadingFirstPageStatus(false);
      }
    };

    fetchFirstPageStatus();

    // Poll every 3 seconds if status is pending, processing, or retrying
    const interval = setInterval(() => {
      if (firstPageStatus?.status === 'pending' || firstPageStatus?.status === 'processing' || firstPageStatus?.status === 'retrying') {
        fetchFirstPageStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedWebsite?.id, firstPageStatus?.status]);

  const generateScript = async (): Promise<void> => {
    if (!selectedWebsite) return;

    setIsGeneratingScript(true);
    setScriptNeedsRegeneration(false);
    try {
      // Generate the script based on selected type
      let script = '';
      switch (activeScriptType) {
        case 'html':
          script = generateHTMLScript();
          break;
        case 'wordpress':
          script = generateWordPressScript();
          break;
        case 'react':
          script = generateReactScript();
          break;
        case 'nextjs':
          script = generateNextJSScript();
          break;
        default:
          script = generateHTMLScript();
      }

      setGeneratedScript(script);
      setShowGeneratedSection(true);

      // Smooth scroll to generated section after a short delay
      setTimeout(() => {
        generatedSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
    } catch (error) {
      console.error('Failed to generate script:', error);
      alert('Failed to generate script. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Handle sending messages in preview chat
  const handlePreviewSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const messageText = previewInputValue.trim();
    if (!messageText || isPreviewTyping || !selectedWebsite) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      content: messageText,
      type: 'user' as const,
      timestamp: new Date()
    };
    setPreviewMessages(prev => [...prev, userMessage]);
    setPreviewInputValue('');

    // Show typing indicator
    setIsPreviewTyping(true);

    try {
      // Call actual API to chat with first page content
      const response = await apiService.chatWithFirstPage(
        selectedWebsite.id,
        messageText,
        `preview-${selectedWebsite.id}-${Date.now()}`
      );

      if (response.success && response.data) {
        const botResponse = {
          id: (Date.now() + 1).toString(),
          content: response.data.response,
          type: 'assistant' as const,
          timestamp: new Date()
        };
        setPreviewMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error(response.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process your message. Please try again.",
        type: 'assistant' as const,
        timestamp: new Date()
      };
      setPreviewMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsPreviewTyping(false);
    }
  };

  const handlePreviewKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePreviewSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages are added (only scroll the chat container, not the whole page)
  useEffect(() => {
    // Scroll the main preview messages container
    if (previewMessagesContainerRef.current) {
      previewMessagesContainerRef.current.scrollTop = previewMessagesContainerRef.current.scrollHeight;
    }
    // Scroll the fullscreen preview messages container
    if (fullscreenMessagesContainerRef.current) {
      fullscreenMessagesContainerRef.current.scrollTop = fullscreenMessagesContainerRef.current.scrollHeight;
    }
  }, [previewMessages, isPreviewTyping]);

  const escapeJSString = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  };

  const generateHTMLScript = (): string => {
    if (!selectedWebsite) return '';

    const widgetId = selectedWebsite.widgetId || `widget_${selectedWebsite.id}_${Date.now()}`;
    const frontendBase = envConfig.widget.frontendUrl;
    const apiBase = envConfig.api.baseUrl + '/api/v1/widget';

    return `<!-- ChatLite Widget Script -->
<script>
    // ChatLite Widget Configuration
    window.chatLiteConfig = {
        widgetId: '${widgetId}',
        frontendBase: '${frontendBase}',
        apiBase: '${apiBase}',
        websiteName: '${escapeJSString(selectedWebsite.name)}',

        // Appearance Configuration
        primaryColor: '${config.widget_color}',
        position: '${config.widget_position}',
        size: '${config.widget_size}',
        theme: '${config.widget_theme}',
        borderRadius: '${config.border_radius}px',
        fontFamily: '${config.font_family || "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"}',

        // Messages Configuration
        welcomeMessage: '${escapeJSString(config.welcome_message)}',
        placeholderText: '${escapeJSString(config.placeholder_text)}',
        offlineMessage: '${escapeJSString(config.offline_message)}',
        thanksMessage: '${escapeJSString(config.thanks_message)}',

        // Branding Configuration
        showBranding: ${config.show_branding},
        customLogoUrl: '${escapeJSString(config.custom_logo_url || "")}',
        companyName: '${escapeJSString(config.company_name)}',
        supportEmail: '${escapeJSString(config.support_email || "")}',
        chatbotName: '${escapeJSString(config.chatbot_name || "")}',
        aiLogoUrl: '${escapeJSString(config.ai_logo_url || "")}',
        buttonLogoUrl: '${escapeJSString(config.button_logo_url || "")}',
        aiAvatarUrl: '${escapeJSString(config.ai_avatar_url || "")}',
        userAvatarUrl: '${escapeJSString(config.user_avatar_url || "")}',

        // Custom CSS
        customCSS: '${escapeJSString(config.custom_css || "")}'
    };
</script>
<script src="${frontendBase}/widget.js" async></script>`;
  };

  const generateWordPressScript = (): string => {
    if (!selectedWebsite) return '';

    const widgetId = selectedWebsite.widgetId || `widget_${selectedWebsite.id}_${Date.now()}`;
    const frontendBase = envConfig.widget.frontendUrl;
    const apiBase = envConfig.api.baseUrl + '/api/v1/widget';

    return `<?php
/**
 * ChatLite Widget Integration for WordPress
 * Add this code to your theme's functions.php file
 * or create a custom plugin for the widget
 */

add_action('wp_footer', 'add_chatlite_widget');

function add_chatlite_widget() {
    ?>
    <script>
    (function() {
        // ChatLite Widget Configuration
        const widgetConfig = {
            widgetId: '<?php echo esc_js("${widgetId}"); ?>',
            frontendBase: '${frontendBase}',
            apiBase: '${apiBase}',
            websiteName: '<?php echo esc_js("${escapeJSString(selectedWebsite.name)}"); ?>',

            // Appearance Configuration
            primaryColor: '<?php echo esc_js("${config.widget_color}"); ?>',
            position: '<?php echo esc_js("${config.widget_position}"); ?>',
            size: '<?php echo esc_js("${config.widget_size}"); ?>',
            theme: '<?php echo esc_js("${config.widget_theme}"); ?>',
            borderRadius: '<?php echo esc_js("${config.border_radius}px"); ?>',
            fontFamily: '<?php echo esc_js("${config.font_family || "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"}"); ?>',

            // Behavior Configuration
            showAvatar: <?php echo ${config.show_avatar} ? 'true' : 'false'; ?>,
            enableSound: <?php echo ${config.enable_sound} ? 'true' : 'false'; ?>,
            autoOpenDelay: <?php echo ${config.auto_open_delay || 'null'}; ?>,
            showOnlineStatus: <?php echo ${config.show_online_status} ? 'true' : 'false'; ?>,

            // Messages Configuration
            welcomeMessage: '<?php echo esc_js("${escapeJSString(config.welcome_message)}"); ?>',
            placeholderText: '<?php echo esc_js("${escapeJSString(config.placeholder_text)}"); ?>',
            offlineMessage: '<?php echo esc_js("${escapeJSString(config.offline_message)}"); ?>',
            thanksMessage: '<?php echo esc_js("${escapeJSString(config.thanks_message)}"); ?>',

            // Branding Configuration
            showBranding: <?php echo ${config.show_branding} ? 'true' : 'false'; ?>,
            customLogoUrl: '<?php echo esc_js("${escapeJSString(config.custom_logo_url || "")}"); ?>',
            companyName: '<?php echo esc_js("${escapeJSString(config.company_name)}"); ?>',
            supportEmail: '<?php echo esc_js("${escapeJSString(config.support_email || "")}"); ?>',
            chatbotName: '<?php echo esc_js("${escapeJSString(config.chatbot_name || "")}"); ?>',
            aiLogoUrl: '<?php echo esc_js("${escapeJSString(config.ai_logo_url || "")}"); ?>',
            buttonLogoUrl: '<?php echo esc_js("${escapeJSString(config.button_logo_url || "")}"); ?>',
            aiAvatarUrl: '<?php echo esc_js("${escapeJSString(config.ai_avatar_url || "")}"); ?>',
            userAvatarUrl: '<?php echo esc_js("${escapeJSString(config.user_avatar_url || "")}"); ?>',

            // Custom CSS
            customCSS: '<?php echo esc_js("${escapeJSString(config.custom_css || "")}"); ?>'
        };

        // Set global config before loading widget
        window.chatLiteConfig = widgetConfig;

        // Load ChatLite Widget
        const script = document.createElement('script');
        script.src = widgetConfig.frontendBase + '/widget.js';
        script.async = true;
        script.onload = function() {
            if (window.ChatLite) {
                window.ChatLite.init(widgetConfig);
            }
        };
        document.head.appendChild(script);
    })();
    </script>
    <?php
}
?>`;
  };

  const generateReactScript = (): string => {
    if (!selectedWebsite) return '';

    const widgetId = selectedWebsite.widgetId || `widget_${selectedWebsite.id}_${Date.now()}`;
    const frontendBase = envConfig.widget.frontendUrl;
    const apiBase = envConfig.api.baseUrl + '/api/v1/widget';

    return `// ChatLite Widget Component for React
// Install: npm install --save @chatlite/react-widget
// Or include the script directly in your index.html

import React, { useEffect } from 'react';

const ChatLiteWidget = () => {
    useEffect(() => {
        // ChatLite Widget Configuration
        const widgetConfig = {
            widgetId: '${widgetId}',
            frontendBase: '${frontendBase}',
            apiBase: '${apiBase}',
            websiteName: '${escapeJSString(selectedWebsite.name)}',

            // Appearance Configuration
            primaryColor: '${config.widget_color}',
            position: '${config.widget_position}',
            size: '${config.widget_size}',
            theme: '${config.widget_theme}',
            borderRadius: '${config.border_radius}px',
            fontFamily: '${config.font_family || "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"}',

            // Behavior Configuration
            showAvatar: ${config.show_avatar},
            enableSound: ${config.enable_sound},
            autoOpenDelay: ${config.auto_open_delay || 'null'},
            showOnlineStatus: ${config.show_online_status},

            // Messages Configuration
            welcomeMessage: '${escapeJSString(config.welcome_message)}',
            placeholderText: '${escapeJSString(config.placeholder_text)}',
            offlineMessage: '${escapeJSString(config.offline_message)}',
            thanksMessage: '${escapeJSString(config.thanks_message)}',

            // Branding Configuration
            showBranding: ${config.show_branding},
            customLogoUrl: '${escapeJSString(config.custom_logo_url || "")}',
            companyName: '${escapeJSString(config.company_name)}',
            supportEmail: '${escapeJSString(config.support_email || "")}',
            chatbotName: '${escapeJSString(config.chatbot_name || "")}',
            aiLogoUrl: '${escapeJSString(config.ai_logo_url || "")}',
            buttonLogoUrl: '${escapeJSString(config.button_logo_url || "")}',
            aiAvatarUrl: '${escapeJSString(config.ai_avatar_url || "")}',
            userAvatarUrl: '${escapeJSString(config.user_avatar_url || "")}',

            // Custom CSS
            customCSS: '${escapeJSString(config.custom_css || "")}'
        };

        // Set global config before loading widget
        window.chatLiteConfig = widgetConfig;

        // Dynamically load the ChatLite script
        const script = document.createElement('script');
        script.src = widgetConfig.frontendBase + '/widget.js';
        script.async = true;
        script.onload = () => {
            if (window.ChatLite) {
                window.ChatLite.init(widgetConfig);
            }
        };
        document.body.appendChild(script);

        // Cleanup on unmount
        return () => {
            if (window.ChatLite && window.ChatLite.destroy) {
                window.ChatLite.destroy();
            }
            document.body.removeChild(script);
        };
    }, []);

    return null; // Widget renders itself
};

export default ChatLiteWidget;

// Usage in your app:
// import ChatLiteWidget from './ChatLiteWidget';
//
// function App() {
//     return (
//         <div>
//             <YourContent />
//             <ChatLiteWidget />
//         </div>
//     );
// }`;
  };

  const generateNextJSScript = (): string => {
    if (!selectedWebsite) return '';

    const widgetId = selectedWebsite.widgetId || `widget_${selectedWebsite.id}_${Date.now()}`;
    const frontendBase = envConfig.widget.frontendUrl;
    const apiBase = envConfig.api.baseUrl + '/api/v1/widget';

    return `// ChatLite Widget for Next.js
// Place this component in your components folder

'use client'; // For Next.js 13+ app directory

import { useEffect } from 'react';
import Script from 'next/script';

export default function ChatLiteWidget() {
    useEffect(() => {
        // Initialize widget when script loads
        if (typeof window !== 'undefined' && window.ChatLite) {
            const widgetConfig = {
                widgetId: '${widgetId}',
                frontendBase: '${frontendBase}',
                apiBase: '${apiBase}',
                websiteName: '${escapeJSString(selectedWebsite.name)}',

                // Appearance Configuration
                primaryColor: '${config.widget_color}',
                position: '${config.widget_position}',
                size: '${config.widget_size}',
                theme: '${config.widget_theme}',
                borderRadius: '${config.border_radius}px',
                fontFamily: '${config.font_family || "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"}',

                // Behavior Configuration
                showAvatar: ${config.show_avatar},
                enableSound: ${config.enable_sound},
                autoOpenDelay: ${config.auto_open_delay || 'null'},
                showOnlineStatus: ${config.show_online_status},

                // Messages Configuration
                welcomeMessage: '${escapeJSString(config.welcome_message)}',
                placeholderText: '${escapeJSString(config.placeholder_text)}',
                offlineMessage: '${escapeJSString(config.offline_message)}',
                thanksMessage: '${escapeJSString(config.thanks_message)}',

                // Branding Configuration
                showBranding: ${config.show_branding},
                customLogoUrl: '${escapeJSString(config.custom_logo_url || "")}',
                companyName: '${escapeJSString(config.company_name)}',
                supportEmail: '${escapeJSString(config.support_email || "")}',
                chatbotName: '${escapeJSString(config.chatbot_name || "")}',
                aiLogoUrl: '${escapeJSString(config.ai_logo_url || "")}',
                buttonLogoUrl: '${escapeJSString(config.button_logo_url || "")}',
                aiAvatarUrl: '${escapeJSString(config.ai_avatar_url || "")}',
                userAvatarUrl: '${escapeJSString(config.user_avatar_url || "")}',

                // Custom CSS
                customCSS: '${escapeJSString(config.custom_css || "")}'
            };

            window.chatLiteConfig = widgetConfig;

            window.ChatLite.init(widgetConfig);
        }
    }, []);

    return (
        <>
            <Script
                id="chatlite-widget"
                src="${frontendBase}/widget.js"
                strategy="afterInteractive"
                onLoad={() => {
                    if (window.ChatLite) {
                        const widgetConfig = {
                            widgetId: '${widgetId}',
                            frontendBase: '${frontendBase}',
                            apiBase: '${apiBase}',
                            websiteName: '${escapeJSString(selectedWebsite.name)}',

                            // Appearance Configuration
                            primaryColor: '${config.widget_color}',
                            position: '${config.widget_position}',
                            size: '${config.widget_size}',
                            theme: '${config.widget_theme}',
                            borderRadius: '${config.border_radius}px',
                            fontFamily: '${config.font_family || "-apple-system,BlinkMacSystemFont,Segue UI,sans-serif"}',

                            // Behavior Configuration
                            showAvatar: ${config.show_avatar},
                            enableSound: ${config.enable_sound},
                            autoOpenDelay: ${config.auto_open_delay || 'null'},
                            showOnlineStatus: ${config.show_online_status},

                            // Messages Configuration
                            welcomeMessage: '${escapeJSString(config.welcome_message)}',
                            placeholderText: '${escapeJSString(config.placeholder_text)}',
                            offlineMessage: '${escapeJSString(config.offline_message)}',
                            thanksMessage: '${escapeJSString(config.thanks_message)}',

                            // Branding Configuration
                            showBranding: ${config.show_branding},
                            customLogoUrl: '${escapeJSString(config.custom_logo_url || "")}',
                            companyName: '${escapeJSString(config.company_name)}',
                            supportEmail: '${escapeJSString(config.support_email || "")}',
                            chatbotName: '${escapeJSString(config.chatbot_name || "")}',
                            aiLogoUrl: '${escapeJSString(config.ai_logo_url || "")}',
                            buttonLogoUrl: '${escapeJSString(config.button_logo_url || "")}',
                            aiAvatarUrl: '${escapeJSString(config.ai_avatar_url || "")}',
                            userAvatarUrl: '${escapeJSString(config.user_avatar_url || "")}',

                            // Custom CSS
                            customCSS: '${escapeJSString(config.custom_css || "")}'
                        };
                        window.chatLiteConfig = widgetConfig;
                        window.ChatLite.init(widgetConfig);
                    }
                }}
            />
        </>
    );
}

// Usage in your layout.tsx or page.tsx:
// import ChatLiteWidget from '@/components/ChatLiteWidget';
//
// export default function RootLayout({ children }) {
//     return (
//         <html lang="en">
//             <body>
//                 {children}
//                 <ChatLiteWidget />
//             </body>
//         </html>
//     );
// }`;
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, itemId]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Auto-regenerate script when config changes
  useEffect(() => {
    if (showGeneratedSection && !scriptNeedsRegeneration) {
      setScriptNeedsRegeneration(true);
    }
  }, [config]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Script Generator</h1>
          <p className="text-xl text-gray-400">Generate installation scripts and get setup guides for your website</p>

          {/* Navigation Buttons */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            <button
              onClick={() => {
                setShowIntegrationGuide(!showIntegrationGuide);
                setShowTroubleshoot(false);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                showIntegrationGuide
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Integration Guide</span>
            </button>

            <button
              onClick={() => {
                setShowTroubleshoot(!showTroubleshoot);
                setShowIntegrationGuide(false);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                showTroubleshoot
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Troubleshoot</span>
            </button>
          </div>
        </div>

        {/* Top Section - Website Selection + Generate */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Select Your Website</h2>
          </div>

          <div className="flex items-center space-x-4">
            <select
              className="flex-1 px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-white/50 focus:border-transparent"
              value={selectedWebsite?.id || ''}
              onChange={(e) => {
                const website = websites.find((w: any) => w.id === e.target.value);
                setSelectedWebsite(website || null);
                setConfig(prev => ({ ...prev, websiteId: e.target.value }));
                setShowGeneratedSection(false);
                setGeneratedScript('');
              }}
            >
              {websites.length === 0 ? (
                <option disabled>No websites available - Please add a website first</option>
              ) : (
                websites.map(website => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.domain})
                </option>
              ))
              )}
            </select>

            <button
              onClick={generateScript}
              disabled={!selectedWebsite || isGeneratingScript}
              className="flex items-center space-x-3 bg-white text-indigo-600 px-8 py-3 rounded-xl text-lg font-bold shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGeneratingScript ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle Section - Widget Appearance and Live Preview Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Left Side - Widget Appearance (Scrollable) */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 overflow-y-auto max-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-10rem)]">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Palette className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Widget Appearance</h2>
            </div>

            {/* Widget Appearance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Widget Color */}
              <div>
                <label className="flex items-center space-x-2 text-red-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                  <span>Widget Color</span>
                </label>
                <div className="flex items-center space-x-2 w-full">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-gray-600 rounded cursor-pointer opacity-0 absolute"
                      value={config.widget_color}
                      onChange={(e) => setConfig(prev => ({ ...prev, widget_color: e.target.value }))}
                    />
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-gray-600 rounded cursor-pointer flex items-center justify-center"
                      style={{ backgroundColor: config.widget_color }}
                    >
                      <span className="text-white text-xs font-bold drop-shadow-lg">●</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="flex-1 px-2 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-xs sm:text-sm min-w-0"
                    value={config.widget_color}
                    onChange={(e) => setConfig(prev => ({ ...prev, widget_color: e.target.value }))}
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="flex items-center space-x-2 text-orange-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                  <span>Position</span>
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  value={config.widget_position}
                  onChange={(e) => setConfig(prev => ({ ...prev, widget_position: e.target.value as any }))}
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              {/* Size */}
              <div>
                <label className="flex items-center space-x-2 text-yellow-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span>Size</span>
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  value={config.widget_size}
                  onChange={(e) => setConfig(prev => ({ ...prev, widget_size: e.target.value as any }))}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Border Radius */}
              <div>
                <label className="flex items-center space-x-2 text-gray-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span>Border Radius: {config.border_radius}px</span>
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={config.border_radius}
                    onChange={(e) => setConfig(prev => ({ ...prev, border_radius: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span>24px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages & Text Section */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Messages & Text</h3>
              </div>

              {/* Welcome Message */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-yellow-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span>Welcome Message</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white resize-none"
                  rows={2}
                  placeholder="Hi! How can I help you today?"
                  value={config.welcome_message}
                  onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                />
                <div className="text-xs text-gray-400 mt-1">First message visitors see</div>
              </div>

              {/* Placeholder Text */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-blue-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                  <span>Placeholder Text</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="Type your message..."
                  value={config.placeholder_text}
                  onChange={(e) => setConfig(prev => ({ ...prev, placeholder_text: e.target.value }))}
                />
                <div className="text-xs text-gray-400 mt-1">Text shown in the input field</div>
              </div>

              {/* Offline Message */}
              <div>
                <label className="flex items-center space-x-2 text-red-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                  <span>Offline Message</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white resize-none"
                  rows={2}
                  placeholder="We're currently offline. Leave a message!"
                  value={config.offline_message}
                  onChange={(e) => setConfig(prev => ({ ...prev, offline_message: e.target.value }))}
                />
                <div className="text-xs text-gray-400 mt-1">Message shown when support is offline</div>
              </div>
            </div>

            {/* Branding & Customization Section */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <User className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Branding & Customization</h3>
              </div>

              {/* Chatbot Name */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-indigo-400 font-medium mb-3">
                  <div className="w-4 h-4 bg-indigo-400 rounded-full"></div>
                  <span>Chatbot Name</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="Support Chat (default: company_name)"
                  value={config.chatbot_name || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, chatbot_name: e.target.value || undefined }))}
                />
                <div className="text-xs text-gray-400 mt-1">Name displayed in chat header</div>
              </div>

              {/* AI Logo URL */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-purple-400 font-medium mb-3">
                  <Image className="w-4 h-4 text-purple-400" />
                  <span>AI Logo URL</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="https://example.com/ai-logo.png"
                  value={config.ai_logo_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, ai_logo_url: e.target.value || undefined }))}
                />
                <div className="text-xs text-gray-400 mt-1">Logo displayed in chat header next to chatbot name</div>
              </div>

              {/* Button Logo URL */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-pink-400 font-medium mb-3">
                  <Image className="w-4 h-4 text-pink-400" />
                  <span>Button Logo URL</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="https://example.com/button-logo.png"
                  value={config.button_logo_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, button_logo_url: e.target.value || undefined }))}
                />
                <div className="text-xs text-gray-400 mt-1">Logo displayed on the chat widget button</div>
              </div>

              {/* AI Avatar URL */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-cyan-400 font-medium mb-3">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>AI Avatar URL</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="https://example.com/ai-avatar.png"
                  value={config.ai_avatar_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, ai_avatar_url: e.target.value || undefined }))}
                />
                <div className="text-xs text-gray-400 mt-1">Avatar shown next to AI/bot messages</div>
              </div>

              {/* User Avatar URL */}
              <div>
                <label className="flex items-center space-x-2 text-teal-400 font-medium mb-3">
                  <User className="w-4 h-4 text-teal-400" />
                  <span>User Avatar URL</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="https://example.com/user-avatar.png"
                  value={config.user_avatar_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, user_avatar_url: e.target.value || undefined }))}
                />
                <div className="text-xs text-gray-400 mt-1">Avatar shown next to user messages</div>
              </div>
            </div>

            {/* Generated Script Section - Always visible */}
            <div ref={generatedSectionRef} className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Code className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Generated Script</h3>
              </div>

              {/* Script Type Tabs - Always visible */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'html', label: 'HTML' },
                  { id: 'wordpress', label: 'WordPress' },
                  { id: 'react', label: 'React' },
                  { id: 'nextjs', label: 'Next.js' }
                ].map(type => {
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setActiveScriptType(type.id as any);
                        // Regenerate script for new type if already generated
                        if (selectedWebsite && showGeneratedSection) {
                          let newScript = '';
                          switch (type.id) {
                            case 'html':
                              newScript = generateHTMLScript();
                              break;
                            case 'wordpress':
                              newScript = generateWordPressScript();
                              break;
                            case 'react':
                              newScript = generateReactScript();
                              break;
                            case 'nextjs':
                              newScript = generateNextJSScript();
                              break;
                          }
                          setGeneratedScript(newScript);
                          setScriptNeedsRegeneration(false);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        activeScriptType === type.id
                          ? 'bg-purple-600 text-white font-medium'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons - Always visible */}
              <div className="flex items-center space-x-3 mb-4">
                <button
                  onClick={generateScript}
                  disabled={!selectedWebsite || isGeneratingScript}
                  className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isGeneratingScript ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => copyToClipboard(generatedScript, 'script')}
                  disabled={!generatedScript}
                  className="flex items-center space-x-2 bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {copiedItems.has('script') ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    let filename = `chatlite-${selectedWebsite?.domain || 'widget'}`;
                    let mimeType = 'text/plain';

                    switch (activeScriptType) {
                      case 'html':
                        filename += '.html';
                        mimeType = 'text/html';
                        break;
                      case 'wordpress':
                        filename += '.php';
                        mimeType = 'text/x-php';
                        break;
                      case 'react':
                        filename += '.jsx';
                        mimeType = 'text/javascript';
                        break;
                      case 'nextjs':
                        filename += '.tsx';
                        mimeType = 'text/typescript';
                        break;
                    }

                    downloadFile(generatedScript, filename, mimeType);
                  }}
                  disabled={!generatedScript}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              {/* Script Content Area */}
              {!showGeneratedSection ? (
                <div className="bg-gray-700/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-600">
                  <div className="mb-4">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-white mb-2">Ready to Generate Script</h4>
                    <p className="text-gray-400 text-sm">
                      Configure your widget settings above, then click the Generate button to create your installation script for the selected platform.
                    </p>
                  </div>
                </div>
              ) : (
                scriptNeedsRegeneration ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-200 font-medium">Script needs regeneration</span>
                    </div>
                    <p className="text-yellow-200 text-sm">
                      Your widget settings have changed. Click Generate to update the script with your new configuration.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-300">
                      <code>{generatedScript || 'Click "Generate" button above to create your script'}</code>
                    </pre>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Side - Live Preview (Fixed Height) */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Eye className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Live Preview</h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFullscreenPreview(true)}
                  className="p-2 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  title="Fullscreen Preview"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                {[
                  { id: 'desktop', icon: Monitor, label: 'Desktop' },
                  { id: 'tablet', icon: Tablet, label: 'Tablet' },
                  { id: 'mobile', icon: Smartphone, label: 'Mobile' }
                ].map(device => {
                  const Icon = device.icon;
                  return (
                    <button
                      key={device.id}
                      onClick={() => setPreviewDevice(device.id)}
                      className={`p-2 rounded-md transition-colors ${
                        previewDevice === device.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      }`}
                      title={device.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* First Page Crawl Status Banner */}
            {firstPageStatus && (
              <div className="mb-4">
                {firstPageStatus.status === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-200">Preparing chat preview...</p>
                        <p className="text-xs text-yellow-200/70 mt-0.5">Setting up your homepage content for instant testing</p>
                      </div>
                    </div>
                  </div>
                )}

                {firstPageStatus.status === 'processing' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-200">
                          Processing homepage... ({firstPageStatus.estimated_time || '~10-15 seconds'})
                        </p>
                        <p className="text-xs text-blue-200/70 mt-0.5">Extracting and indexing content for chat functionality</p>
                      </div>
                    </div>
                  </div>
                )}

                {firstPageStatus.status === 'retrying' && firstPageStatus.retry_info && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-200">
                          Retry {firstPageStatus.retry_info.current_attempt}/{firstPageStatus.retry_info.max_attempts} in {firstPageStatus.retry_info.seconds_until_retry}s
                        </p>
                        <p className="text-xs text-orange-200/70 mt-0.5">
                          {firstPageStatus.retry_info.error_message || 'Temporary issue, retrying automatically...'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {firstPageStatus.status === 'ready' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-200">
                          ✨ Chat preview ready! ({firstPageStatus.chunks_count || 0} sections indexed)
                        </p>
                        <p className="text-xs text-green-200/70 mt-0.5">Type a message below to test your chatbot with homepage content</p>
                      </div>
                    </div>
                  </div>
                )}

                {firstPageStatus.status === 'failed' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-200">Setup failed after {firstPageStatus.failure_info?.total_attempts || 3} attempts</p>
                        <p className="text-xs text-red-200/70 mt-0.5">
                          {firstPageStatus.failure_info?.last_error || 'Please try again or contact support'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Container */}
            <div className="flex justify-center flex-1 overflow-auto">
              <div className={`
                ${
                  previewDevice === 'desktop' ? 'w-full max-w-4xl h-[600px]' :
                  previewDevice === 'tablet' ? 'w-96 h-[700px]' :
                  'w-72 h-[600px]'
                }
                bg-white rounded-lg relative overflow-hidden border-2 border-gray-600 shadow-lg
              `}>
                {/* Mock Website Header */}
                <div className={`bg-gray-800 flex items-center ${
                  previewDevice === 'mobile' ? 'h-8 px-3' : 'h-10 px-4'
                }`}>
                  <div className="flex space-x-2">
                    <div className={`rounded-full bg-red-500 ${
                      previewDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
                    }`}></div>
                    <div className={`rounded-full bg-yellow-500 ${
                      previewDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
                    }`}></div>
                    <div className={`rounded-full bg-green-500 ${
                      previewDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
                    }`}></div>
                  </div>
                  <div className={`ml-3 text-white ${
                    previewDevice === 'mobile' ? 'text-xs' : 'text-sm'
                  }`}>{selectedWebsite?.domain || 'yourwebsite.com'}</div>
                </div>

                {/* Website Content - Priority: Screenshot > Iframe > Fallback */}
                <div className="relative h-full">
                  {selectedWebsite?.screenshot_url ? (
                    // Show screenshot if available (primary)
                    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
                      <img
                        src={selectedWebsite.screenshot_url}
                        alt={`Screenshot of ${selectedWebsite.domain}`}
                        className="w-full object-cover object-top"
                      />
                    </div>
                  ) : selectedWebsite?.url ? (
                    // Try iframe if no screenshot (secondary)
                    <>
                      {iframeLoading && (
                        <div className={`absolute inset-0 flex items-center justify-center bg-white space-y-4 ${
                          previewDevice === 'mobile' ? 'p-4' : 'p-6'
                        }`}>
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <div className="text-gray-600 text-sm">Loading website...</div>
                          </div>
                        </div>
                      )}
                      {!iframeError ? (
                        <iframe
                          key={selectedWebsite.url}
                          src={selectedWebsite.url}
                          className="w-full h-full border-0"
                          style={{ pointerEvents: 'auto' }}
                          onLoad={(e) => {
                            console.log('Iframe loaded successfully', e.currentTarget.src);
                            iframeLoadedRef.current = true;
                            if (iframeTimeoutRef.current) {
                              clearTimeout(iframeTimeoutRef.current);
                              iframeTimeoutRef.current = null;
                            }
                            setIframeLoading(false);
                            setIframeError(false);
                          }}
                          onError={(e) => {
                            console.error('Iframe failed to load:', e.currentTarget.src);
                            if (iframeTimeoutRef.current) {
                              clearTimeout(iframeTimeoutRef.current);
                              iframeTimeoutRef.current = null;
                            }
                            setIframeError(true);
                            setIframeLoading(false);
                          }}
                          title="Website Preview"
                        />
                      ) : (
                        // Show fallback if iframe failed and no screenshot
                        <div className={`space-y-4 ${
                          previewDevice === 'mobile' ? 'p-4' : 'p-6'
                        }`}>
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-xs font-medium text-blue-900 mb-1">Preview Not Available</div>
                                <div className="text-xs text-blue-800 leading-relaxed">
                                  This website blocks iframe embedding for security. This is normal for sites like ChatGPT, banks, and many corporate sites. Your chat widget will work perfectly when installed on your actual website.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Default fallback - no website selected
                    <div className={`space-y-4 ${
                      previewDevice === 'mobile' ? 'p-4' : 'p-6'
                    }`}>
                      <div className={`font-bold text-gray-900 ${
                        previewDevice === 'mobile' ? 'text-lg' : 'text-2xl'
                      }`}>Your Website</div>
                      <div className={`text-gray-600 ${
                        previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                      }`}>This is how your chat widget will appear to visitors</div>
                      <div className="space-y-2">
                        <div className={`bg-gray-200 rounded w-3/4 ${
                          previewDevice === 'mobile' ? 'h-3' : 'h-4'
                        }`}></div>
                        <div className={`bg-gray-200 rounded w-1/2 ${
                          previewDevice === 'mobile' ? 'h-3' : 'h-4'
                        }`}></div>
                        <div className={`bg-gray-200 rounded w-2/3 ${
                          previewDevice === 'mobile' ? 'h-3' : 'h-4'
                        }`}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Widget Preview */}
                <div className="absolute" style={{
                  ...{
                    'bottom-right': {
                      bottom: previewDevice === 'mobile' ? '12px' : '16px',
                      right: previewDevice === 'mobile' ? '12px' : '16px'
                    },
                    'bottom-left': {
                      bottom: previewDevice === 'mobile' ? '12px' : '16px',
                      left: previewDevice === 'mobile' ? '12px' : '16px'
                    },
                    'top-right': {
                      top: previewDevice === 'mobile' ? '50px' : '56px',
                      right: previewDevice === 'mobile' ? '12px' : '16px'
                    },
                    'top-left': {
                      top: previewDevice === 'mobile' ? '50px' : '56px',
                      left: previewDevice === 'mobile' ? '12px' : '16px'
                    }
                  }[config.widget_position]
                }}>

                  {/* Chat Interface - Toggleable */}
                  {previewChatOpen && (
                    <div
                      className="bg-white rounded-lg shadow-2xl border-2 mb-3 absolute z-10 transition-all duration-300"
                      style={{
                        width: previewDevice === 'mobile' ? '240px' : previewDevice === 'tablet' ? '280px' : '320px',
                        height: previewDevice === 'mobile' ? '320px' : previewDevice === 'tablet' ? '380px' : '420px',
                        borderColor: config.widget_color,
                        borderRadius: config.border_radius + 'px',
                        ...{
                          'bottom-right': {
                            bottom: previewDevice === 'mobile' ? '50px' : previewDevice === 'tablet' ? '60px' : '70px',
                            right: '0'
                          },
                          'bottom-left': {
                            bottom: previewDevice === 'mobile' ? '50px' : previewDevice === 'tablet' ? '60px' : '70px',
                            left: '0'
                          },
                          'top-right': {
                            top: previewDevice === 'mobile' ? '50px' : previewDevice === 'tablet' ? '60px' : '70px',
                            right: '0'
                          },
                          'top-left': {
                            top: previewDevice === 'mobile' ? '50px' : previewDevice === 'tablet' ? '60px' : '70px',
                            left: '0'
                          }
                        }[config.widget_position]
                      }}
                    >
                      {/* Chat Header */}
                      <div
                        className={`flex items-center justify-between text-white ${
                          previewDevice === 'mobile' ? 'p-2' : 'p-3'
                        }`}
                        style={{
                          backgroundColor: config.widget_color,
                          borderTopLeftRadius: config.border_radius + 'px',
                          borderTopRightRadius: config.border_radius + 'px'
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          {config.ai_logo_url ? (
                            <img
                              src={config.ai_logo_url}
                              alt="AI Logo"
                              className={`rounded-full object-cover ${
                                previewDevice === 'mobile' ? 'w-5 h-5' : 'w-6 h-6'
                              }`}
                              onError={(e) => {
                                // Fallback to emoji if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`bg-white/20 rounded-full flex items-center justify-center ${
                            previewDevice === 'mobile' ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
                          } ${config.ai_logo_url ? 'hidden' : ''}`}>
                            💬
                          </div>
                          <div>
                            <div className={`font-semibold ${
                              previewDevice === 'mobile' ? 'text-xs' : 'text-sm'
                            }`}>{config.chatbot_name || config.company_name || 'Support Chat'}</div>
                            <div className={`opacity-80 ${
                              previewDevice === 'mobile' ? 'text-xs' : 'text-xs'
                            }`}>Online now</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewChatOpen(false)}
                          className={`text-white/60 hover:text-white transition-colors ${
                            previewDevice === 'mobile' ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          ✕
                        </button>
                      </div>

                    {/* Chat Messages */}
                    <div
                      ref={previewMessagesContainerRef}
                      className={`flex-1 space-y-2 overflow-y-auto ${
                        previewDevice === 'mobile' ? 'p-2' : 'p-3'
                      }`}
                      style={{
                        height: previewDevice === 'mobile' ? '200px' : previewDevice === 'tablet' ? '250px' : '280px'
                      }}
                    >
                      {previewMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-start ${
                            msg.type === 'user' ? 'justify-end' : ''
                          } ${
                            previewDevice === 'mobile' ? 'space-x-1' : 'space-x-2'
                          }`}
                        >
                          {msg.type === 'assistant' && (
                            config.ai_avatar_url ? (
                              <img
                                src={config.ai_avatar_url}
                                alt="AI Avatar"
                                className={`rounded-full flex-shrink-0 object-cover ${
                                  previewDevice === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'
                                }`}
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              <div className={`bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center ${
                                previewDevice === 'mobile' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'
                              }`}>👤</div>
                            )
                          )}
                          <div
                            className={`rounded-lg max-w-xs ${
                              msg.type === 'assistant'
                                ? 'bg-gray-100'
                                : 'text-white'
                            } ${
                              previewDevice === 'mobile' ? 'px-2 py-1' : 'px-2 py-1'
                            }`}
                            style={msg.type === 'user' ? { backgroundColor: config.widget_color } : {}}
                          >
                            <div className={`${
                              msg.type === 'assistant' ? 'text-gray-800' : 'text-white'
                            } ${
                              previewDevice === 'mobile' ? 'text-xs' : 'text-xs'
                            }`}>{msg.content}</div>
                          </div>
                          {msg.type === 'user' && (
                            config.user_avatar_url ? (
                              <img
                                src={config.user_avatar_url}
                                alt="User Avatar"
                                className={`rounded-full flex-shrink-0 object-cover ${
                                  previewDevice === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'
                                }`}
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              <div className={`bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center ${
                                previewDevice === 'mobile' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'
                              }`}>👤</div>
                            )
                          )}
                        </div>
                      ))}
                      {isPreviewTyping && (
                        <div className={`flex items-start ${
                          previewDevice === 'mobile' ? 'space-x-1' : 'space-x-2'
                        }`}>
                          {config.ai_avatar_url ? (
                            <img
                              src={config.ai_avatar_url}
                              alt="AI Avatar"
                              className={`rounded-full flex-shrink-0 object-cover ${
                                previewDevice === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'
                              }`}
                              onError={(e) => {
                                // Fallback to emoji if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center ${
                            previewDevice === 'mobile' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'
                          } ${config.ai_avatar_url ? 'hidden' : ''}`}>👤</div>
                          <div className={`bg-gray-100 rounded-lg ${
                            previewDevice === 'mobile' ? 'px-2 py-1' : 'px-2 py-1'
                          }`}>
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className={`border-t border-gray-200 ${
                      previewDevice === 'mobile' ? 'p-2' : 'p-3'
                    }`}>
                      <form onSubmit={handlePreviewSendMessage} className="flex items-center space-x-1">
                        <input
                          type="text"
                          placeholder={isPreviewTyping ? "AI is typing..." : (config.placeholder_text || "Type your message...")}
                          value={previewInputValue}
                          onChange={(e) => setPreviewInputValue(e.target.value)}
                          onKeyPress={handlePreviewKeyPress}
                          disabled={isPreviewTyping || !selectedWebsite}
                          className={`flex-1 border border-gray-300 rounded min-w-0 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                            previewDevice === 'mobile' ? 'px-1.5 py-1 text-xs' : 'px-2 py-1 text-xs'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={!previewInputValue.trim() || isPreviewTyping || !selectedWebsite}
                          className={`text-white rounded flex-shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${
                            previewDevice === 'mobile' ? 'px-1.5 py-1 text-xs' : 'px-2 py-1 text-xs'
                          }`}
                          style={{ backgroundColor: config.widget_color }}
                        >
                          {isPreviewTyping ? '...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                  )}

                  {/* Chat Button */}
                  <button
                    onClick={() => setPreviewChatOpen(!previewChatOpen)}
                    className="rounded-full shadow-lg cursor-pointer flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 focus:outline-none"
                    style={{
                      width: (() => {
                        const baseSize = config.widget_size === 'small' ? 50 : config.widget_size === 'large' ? 70 : 60;
                        const deviceMultiplier = previewDevice === 'mobile' ? 0.8 : previewDevice === 'tablet' ? 0.9 : 1;
                        return Math.round(baseSize * deviceMultiplier) + 'px';
                      })(),
                      height: (() => {
                        const baseSize = config.widget_size === 'small' ? 50 : config.widget_size === 'large' ? 70 : 60;
                        const deviceMultiplier = previewDevice === 'mobile' ? 0.8 : previewDevice === 'tablet' ? 0.9 : 1;
                        return Math.round(baseSize * deviceMultiplier) + 'px';
                      })(),
                      fontSize: previewDevice === 'mobile' ? '16px' : previewDevice === 'tablet' ? '18px' : '20px',
                      backgroundColor: config.widget_color,
                      borderRadius: config.border_radius + 'px'
                    }}
                  >
                    {config.button_logo_url ? (
                      <img
                        src={config.button_logo_url}
                        alt="Chat Button"
                        className="rounded-full object-cover"
                        style={{
                          width: (() => {
                            const baseSize = config.widget_size === 'small' ? 30 : config.widget_size === 'large' ? 42 : 36;
                            const deviceMultiplier = previewDevice === 'mobile' ? 0.8 : previewDevice === 'tablet' ? 0.9 : 1;
                            return Math.round(baseSize * deviceMultiplier) + 'px';
                          })(),
                          height: (() => {
                            const baseSize = config.widget_size === 'small' ? 30 : config.widget_size === 'large' ? 42 : 36;
                            const deviceMultiplier = previewDevice === 'mobile' ? 0.8 : previewDevice === 'tablet' ? 0.9 : 1;
                            return Math.round(baseSize * deviceMultiplier) + 'px';
                          })()
                        }}
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '💬';
                          }
                        }}
                      />
                    ) : (
                      '💬'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Current Settings Summary */}
            <div className="mt-6 bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Current Settings</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Color:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: config.widget_color }}
                    ></div>
                    <span className="text-white font-mono">{config.widget_color}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Position:</span>
                  <div className="text-white mt-1 capitalize">{config.widget_position.replace('-', ' ')}</div>
                </div>
                <div>
                  <span className="text-gray-400">Size:</span>
                  <div className="text-white mt-1 capitalize">{config.widget_size}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Guide Modal */}
        {showIntegrationGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-6xl max-h-[90vh] w-full overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-br from-blue-600 to-cyan-600 p-6 border-b border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Installation Guide</h2>
                      <p className="text-blue-200 text-sm">Step-by-step instructions for different platforms</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIntegrationGuide(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 bg-gray-50">
                <div className="space-y-6">
                  {/* HTML/Static Website Installation */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleInstallationSection('html')}
                      className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Code className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 text-lg">HTML/Static Website</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Most Common</span>
                      </div>
                      {expandedInstallationSection.has('html') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedInstallationSection.has('html') && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="bg-blue-50 rounded-lg p-4 mt-4 mb-6">
                          <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-blue-900 text-sm">
                                Add the generated script just before the closing <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag in your HTML file.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-gray-900 font-medium">Step-by-step instructions:</h4>
                          <div className="space-y-3">
                            {[
                              'Generate your HTML script using the form above',
                              'Copy the generated script code to your clipboard',
                              'Open your website\'s HTML file in a text editor',
                              'Scroll to the bottom and find the </body> tag',
                              'Paste the script just before the </body> tag',
                              'Save the file and upload it to your web server',
                              'Refresh your website to see the chat widget'
                            ].map((step, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <span className="text-gray-700 text-sm">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WordPress Installation */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleInstallationSection('wordpress')}
                      className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 text-lg">WordPress</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Plugin Available</span>
                      </div>
                      {expandedInstallationSection.has('wordpress') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedInstallationSection.has('wordpress') && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="space-y-6 mt-4">
                          {/* Method 1: Plugin */}
                          <div>
                            <div className="bg-green-50 rounded-lg p-4 mb-4">
                              <div className="flex items-start space-x-3">
                                <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="text-green-900 font-medium mb-1">Method 1: WordPress Plugin (Recommended)</h4>
                                  <p className="text-green-800 text-sm">Use our WordPress plugin for automatic installation and updates.</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {[
                                'Generate WordPress script above and download the plugin file',
                                'Go to your WordPress admin → Plugins → Add New',
                                'Click "Upload Plugin" and select the downloaded file',
                                'Click "Install Now" and then "Activate"',
                                'The chatbot will automatically appear on your site'
                              ].map((step, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-700 text-sm">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Method 2: Manual */}
                          <div>
                            <h4 className="text-gray-900 font-medium mb-3">Method 2: Manual Installation</h4>
                            <div className="space-y-3">
                              {[
                                'Go to WordPress admin → Appearance → Theme Editor',
                                'Select your active theme and open footer.php',
                                'Paste the generated script before </body> tag',
                                'Click "Update File" to save changes'
                              ].map((step, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-700 text-sm">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* React/Next.js Installation */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleInstallationSection('react')}
                      className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Code className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 text-lg">React/Next.js</span>
                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full">Component Based</span>
                      </div>
                      {expandedInstallationSection.has('react') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedInstallationSection.has('react') && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="mt-4 space-y-4">
                          <div className="bg-cyan-50 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <Info className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-cyan-900 text-sm">
                                  Generate the React/Next.js component above and integrate it into your application.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {[
                              'Generate React/Next.js component from the script section above',
                              'Create a new component file (e.g., ChatWidget.tsx)',
                              'Copy the generated component code into the file',
                              'Import the component in your main app layout',
                              'Add the component to your JSX (preferably in layout)',
                              'The widget will load automatically across all pages'
                            ].map((step, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <span className="text-gray-700 text-sm">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Testing & Verification */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleInstallationSection('testing')}
                      className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 text-lg">Testing & Verification</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Important</span>
                      </div>
                      {expandedInstallationSection.has('testing') ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedInstallationSection.has('testing') && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="mt-4 space-y-4">
                          <div className="space-y-3">
                            {[
                              'Visit your website in a new browser window/incognito mode',
                              'Look for the chat widget in the configured position',
                              'Click the widget to open the chat interface',
                              'Send a test message to verify the connection works',
                              'Test on mobile devices to ensure responsiveness',
                              'Check browser console for any errors (F12 → Console)'
                            ].map((step, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <span className="text-gray-700 text-sm">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pro Tips */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-semibold text-blue-900">Pro Tips</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-900 text-sm">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Always test on a staging environment first</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <RefreshCw className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Clear browser cache if widget doesn't appear</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <FileText className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Keep the generated script file for future reference</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <HelpCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Check troubleshoot section if issues arise</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Troubleshoot Modal */}
        {showTroubleshoot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-6xl max-h-[90vh] w-full overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-br from-red-600 to-orange-600 p-6 border-b border-red-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Wrench className="w-6 h-6 text-red-300" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Troubleshooting Guide</h2>
                      <p className="text-red-200 text-sm">Common issues and their solutions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTroubleshoot(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 bg-gray-50">
                {/* Warning Box */}
                <div className="mb-6 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-900 font-medium mb-1">Before You Start</h4>
                      <p className="text-yellow-800 text-sm">
                        If you're experiencing issues with your chatbot, try these common solutions in order.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Widget Not Appearing */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span>Widget Not Appearing</span>
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Clear your browser cache and hard refresh the page (Ctrl+F5 or Cmd+Shift+R)',
                        'Check that the script is placed before the closing </body> tag',
                        'Open browser developer tools (F12) and check for JavaScript errors in the console',
                        'Verify the website ID in the script matches your registered website',
                        'Ensure there are no ad blockers or browser extensions blocking the widget'
                      ].map((solution, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{solution}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat Not Working */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <MessageSquare className="w-6 h-6 text-red-500" />
                      <span>Chat Functionality Not Working</span>
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Check your internet connection and firewall settings',
                        'Verify your website is active and properly configured in the dashboard',
                        'Ensure your website content has been crawled successfully',
                        'Test with different browsers to rule out browser-specific issues',
                        'Check the browser console for network errors or CORS issues'
                      ].map((solution, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{solution}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Styling Issues */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Palette className="w-6 h-6 text-red-500" />
                      <span>Styling & Appearance Issues</span>
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Regenerate the script with updated appearance settings',
                        'Check for CSS conflicts with your existing website styles',
                        'Verify that custom CSS (if used) is properly formatted',
                        'Test the widget on different devices to ensure responsiveness',
                        'Check z-index conflicts if the widget appears behind other elements'
                      ].map((solution, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{solution}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform-Specific Issues */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Globe className="w-6 h-6 text-red-500" />
                      <span>Platform-Specific Issues</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* WordPress Issues */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-gray-900 font-medium mb-3">WordPress Issues</h4>
                        <div className="space-y-2">
                          {[
                            'Check if your theme supports custom code injection',
                            'Use a plugin like "Insert Headers and Footers" as alternative',
                            'Verify functions.php syntax (missing semicolons/brackets)',
                            'Test with a default theme to rule out theme conflicts'
                          ].map((solution, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 text-xs">{solution}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* React/Next.js Issues */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-gray-900 font-medium mb-3">React/Next.js Issues</h4>
                        <div className="space-y-2">
                          {[
                            'Ensure useEffect hook is properly implemented',
                            'Check for hydration mismatches in Next.js',
                            'Verify the component is imported and used correctly',
                            'Test component mounting/unmounting behavior'
                          ].map((solution, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 text-xs">{solution}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Support */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-semibold text-blue-900">Still Need Help?</h4>
                    </div>
                    <p className="text-blue-800 text-sm mb-4">
                      If you've tried the solutions above and are still experiencing issues, our support team is ready to help you get your chat widget working perfectly.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="mailto:support@chatlite.com"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Email Support</span>
                      </a>
                      <a
                        href="#"
                        className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Documentation</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Preview Modal */}
        {showFullscreenPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
            {/* Modal Header */}
            <div className="bg-gray-900 border-b border-gray-700 p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Eye className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Live Preview</h2>
                      <p className="text-sm text-gray-400">{selectedWebsite?.domain}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-8">
                    {[
                      { id: 'desktop', icon: Monitor, label: 'Desktop' },
                      { id: 'tablet', icon: Tablet, label: 'Tablet' },
                      { id: 'mobile', icon: Smartphone, label: 'Mobile' }
                    ].map(device => {
                      const Icon = device.icon;
                      return (
                        <button
                          key={device.id}
                          onClick={() => setPreviewDevice(device.id)}
                          className={`p-2 rounded-md transition-colors ${
                            previewDevice === device.id
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                          }`}
                          title={device.label}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setShowFullscreenPreview(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* First Page Crawl Status Banner - Fullscreen */}
            {firstPageStatus && firstPageStatus.status !== 'ready' && (
              <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
                <div className="max-w-7xl mx-auto">
                  {firstPageStatus.status === 'pending' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-200">Preparing chat preview...</p>
                          <p className="text-xs text-yellow-200/70 mt-0.5">Setting up your homepage content for instant testing</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {firstPageStatus.status === 'processing' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-200">
                            Processing homepage... ({firstPageStatus.estimated_time || '~10-15 seconds'})
                          </p>
                          <p className="text-xs text-blue-200/70 mt-0.5">Extracting and indexing content for chat functionality</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {firstPageStatus.status === 'retrying' && firstPageStatus.retry_info && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-200">
                            Retry {firstPageStatus.retry_info.current_attempt}/{firstPageStatus.retry_info.max_attempts} in {firstPageStatus.retry_info.seconds_until_retry}s
                          </p>
                          <p className="text-xs text-orange-200/70 mt-0.5">
                            {firstPageStatus.retry_info.error_message || 'Temporary issue, retrying automatically...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {firstPageStatus.status === 'failed' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-200">Setup failed after {firstPageStatus.failure_info?.total_attempts || 3} attempts</p>
                          <p className="text-xs text-red-200/70 mt-0.5">
                            {firstPageStatus.failure_info?.last_error || 'Please try again or contact support'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              <div className={`
                ${
                  previewDevice === 'desktop' ? 'w-full h-full' :
                  previewDevice === 'tablet' ? 'w-[768px] h-[1024px]' :
                  'w-[375px] h-[667px]'
                }
                bg-white rounded-lg relative overflow-hidden shadow-2xl
              `}>
                {/* Mock Website Header */}
                <div className="bg-gray-800 h-10 px-4 flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="ml-3 text-white text-sm">{selectedWebsite?.domain || 'yourwebsite.com'}</div>
                </div>

                {/* Website Content - Priority: Screenshot > Iframe > Fallback */}
                <div className="relative h-[calc(100%-40px)]">
                  {selectedWebsite?.screenshot_url ? (
                    // Show screenshot if available (primary)
                    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
                      <img
                        src={selectedWebsite.screenshot_url}
                        alt={`Screenshot of ${selectedWebsite.domain}`}
                        className="w-full object-cover object-top"
                      />
                    </div>
                  ) : selectedWebsite?.url ? (
                    // Try iframe if no screenshot (secondary)
                    <>
                      {fullscreenIframeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <div className="text-gray-600">Loading website...</div>
                          </div>
                        </div>
                      )}
                      {!fullscreenIframeError ? (
                        <iframe
                          key={selectedWebsite.url}
                          src={selectedWebsite.url}
                          className="w-full h-full border-0"
                          style={{ pointerEvents: 'auto' }}
                          onLoad={(e) => {
                            console.log('Fullscreen iframe loaded successfully', e.currentTarget.src);
                            fullscreenIframeLoadedRef.current = true;
                            if (fullscreenIframeTimeoutRef.current) {
                              clearTimeout(fullscreenIframeTimeoutRef.current);
                              fullscreenIframeTimeoutRef.current = null;
                            }
                            setFullscreenIframeLoading(false);
                            setFullscreenIframeError(false);
                          }}
                          onError={(e) => {
                            console.error('Fullscreen iframe failed to load:', e.currentTarget.src);
                            if (fullscreenIframeTimeoutRef.current) {
                              clearTimeout(fullscreenIframeTimeoutRef.current);
                              fullscreenIframeTimeoutRef.current = null;
                            }
                            setFullscreenIframeError(true);
                            setFullscreenIframeLoading(false);
                          }}
                          title="Website Preview Fullscreen"
                        />
                      ) : (
                        // Show fallback if iframe failed and no screenshot
                        <div className="p-8 h-full overflow-auto">
                          <div className="mt-6 bg-blue-50 border border-blue-300 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-blue-900 mb-2">Preview Not Available</div>
                                <div className="text-sm text-blue-800 leading-relaxed">
                                  This website blocks iframe embedding for security reasons. This is common for sites like ChatGPT, online banking, and many corporate websites. Rest assured, your chat widget will work perfectly when you install it on your actual website.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Default fallback - no website selected
                    <div className="p-8 h-full overflow-auto">
                      <div className="font-bold text-gray-900 text-3xl mb-4">Your Website</div>
                      <div className="text-gray-600 text-lg mb-6">This is how your chat widget will appear to visitors</div>
                      <div className="space-y-3">
                        <div className="bg-gray-200 rounded h-6 w-3/4"></div>
                        <div className="bg-gray-200 rounded h-6 w-1/2"></div>
                        <div className="bg-gray-200 rounded h-6 w-2/3"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Widget Preview */}
                <div className="absolute" style={{
                  ...{
                    'bottom-right': { bottom: '20px', right: '20px' },
                    'bottom-left': { bottom: '20px', left: '20px' },
                    'top-right': { top: '60px', right: '20px' },
                    'top-left': { top: '60px', left: '20px' }
                  }[config.widget_position]
                }}>
                  {/* Chat Interface - Toggleable */}
                  {previewChatOpen && (
                    <div
                      className="bg-white rounded-lg shadow-2xl border-2 mb-3 absolute z-10 transition-all duration-300"
                      style={{
                        width: '360px',
                        height: '520px',
                        borderColor: config.widget_color,
                        borderRadius: config.border_radius + 'px',
                        ...{
                          'bottom-right': { bottom: '80px', right: '0' },
                          'bottom-left': { bottom: '80px', left: '0' },
                          'top-right': { top: '80px', right: '0' },
                          'top-left': { top: '80px', left: '0' }
                        }[config.widget_position]
                      }}
                    >
                      {/* Chat Header */}
                      <div
                        className="flex items-center justify-between text-white p-4"
                        style={{
                          backgroundColor: config.widget_color,
                          borderTopLeftRadius: config.border_radius + 'px',
                          borderTopRightRadius: config.border_radius + 'px'
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">💬</div>
                          <div>
                            <div className="font-semibold">Support Chat</div>
                            <div className="text-sm opacity-80">Online now</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewChatOpen(false)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Chat Messages */}
                      <div ref={fullscreenMessagesContainerRef} className="p-4 space-y-3 overflow-y-auto" style={{ height: '380px' }}>
                        {previewMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex items-start space-x-2 ${
                              msg.type === 'user' ? 'justify-end' : ''
                            }`}
                          >
                            {msg.type === 'assistant' && (
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-xs">👤</div>
                            )}
                            <div
                              className={`rounded-lg px-3 py-2 max-w-xs ${
                                msg.type === 'assistant'
                                  ? 'bg-gray-100'
                                  : 'text-white'
                              }`}
                              style={msg.type === 'user' ? { backgroundColor: config.widget_color } : {}}
                            >
                              <div className={`text-sm ${
                                msg.type === 'assistant' ? 'text-gray-800' : 'text-white'
                              }`}>{msg.content}</div>
                            </div>
                          </div>
                        ))}
                        {isPreviewTyping && (
                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-xs">👤</div>
                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input */}
                      <div className="border-t border-gray-200 p-3">
                        <form onSubmit={handlePreviewSendMessage} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder={isPreviewTyping ? "AI is typing..." : (config.placeholder_text || "Type your message...")}
                            value={previewInputValue}
                            onChange={(e) => setPreviewInputValue(e.target.value)}
                            onKeyPress={handlePreviewKeyPress}
                            disabled={isPreviewTyping || !selectedWebsite}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm min-w-0 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="submit"
                            disabled={!previewInputValue.trim() || isPreviewTyping || !selectedWebsite}
                            className="text-white rounded px-4 py-2 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            style={{ backgroundColor: config.widget_color }}
                          >
                            {isPreviewTyping ? '...' : 'Send'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Chat Button */}
                  <button
                    onClick={() => setPreviewChatOpen(!previewChatOpen)}
                    className="rounded-full shadow-lg cursor-pointer flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 focus:outline-none"
                    style={{
                      width: config.widget_size === 'small' ? '60px' : config.widget_size === 'large' ? '80px' : '70px',
                      height: config.widget_size === 'small' ? '60px' : config.widget_size === 'large' ? '80px' : '70px',
                      fontSize: '24px',
                      backgroundColor: config.widget_color,
                      borderRadius: config.border_radius + 'px'
                    }}
                  >
                    💬
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Padding */}
      <div className="h-16 bg-gray-900"></div>
    </div>
  );
};

export default ScriptGenerator;