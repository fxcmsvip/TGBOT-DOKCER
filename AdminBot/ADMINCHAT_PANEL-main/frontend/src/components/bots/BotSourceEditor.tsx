import { useState, useEffect, useCallback } from 'react';
import { X, Save, RotateCcw, Play, CheckCircle, AlertCircle, Code2 } from 'lucide-react';
import { botSourceApi, type BotSource } from '../../services/botSourceApi';

interface BotSourceEditorProps {
  botId: number;
  botName: string;
  onClose: () => void;
}

export default function BotSourceEditor({ botId, botName, onClose }: BotSourceEditorProps) {
  const [source, setSource] = useState<BotSource | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSource = useCallback(async () => {
    setLoading(true);
    try {
      const response = await botSourceApi.get(botId);
      const data = response.data;
      setSource(data);
      setEditValue(data.source_code);
      setIsValid(null);
      setValidationError(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load source code' });
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await botSourceApi.validate(botId, editValue);
      const result = response.data;
      setIsValid(result.valid);
      setValidationError(result.error || null);
    } catch (err) {
      setIsValid(false);
      setValidationError('Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await botSourceApi.update(botId, editValue);
      setMessage({ type: 'success', text: 'Source code saved successfully' });
      setSource(prev => prev ? { ...prev, is_custom: true } : null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save source code' });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate source code? This will overwrite your custom changes.')) return;
    try {
      const response = await botSourceApi.regenerate(botId);
      const data = response.data;
      setSource(data);
      setEditValue(data.source_code);
      setMessage({ type: 'success', text: 'Source code regenerated' });
      setIsValid(null);
      setValidationError(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to regenerate source code' });
    }
  };

  const handleRestart = async (mode: 'auto' | 'local' | 'remote') => {
    try {
      const response = await botSourceApi.restart(botId, mode);
      const result = response.data;
      if (result.local_started || result.remote_started) {
        setMessage({ 
          type: 'success', 
          text: `Bot restarted (${result.local_started ? 'local' : 'remote'})` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Restart failed: ${result.errors?.join(', ') || 'Unknown error'}` 
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to restart bot' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[80vh] bg-bg-primary border border-border-default rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <Code2 size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              {botName} - Source Code
            </h2>
            {source?.is_custom && (
              <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
                Custom
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border-subtle bg-bg-secondary/50">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {validating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            Validate
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || editValue === source?.source_code}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Regenerate
          </button>

          <div className="w-px h-6 bg-border-subtle mx-2" />

          <button
            onClick={() => handleRestart('auto')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Play size={16} />
            Restart (Auto)
          </button>

          {/* Validation status */}
          {isValid !== null && (
            <div className={`flex items-center gap-2 ml-auto text-sm ${isValid ? 'text-success' : 'text-error'}`}>
              {isValid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {isValid ? 'Valid' : validationError}
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-success/10 text-success border border-success/20' 
              : 'bg-error/10 text-error border border-error/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <textarea
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setIsValid(null);
                setValidationError(null);
              }}
              className="w-full h-full p-4 bg-bg-secondary border border-border-subtle rounded-lg font-mono text-sm text-text-primary resize-none focus:outline-none focus:border-accent/50"
              spellCheck={false}
              placeholder="Bot source code will appear here..."
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/30">
          <div className="text-sm text-text-tertiary">
            {source?.last_modified && (
              <span>Last modified: {new Date(source.last_modified).toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
