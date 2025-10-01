import React from 'react';
import { config } from '../config/env';

const WidgetTest: React.FC = () => {
  const widgetFrontendUrl = config.widget.frontendUrl;
  const testUrl = `${widgetFrontendUrl}/?id=test_widget_123&mode=embedded&theme=auto`;

  React.useEffect(() => {
    // Redirect to widget frontend after a short delay
    const timer = setTimeout(() => {
      window.open(testUrl, '_blank');
    }, 2000);

    return () => clearTimeout(timer);
  }, [testUrl]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Widget Test Page
          </h1>
          <p className="text-gray-600 mb-6">
            The widget functionality has been moved to a separate frontend for better isolation.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-blue-800 font-medium">
              Redirecting to widget frontend in 2 seconds...
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Open Widget Test (New Window)
            </a>

            <div className="text-sm text-gray-500">
              <p className="mb-2">Widget Frontend URL:</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {widgetFrontendUrl}
              </code>
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-2">Test Widget URL:</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                {testUrl}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetTest;