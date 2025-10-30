import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { loadPromptFile, savePromptFile } from '../../store/slices/profileEditorSlice';
import { toast } from 'react-toastify';
import { FileText, Save, Eye } from 'lucide-react';

interface PromptFileManagerProps {
  profileName: string;
  promptPath: string;
}

/**
 * PromptFileManager - Simple textarea editor for prompt files
 */
function PromptFileManager({ profileName, promptPath }: PromptFileManagerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      loadContent();
    }
  }, [isExpanded, hasLoaded]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const result = await dispatch(
        loadPromptFile({ profileName, path: promptPath })
      ).unwrap();
      setContent(result.content);
      setHasLoaded(true);
    } catch (error: any) {
      // File might not exist yet, that's okay
      if (!error.message?.includes('not found')) {
        toast.error('Failed to load prompt file');
      }
      setContent('');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await dispatch(
        savePromptFile({ profileName, path: promptPath, content })
      ).unwrap();
      toast.success('Prompt file saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save prompt file');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FileText size={16} />
          Prompt File: {promptPath}
        </div>
        <Eye size={16} className={isExpanded ? 'text-blue-600' : 'text-gray-400'} />
      </div>

      {isExpanded && (
        <div className="p-3 bg-white border-t border-gray-200">
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">Loading...</div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter prompt content here..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">
                  Quick edit - for detailed editing, save and open in markdown editor
                </p>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PromptFileManager;
