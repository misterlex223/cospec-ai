import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  fetchAvailableProfiles,
  deleteProfile,
  activateProfile,
  setActiveProfileName,
} from '../store/slices/profileEditorSlice';
import { toast } from 'react-toastify';
import { Trash2, Edit, Plus, Play } from 'lucide-react';
import webSocketService from '../services/websocket';

/**
 * ProfileBrowser - Lists all available profiles with actions
 */
function ProfileBrowser() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { availableProfiles, activeProfileName, isLoading } = useSelector(
    (state: RootState) => state.profileEditor
  );

  const [deletingProfile, setDeletingProfile] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAvailableProfiles());

    // Listen for profile reload events
    const handleProfileReload = (data: any) => {
      console.log('Profile reloaded:', data);
      dispatch(setActiveProfileName(data.profileName));
      toast.info(`Profile switched to "${data.profileName}"`);
    };

    webSocketService.addEventListener('profile-reloaded', handleProfileReload);

    return () => {
      webSocketService.removeEventListener('profile-reloaded', handleProfileReload);
    };
  }, [dispatch]);

  const handleCreateNew = () => {
    navigate('/new');
  };

  const handleEdit = (profileName: string) => {
    navigate(`/edit/${profileName}`);
  };

  const handleDelete = async (profileName: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${profileName}"?`)) {
      return;
    }

    setDeletingProfile(profileName);
    try {
      await dispatch(deleteProfile(profileName)).unwrap();
      toast.success(`Profile "${profileName}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete profile');
    } finally {
      setDeletingProfile(null);
    }
  };

  const handleActivate = async (profileName: string) => {
    try {
      await dispatch(activateProfile(profileName)).unwrap();
      toast.success(`Profile "${profileName}" activated`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate profile');
    }
  };

  if (isLoading && availableProfiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="pe-browser-container">
      <div className="pe-flex pe-items-center pe-justify-between pe-mb-lg">
        <h2 className="pe-card-title">Available Profiles</h2>
        <button
          onClick={handleCreateNew}
          className="pe-btn pe-btn-primary"
        >
          <Plus size={20} />
          Create New Profile
        </button>
      </div>

      {availableProfiles.length === 0 ? (
        <div className="pe-card">
          <div className="pe-empty-state">
            <div className="pe-empty-state-title">No profiles found</div>
            <div className="pe-empty-state-description">
              Create your first profile to get started
            </div>
            <button
              onClick={handleCreateNew}
              className="pe-btn pe-btn-primary"
            >
              <Plus size={20} />
              Create Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="pe-profile-grid">
          {availableProfiles.map((profileName) => (
            <div
              key={profileName}
              className="pe-profile-item"
            >
              <div className="pe-profile-item-header">
                <div className="flex-1">
                  <h3 className="pe-profile-item-title pe-flex pe-items-center pe-gap-sm">
                    {profileName}
                    {activeProfileName === profileName && (
                      <span className="pe-badge pe-badge-success">
                        Active
                      </span>
                    )}
                  </h3>
                  <p className="pe-profile-item-desc">
                    Profile stored at ~/.cospec-ai/profiles/{profileName}
                  </p>
                </div>
              </div>

              <div className="pe-profile-item-actions">
                {activeProfileName !== profileName && (
                  <button
                    onClick={() => handleActivate(profileName)}
                    className="pe-btn pe-btn-success pe-btn-icon"
                    title="Activate profile"
                  >
                    <Play size={20} />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(profileName)}
                  className="pe-btn pe-btn-primary pe-btn-icon"
                  title="Edit profile"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(profileName)}
                  disabled={
                    deletingProfile === profileName ||
                    activeProfileName === profileName
                  }
                  className="pe-btn pe-btn-danger pe-btn-icon"
                  title={
                    activeProfileName === profileName
                      ? 'Cannot delete active profile'
                      : 'Delete profile'
                  }
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfileBrowser;
