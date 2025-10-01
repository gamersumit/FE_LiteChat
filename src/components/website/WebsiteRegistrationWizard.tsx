import React, { useState } from 'react';
import { Globe, Settings, CheckCircle, ArrowLeft, ArrowRight, Loader2, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store';
import { createWebsite } from '../../store/dashboardSlice';
import { showSuccessToast, showErrorToast } from '../../store/notificationSlice';
import { config } from '../../config/env';

interface WebsiteData {
  name: string;
  url: string;
  domain: string;
  description: string;
  category: string;
  scrapingFrequency: string;
  maxPages: number;
  features: string[];
}

const categories = [
  'E-commerce',
  'Blog',
  'Corporate',
  'Portfolio',
  'Documentation',
  'News',
  'Educational',
  'Healthcare',
  'Technology',
  'Other'
];

const scrapingFrequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual only' }
];

const availableFeatures = [
  'FAQ Detection',
  'Contact Form Integration',
  'Product Search',
  'Order Status Check',
  'Support Ticket Creation',
  'Knowledge Base Search',
  'Live Chat Handoff',
  'Multilingual Support'
];

interface WebsiteRegistrationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const WebsiteRegistrationWizard: React.FC<WebsiteRegistrationModalProps> = ({
  isOpen = true,
  onClose = () => {},
  onSuccess
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect to dashboard on F5 refresh if modal is open
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      // Store flag to redirect after refresh
      sessionStorage.setItem('modal_was_open', 'registration');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Check if we just refreshed from a modal
    const wasModalOpen = sessionStorage.getItem('modal_was_open');
    if (wasModalOpen === 'registration') {
      sessionStorage.removeItem('modal_was_open');
      navigate('/dashboard');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);
  
  const [websiteData, setWebsiteData] = useState<WebsiteData>({
    name: '',
    url: '',
    domain: '',
    description: '',
    category: '',
    scrapingFrequency: 'weekly',
    maxPages: config.defaults.maxPages,
    features: []
  });

  const steps = [
    {
      id: 1,
      title: 'Website Details',
      description: 'Basic information about your website',
      icon: Globe
    },
    {
      id: 2,
      title: 'Scraping Settings',
      description: 'Configure how we analyze your content',
      icon: Settings
    },
    {
      id: 3,
      title: 'Review & Deploy',
      description: 'Confirm settings and create your website',
      icon: CheckCircle
    }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!websiteData.name.trim()) newErrors.name = 'Website name is required';
      if (!websiteData.url.trim()) newErrors.url = 'Website URL is required';
      if (!websiteData.url.match(/^https?:\/\/.+/)) newErrors.url = 'Please enter a valid URL';
      if (!websiteData.category) newErrors.category = 'Please select a category';
    }

    if (step === 2) {
      if (!websiteData.scrapingFrequency) newErrors.scrapingFrequency = 'Please select scraping frequency';
      if (websiteData.maxPages < 1 || websiteData.maxPages > 10000) {
        newErrors.maxPages = 'Max pages must be between 1 and 10,000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      // Use Redux action to create website and update state
      const result = await dispatch(createWebsite(websiteData)).unwrap();

      // Show success notification
      dispatch(showSuccessToast(
        'Website registered successfully!',
        'Your chatbot is being set up and will be available shortly.'
      ));

      // Call success callback and close modal
      onSuccess?.();
      onClose();

      // Redirect to dashboard after successful creation
      navigate('/dashboard');

    } catch (error) {
      let errorMessage = 'Failed to create website. Please try again.';

      // Handle different error types
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }

      // Handle specific 409 error for duplicate URL
      if (errorMessage.includes('409') || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        errorMessage = 'This website URL is already registered. Please use a different URL.';
      }

      // Only show error in the modal, not as a toast to avoid multiple popups
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const updateWebsiteData = (field: keyof WebsiteData, value: any) => {
    const updates: Partial<WebsiteData> = { [field]: value };

    // Extract domain from URL when URL is updated
    if (field === 'url' && value) {
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        updates.domain = url.hostname;
      } catch {
        // Invalid URL, clear domain
        updates.domain = '';
      }
    }

    setWebsiteData(prev => ({ ...prev, ...updates }));
    // Clear any existing error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleFeature = (feature: string) => {
    setWebsiteData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          Website Name
        </label>
        <input
          type="text"
          id="name"
          className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-600 text-gray-100 placeholder-gray-400 ${
            errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-500 hover:border-gray-400'
          }`}
          placeholder="e.g., TechCorp Solutions, My Restaurant"
          value={websiteData.name}
          onChange={(e) => updateWebsiteData('name', e.target.value)}
        />
        {errors.name && <p className="mt-2 text-sm text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
          Website URL
        </label>
        <input
          type="url"
          id="url"
          className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-600 text-gray-100 placeholder-gray-400 ${
            errors.url ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-500 hover:border-gray-400'
          }`}
          placeholder="https://your-website.com"
          value={websiteData.url}
          onChange={(e) => updateWebsiteData('url', e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">We'll automatically crawl this to learn about your business</p>
        {errors.url && <p className="mt-2 text-sm text-red-400">{errors.url}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
          Business Category
        </label>
        <select
          id="category"
          className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-600 text-gray-100 ${
            errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-500 hover:border-gray-400'
          }`}
          value={websiteData.category}
          onChange={(e) => updateWebsiteData('category', e.target.value)}
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        {errors.category && <p className="mt-2 text-sm text-red-400">{errors.category}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Business Description <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-600 text-gray-100 placeholder-gray-400 hover:border-gray-400"
          placeholder="Brief description of your business to help the AI provide better responses..."
          value={websiteData.description}
          onChange={(e) => updateWebsiteData('description', e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">This helps create more accurate and relevant responses</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Update Frequency
        </label>
        <div className="space-y-3">
          {scrapingFrequencies.map(freq => (
            <div key={freq.value} className="flex items-center p-3 bg-gray-600 rounded-lg border border-gray-500 hover:border-gray-400 transition-all duration-200">
              <input
                id={`freq-${freq.value}`}
                name="scrapingFrequency"
                type="radio"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 bg-gray-600"
                value={freq.value}
                checked={websiteData.scrapingFrequency === freq.value}
                onChange={(e) => updateWebsiteData('scrapingFrequency', e.target.value)}
              />
              <label htmlFor={`freq-${freq.value}`} className="ml-3 block text-sm text-gray-200 font-medium">
                {freq.label}
                <span className="block text-xs text-gray-400 font-normal">
                  {freq.value === 'daily' && 'Best for dynamic content (news, products, etc.)'}
                  {freq.value === 'weekly' && 'Recommended for most businesses'}
                  {freq.value === 'monthly' && 'Good for static websites'}
                  {freq.value === 'manual' && 'Manual control over updates'}
                </span>
              </label>
            </div>
          ))}
        </div>
        {errors.scrapingFrequency && <p className="mt-2 text-sm text-red-400">{errors.scrapingFrequency}</p>}
      </div>

      <div>
        <label htmlFor="maxPages" className="block text-sm font-medium text-gray-300 mb-2">
          Maximum Pages to Crawl
        </label>
        <input
          type="number"
          id="maxPages"
          min="1"
          max="10000"
          className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-600 text-gray-100 placeholder-gray-400 ${
            errors.maxPages ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-500 hover:border-gray-400'
          }`}
          value={websiteData.maxPages}
          onChange={(e) => updateWebsiteData('maxPages', parseInt(e.target.value))}
        />
        <p className="mt-1 text-xs text-gray-400">
          Recommended: 100-500 pages for optimal performance
        </p>
        {errors.maxPages && <p className="mt-2 text-sm text-red-400">{errors.maxPages}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Advanced Features <span className="text-gray-500">(optional)</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableFeatures.map(feature => (
            <div key={feature} className={`flex items-center p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
              websiteData.features.includes(feature)
                ? 'bg-indigo-600 border-indigo-500 shadow-lg'
                : 'bg-gray-600 border-gray-500 hover:border-gray-400'
            }`} onClick={() => toggleFeature(feature)}>
              <input
                id={`feature-${feature}`}
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 bg-gray-600 rounded"
                checked={websiteData.features.includes(feature)}
                onChange={() => toggleFeature(feature)}
              />
              <label htmlFor={`feature-${feature}`} className={`ml-3 block text-sm font-medium cursor-pointer ${
                websiteData.features.includes(feature) ? 'text-white' : 'text-gray-200'
              }`}>
                {feature}
              </label>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          You can start with basic features and add more later
        </p>
      </div>
    </div>
  );


  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-green-600 border border-green-500 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Ready to Deploy</h3>
            <p className="text-green-100">
              Review your configuration and create your chatbot
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-600 border border-gray-500 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-gray-200 text-lg flex items-center">
          <Globe className="w-5 h-5 mr-2 text-indigo-400" />
          Configuration Summary
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-300">Name:</span>
              <span className="text-sm text-gray-100 font-semibold">{websiteData.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-300">URL:</span>
              <span className="text-sm text-gray-100 font-mono truncate ml-2">{websiteData.url}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-300">Category:</span>
              <span className="text-sm text-gray-100 font-semibold">{websiteData.category}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-300">Updates:</span>
              <span className="text-sm text-gray-100 font-semibold capitalize">{websiteData.scrapingFrequency}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-300">Max Pages:</span>
              <span className="text-sm text-gray-100 font-semibold">{websiteData.maxPages.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {websiteData.features.length > 0 && (
        <div className="bg-gray-600 border border-gray-500 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-200 text-lg flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-400" />
            Selected Features
          </h4>
          <div className="flex flex-wrap gap-2">
            {websiteData.features.map(feature => (
              <span
                key={feature}
                className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-600 border border-red-500 rounded-lg p-4">
          <p className="text-sm text-red-100">
            {errors.submit}
          </p>
        </div>
      )}
    </div>
  );

  const currentStepData = steps.find(step => step.id === currentStep);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Add New Website</h2>
              <p className="text-sm text-gray-400">Set up your AI chatbot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-600 text-white shadow-lg'
                        : isActive
                        ? 'border-indigo-500 text-indigo-400 bg-gray-700 shadow-lg'
                        : 'border-gray-600 text-gray-500 bg-gray-700'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <div className={`text-sm font-medium transition-colors ${
                        isActive ? 'text-indigo-400' : isCompleted ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 ml-4 h-0.5 transition-colors ${
                        isCompleted ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-700 rounded-xl px-6 py-8 shadow-inner">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-100 mb-2">{currentStepData?.title}</h3>
              <p className="text-gray-400">{currentStepData?.description}</p>
            </div>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

            {/* Navigation */}
            <div className="mt-8 flex justify-between items-center">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center px-6 py-3 border-2 border-gray-600 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Website...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Website
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteRegistrationWizard;