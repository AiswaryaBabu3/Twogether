import { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  User,
  Calendar,
  MapPin,
  Camera,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Users,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { CoupleData } from '../services/api';
import { onboardCouplePartner } from '../services/api';
import { ImageAdjustModal } from './ImageAdjustModal';

interface CoupleOnboardingModalProps {
  currentCoupleData?: CoupleData | null;
  currentPartnerIndex?: number;
  isOpen: boolean;
  onClose?: () => void;
  onComplete: (updatedCouple: CoupleData, partnerIndex: number) => void;
}

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female 👩' },
  { value: 'Male', label: 'Male 👨' },
  { value: 'Non-Binary', label: 'Non-Binary 🌈' },
  { value: 'Prefer not to say', label: 'Other ✨' },
];

const POPULAR_CITIES = [
  { city: 'Coimbatore, India', tz: 'Asia/Kolkata' },
  { city: 'Bengaluru, India', tz: 'Asia/Kolkata' },
  { city: 'Chennai, India', tz: 'Asia/Kolkata' },
  { city: 'Mumbai, India', tz: 'Asia/Kolkata' },
  { city: 'New York, USA', tz: 'America/New_York' },
  { city: 'London, UK', tz: 'Europe/London' },
  { city: 'Paris, France', tz: 'Europe/Paris' },
  { city: 'Singapore', tz: 'Asia/Singapore' },
];

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
];

export const CoupleOnboardingModal: React.FC<CoupleOnboardingModalProps> = ({
  currentCoupleData,
  currentPartnerIndex = 0,
  isOpen,
  onClose,
  onComplete,
}) => {
  const existingPartner = currentCoupleData?.partners?.[currentPartnerIndex];

  // Personal Info Form State
  const [name, setName] = useState(existingPartner?.name || '');
  const [gender, setGender] = useState<string>(existingPartner?.gender || 'Female');
  const [dob, setDob] = useState<string>(existingPartner?.dob || '2001-08-15');
  const [age, setAge] = useState<number | ''>(() => {
    if (existingPartner?.age) return existingPartner.age;
    return 24;
  });
  const [city, setCity] = useState(existingPartner?.city || 'Coimbatore, India');
  const [avatarUrl, setAvatarUrl] = useState(
    existingPartner?.avatar_url || DEFAULT_AVATARS[0]
  );

  // Pairing Flow State: 'create' = Partner 1 creates, 'join' = Partner 2 joins
  const [pairingMode, setPairingMode] = useState<'create' | 'join'>('create');
  const [inputPairingCode, setInputPairingCode] = useState(
    currentCoupleData?.pairing_code || ''
  );
  const [copiedCode, setCopiedCode] = useState(false);

  // Image adjust modal states
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Loading & error states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize form fields whenever currentCoupleData, active partner, or modal visibility updates
  useEffect(() => {
    const partner =
      currentCoupleData?.partners?.[currentPartnerIndex] ||
      currentCoupleData?.partners?.[0];

    if (partner) {
      if (partner.name) setName(partner.name);
      if (partner.gender) setGender(partner.gender);
      if (partner.dob) setDob(partner.dob);
      if (partner.age) setAge(partner.age);
      if (partner.city) setCity(partner.city);
      if (partner.avatar_url) setAvatarUrl(partner.avatar_url);
    } else {
      const savedProfile = localStorage.getItem('twogether_user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name) setName(parsed.name);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.age) setAge(parsed.age);
          if (parsed.city) setCity(parsed.city);
          if (parsed.avatar_url) setAvatarUrl(parsed.avatar_url);
        } catch {
          // ignore error
        }
      } else {
        const savedName = localStorage.getItem('twogether_partner_name');
        if (savedName) setName(savedName);
      }
    }

    if (currentCoupleData?.pairing_code) {
      setInputPairingCode(currentCoupleData.pairing_code);
    }
  }, [currentCoupleData, currentPartnerIndex, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Record that onboarding was acknowledged so it won't prompt on every reload
    localStorage.setItem('twogether_onboarded', 'true');
    if (onClose) onClose();
  };

  // Compute age automatically from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge > 0 && calculatedAge < 120) {
        setAge(calculatedAge);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAdjustingImage(reader.result as string);
      e.target.value = '';
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = () => {
    const codeToCopy = currentCoupleData?.pairing_code || 'TWO-7749';
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter or select your city.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const pairingCodePayload =
        pairingMode === 'join'
          ? inputPairingCode.trim().toUpperCase()
          : undefined;

      const res = await onboardCouplePartner({
        name: name.trim(),
        gender: gender || null,
        age: age !== '' ? Number(age) : null,
        dob: dob || null,
        city: city.trim(),
        avatar_url: avatarUrl,
        pairing_code: pairingCodePayload,
        partner_index: currentPartnerIndex,
      });

      // Save user identity in localStorage so this browser/device always acts as this partner
      localStorage.setItem('twogether_partner_index', String(res.partner_index));
      localStorage.setItem('twogether_partner_name', res.partner_name);
      localStorage.setItem('twogether_onboarded', 'true');
      localStorage.setItem(
        'twogether_user_profile',
        JSON.stringify({
          name: name.trim(),
          gender,
          dob,
          age,
          city: city.trim(),
          avatar_url: avatarUrl,
        })
      );

      onComplete(res.couple, res.partner_index);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete couple onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          handleClose();
        }
      }}
    >
      <div className="modal-container onboarding-modal">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-badge">
            <Heart size={16} fill="#FF4D6D" color="#FF4D6D" />
            <span>Couple Setup & Pairing</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleClose}
              title="Close modal"
            >
              <X size={20} />
            </button>
          )}
          <h2 className="onboarding-title">
            {existingPartner?.name ? 'Your Personal Profile' : 'Step into Your Shared World'}
          </h2>
          <p className="onboarding-subtitle">
            {existingPartner?.name
              ? 'Your basic details are saved and synced across devices in real-time.'
              : 'Enter your basic details, then connect both apps so you and your partner stay in sync across any distance in real-time.'}
          </p>
        </div>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* Section 1: Personal Details */}
          <div className="onboarding-section">
            <div className="section-label-row">
              <User size={16} color="#FF758F" />
              <span>Your Personal Details</span>
            </div>

            {/* Avatar Selection Row */}
            <div className="onboarding-avatar-row">
              <div
                className="onboarding-avatar-preview clickable"
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload profile photo"
              >
                <img
                  src={avatarUrl}
                  alt={name || 'Avatar'}
                  className="onboarding-avatar-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATARS[0];
                  }}
                />
                <div className="onboarding-avatar-badge">
                  <Camera size={14} color="#FFFFFF" />
                </div>
              </div>

              <div className="avatar-picker-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  <span>Upload & Crop Photo</span>
                </button>
                <div className="avatar-preset-pills">
                  {DEFAULT_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`avatar-preset-circle ${
                        avatarUrl === url ? 'active' : ''
                      }`}
                      onClick={() => setAvatarUrl(url)}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Aishu or Prago"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Gender Selection */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <div className="gender-pill-group">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`gender-pill-btn ${
                      gender === opt.value ? 'active' : ''
                    }`}
                    onClick={() => setGender(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth and Age Grid */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Date of Birth (DOB)
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={handleDobChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 24"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value ? Number(e.target.value) : '')
                  }
                />
              </div>
            </div>

            {/* City / Location */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                Your Current City
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Coimbatore, India"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <div className="city-quick-picks">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    className={`city-chip ${city === c.city ? 'active' : ''}`}
                    onClick={() => setCity(c.city)}
                  >
                    {c.city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Combine Apps into Shared Couple App */}
          <div className="onboarding-section pairing-section">
            <div className="section-label-row">
              <Users size={16} color="#A77BFF" />
              <span>Combine with Partner's App</span>
            </div>

            {/* Mode Selector */}
            <div className="pairing-mode-tabs">
              <button
                type="button"
                className={`pairing-tab ${pairingMode === 'create' ? 'active' : ''}`}
                onClick={() => setPairingMode('create')}
              >
                <Sparkles size={14} />
                <span>1. I'm Creating the Space</span>
              </button>
              <button
                type="button"
                className={`pairing-tab ${pairingMode === 'join' ? 'active' : ''}`}
                onClick={() => setPairingMode('join')}
              >
                <LinkIcon size={14} />
                <span>2. I Have Partner's Code</span>
              </button>
            </div>

            {pairingMode === 'create' ? (
              <div className="pairing-create-box">
                <p className="pairing-helper-text">
                  You are setting up the shared couple space! Your partner can join
                  from their phone or laptop using this secret code:
                </p>
                <div className="pairing-code-display">
                  <span className="code-text">
                    {currentCoupleData?.pairing_code || 'TWO-7749'}
                  </span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={handleCopyCode}
                    title="Copy code to share with partner"
                  >
                    {copiedCode ? <Check size={16} color="#4ADE80" /> : <Copy size={16} />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <div className="pairing-tip">
                  <ShieldCheck size={14} color="#FF758F" />
                  <span>Send this code to your partner so they can link their app.</span>
                </div>
              </div>
            ) : (
              <div className="pairing-join-box">
                <p className="pairing-helper-text">
                  Enter the pairing code provided by your partner to unite both apps:
                </p>
                <input
                  type="text"
                  className="form-input pairing-code-input"
                  placeholder="e.g. TWO-7749"
                  value={inputPairingCode}
                  onChange={(e) => setInputPairingCode(e.target.value.toUpperCase())}
                  required={pairingMode === 'join'}
                />
                <div className="pairing-tip">
                  <CheckCircle2 size={14} color="#A77BFF" />
                  <span>
                    Once connected, all photos, love pulses, and countdowns update
                    live on both screens.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="onboarding-actions">
            <button
              type="submit"
              className="btn-primary btn-block submit-onboard-btn"
              disabled={submitting}
            >
              <span>
                {submitting
                  ? 'Saving Space...'
                  : existingPartner?.name
                  ? 'Save & Continue ❤️'
                  : 'Start Twogether ❤️'}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Image Adjust Cropper Modal */}
      {adjustingImage && (
        <ImageAdjustModal
          imageUrl={adjustingImage}
          partnerName={name || 'Profile'}
          onClose={() => setAdjustingImage(null)}
          onSave={(croppedBase64) => {
            setAvatarUrl(croppedBase64);
            setAdjustingImage(null);
          }}
        />
      )}
    </div>
  );
};
