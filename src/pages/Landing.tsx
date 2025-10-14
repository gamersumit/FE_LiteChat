import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Zap,
  Shield,
  BarChart3,
  Globe,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Code,
  Users,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/centralizedApi';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [testUrl, setTestUrl] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleTestWebsite = async () => {
    const urlValue = testUrl.trim();
    if (!urlValue) return;

    // Basic URL validation
    if (!urlValue.startsWith('http://') && !urlValue.startsWith('https://')) {
      setTestError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsTestLoading(true);
    setTestError(null);

    try {
      // Call the real demo API
      const response = await apiService.initiateDemoCrawl(urlValue);

      if (response.success && response.data) {
        // Navigate to the demo page
        navigate(`/demo/${response.data.demo_id}`);
      } else {
        setTestError(response.message || 'Failed to initiate demo. Please try again.');
      }
    } catch (error) {
      console.error('Error initiating demo:', error);
      setTestError('An error occurred. Please check the URL and try again.');
    } finally {
      setIsTestLoading(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast Setup',
      description: 'Get your AI chatbot up and running in minutes. Just add a simple script tag to your website.'
    },
    {
      icon: Globe,
      title: 'Smart Website Crawling',
      description: 'Automatically crawls and indexes your website content to provide accurate, contextual responses.'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Responses',
      description: 'Leverage advanced AI models to answer customer questions naturally and intelligently.'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track conversations, measure satisfaction, and gain insights into customer behavior.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance with industry standards to keep your data safe.'
    },
    {
      icon: Code,
      title: 'Easy Integration',
      description: 'Works with any website platform. No complex setup or coding required.'
    }
  ];

  const stats = [
    { value: '10M+', label: 'Messages Handled' },
    { value: '99.9%', label: 'Uptime' },
    { value: '< 500ms', label: 'Response Time' },
    { value: '95%', label: 'Satisfaction Rate' }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-8 h-8 text-gray-900" />
              <span className="text-xl font-semibold text-gray-900">ChatLite</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered Chat
              <br />
              <span className="text-gray-600">For Your Website</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your website into an intelligent customer service platform.
              ChatLite automatically learns from your content to answer questions instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="group bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Let's Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('test-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-lg text-lg font-medium text-gray-900 border-2 border-gray-900 hover:bg-gray-50 transition-colors"
              >
                Try Demo
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make customer support effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg"
              >
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Register Your Website
              </h3>
              <p className="text-gray-600">
                Sign up and add your website URL. We'll verify ownership instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Train Your AI
              </h3>
              <p className="text-gray-600">
                Our system automatically crawls your site and trains the AI on your content.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Add Widget & Go Live
              </h3>
              <p className="text-gray-600">
                Copy a simple script tag to your site. Your AI chatbot is now live!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testing Section */}
      <section id="test-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Test Your Website
            </h2>
            <p className="text-xl text-gray-600">
              Enter your website URL to see how ChatLite would work for you
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                value={testUrl}
                onChange={(e) => {
                  setTestUrl(e.target.value);
                  setTestError(null); // Clear error when typing
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isTestLoading) {
                    handleTestWebsite();
                  }
                }}
                placeholder="https://yourwebsite.com"
                className={`flex-1 px-6 py-4 border-2 rounded-lg text-lg focus:outline-none transition-colors ${
                  testError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-gray-900'
                }`}
              />
              <button
                onClick={handleTestWebsite}
                disabled={!testUrl.trim() || isTestLoading}
                className="bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isTestLoading ? 'Testing...' : 'Test Now'}
              </button>
            </div>

            {testError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{testError}</p>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-4 text-center">
              No signup required for testing. See instant results.
            </p>
          </div>

          {/* Use Cases */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <Users className="w-8 h-8 text-gray-900 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Customer Support</h4>
              <p className="text-sm text-gray-600">
                Answer FAQs instantly, 24/7 without human intervention
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <TrendingUp className="w-8 h-8 text-gray-900 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Lead Generation</h4>
              <p className="text-sm text-gray-600">
                Engage visitors and convert them into qualified leads
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <Clock className="w-8 h-8 text-gray-900 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Save Time</h4>
              <p className="text-sm text-gray-600">
                Reduce support tickets by up to 80% with AI automation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Website?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of businesses using ChatLite to provide exceptional customer experiences
          </p>
          <button
            onClick={handleGetStarted}
            className="group bg-gray-900 text-white px-10 py-5 rounded-lg text-xl font-medium hover:bg-gray-800 transition-all inline-flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <MessageSquare className="w-6 h-6 text-gray-900" />
              <span className="text-lg font-semibold text-gray-900">ChatLite</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Docs</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            © 2025 ChatLite. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
