import { useState } from 'react';
import { Sparkles, Bot, Send, CheckCircle2, Lock, Unlock, RotateCcw, Edit3, X, MessageSquareHeart } from 'lucide-react';
import type { DailyPrompt, CoupleData } from '../services/api';
import { submitDailyAnswer, resetDailyQuestion, updateDailyQuestion } from '../services/api';

interface DailyGameCardProps {
  dailyPrompt: DailyPrompt | null;
  activePartnerIndex?: number;
  partnerName: string;
  userName?: string;
  onAnswerSubmitted: (data: CoupleData) => void;
}

const QUESTION_SUGGESTIONS = [
  "What is your favorite memory of us together so far?",
  "If we could teleport to anywhere tonight for 3 hours, where would we go?",
  "What is the first thing we should do the moment we hug at the airport?",
  "What song always reminds you of me and why?",
  "What is one little thing I do that always makes you smile?",
];

export const DailyGameCard: React.FC<DailyGameCardProps> = ({
  dailyPrompt,
  activePartnerIndex = 0,
  partnerName,
  userName = 'You',
  onAnswerSubmitted,
}) => {
  const [myAnswer, setMyAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);

  const isUser1 = activePartnerIndex === 0;
  const isMyAnswered = Boolean(isUser1 ? dailyPrompt?.user1_answered : dailyPrompt?.user2_answered);
  const myAnswerText = (isUser1 ? dailyPrompt?.user1_answer : dailyPrompt?.user2_answer) || myAnswer;

  const isPartnerAnswered = Boolean(isUser1 ? dailyPrompt?.user2_answered : dailyPrompt?.user1_answered);
  // Answers are ONLY unlocked and viewable when BOTH partners have answered
  const isBothRevealed = Boolean(dailyPrompt?.is_revealed || (isMyAnswered && isPartnerAnswered));
  const partnerAnswerText = isBothRevealed
    ? ((isUser1 ? dailyPrompt?.user2_answer : dailyPrompt?.user1_answer) || '')
    : '';

  const questionText =
    dailyPrompt?.question ||
    'What is your favorite memory of us together so far?';

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await submitDailyAnswer(activePartnerIndex, myAnswer.trim());
      setMyAnswer('');
      onAnswerSubmitted(updated);
    } catch (err) {
      console.error('Failed to submit daily answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      const updated = await resetDailyQuestion();
      setMyAnswer('');
      onAnswerSubmitted(updated);
    } catch (err) {
      console.error('Failed to reset question', err);
    }
  };

  const handleSaveCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    setIsSavingQuestion(true);
    try {
      const updated = await updateDailyQuestion(customQuestion.trim());
      setIsEditingQuestion(false);
      setCustomQuestion('');
      setMyAnswer('');
      onAnswerSubmitted(updated);
    } catch (err) {
      console.error('Failed to update question', err);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  return (
    <div className="glass-panel daily-game-widget">
      {/* Header */}
      <div className="game-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'rgba(167, 123, 255, 0.15)',
            border: '1px solid rgba(167, 123, 255, 0.3)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={18} color="#A77BFF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
              AI Daily Question
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Answers unlock together
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}
            onClick={() => {
              setCustomQuestion(questionText);
              setIsEditingQuestion(true);
            }}
            title="Write your own custom question"
          >
            <Edit3 size={12} color="#A77BFF" />
            <span>Change Question</span>
          </button>

          {(isMyAnswered || isPartnerAnswered) && (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}
              onClick={handleReset}
              title="Reset today's answers"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <div className="badge badge-amber">
            <Sparkles size={12} />
            <span>+50 Pts</span>
          </div>
        </div>
      </div>

      {isEditingQuestion ? (
        <form onSubmit={handleSaveCustomQuestion} style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(167, 123, 255, 0.25)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A77BFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquareHeart size={14} />
              Set Custom Question for {partnerName}
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '2px', opacity: 0.6 }}
              onClick={() => setIsEditingQuestion(false)}
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            className="answer-textarea"
            placeholder="Type your question for both of you to answer today..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            rows={2}
            style={{ marginBottom: '10px' }}
          />

          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Quick romantic suggestions:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {QUESTION_SUGGESTIONS.map((sug, i) => (
                <button
                  type="button"
                  key={i}
                  className="btn-ghost"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    textAlign: 'left'
                  }}
                  onClick={() => setCustomQuestion(sug)}
                >
                  "{sug.length > 38 ? sug.substring(0, 38) + '...' : sug}"
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setIsEditingQuestion(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: '12px', padding: '6px 16px' }}
              disabled={!customQuestion.trim() || isSavingQuestion}
            >
              {isSavingQuestion ? 'Saving...' : 'Set Question'}
            </button>
          </div>
        </form>
      ) : (
        <div className="question-prompt-box">
          <span className="question-tag">Today's Question</span>
          <h3 className="prompt-text">"{questionText}"</h3>
        </div>
      )}

      <div className="game-content">
        {!isMyAnswered ? (
          <div className="unanswered-form-wrapper">
            {isPartnerAnswered && (
              <div
                className="partner-waiting-alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  color: '#FBBF24',
                }}
              >
                <Lock size={15} color="#F59E0B" />
                <span>
                  <strong>{partnerName}</strong> has locked in their answer! Lock in your answer below to unlock and reveal both together.
                </span>
              </div>
            )}
            <form onSubmit={handleAnswerSubmit} className="answer-form">
              <textarea
                className="answer-textarea"
                placeholder={`Write your answer here, ${userName}... (${partnerName} can't see it until you both answer!)`}
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                rows={3}
              />
              <button
                type="submit"
                className="btn-primary submit-answer-btn"
                disabled={!myAnswer.trim() || isSubmitting}
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Locking in...' : 'Lock In Answer'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="revealed-answers-container">
            {/* My submitted answer */}
            <div className="answer-bubble my-answer">
              <div className="bubble-header">
                <span className="bubble-author">Your Answer ({userName})</span>
                <CheckCircle2 size={16} color="#10B981" />
              </div>
              <p className="bubble-text">"{myAnswerText}"</p>
            </div>

            {/* Partner answer card: strictly locked until both have answered! */}
            <div className="answer-bubble partner-answer">
              <div className="bubble-header">
                <span className="bubble-author">{partnerName}'s Answer</span>
                {isBothRevealed ? (
                  <Unlock size={16} color="#10B981" />
                ) : (
                  <Lock size={16} color="#F59E0B" />
                )}
              </div>
              {isBothRevealed ? (
                <p className="bubble-text partner-revealed-text">
                  "{partnerAnswerText}"
                </p>
              ) : (
                <div className="locked-preview">
                  <p className="locked-text">
                    {isPartnerAnswered
                      ? `${partnerName} has locked in their answer! 🔒 Answers reveal together.`
                      : `${partnerName} hasn't answered yet. Answers reveal together!`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
