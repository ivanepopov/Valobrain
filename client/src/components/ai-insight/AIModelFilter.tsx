import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { capitalize } from '../../utils/formatters.ts';
import { GlassBox } from '../ui/GlassBox.tsx';
import type { AIInsightReportState, AIAgent, CustomAIModel } from '../../types/AIInsight.ts';

const INITIAL_MODELS: Array<{ id: string; name: string; agent: AIAgent }> = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', agent: 'gemini' },
  { id: 'gpt-5.2', name: 'GPT-5.2', agent: 'openai' },
  { id: 'claude-4.5-haiku', name: 'Claude 4.5 Haiku', agent: 'claude' },
  { id: 'llama3', name: 'Ollama (Llama 3)', agent: 'ollama' },
];

interface Props {
  selectedModel: string;
  setSelectedModel: (model: string, agent?: AIAgent) => void;

  customModels: CustomAIModel[];
  setReportState: React.Dispatch<React.SetStateAction<AIInsightReportState>>;

  userApiKey: string;
  setUserApiKey: (key: string) => void;

  selectedAgent: AIAgent;
  setShowCustomModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const AIModelFilter = ({
  selectedModel,
  setSelectedModel,
  customModels,
  setReportState,
  userApiKey,
  setUserApiKey,
  selectedAgent,
  setShowCustomModal,
}: Props) => {
  const [showApiKey, setShowApiKey] = useState(false);

  const isOllama = selectedAgent === 'ollama';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
    >
      <GlassBox>
        <div className="flex flex-col gap-4">
          {/* AI Model Selection */}
          <div className="flex items-center gap-6">
            <label className="text-xs font-medium tracking-wider whitespace-nowrap w-28" style={{ color: '#fffffe' }}>
              Select Model
            </label>

            <div className="flex gap-1.5 flex-wrap">
              {INITIAL_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id, model.agent)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300"
                  style={{
                      backgroundColor: selectedModel === model.id ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedModel === model.id ? '#fffffe' : '#94a1b2',
                      boxShadow: selectedModel === model.id ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                      if (selectedModel !== model.id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                      if (selectedModel !== model.id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  {model.name}
                </button>
              ))}

              {/* Custom Models */}
              {customModels.map((model) => (
                <div key={model.id} className="relative group">
                  <button
                    onClick={() => setSelectedModel(model.id, model.agent)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300"
                    style={{
                        backgroundColor: selectedModel === model.id ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                        color: selectedModel === model.id ? '#fffffe' : '#94a1b2',
                        boxShadow: selectedModel === model.id ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedModel !== model.id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        if (selectedModel !== model.id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    {model.name}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();

                      const updated = customModels.filter((m) => m.id !== model.id);

                      setReportState((prev) => ({ ...prev, customModels: updated }));
                      localStorage.setItem('valobrain_custom_models', JSON.stringify(updated));

                      if (selectedModel === model.id) {
                        const fallback = INITIAL_MODELS[0];
                        setSelectedModel(fallback.id, fallback.agent);
                      }
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove custom model"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/5 transition-all duration-300 flex items-center gap-1"
                style={{
                    outline: '#7f5af0',
                    color: '#94a1b2',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <Plus className="w-3 h-3" />
                Custom..
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="flex items-center gap-6">
            <label className="text-xs font-medium tracking-wider whitespace-nowrap w-28 uppercase" style={{ color: '#fffffe' }}>
              API Key
            </label>

            <div className="flex-1">
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder={isOllama ? 'No API key required for Ollama' : `Enter ${capitalize(selectedAgent)} key...`}
                  disabled={isOllama}
                  className={`
                    w-full px-4 py-1.5 pr-10 rounded-lg bg-white/5 border border-white/10 text-sm
                    focus:outline-none focus:border-blue-400/50 transition-colors
                    ${isOllama ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                      color: '#94a1b2',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  disabled={isOllama}
                  className={`
                    absolute right-3 top-1/2 transform -translate-y-1/2
                    ${isOllama ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                      color: '#7f5af0',
                  }}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 px-1">
                {userApiKey && !isOllama && (
                  <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">
                    Key Provided ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassBox>
    </motion.div>
  );
};

export default AIModelFilter;