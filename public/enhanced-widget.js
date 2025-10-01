/**
 * Enhanced LiteChat Widget with Real-time Configuration Updates
 * This widget supports dynamic configuration loading and real-time updates
 */

(function(window, document) {
  'use strict';

  // Widget configuration and state
  let widgetConfig = null;
  let widgetElement = null;
  let configClient = null;
  let styleInjector = null;
  let isVisible = false;
  let messageQueue = [];
  let connectionStatus = 'connecting';

  // Default configuration
  const defaultConfig = {
    appearance: {
      primaryColor: '#0066CC',
      theme: 'light',
      borderRadius: 12,
      position: 'bottom-right',
      size: 'medium'
    },
    messages: {
      welcomeMessage: 'Hi! How can I help you today?',
      placeholder: 'Type your message...',
      offlineMessage: 'We\'re currently offline. We\'ll get back to you soon!',
      title: 'Chat Support'
    },
    behavior: {
      showAvatar: true,
      soundEnabled: true,
      typingIndicator: true,
      quickReplies: ['Help', 'Contact Support', 'Pricing', 'Features']
    }
  };

  // Utility functions
  function getWidgetId() {
    const script = document.querySelector('script[data-widget-id]');
    if (script) {
      return script.getAttribute('data-widget-id');
    }
    
    // Fallback: try to extract from script src or configuration
    const scripts = document.querySelectorAll('script[src*="widget"], script[src*="litechat"]');
    for (let script of scripts) {
      const src = script.src;
      const match = src.match(/widget[_-]?id=([^&]+)/);
      if (match) {
        return match[1];
      }
    }
    
    return 'default'; // Ultimate fallback
  }

  function detectBaseUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src.includes('widget.js') || src.includes('litechat')) {
        try {
          const url = new URL(src);
          return `${url.protocol}//${url.host}`;
        } catch (e) {
          continue;
        }
      }
    }
    return 'http://localhost:8001'; // Development fallback
  }

  function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    for (let [key, value] of Object.entries(attributes)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(element.dataset, value);
      } else {
        element.setAttribute(key, value);
      }
    }
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  }

  function generateId() {
    return 'litechat-' + Math.random().toString(36).substr(2, 9);
  }

  // Configuration client implementation
  class WidgetConfigClient {
    constructor(widgetId, baseUrl) {
      this.widgetId = widgetId;
      this.baseUrl = baseUrl;
      this.currentVersion = null;
      this.pollingInterval = null;
      this.isPolling = false;
      this.retryCount = 0;
      this.maxRetries = 5;
      this.pollIntervalMs = 30000; // 30 seconds
      
      this.loadFromCache();
    }

    loadFromCache() {
      try {
        const cached = localStorage.getItem(`widget_config_${this.widgetId}`);
        if (cached) {
          const cachedConfig = JSON.parse(cached);
          this.currentVersion = cachedConfig.version;
          return cachedConfig;
        }
      } catch (error) {
      }
      return null;
    }

    saveToCache(config) {
      try {
        localStorage.setItem(`widget_config_${this.widgetId}`, JSON.stringify(config));
      } catch (error) {
      }
    }

    async fetchConfiguration(useCache = true) {
      try {
        const url = `${this.baseUrl}/api/v1/customization/widget/${this.widgetId}/config`;
        const params = new URLSearchParams();
        
        if (this.currentVersion && useCache) {
          params.set('version', this.currentVersion);
        }
        
        const fullUrl = params.toString() ? `${url}?${params}` : url;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const config = await response.json();
        
        if (!config.cached) {
          this.currentVersion = config.version;
          this.saveToCache(config);
        }

        this.retryCount = 0;
        updateConnectionStatus('connected');
        
        return config;

      } catch (error) {
        updateConnectionStatus('error');

        // Try to return cached config on error
        const cached = this.loadFromCache();
        if (cached) {
          return cached;
        }

        throw error;
      }
    }

    startPolling() {
      if (this.isPolling) return;
      
      this.isPolling = true;
      
      const poll = async () => {
        try {
          const config = await this.fetchConfiguration();

          if (this.currentVersion !== config.version) {
            updateWidgetConfiguration(config);
          }

        } catch (error) {
          this.retryCount++;

          if (this.retryCount >= this.maxRetries) {
            this.stopPolling();
            updateConnectionStatus('failed');
            return;
          }
        }
        
        if (this.isPolling) {
          this.pollingInterval = setTimeout(poll, this.pollIntervalMs);
        }
      };

      poll();
    }

    stopPolling() {
      this.isPolling = false;
      if (this.pollingInterval) {
        clearTimeout(this.pollingInterval);
        this.pollingInterval = null;
      }
    }

    async refresh() {
      return this.fetchConfiguration(false);
    }

    destroy() {
      this.stopPolling();
    }
  }

  // Style injection implementation
  class StyleInjector {
    constructor(widgetId) {
      this.widgetId = widgetId;
      this.styleElement = null;
    }

    injectStyles(config) {
      if (!config.config) return;

      this.removeStyles();
      
      this.styleElement = document.createElement('style');
      this.styleElement.id = `litechat-widget-styles-${this.widgetId}`;
      this.styleElement.textContent = this.generateCSS(config.config);
      
      document.head.appendChild(this.styleElement);
    }

    generateCSS(config) {
      const { appearance } = config;
      const widgetSelector = `[data-widget-id="${this.widgetId}"]`;
      
      return `
        ${widgetSelector} {
          --primary-color: ${appearance.primaryColor};
          --border-radius: ${appearance.borderRadius}px;
          --text-color: ${appearance.theme === 'dark' ? '#fff' : '#333'};
          --bg-color: ${appearance.theme === 'dark' ? '#1f2937' : '#ffffff'};
          --border-color: ${appearance.theme === 'dark' ? '#374151' : '#e5e7eb'};
        }
        
        ${widgetSelector} .litechat-widget-button {
          background-color: var(--primary-color);
          border-radius: ${appearance.borderRadius > 20 ? '50%' : 'var(--border-radius)'};
          width: ${this.getSizePixels(appearance.size)};
          height: ${this.getSizePixels(appearance.size)};
          position: fixed;
          ${this.getPositionCSS(appearance.position)}
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 999999;
          transition: all 0.3s ease;
        }
        
        ${widgetSelector} .litechat-widget-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        
        ${widgetSelector} .litechat-widget-container {
          position: fixed;
          ${this.getPositionCSS(appearance.position)}
          width: ${this.getContainerWidth(appearance.size)};
          height: ${this.getContainerHeight(appearance.size)};
          background-color: var(--bg-color);
          border-radius: var(--border-radius);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 999998;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        ${widgetSelector} .litechat-widget-header {
          background-color: var(--primary-color);
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        ${widgetSelector} .litechat-widget-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        ${widgetSelector} .litechat-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        ${widgetSelector} .litechat-message-bubble {
          padding: 8px 12px;
          border-radius: 16px;
          max-width: 80%;
          font-size: 14px;
          line-height: 1.4;
        }
        
        ${widgetSelector} .litechat-message.bot .litechat-message-bubble {
          background-color: ${appearance.theme === 'dark' ? '#374151' : '#f3f4f6'};
          color: var(--text-color);
        }
        
        ${widgetSelector} .litechat-message.user .litechat-message-bubble {
          background-color: var(--primary-color);
          color: white;
          margin-left: auto;
        }
        
        ${widgetSelector} .litechat-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        
        ${widgetSelector} .litechat-quick-reply {
          padding: 6px 12px;
          border: 1px solid var(--primary-color);
          background: transparent;
          color: var(--primary-color);
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        ${widgetSelector} .litechat-quick-reply:hover {
          background-color: var(--primary-color);
          color: white;
        }
        
        ${widgetSelector} .litechat-widget-input {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        ${widgetSelector} .litechat-input-field {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-size: 14px;
          background-color: ${appearance.theme === 'dark' ? '#374151' : '#ffffff'};
          color: var(--text-color);
          outline: none;
        }
        
        ${widgetSelector} .litechat-send-button {
          padding: 8px 12px;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          transition: opacity 0.2s ease;
        }
        
        ${widgetSelector} .litechat-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        ${widgetSelector} .litechat-close-button {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        ${widgetSelector} .litechat-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        ${widgetSelector} .litechat-connection-status {
          font-size: 10px;
          opacity: 0.8;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          ${widgetSelector} .litechat-widget-container {
            width: calc(100vw - 40px) !important;
            height: calc(100vh - 40px) !important;
            bottom: 20px !important;
            right: 20px !important;
            left: 20px !important;
            top: 20px !important;
          }
        }
        
        /* Animation keyframes */
        @keyframes litechat-fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        ${widgetSelector} .litechat-widget-container {
          animation: litechat-fade-in 0.3s ease;
        }
      `;
    }

    getSizePixels(size) {
      const sizes = {
        small: '48px',
        medium: '56px',
        large: '64px'
      };
      return sizes[size] || sizes.medium;
    }

    getContainerWidth(size) {
      const widths = {
        small: '320px',
        medium: '380px',
        large: '420px'
      };
      return widths[size] || widths.medium;
    }

    getContainerHeight(size) {
      const heights = {
        small: '450px',
        medium: '520px',
        large: '600px'
      };
      return heights[size] || heights.medium;
    }

    getPositionCSS(position) {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;'
      };
      return positions[position] || positions['bottom-right'];
    }

    removeStyles() {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
        this.styleElement = null;
      }
    }

    destroy() {
      this.removeStyles();
    }
  }

  // Widget functionality
  function updateConnectionStatus(status) {
    connectionStatus = status;
    const statusElement = document.querySelector('[data-widget-id] .litechat-connection-status');
    if (statusElement) {
      const statusText = {
        connecting: 'Connecting...',
        connected: 'Online',
        error: 'Connection issues',
        failed: 'Offline'
      };
      statusElement.textContent = statusText[status] || 'Unknown';
    }
  }

  function updateWidgetConfiguration(newConfig) {
    widgetConfig = newConfig;
    
    // Update styles
    if (styleInjector) {
      styleInjector.injectStyles(newConfig);
    }
    
    // Update widget content
    updateWidgetContent();
    
    // Trigger custom event for external integrations
    window.dispatchEvent(new CustomEvent('litechat:configUpdated', {
      detail: { config: newConfig }
    }));
  }

  function updateWidgetContent() {
    if (!widgetElement || !widgetConfig) return;

    const { messages, behavior, appearance } = widgetConfig.config;
    
    // Update header
    const titleElement = widgetElement.querySelector('.litechat-widget-title');
    if (titleElement) {
      titleElement.textContent = messages.title;
    }
    
    // Update welcome message
    const welcomeElement = widgetElement.querySelector('.litechat-welcome-message');
    if (welcomeElement) {
      welcomeElement.textContent = messages.welcomeMessage;
    }
    
    // Update input placeholder
    const inputElement = widgetElement.querySelector('.litechat-input-field');
    if (inputElement) {
      inputElement.placeholder = messages.placeholder;
    }
    
    // Update quick replies
    updateQuickReplies(behavior.quickReplies);
    
    // Update avatar visibility
    const avatarElements = widgetElement.querySelectorAll('.litechat-avatar');
    avatarElements.forEach(avatar => {
      avatar.style.display = behavior.showAvatar ? 'flex' : 'none';
    });
  }

  function updateQuickReplies(quickReplies) {
    if (!quickReplies || !Array.isArray(quickReplies)) return;
    
    const quickRepliesContainer = widgetElement.querySelector('.litechat-quick-replies');
    if (!quickRepliesContainer) return;
    
    // Clear existing quick replies
    quickRepliesContainer.innerHTML = '';
    
    // Add new quick replies
    quickReplies.forEach(reply => {
      const button = createElement('button', {
        class: 'litechat-quick-reply',
        'data-reply': reply
      }, [reply]);
      
      button.addEventListener('click', () => {
        handleQuickReply(reply);
      });
      
      quickRepliesContainer.appendChild(button);
    });
  }

  function handleQuickReply(reply) {
    // Add user message
    addMessage(reply, 'user');
    
    // Simulate bot response (in real implementation, this would call the API)
    setTimeout(() => {
      addMessage(`Thanks for your question about "${reply}". How can I help you further?`, 'bot');
    }, 1000);
  }

  function addMessage(text, sender) {
    if (!widgetElement) return;
    
    const messagesContainer = widgetElement.querySelector('.litechat-widget-messages');
    if (!messagesContainer) return;
    
    const messageElement = createElement('div', {
      class: `litechat-message ${sender}`
    });
    
    if (sender === 'bot' && widgetConfig?.config.behavior.showAvatar) {
      const avatar = createElement('div', {
        class: 'litechat-avatar'
      }, ['AI']);
      messageElement.appendChild(avatar);
    }
    
    const bubble = createElement('div', {
      class: 'litechat-message-bubble'
    }, [text]);
    
    messageElement.appendChild(bubble);
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function createWidgetHTML() {
    if (!widgetConfig) return null;

    const { messages, behavior, appearance } = widgetConfig.config;
    const widgetId = configClient.widgetId;

    return createElement('div', {
      'data-widget-id': widgetId,
      class: `litechat-widget-wrapper widget-${appearance.position} widget-size-${appearance.size}`,
      style: {
        position: 'fixed',
        zIndex: '999999'
      }
    }, [
      // Widget button
      createElement('button', {
        class: 'litechat-widget-button',
        'aria-label': 'Open chat',
        style: { display: isVisible ? 'none' : 'flex' }
      }, [
        createElement('svg', {
          width: '24',
          height: '24',
          viewBox: '0 0 24 24',
          fill: 'currentColor'
        }, [
          createElement('path', {
            d: 'M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'
          })
        ])
      ]),
      
      // Widget container
      createElement('div', {
        class: 'litechat-widget-container',
        style: { display: isVisible ? 'flex' : 'none' }
      }, [
        // Header
        createElement('div', {
          class: 'litechat-widget-header'
        }, [
          createElement('div', {
            style: { display: 'flex', alignItems: 'center', gap: '8px' }
          }, [
            behavior.showAvatar ? createElement('div', {
              class: 'litechat-avatar'
            }, ['AI']) : null,
            createElement('div', {}, [
              createElement('div', {
                class: 'litechat-widget-title',
                style: { fontWeight: 'bold', fontSize: '14px' }
              }, [messages.title]),
              createElement('div', {
                class: 'litechat-connection-status',
                style: { fontSize: '10px', opacity: '0.8' }
              }, ['Online'])
            ])
          ].filter(Boolean)),
          createElement('button', {
            class: 'litechat-close-button',
            'aria-label': 'Close chat'
          }, ['×'])
        ]),
        
        // Messages
        createElement('div', {
          class: 'litechat-widget-messages'
        }, [
          createElement('div', {
            class: 'litechat-message bot'
          }, [
            behavior.showAvatar ? createElement('div', {
              class: 'litechat-avatar'
            }, ['AI']) : null,
            createElement('div', {
              class: 'litechat-message-bubble litechat-welcome-message'
            }, [messages.welcomeMessage])
          ].filter(Boolean)),
          
          // Quick replies container
          createElement('div', {
            class: 'litechat-quick-replies'
          })
        ]),
        
        // Input
        createElement('div', {
          class: 'litechat-widget-input'
        }, [
          createElement('input', {
            class: 'litechat-input-field',
            type: 'text',
            placeholder: messages.placeholder
          }),
          createElement('button', {
            class: 'litechat-send-button'
          }, ['Send'])
        ])
      ])
    ]);
  }

  function attachEventListeners() {
    if (!widgetElement) return;

    // Toggle widget visibility
    const button = widgetElement.querySelector('.litechat-widget-button');
    const closeButton = widgetElement.querySelector('.litechat-close-button');
    
    if (button) {
      button.addEventListener('click', () => {
        showWidget();
      });
    }
    
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        hideWidget();
      });
    }
    
    // Handle message input
    const input = widgetElement.querySelector('.litechat-input-field');
    const sendButton = widgetElement.querySelector('.litechat-send-button');
    
    if (input && sendButton) {
      const sendMessage = () => {
        const message = input.value.trim();
        if (message) {
          addMessage(message, 'user');
          input.value = '';
          
          // Simulate bot response
          setTimeout(() => {
            addMessage('Thanks for your message! Our team will get back to you soon.', 'bot');
          }, 1000);
        }
      };
      
      sendButton.addEventListener('click', sendMessage);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }

  function showWidget() {
    isVisible = true;
    if (widgetElement) {
      const button = widgetElement.querySelector('.litechat-widget-button');
      const container = widgetElement.querySelector('.litechat-widget-container');
      
      if (button) button.style.display = 'none';
      if (container) container.style.display = 'flex';
    }
  }

  function hideWidget() {
    isVisible = false;
    if (widgetElement) {
      const button = widgetElement.querySelector('.litechat-widget-button');
      const container = widgetElement.querySelector('.litechat-widget-container');
      
      if (button) button.style.display = 'flex';
      if (container) container.style.display = 'none';
    }
  }

  // Main initialization
  async function initializeWidget() {
    try {
      const widgetId = getWidgetId();
      const baseUrl = detectBaseUrl();

      // Initialize configuration client
      configClient = new WidgetConfigClient(widgetId, baseUrl);
      styleInjector = new StyleInjector(widgetId);
      
      // Try to load cached configuration first
      let cachedConfig = configClient.loadFromCache();
      if (cachedConfig) {
        widgetConfig = cachedConfig;
        renderWidget();
      }
      
      // Fetch latest configuration
      try {
        const latestConfig = await configClient.fetchConfiguration();
        if (JSON.stringify(latestConfig) !== JSON.stringify(cachedConfig)) {
          updateWidgetConfiguration(latestConfig);
        }
      } catch (error) {
        if (!widgetConfig) {
          widgetConfig = {
            widget_id: widgetId,
            config: defaultConfig,
            version: 'default',
            cached: false
          };
          renderWidget();
        }
      }
      
      // Start polling for updates
      configClient.startPolling();

    } catch (error) {
      // Fallback to default configuration
      const widgetId = getWidgetId();
      widgetConfig = {
        widget_id: widgetId,
        config: defaultConfig,
        version: 'default',
        cached: false
      };
      renderWidget();
    }
  }

  function renderWidget() {
    if (!widgetConfig) return;
    
    // Remove existing widget
    const existing = document.querySelector(`[data-widget-id="${configClient.widgetId}"]`);
    if (existing) {
      existing.remove();
    }
    
    // Create new widget
    widgetElement = createWidgetHTML();
    if (!widgetElement) return;
    
    // Inject styles
    styleInjector.injectStyles(widgetConfig);
    
    // Add to page
    document.body.appendChild(widgetElement);
    
    // Attach event listeners
    attachEventListeners();
    
    // Update quick replies
    updateQuickReplies(widgetConfig.config.behavior.quickReplies);
  }

  // Public API
  window.LiteChat = {
    show: showWidget,
    hide: hideWidget,
    refresh: () => configClient?.refresh(),
    getConfig: () => widgetConfig,
    destroy: () => {
      if (configClient) configClient.destroy();
      if (styleInjector) styleInjector.destroy();
      if (widgetElement) widgetElement.remove();
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

})(window, document);