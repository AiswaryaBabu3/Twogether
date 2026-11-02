import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Image as ImageIcon,
  Video,
  X,
  Check,
  CheckCheck,
  Smile,
  PhoneCall,
  Download,
  Maximize2,
  Minimize2,
  Heart,
  Lock,
  Reply,
  Trash2,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import type { CoupleData, ChatMessage } from '../services/api';
import {
  getChatMessages,
  sendChatMessage,
  sendChatPhoto,
  reactToChatMessage,
  deleteChatMessage,
  markChatRead,
  coupleSyncChannel,
} from '../services/api';
import '../styles/WhatsAppChat.css';

interface PrivateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleData: CoupleData | null;
  activePartnerIndex: number;
  onStartVideoCall: () => void;
  onNewMessageReceived?: () => void;
}

const QUICK_EMOJIS = ['❤️', '🥰', '✨', '💕', '😘', '🌹', '😍', '💖', '💍', '🥂', '🫂', '💋'];

export const PrivateChatModal: React.FC<PrivateChatModalProps> = ({
  isOpen,
  onClose,
  coupleData,
  activePartnerIndex,
  onStartVideoCall,
  onNewMessageReceived,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedPhotoData, setSelectedPhotoData] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showEmojiTray, setShowEmojiTray] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const p1 = coupleData?.partners?.[0];
  const p2 = coupleData?.partners?.[1];

  const currentUser = activePartnerIndex === 1 ? p2 : p1;
  const currentUserName = currentUser?.name || (activePartnerIndex === 1 ? 'Prago' : 'Aishu');

  const partnerUser = activePartnerIndex === 1 ? p1 : p2;
  const partnerName = partnerUser?.name || (activePartnerIndex === 1 ? 'Aishu' : 'Prago');
  const partnerAvatar =
    partnerUser?.avatar_url ||
    (activePartnerIndex === 1
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');
  const isPartnerOnline = partnerUser?.is_online ?? false;

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Safely append message without duplicating IDs
  const appendMessage = useCallback((newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  }, []);

  // Fetch messages from backend with ID deduplication
  const loadMessages = useCallback(async () => {
    try {
      const data = await getChatMessages(200);
      const seen = new Set<number>();
      const unique = data.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setMessages(unique);
      scrollToBottom('auto');
      markChatRead(activePartnerIndex);
    } catch (err) {
      console.warn('Failed to load chat messages:', err);
    }
  }, [activePartnerIndex]);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      markChatRead(activePartnerIndex);
    }
  }, [isOpen, loadMessages, activePartnerIndex]);

  // Listen for realtime chat updates
  useEffect(() => {
    const handleIncomingChatMessage = (msg: ChatMessage) => {
      appendMessage(msg);
      setTimeout(() => scrollToBottom('smooth'), 100);

      if (isOpen) {
        markChatRead(activePartnerIndex);
      } else if (msg.sender_index !== activePartnerIndex && onNewMessageReceived) {
        onNewMessageReceived();
      }
    };

    const handleWindowChat = (e: CustomEvent) => {
      const payload = e.detail;
      if (payload?.type === 'CHAT_MESSAGE' && payload.message) {
        handleIncomingChatMessage(payload.message);
      } else if (payload?.type === 'CHAT_MESSAGE_UPDATED' && payload.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.message.id ? payload.message : m))
        );
      } else if (payload?.type === 'CHAT_READ') {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_index === activePartnerIndex ? { ...m, is_read: true } : m
          )
        );
      }
    };

    const handleChannel = (ev: MessageEvent) => {
      if (ev.data?.type === 'CHAT_MESSAGE' && ev.data.message) {
        handleIncomingChatMessage(ev.data.message);
      } else if (ev.data?.type === 'CHAT_MESSAGE_UPDATED' && ev.data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === ev.data.message.id ? ev.data.message : m))
        );
      } else if (ev.data?.type === 'CHAT_READ') {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_index === activePartnerIndex ? { ...m, is_read: true } : m
          )
        );
      }
    };

    window.addEventListener('chat_event' as any, handleWindowChat);
    coupleSyncChannel?.addEventListener('message', handleChannel);

    return () => {
      window.removeEventListener('chat_event' as any, handleWindowChat);
      coupleSyncChannel?.removeEventListener('message', handleChannel);
    };
  }, [isOpen, activePartnerIndex, onNewMessageReceived, appendMessage]);

  // Reply to a message
  const handleReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  // React to a message
  const handleReactToMessage = async (msgId: number, emoji: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const key = String(activePartnerIndex);
        if (currentReactions[key] === emoji) {
          delete currentReactions[key];
        } else {
          currentReactions[key] = emoji;
        }
        return { ...m, reactions: currentReactions };
      })
    );

    try {
      const updated = await reactToChatMessage(msgId, activePartnerIndex, emoji);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (e) {
      console.warn('Failed to react to message:', e);
    }
  };

  // Soft delete / unsend message
  const handleDeleteMessage = async (msgId: number) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, is_deleted: true, deleted_at: new Date().toISOString() }
          : m
      )
    );

    try {
      const updated = await deleteChatMessage(msgId, activePartnerIndex);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (e) {
      console.warn('Failed to unsend message:', e);
    }
  };

  // Smooth scroll to quoted message
  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`tw-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('tw-highlight-pulse');
      setTimeout(() => el.classList.remove('tw-highlight-pulse'), 1500);
    }
  };

  // Send text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !selectedPhotoData) return;

    setIsSending(true);
    try {
      const replyData = replyingTo
        ? {
            reply_to_id: replyingTo.id,
            reply_to_text: replyingTo.content || (replyingTo.image_url ? '📷 Photo' : 'Message'),
            reply_to_sender: replyingTo.sender_name,
          }
        : {};

      if (selectedPhotoData) {
        const newMsg = await sendChatPhoto({
          sender_index: activePartnerIndex,
          image_data: selectedPhotoData,
          caption: text || photoCaption || undefined,
          ...replyData,
        });
        appendMessage(newMsg);
        setSelectedPhotoData(null);
        setPhotoCaption('');
      } else {
        const newMsg = await sendChatMessage({
          sender_index: activePartnerIndex,
          content: text,
          message_type: 'text',
          ...replyData,
        });
        appendMessage(newMsg);
      }
      setInputText('');
      setReplyingTo(null);
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Emoji reaction click
  const handleQuickEmoji = async (emoji: string) => {
    try {
      const newMsg = await sendChatMessage({
        sender_index: activePartnerIndex,
        content: emoji,
        message_type: 'text',
      });
      appendMessage(newMsg);
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (e) {
      console.warn('Could not send emoji reaction:', e);
    }
  };

  // Compress and handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedUri = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedPhotoData(compressedUri);
        }
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Format message time (e.g. 04:18 PM)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Deduplicated messages for rendering
  const uniqueMessages = useMemo(() => {
    const seen = new Set<number>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="tw-chat-overlay">
      <div className={`tw-chat-window ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Top Header */}
        <div className="tw-chat-header">
          <div className="tw-chat-header-glow" />

          <div className="tw-header-left">
            <div className="tw-avatar-wrap">
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="tw-avatar-img"
              />
              {isPartnerOnline && <span className="tw-online-pulse" />}
            </div>

            <div className="tw-user-meta">
              <div className="tw-user-name">
                {partnerName}
                <Heart size={14} className="tw-heart-icon" />
              </div>
              <div className={`tw-user-subtitle ${isPartnerOnline ? 'online' : ''}`}>
                {isPartnerOnline ? '● Online now' : 'Offline'} • {partnerUser?.city || 'Connected'}
              </div>
            </div>
          </div>

          <div className="tw-header-actions">
            {/* Start Video Call Button */}
            <button
              type="button"
              onClick={onStartVideoCall}
              className="tw-video-btn"
              title="Start 1-on-1 private video call"
            >
              <Video size={15} />
              <span>Video</span>
            </button>

            {/* Toggle Fullscreen / Maximize */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="tw-icon-btn"
              title={isFullscreen ? 'Dock in corner' : 'Expand window'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Chatbot */}
            <button
              type="button"
              onClick={onClose}
              className="tw-icon-btn"
              title="Close chat"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Chat Canvas / Messages Area */}
        <div className="tw-chat-body">
          {/* Privacy & Encryption Notice */}
          <div className="tw-privacy-banner">
            <Lock size={12} style={{ flexShrink: 0 }} />
            <span>Private & end-to-end encrypted space for {p1?.name || 'Aishu'} & {p2?.name || 'Prago'}</span>
          </div>

          {/* Empty State vs Message Stream */}
          {uniqueMessages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '32px 20px',
                color: '#94a3b8',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255, 77, 109, 0.15) 0%, rgba(138, 79, 255, 0.15) 100%)',
                  border: '1px solid rgba(255, 77, 109, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff4d6d',
                  marginBottom: '16px',
                  boxShadow: '0 4px 20px rgba(255, 77, 109, 0.2)',
                }}
              >
                <Heart size={28} fill="#ff4d6d" />
              </div>
              <h4 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
                Say hello to {partnerName}! ❤️
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '280px', lineHeight: 1.5, marginBottom: '20px' }}>
                Send your first message, share pictures, or start a private video call.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Hey love! ❤️', 'Thinking of you ✨', 'Miss you 🥰'].map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => handleQuickEmoji(starter)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f1f5f9',
                      padding: '6px 14px',
                      borderRadius: '16px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Centered Date Separator */}
              <div className="tw-date-pill-wrap">
                <div className="tw-date-pill">TODAY</div>
              </div>

              {/* Message Stream */}
              {uniqueMessages.map((msg) => {
                const isMine = Number(msg.sender_index) === Number(activePartnerIndex);

                // Call Log Badge
                if (msg.message_type === 'call_log') {
                  return (
                    <div key={msg.id} className="tw-date-pill-wrap">
                      <div className="tw-call-log-badge">
                        <PhoneCall size={14} />
                        <span>{msg.content || 'Video Call'}</span>
                        <span style={{ opacity: 0.65, fontSize: '11px', marginLeft: 4 }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }

                const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
                if (msg.reactions) {
                  Object.entries(msg.reactions).forEach(([pIdx, emoji]) => {
                    if (!reactionCounts[emoji]) {
                      reactionCounts[emoji] = { count: 0, mine: false };
                    }
                    reactionCounts[emoji].count += 1;
                    if (Number(pIdx) === Number(activePartnerIndex)) {
                      reactionCounts[emoji].mine = true;
                    }
                  });
                }

                return (
                  <div
                    key={msg.id}
                    id={`tw-msg-${msg.id}`}
                    className={`tw-msg-row ${isMine ? 'outgoing' : 'incoming'}`}
                  >
                    <div className="tw-msg-container">
                      {/* Floating Actions Bar on Message Hover (Hidden if deleted) */}
                      {!msg.is_deleted && (
                        <div className="tw-msg-actions-bar">
                          {/* Quick Reactions strip */}
                          <div className="tw-mini-reactions-strip">
                            {['❤️', '🥰', '😂', '🔥', '👍'].map((em) => (
                              <button
                                key={em}
                                type="button"
                                className="tw-reaction-emoji-btn"
                                onClick={() => handleReactToMessage(msg.id, em)}
                                title={`React ${em}`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>

                          {/* Reply Button */}
                          <button
                            type="button"
                            className="tw-action-btn"
                            onClick={() => handleReply(msg)}
                            title="Reply to message"
                          >
                            <Reply size={13} />
                          </button>

                          {/* Unsend / Delete Button (Only for sender) */}
                          {isMine && (
                            <button
                              type="button"
                              className="tw-action-btn delete"
                              onClick={() => setConfirmDeleteMessageId(msg.id)}
                              title="Unsend / Delete message"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`tw-msg-bubble ${isMine ? 'outgoing' : 'incoming'} ${msg.is_deleted ? 'deleted' : ''}`}>
                        {msg.is_deleted ? (
                          <>
                            <Ban size={13} className="tw-deleted-icon" />
                            <span>{isMine ? 'You unsent this message' : 'This message was unsent'}</span>
                            <span className="tw-bubble-time" style={{ marginLeft: 8 }}>{formatTime(msg.created_at)}</span>
                          </>
                        ) : (
                          <>
                            {/* Quoted Reply Header inside bubble */}
                            {msg.reply_to_id && (
                              <div
                                className="tw-bubble-reply-quote"
                                onClick={() => scrollToMessage(msg.reply_to_id!)}
                                title="Click to view quoted message"
                              >
                                <div className="tw-quote-sender">{msg.reply_to_sender || 'Partner'}</div>
                                <div className="tw-quote-text">{msg.reply_to_text || 'Original message'}</div>
                              </div>
                            )}

                            {/* Attached Photo */}
                            {msg.image_url && (
                              <div
                                className="tw-bubble-photo-box"
                                onClick={() => setExpandedImage(msg.image_url!)}
                                title="Click to view full photo"
                              >
                                <img
                                  src={msg.image_url}
                                  alt="Shared memory"
                                  className="tw-bubble-photo"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <span className="tw-photo-zoom-tag">
                                  <Maximize2 size={11} />
                                  <span>View</span>
                                </span>
                              </div>
                            )}

                            {/* Text Content */}
                            {msg.content && <p className="tw-msg-text">{msg.content}</p>}

                            {/* Bubble Metadata */}
                            <div className="tw-bubble-meta">
                              <span className="tw-bubble-time">{formatTime(msg.created_at)}</span>
                              {isMine && (
                                <span className={`tw-check-icon ${msg.is_read ? 'read' : ''}`}>
                                  {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Reaction Badges Below Bubble */}
                      {!msg.is_deleted && hasReactions && (
                        <div className="tw-reactions-wrap">
                          {Object.entries(reactionCounts).map(([emoji, info]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`tw-reaction-badge ${info.mine ? 'mine' : ''}`}
                              onClick={() => handleReactToMessage(msg.id, emoji)}
                              title={info.mine ? 'Click to remove your reaction' : `Reacted with ${emoji}`}
                            >
                              <span>{emoji}</span>
                              {info.count > 1 && <span>{info.count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying Active Quote Banner */}
        {replyingTo && (
          <div className="tw-replying-banner">
            <div className="tw-replying-info">
              <div className="tw-replying-header">
                <Reply size={12} />
                <span>Replying to {replyingTo.sender_name}</span>
              </div>
              <div className="tw-replying-snippet">
                {replyingTo.content || (replyingTo.image_url ? '📷 Photo' : 'Message')}
              </div>
            </div>
            <button
              type="button"
              className="tw-replying-cancel-btn"
              onClick={() => setReplyingTo(null)}
              title="Cancel reply"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Selected Photo Pending Upload Preview Bar */}
        {selectedPhotoData && (
          <div className="tw-photo-preview-bar">
            <div className="tw-preview-thumb">
              <img src={selectedPhotoData} alt="Preview" className="tw-preview-img" />
              <button
                type="button"
                onClick={() => setSelectedPhotoData(null)}
                className="tw-preview-del"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Add a loving caption..."
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              className="tw-preview-caption-input"
            />
          </div>
        )}

        {/* Quick Emoji Reaction Tray */}
        {showEmojiTray && (
          <div className="tw-emoji-tray">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleQuickEmoji(emoji)}
                className="tw-emoji-btn"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Footer */}
        <form onSubmit={handleSendMessage} className="tw-chat-footer">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Emoji Tray Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiTray(!showEmojiTray)}
            className="tw-footer-btn"
            title="Add sweet emoji"
          >
            <Smile size={20} />
          </button>

          {/* Photo Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="tw-footer-btn"
            title="Share a photo"
          >
            <ImageIcon size={20} />
          </button>

          {/* Text Input Pill */}
          <div className="tw-input-pill">
            <input
              ref={inputRef}
              type="text"
              placeholder={`Message as ${currentUserName}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="tw-text-input"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedPhotoData) || isSending}
            className="tw-send-btn"
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </form>

        {/* Unsend / Delete Confirmation Warning Modal */}
        {confirmDeleteMessageId !== null && (
          <div className="tw-confirm-overlay" onClick={() => setConfirmDeleteMessageId(null)}>
            <div className="tw-confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className="tw-confirm-icon-wrap">
                <AlertTriangle size={28} />
              </div>
              <h4 className="tw-confirm-title">Unsend Message?</h4>
              <p className="tw-confirm-desc">
                This will remove this message for both you and {partnerName}. It will show as unsent.
              </p>
              <div className="tw-confirm-actions">
                <button
                  type="button"
                  className="tw-confirm-btn-cancel"
                  onClick={() => setConfirmDeleteMessageId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tw-confirm-btn-danger"
                  onClick={() => {
                    handleDeleteMessage(confirmDeleteMessageId);
                    setConfirmDeleteMessageId(null);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Unsend</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Photo Lightbox Preview */}
        {expandedImage && (
          <div
            className="tw-lightbox-overlay"
            onClick={() => setExpandedImage(null)}
          >
            <div className="tw-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={expandedImage}
                alt="Enlarged view"
                className="tw-lightbox-img"
              />
              <div className="tw-lightbox-toolbar">
                <a
                  href={expandedImage}
                  download="twogether-memory.jpg"
                  className="tw-lightbox-btn"
                  title="Download photo"
                >
                  <Download size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="tw-lightbox-btn"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
