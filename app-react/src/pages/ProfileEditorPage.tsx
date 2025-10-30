import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  loadProfileForEditing,
  createProfile,
  updateProfile,
  updateEditingProfile,
  clearEditingProfile,
} from '../store/slices/profileEditorSlice';
import type { Profile, Document, Folder } from '../types/profile';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import DocumentList from '../components/ProfileEditor/DocumentList';
import FolderList from '../components/ProfileEditor/FolderList';

/**
 * ProfileEditorPage - Main interface for editing profile configuration
 */
function ProfileEditorPage() {
  const { profileName } = useParams<{ profileName?: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { editingProfile, isDirty, savingState, errorMessage } = useSelector(
    (state: RootState) => state.profileEditor
  );

  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [profileNameInput, setProfileNameInput] = useState('');

  const isNewProfile = !profileName;

  useEffect(() => {
    if (profileName) {
      // Load existing profile
      dispatch(loadProfileForEditing(profileName));
    } else {
      // Initialize new profile template
      const template: Profile = {
        name: '',
        version: '1.0.0',
        description: '',
        documents: [],
        folders: [],
      };
      setLocalProfile(template);
      dispatch(updateEditingProfile(template));
    }

    return () => {
      dispatch(clearEditingProfile());
    };
  }, [profileName, dispatch]);

  useEffect(() => {
    if (editingProfile) {
      setLocalProfile(editingProfile);
      if (isNewProfile) {
        setProfileNameInput('');
      } else {
        setProfileNameInput(profileName || '');
      }
    }
  }, [editingProfile, isNewProfile, profileName]);

  const handleBack = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/');
  };

  const handleSave = async () => {
    if (!localProfile) return;

    // Validate
    if (!localProfile.name) {
      toast.error('Profile name is required');
      return;
    }

    if (isNewProfile && !profileNameInput) {
      toast.error('Profile folder name is required');
      return;
    }

    if (!localProfile.documents?.length && !localProfile.folders?.length) {
      toast.error('Profile must have at least one document or folder');
      return;
    }

    try {
      if (isNewProfile) {
        await dispatch(
          createProfile({
            name: profileNameInput,
            config: localProfile,
          })
        ).unwrap();
        toast.success('Profile created successfully');
        navigate('/');
      } else {
        await dispatch(
          updateProfile({
            name: profileName!,
            config: localProfile,
          })
        ).unwrap();
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    }
  };

  const handleProfileChange = (updates: Partial<Profile>) => {
    if (!localProfile) return;
    const updated = { ...localProfile, ...updates };
    setLocalProfile(updated);
    dispatch(updateEditingProfile(updated));
  };

  const handleAddDocument = () => {
    if (!localProfile) return;
    const newDoc: Document = {
      name: 'New Document',
      path: 'new-doc.md',
      description: '',
    };
    handleProfileChange({
      documents: [...(localProfile.documents || []), newDoc],
    });
  };

  const handleUpdateDocument = (index: number, doc: Document) => {
    if (!localProfile) return;
    const documents = [...(localProfile.documents || [])];
    documents[index] = doc;
    handleProfileChange({ documents });
  };

  const handleDeleteDocument = (index: number) => {
    if (!localProfile) return;
    const documents = [...(localProfile.documents || [])];
    documents.splice(index, 1);
    handleProfileChange({ documents });
  };

  const handleAddFolder = () => {
    if (!localProfile) return;
    const newFolder: Folder = {
      name: 'New Folder',
      path: 'new-folder/',
      description: '',
      documentType: 'document',
      documents: [],
    };
    handleProfileChange({
      folders: [...(localProfile.folders || []), newFolder],
    });
  };

  const handleUpdateFolder = (index: number, folder: Folder) => {
    if (!localProfile) return;
    const folders = [...(localProfile.folders || [])];
    folders[index] = folder;
    handleProfileChange({ folders });
  };

  const handleDeleteFolder = (index: number) => {
    if (!localProfile) return;
    const folders = [...(localProfile.folders || [])];
    folders.splice(index, 1);
    handleProfileChange({ folders });
  };

  if (!localProfile) {
    return (
      <div className="pe-loading">
        <div className="pe-spinner"></div>
        <span style={{marginLeft: '1rem'}}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="pe-editor-container">
      {/* Sticky Header */}
      <div className="pe-editor-header">
        <div className="pe-editor-header-content">
          <div className="pe-editor-header-left">
            <button
              onClick={handleBack}
              className="pe-btn pe-btn-icon"
              title="Back to profiles"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="pe-editor-title">
                {isNewProfile ? 'Create New Profile' : `Edit: ${profileName}`}
              </h2>
              {isDirty && <p className="pe-editor-dirty">● Unsaved changes</p>}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={savingState === 'saving'}
            className="pe-btn pe-btn-primary"
          >
            <Save size={20} />
            {savingState === 'saving' ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="pe-alert pe-alert-danger" style={{maxWidth: '1800px', margin: '0 auto', padding: '0 var(--pe-space-xl)'}}>
          {errorMessage}
        </div>
      )}

      <div className="pe-editor-content">
        {/* Left Column - Basic Information */}
        <div>
          <div className="pe-editor-section">
            <h3 className="pe-editor-section-title">Basic Information</h3>
            {isNewProfile && (
              <div className="pe-form-group">
                <label className="pe-label">Profile Folder Name *</label>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="e.g., api-development"
                  className="pe-input"
                />
                <span className="pe-input-help">
                  Used as directory name in ~/.cospec-ai/profiles/
                </span>
              </div>
            )}

            <div className="pe-form-row">
              <div className="pe-form-group">
                <label className="pe-label">Profile Name *</label>
                <input
                  type="text"
                  value={localProfile.name}
                  onChange={(e) => handleProfileChange({ name: e.target.value })}
                  placeholder="e.g., API Development Profile"
                  className="pe-input"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">Version</label>
                <input
                  type="text"
                  value={localProfile.version || '1.0.0'}
                  onChange={(e) => handleProfileChange({ version: e.target.value })}
                  placeholder="1.0.0"
                  className="pe-input"
                />
              </div>
            </div>

            <div className="pe-form-group">
              <label className="pe-label">Description</label>
              <textarea
                value={localProfile.description || ''}
                onChange={(e) => handleProfileChange({ description: e.target.value })}
                placeholder="Brief description of this profile's purpose"
                rows={4}
                className="pe-textarea"
              />
            </div>
          </div>

          {/* Documents Section */}
          <div className="pe-editor-section pe-mt-lg">
            <div className="pe-editor-section-actions">
              <h3 className="pe-editor-section-title" style={{margin: 0, border: 'none', padding: 0}}>
                Top-Level Documents
              </h3>
              <button
                onClick={handleAddDocument}
                className="pe-btn pe-btn-primary"
              >
                <Plus size={18} />
                Add Document
              </button>
            </div>
            <DocumentList
              documents={localProfile.documents || []}
              onUpdate={handleUpdateDocument}
              onDelete={handleDeleteDocument}
              profileName={profileNameInput || profileName || ''}
            />
          </div>
        </div>

        {/* Right Column - Folders */}
        <div>
          <div className="pe-editor-section">
            <div className="pe-editor-section-actions">
              <h3 className="pe-editor-section-title" style={{margin: 0, border: 'none', padding: 0}}>
                Folders
              </h3>
              <button
                onClick={handleAddFolder}
                className="pe-btn pe-btn-primary"
              >
                <Plus size={18} />
                Add Folder
              </button>
            </div>
            <FolderList
              folders={localProfile.folders || []}
              onUpdate={handleUpdateFolder}
              onDelete={handleDeleteFolder}
              profileName={profileNameInput || profileName || ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditorPage;
