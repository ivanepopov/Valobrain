import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { GlassBox } from './GlassBox';
import type { AIAgent, CustomAIModel } from '../../types/AIInsight';

type CustomModelFormState = Omit<CustomAIModel, 'id'>;

interface AIModelModalProps {
    form: CustomModelFormState;
    setForm: React.Dispatch<React.SetStateAction<CustomModelFormState>>;
    onClose: () => void;
    onAdd: (model: CustomModelFormState) => void;
}

const AIModelModal = ({
     form,
     setForm,
     onClose,
     onAdd,
 }: AIModelModalProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md"
            >
                <GlassBox className="p-8 border-blue-400/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Add Custom Model</h3>
                        <button onClick={onClose} className="text-blue-300 hover:text-white" aria-label="Close modal">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-blue-200 text-xs font-medium uppercase mb-2">Agent Type</label>
                            <select
                                value={form.agent}
                                onChange={(e) => setForm((prev) => ({ ...prev, agent: e.target.value as AIAgent }))}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                            >
                                <option value="openai" className="bg-slate-900">
                                    OpenAI (Default)
                                </option>
                                <option value="gemini" className="bg-slate-900">
                                    Gemini
                                </option>
                                <option value="claude" className="bg-slate-900">
                                    Claude
                                </option>
                                <option value="ollama" className="bg-slate-900">
                                    Ollama
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-blue-200 text-xs font-medium uppercase mb-2">Display Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Local Llama"
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="block text-blue-200 text-xs font-medium uppercase mb-2">Model ID</label>
                            <input
                                type="text"
                                value={form.modelId}
                                onChange={(e) => setForm((prev) => ({ ...prev, modelId: e.target.value }))}
                                placeholder="e.g., gpt-4o"
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="block text-blue-200 text-xs font-medium uppercase mb-2">Custom Endpoint (Optional)</label>
                            <input
                                type="text"
                                value={form.endpoint}
                                onChange={(e) => setForm((prev) => ({ ...prev, endpoint: e.target.value }))}
                                placeholder={form.agent === 'ollama' ? 'http://localhost:11434/v1' : 'https://your-proxy.com/v1'}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                            />
                        </div>

                        <button
                            onClick={() => {
                                if (!form.name || !form.modelId) return;
                                onAdd(form);
                                onClose();
                                setForm({ name: '', endpoint: '', modelId: '', agent: 'openai' });
                            }}
                            className="w-full py-3 mt-4 bg-blue-900 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            Add Model
                        </button>
                    </div>
                </GlassBox>
            </motion.div>
        </div>
    );
}

export default AIModelModal;