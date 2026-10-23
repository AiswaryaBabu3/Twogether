import { useState, useRef } from 'react';
import {
  X,
  User,
  Heart,
  Plane,
  Save,
  Sparkles,
  MapPin,
  Camera,
  Upload,
  Link as LinkIcon,
  Check,
  Sliders,
} from 'lucide-react';
import type { CoupleData, Partner } from '../services/api';
import { updatePartnerProfile, updateReunion } from '../services/api';
import { ImageAdjustModal } from './ImageAdjustModal';

interface ProfileMenuModalProps {
  coupleData: CoupleData;
  initialTab?: 'user' | 'partner' | 'reunion';
  onClose: () => void;
  onUpdated: (newData: CoupleData) => void;
}

const EMOJI_OPTIONS = ['☕', '🎧', '📚', '💖', '✈️', '🍕', '💻', '😴', '🌸', '🔥', '🌟', '🍿'];

const CITY_PRESETS = [
  { city: 'New York, USA', tz: 'America/New_York' },
  { city: 'London, UK', tz: 'Europe/London' },
  { city: 'Paris, France', tz: 'Europe/Paris' },
  { city: 'Tokyo, Japan', tz: 'Asia/Tokyo' },
  { city: 'Mumbai, India', tz: 'Asia/Kolkata' },
  { city: 'Bengaluru, India', tz: 'Asia/Kolkata' },
  { city: 'Coimbatore, India', tz: 'Asia/Kolkata' },
  { city: 'San Francisco, USA', tz: 'America/Los_Angeles' },
  { city: 'Sydney, Australia', tz: 'Australia/Sydney' },
  { city: 'Singapore', tz: 'Asia/Singapore' },
  { city: 'Toronto, Canada', tz: 'America/Toronto' },
];

const P1_AVATAR_PRESETS = [
  { label: 'Studio Classic', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Warm Smile', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
  { label: 'Golden Hour', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { label: 'Natural Aesthetic', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80' },
  { label: 'Urban Chic', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80' },
  { label: 'Gentle Breeze', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
];

const P2_AVATAR_PRESETS = [
  { label: 'Warm Smile', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Charming Casual', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { label: 'City Stroll', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80' },
  { label: 'Thoughtful', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Sunny Day', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80' },
  { label: 'Outdoor Smile', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80' },
];

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({
  coupleData,
  initialTab = 'user',
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'partner' | 'reunion'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File input refs for avatar uploading
  const p1FileRef = useRef<HTMLInputElement | null>(null);
  const p2FileRef = useRef<HTMLInputElement | null>(null);

  const [showP1UrlInput, setShowP1UrlInput] = useState(false);
  const [showP2UrlInput, setShowP2UrlInput] = useState(false);

  // Image adjust modal states
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const [adjustingPartnerIndex, setAdjustingPartnerIndex] = useState<number>(0);

  const p1: Partner = coupleData.partners[0] || {
    id: 1,
    couple_id: 1,
    name: 'Aishu',
    city: 'Coimbatore, India',
    timezone: 'Asia/Kolkata',
    status_message: 'Coding Twogether App',
    status_emoji: '💻',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    is_online: true,
    latitude: 11.0168,
    longitude: 76.9558,
  };

  const p2: Partner = coupleData.partners[1] || {
    id: 2,
    couple_id: 1,
    name: 'Arjun',
    city: 'Bengaluru, India',
    timezone: 'Asia/Kolkata',
    status_message: 'Listening to our playlist',
    status_emoji: '🎧',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    is_online: true,
    latitude: 12.9716,
    longitude: 77.5946,
  };

  // Form states for Partner 1 (You)
  const [p1Name, setP1Name] = useState(p1.name);
  const [p1City, setP1City] = useState(p1.city);
  const [p1Tz, setP1Tz] = useState(p1.timezone);
  const [p1Status, setP1Status] = useState(p1.status_message);
  const [p1Emoji, setP1Emoji] = useState(p1.status_emoji);
  const [p1Avatar, setP1Avatar] = useState(p1.avatar_url);

  // Form states for Partner 2
  const [p2Name, setP2Name] = useState(p2.name);
  const [p2City, setP2City] = useState(p2.city);
  const [p2Tz, setP2Tz] = useState(p2.timezone);
  const [p2Status, setP2Status] = useState(p2.status_message);
  const [p2Emoji, setP2Emoji] = useState(p2.status_emoji);
  const [p2Avatar, setP2Avatar] = useState(p2.avatar_url);

  // Reunion Form States
  const [reunionTitle, setReunionTitle] = useState(coupleData.reunion_title);
  const [reunionCity, setReunionCity] = useState(coupleData.reunion_city);
  const [reunionProgress, setReunionProgress] = useState(coupleData.reunion_progress);
  const [reunionDate, setReunionDate] = useState(() => {
    try {
      return new Date(coupleData.reunion_date).toISOString().split('T')[0];
    } catch {
      return '2026-11-05';
    }
  });

  const handleCitySelect = (partnerIndex: number, cityItem: { city: string; tz: string }) => {
    if (partnerIndex === 0) {
      setP1City(cityItem.city);
      setP1Tz(cityItem.tz);
    } else {
      setP2City(cityItem.city);
      setP2Tz(cityItem.tz);
    }
  };

  // Handle local image file upload and open interactive adjuster immediately
  const handleFileUpload = (partnerIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Immediately open ImageAdjustModal so user can position and zoom
      setAdjustingPartnerIndex(partnerIndex);
      setAdjustingImage(result);
      setErrorMsg(null);
      // Reset input value so same file can be selected again if desired
      e.target.value = '';
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePartner = async (partnerIndex: number) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = partnerIndex === 0
        ? {
            partner_index: 0,
            name: p1Name,
            city: p1City,
            timezone: p1Tz,
            status_message: p1Status,
            status_emoji: p1Emoji,
            avatar_url: p1Avatar,
          }
        : {
            partner_index: 1,
            name: p2Name,
            city: p2City,
            timezone: p2Tz,
            status_message: p2Status,
            status_emoji: p2Emoji,
            avatar_url: p2Avatar,
          };

      const updated = await updatePartnerProfile(payload);
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReunion = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await updateReunion({
        reunion_title: reunionTitle,
        reunion_city: reunionCity,
        reunion_date: new Date(reunionDate).toISOString(),
        reunion_progress: reunionProgress,
      });
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update reunion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-menu-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="profile-modal-header">
          <div className="profile-title-group">
            <Heart size={20} color="#FF4D6D" fill="#FF4D6D" />
            <h3 className="profile-modal-title">Couple Space & Profile Settings</h3>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-nav-tabs">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <User size={16} />
            <span>{p1Name} (You)</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'partner' ? 'active' : ''}`}
            onClick={() => setActiveTab('partner')}
          >
            <Sparkles size={16} />
            <span>{p2Name} (Partner)</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'reunion' ? 'active' : ''}`}
            onClick={() => setActiveTab('reunion')}
          >
            <Plane size={16} />
            <span>Reunion Goal</span>
          </button>
        </div>

        {errorMsg && <div className="error-alert">{errorMsg}</div>}

        {/* Tab 1: You (Partner 1) */}
        {activeTab === 'user' && (
          <div className="tab-pane">
            {/* Interactive Profile Picture Section */}
            <div className="avatar-edit-card">
              <div className="avatar-preview-container">
                <div
                  className="avatar-preview-wrapper ring-rose clickable-avatar-preview"
                  onClick={() => {
                    setAdjustingPartnerIndex(0);
                    setAdjustingImage(p1Avatar || p1.avatar_url);
                  }}
                  title="Click to adjust zoom and reposition"
                >
                  <img
                    src={p1Avatar || p1.avatar_url}
                    alt={p1Name}
                    className="avatar-preview-img"
                  />
                  <button
                    type="button"
                    className="avatar-upload-badge-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      p1FileRef.current?.click();
                    }}
                    title="Upload profile photo from computer or phone"
                  >
                    <Camera size={15} />
                  </button>
                </div>

                <div className="avatar-upload-info">
                  <h4 className="avatar-section-title">Profile Picture</h4>
                  <p className="avatar-section-desc">
                    Upload from device, adjust zoom & position, or choose a curated avatar.
                  </p>
                  <div className="avatar-quick-actions">
                    <input
                      type="file"
                      ref={p1FileRef}
                      onChange={(e) => handleFileUpload(0, e)}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-upload-photo"
                      onClick={() => p1FileRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      className="btn-adjust-photo"
                      onClick={() => {
                        setAdjustingPartnerIndex(0);
                        setAdjustingImage(p1Avatar || p1.avatar_url);
                      }}
                      title="Adjust & frame face in circle"
                    >
                      <Sliders size={14} />
                      <span>Adjust & Zoom</span>
                    </button>
                    <button
                      type="button"
                      className="btn-link-photo"
                      onClick={() => setShowP1UrlInput(!showP1UrlInput)}
                    >
                      <LinkIcon size={14} />
                      <span>{showP1UrlInput ? 'Hide URL' : 'Image URL'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {showP1UrlInput && (
                <div className="avatar-url-input-box">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/your-photo.jpg"
                    value={p1Avatar}
                    onChange={(e) => setP1Avatar(e.target.value)}
                  />
                </div>
              )}

              {/* Curated Presets for Partner 1 */}
              <div className="avatar-presets-group">
                <span className="presets-label">Curated Avatars</span>
                <div className="presets-grid">
                  {P1_AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`preset-avatar-btn ${p1Avatar === preset.url ? 'active' : ''}`}
                      onClick={() => setP1Avatar(preset.url)}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="preset-thumb" />
                      {p1Avatar === preset.url && (
                        <div className="preset-check-badge">
                          <Check size={11} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your City & Location</label>
              <input
                type="text"
                className="form-input"
                value={p1City}
                onChange={(e) => setP1City(e.target.value)}
                placeholder="e.g. Coimbatore, India or New York, USA"
              />
              <div className="city-preset-pills">
                {CITY_PRESETS.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    className={`preset-pill ${p1City === c.city ? 'active' : ''}`}
                    onClick={() => handleCitySelect(0, c)}
                  >
                    <MapPin size={10} />
                    {c.city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Status Message</label>
              <input
                type="text"
                className="form-input"
                value={p1Status}
                onChange={(e) => setP1Status(e.target.value)}
                placeholder="e.g. Coding Twogether App, Having coffee..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status Emoji</label>
              <div className="emoji-selector-row">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={`emoji-btn ${p1Emoji === em ? 'active' : ''}`}
                    onClick={() => setP1Emoji(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => handleSavePartner(0)}
              >
                <Save size={16} />
                <span>{saving ? 'Syncing...' : 'Save & Sync Realtime'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Partner (Partner 2) */}
        {activeTab === 'partner' && (
          <div className="tab-pane">
            {/* Interactive Profile Picture Section for Partner 2 */}
            <div className="avatar-edit-card">
              <div className="avatar-preview-container">
                <div
                  className="avatar-preview-wrapper ring-purple clickable-avatar-preview"
                  onClick={() => {
                    setAdjustingPartnerIndex(1);
                    setAdjustingImage(p2Avatar || p2.avatar_url);
                  }}
                  title="Click to adjust zoom and reposition"
                >
                  <img
                    src={p2Avatar || p2.avatar_url}
                    alt={p2Name}
                    className="avatar-preview-img"
                  />
                  <button
                    type="button"
                    className="avatar-upload-badge-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      p2FileRef.current?.click();
                    }}
                    title="Upload partner photo from device"
                  >
                    <Camera size={15} />
                  </button>
                </div>

                <div className="avatar-upload-info">
                  <h4 className="avatar-section-title">Partner Photo</h4>
                  <p className="avatar-section-desc">
                    Update partner's avatar from device, adjust zoom & position, or choose a curated preset.
                  </p>
                  <div className="avatar-quick-actions">
                    <input
                      type="file"
                      ref={p2FileRef}
                      onChange={(e) => handleFileUpload(1, e)}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-upload-photo"
                      onClick={() => p2FileRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      className="btn-adjust-photo"
                      onClick={() => {
                        setAdjustingPartnerIndex(1);
                        setAdjustingImage(p2Avatar || p2.avatar_url);
                      }}
                      title="Adjust & frame face in circle"
                    >
                      <Sliders size={14} />
                      <span>Adjust & Zoom</span>
                    </button>
                    <button
                      type="button"
                      className="btn-link-photo"
                      onClick={() => setShowP2UrlInput(!showP2UrlInput)}
                    >
                      <LinkIcon size={14} />
                      <span>{showP2UrlInput ? 'Hide URL' : 'Image URL'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {showP2UrlInput && (
                <div className="avatar-url-input-box">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/partner-photo.jpg"
                    value={p2Avatar}
                    onChange={(e) => setP2Avatar(e.target.value)}
                  />
                </div>
              )}

              {/* Curated Presets for Partner 2 */}
              <div className="avatar-presets-group">
                <span className="presets-label">Curated Avatars</span>
                <div className="presets-grid">
                  {P2_AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`preset-avatar-btn ${p2Avatar === preset.url ? 'active' : ''}`}
                      onClick={() => setP2Avatar(preset.url)}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="preset-thumb" />
                      {p2Avatar === preset.url && (
                        <div className="preset-check-badge">
                          <Check size={11} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Partner's Name</label>
              <input
                type="text"
                className="form-input"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Partner's display name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Partner's City & Location</label>
              <input
                type="text"
                className="form-input"
                value={p2City}
                onChange={(e) => setP2City(e.target.value)}
                placeholder="e.g. Bengaluru, India or London, UK"
              />
              <div className="city-preset-pills">
                {CITY_PRESETS.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    className={`preset-pill ${p2City === c.city ? 'active' : ''}`}
                    onClick={() => handleCitySelect(1, c)}
                  >
                    <MapPin size={10} />
                    {c.city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Partner's Status Message</label>
              <input
                type="text"
                className="form-input"
                value={p2Status}
                onChange={(e) => setP2Status(e.target.value)}
                placeholder="e.g. Listening to our playlist, Heading home..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Partner's Emoji</label>
              <div className="emoji-selector-row">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={`emoji-btn ${p2Emoji === em ? 'active' : ''}`}
                    onClick={() => setP2Emoji(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => handleSavePartner(1)}
              >
                <Save size={16} />
                <span>{saving ? 'Syncing...' : 'Save & Sync Realtime'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Reunion Countdown Settings */}
        {activeTab === 'reunion' && (
          <div className="tab-pane">
            <div className="form-group">
              <label className="form-label">Reunion Title</label>
              <input
                type="text"
                className="form-input"
                value={reunionTitle}
                onChange={(e) => setReunionTitle(e.target.value)}
                placeholder="e.g. Countdown until we hug in person"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reunion Destination City</label>
              <input
                type="text"
                className="form-input"
                value={reunionCity}
                onChange={(e) => setReunionCity(e.target.value)}
                placeholder="e.g. Paris, France or Venice, Italy"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Reunion Date</label>
              <input
                type="date"
                className="form-input"
                value={reunionDate}
                onChange={(e) => setReunionDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="slider-label-row">
                <label className="form-label">Preparation Progress</label>
                <span className="slider-value-badge">{reunionProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="form-range"
                value={reunionProgress}
                onChange={(e) => setReunionProgress(Number(e.target.value))}
              />
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={handleSaveReunion}
              >
                <Save size={16} />
                <span>{saving ? 'Syncing...' : 'Update Countdown'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Image Adjuster / Cropper Modal */}
      {adjustingImage && (
        <ImageAdjustModal
          imageUrl={adjustingImage}
          partnerName={adjustingPartnerIndex === 0 ? p1Name : p2Name}
          onSave={(croppedUrl) => {
            if (adjustingPartnerIndex === 0) {
              setP1Avatar(croppedUrl);
            } else {
              setP2Avatar(croppedUrl);
            }
            setAdjustingImage(null);
          }}
          onClose={() => setAdjustingImage(null)}
        />
      )}
    </div>
  );
};
