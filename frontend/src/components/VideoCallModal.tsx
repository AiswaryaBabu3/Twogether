import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import type { CoupleData } from '../services/api';
import { sendWebSocketSignal, sendChatMessage } from '../services/api';
import '../styles/WhatsAppChat.css';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleData: CoupleData | null;
  activePartnerIndex: number;
  incomingOffer?: any;
  isCaller?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  coupleData,
  activePartnerIndex,
  incomingOffer,
  isCaller = true,
}) => {
  const [callStatus, setCallStatus] = useState<
    'ringing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'permission_denied'
  >(isCaller ? 'ringing' : 'incoming');

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<any>(null);
  const callDurationRef = useRef<number>(0);

  const p1 = coupleData?.partners?.[0];
  const p2 = coupleData?.partners?.[1];
  const partnerUser = activePartnerIndex === 1 ? p1 : p2;
  const partnerName = partnerUser?.name || (activePartnerIndex === 1 ? 'Aishu' : 'Prago');
  const partnerAvatar =
    partnerUser?.avatar_url ||
    (activePartnerIndex === 1
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');

  const currentUser = activePartnerIndex === 1 ? p2 : p1;
  const currentName = currentUser?.name || (activePartnerIndex === 1 ? 'Prago' : 'Aishu');

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Stop all media tracks and clean up RTCPeerConnection
  const cleanupStreams = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // End Call function
  const handleEndCall = useCallback(
    (reason: string = 'ended') => {
      const finalSecs = callDurationRef.current;
      sendWebSocketSignal({
        type: 'CALL_ENDED',
        sender_index: activePartnerIndex,
        target_index: activePartnerIndex === 1 ? 0 : 1,
        reason,
      });

      if (finalSecs > 0) {
        sendChatMessage({
          sender_index: activePartnerIndex,
          message_type: 'call_log',
          content: `Video call • ${formatDuration(finalSecs)}`,
        }).catch(() => {});
      } else if (isCaller && reason !== 'rejected') {
        sendChatMessage({
          sender_index: activePartnerIndex,
          message_type: 'call_log',
          content: 'Outgoing video call (no answer)',
        }).catch(() => {});
      }

      cleanupStreams();
      setCallStatus('ended');
      setTimeout(() => {
        onClose();
      }, 1000);
    },
    [activePartnerIndex, isCaller, cleanupStreams, onClose]
  );

  // Acquire local camera and mic stream
  const getMediaStream = useCallback(
    async (mode: 'user' | 'environment' = 'user') => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        return stream;
      } catch (err: any) {
        console.warn('Could not acquire audio/video stream:', err);
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnlyStream;
          return audioOnlyStream;
        } catch {
          setPermissionError(
            'Camera/Microphone access was denied or is in use by another tab. Please check browser permissions.'
          );
          setCallStatus('permission_denied');
          return null;
        }
      }
    },
    []
  );

  // Initialize WebRTC Peer Connection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketSignal({
          type: 'ICE_CANDIDATE',
          sender_index: activePartnerIndex,
          target_index: activePartnerIndex === 1 ? 0 : 1,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus('connected');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        if (callStatus === 'connected') {
          handleEndCall('partner_disconnected');
        }
      }
    };

    return pc;
  }, [activePartnerIndex, callStatus, handleEndCall]);

  // Start outgoing call
  const startCall = useCallback(async () => {
    setCallStatus('ringing');
    const stream = await getMediaStream(facingMode);
    if (!stream) return;

    const pc = createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    sendWebSocketSignal({
      type: 'CALL_RINGING',
      sender_index: activePartnerIndex,
      target_index: activePartnerIndex === 1 ? 0 : 1,
      caller_name: currentName,
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    sendWebSocketSignal({
      type: 'CALL_OFFER',
      sender_index: activePartnerIndex,
      target_index: activePartnerIndex === 1 ? 0 : 1,
      caller_name: currentName,
      sdp: offer,
    });
  }, [facingMode, getMediaStream, createPeerConnection, activePartnerIndex, currentName]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    setCallStatus('connecting');
    const stream = await getMediaStream(facingMode);
    const pc = createPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    if (incomingOffer) {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendWebSocketSignal({
        type: 'CALL_ANSWER',
        sender_index: activePartnerIndex,
        target_index: activePartnerIndex === 1 ? 0 : 1,
        sdp: answer,
      });
    }
  }, [facingMode, getMediaStream, createPeerConnection, incomingOffer, activePartnerIndex]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    sendWebSocketSignal({
      type: 'CALL_REJECTED',
      sender_index: activePartnerIndex,
      target_index: activePartnerIndex === 1 ? 0 : 1,
    });
    cleanupStreams();
    onClose();
  }, [activePartnerIndex, cleanupStreams, onClose]);

  // Listen for WebRTC signals
  useEffect(() => {
    const handleSignal = async (data: any) => {
      if (!data || data.sender_index === activePartnerIndex) return;

      if (data.type === 'CALL_ANSWER' && pcRef.current) {
        if (data.sdp) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          setCallStatus('connected');
        }
      } else if (data.type === 'ICE_CANDIDATE' && pcRef.current) {
        if (data.candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.warn('Error adding ice candidate:', e);
          }
        }
      } else if (data.type === 'CALL_REJECTED' || data.type === 'CALL_ENDED') {
        setCallStatus('ended');
        cleanupStreams();
        setTimeout(onClose, 1200);
      }
    };

    const handleWindowSignal = (e: CustomEvent) => handleSignal(e.detail);
    window.addEventListener('webrtc_signal' as any, handleWindowSignal);

    return () => {
      window.removeEventListener('webrtc_signal' as any, handleWindowSignal);
    };
  }, [activePartnerIndex, cleanupStreams, onClose]);

  // Trigger call on mount
  useEffect(() => {
    if (!isOpen) return;

    if (isCaller) {
      startCall();
    } else {
      setCallStatus('incoming');
    }

    return () => {
      cleanupStreams();
    };
  }, [isOpen, isCaller]);

  // Call timer effect
  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const next = prev + 1;
          callDurationRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  // Toggle Audio Mute
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsAudioMuted(!nextState);
      }
    }
  };

  // Toggle Video Track
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoDisabled(!nextState);
      }
    }
  };

  // Switch Camera
  const switchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (localStreamRef.current && pcRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(newVideoTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      } catch (e) {
        console.warn('Could not switch camera:', e);
      }
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tw-call-overlay">
      <div
        ref={modalContainerRef}
        className="tw-call-window"
        style={{ width: isFullscreen ? '100vw' : '920px', height: isFullscreen ? '100vh' : '700px' }}
      >
        {/* Top Header Bar */}
        <div className="tw-call-topbar">
          <div className="tw-call-peer-info">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="tw-call-peer-avatar"
            />
            <div>
              <div className="tw-call-peer-name">
                {partnerName} ❤️
              </div>
              <div className="tw-call-live-timer">
                {callStatus === 'connected' ? (
                  formatDuration(callDuration)
                ) : callStatus === 'ringing' ? (
                  'Calling...'
                ) : callStatus === 'incoming' ? (
                  'Incoming video call...'
                ) : callStatus === 'connecting' ? (
                  'Securing video...'
                ) : (
                  'Call Ended'
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="tw-icon-btn"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={() => handleEndCall('cancelled')}
              className="tw-icon-btn"
              title="Close window"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="tw-call-canvas">
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="tw-remote-video-feed"
            style={{ display: callStatus === 'connected' ? 'block' : 'none' }}
          />

          {/* Fallback Overlay */}
          {callStatus !== 'connected' && (
            <div className="tw-call-state-overlay">
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="tw-call-pulse-avatar"
              />
              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                {callStatus === 'incoming'
                  ? `${partnerName} is video calling you ❤️`
                  : callStatus === 'ringing'
                  ? `Calling ${partnerName}...`
                  : callStatus === 'permission_denied'
                  ? 'Permission Required'
                  : 'Connecting Video...'}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '400px', marginBottom: '24px' }}>
                {permissionError ||
                  (callStatus === 'incoming'
                    ? 'Private couple video call. Connect now?'
                    : 'Waiting for your partner to pick up...')}
              </p>

              {/* Incoming Call Buttons */}
              {callStatus === 'incoming' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="tw-incoming-decline-btn"
                    title="Decline"
                  >
                    <PhoneOff size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="tw-incoming-accept-btn"
                    title="Accept Call"
                  >
                    <PhoneCall size={18} />
                    <span>Accept Call</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Floating Self Video Picture-in-Picture */}
          <div className="tw-pip-video-box">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="tw-local-video-feed"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {isVideoDisabled && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#0e101c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                }}
              >
                <VideoOff size={24} color="#ef4444" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="tw-call-controls-strip">
          <button
            type="button"
            onClick={toggleAudio}
            className={`tw-call-action-btn ${isAudioMuted ? 'active-off' : ''}`}
            title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`tw-call-action-btn ${isVideoDisabled ? 'active-off' : ''}`}
            title={isVideoDisabled ? 'Camera On' : 'Camera Off'}
          >
            {isVideoDisabled ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <button
            type="button"
            onClick={switchCamera}
            className="tw-call-action-btn"
            title="Switch front/back camera"
          >
            <RefreshCw size={20} />
          </button>

          <button
            type="button"
            onClick={() => handleEndCall('user_hangup')}
            className="tw-hangup-btn"
            title="End Call"
          >
            <PhoneOff size={20} />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
