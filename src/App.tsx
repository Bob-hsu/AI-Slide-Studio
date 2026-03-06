import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import { useEditorStore } from './store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { User as UserIcon } from 'lucide-react';

const COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const { user, setUser, initSocket } = useEditorStore();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (user) {
      initSocket();
    }
  }, [user, initSocket]);

  const handleSetUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    
    const newUser = {
      id: uuidv4(),
      name: userName.trim(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    setUser(newUser);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to AI Slide Studio</h1>
            <p className="text-gray-500 text-center mt-2">Enter your name to start collaborating in real-time.</p>
          </div>
          
          <form onSubmit={handleSetUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Alex Smith"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {currentView === 'dashboard' ? (
        <Dashboard onOpenEditor={() => setCurrentView('editor')} />
      ) : (
        <Editor onBack={() => setCurrentView('dashboard')} />
      )}
    </div>
  );
}
