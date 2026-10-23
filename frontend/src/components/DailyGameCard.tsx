import { useState } from 'react';
import { Sparkles, Bot, Send, CheckCircle2, Lock, Unlock, Trophy } from 'lucide-react';
import type { DailyPrompt, CoupleData } from '../services/api';
import { submitDailyAnswer } from '../services/api';

interface DailyGameCardProps {
  dailyPrompt: DailyPrompt | null;
  onAnswerSubmitted: (data: CoupleData) => void;
  partnerName: string;
}

export const DailyGameCard: React.FC<DailyGameCardProps> = ({
  dailyPrompt,
  onAnswerSubmitted,
  partnerName,
}) => {
  const [activeTab, setActiveTab] = useState<'question' | 'trivia'>('question');
  const [myAnswer, setMyAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [partnerRevealed, setPartnerRevealed] = useState<boolean>(false);

  // Trivia state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState<boolean>(false);

  const isUser1Answered = dailyPrompt?.user1_answered || false;
  const user1AnswerText = dailyPrompt?.user1_answer || myAnswer;
  const user2AnswerText = dailyPrompt?.user2_answer || "A rooftop noodle bar in Shinjuku, Tokyo watching the rain and sharing hot gyozas under one coat! 🥟🌧️";
  const questionText = dailyPrompt?.question || "If we could magically teleport together to any spot in the world for just 3 hours tonight, where would we go and what would we eat?";

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await submitDailyAnswer(0, myAnswer.trim());
      onAnswerSubmitted(updated);
    } catch (err) {
      console.error('Failed to submit daily answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel daily-game-widget">
      {/* Header Tabs */}
      <div className="game-header">
        <div className="game-tabs">
          <button
            type="button"
            className={`game-tab-btn ${activeTab === 'question' ? 'active' : ''}`}
            onClick={() => setActiveTab('question')}
          >
            <Bot size={16} />
            <span>AI Daily Question</span>
          </button>
          <button
            type="button"
            className={`game-tab-btn ${activeTab === 'trivia' ? 'active' : ''}`}
            onClick={() => setActiveTab('trivia')}
          >
            <Trophy size={16} />
            <span>Couple Trivia</span>
          </button>
        </div>
        <div className="badge badge-amber">
          <Sparkles size={12} />
          <span>+50 Pts</span>
        </div>
      </div>

      {activeTab === 'question' ? (
        <div className="game-content">
          <div className="question-prompt-box">
            <span className="question-tag">Today's Deep Prompt</span>
            <h3 className="prompt-text">"{questionText}"</h3>
          </div>

          {!isUser1Answered && !myAnswer ? (
            <form onSubmit={handleAnswerSubmit} className="answer-form">
              <textarea
                className="answer-textarea"
                placeholder={`Write your answer here... (${partnerName} can't see it until you both answer!)`}
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
          ) : (
            <div className="revealed-answers-container">
              {/* My submitted answer */}
              <div className="answer-bubble my-answer">
                <div className="bubble-header">
                  <span className="bubble-author">Your Answer</span>
                  <CheckCircle2 size={16} color="#10B981" />
                </div>
                <p className="bubble-text">"{user1AnswerText}"</p>
              </div>

              {/* Partner answer reveal card */}
              <div className="answer-bubble partner-answer">
                <div className="bubble-header">
                  <span className="bubble-author">{partnerName}'s Answer</span>
                  {partnerRevealed || dailyPrompt?.is_revealed ? (
                    <Unlock size={16} color="#A77BFF" />
                  ) : (
                    <Lock size={16} color="#F59E0B" />
                  )}
                </div>
                {partnerRevealed || dailyPrompt?.is_revealed ? (
                  <p className="bubble-text partner-revealed-text">
                    "{user2AnswerText}"
                  </p>
                ) : (
                  <div className="locked-preview">
                    <p className="locked-text">{partnerName} has locked in her answer!</p>
                    <button
                      type="button"
                      className="btn-secondary reveal-btn"
                      onClick={() => setPartnerRevealed(true)}
                    >
                      <Sparkles size={14} color="#FF758F" />
                      <span>Reveal {partnerName}'s Answer</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Couple Trivia tab */
        <div className="trivia-content">
          <div className="trivia-question">
            <span className="question-tag">Trivia of the Day</span>
            <p className="prompt-text">What was the exact date of your first FaceTime call?</p>
          </div>
          <div className="trivia-options">
            {['November 12, 2024', 'December 3, 2024', 'January 15, 2025', 'February 14, 2025'].map(
              (opt, idx) => (
                <button
                  type="button"
                  key={opt}
                  className={`trivia-opt-btn ${
                    selectedOption === idx ? (idx === 1 ? 'correct' : 'wrong') : ''
                  }`}
                  onClick={() => {
                    setSelectedOption(idx);
                    setTriviaAnswered(true);
                  }}
                  disabled={triviaAnswered}
                >
                  <span className="opt-letter">{String.fromCharCode(65 + idx)}</span>
                  <span>{opt}</span>
                  {triviaAnswered && idx === 1 && (
                    <CheckCircle2 size={16} color="#10B981" style={{ marginLeft: 'auto' }} />
                  )}
                </button>
              )
            )}
          </div>
          {triviaAnswered && (
            <div className="trivia-result-badge">
              {selectedOption === 1 ? (
                <span className="text-emerald">✨ Correct! December 3rd, 2024 (Call lasted 4 hrs 12 mins)</span>
              ) : (
                <span className="text-rose">Almost! It was December 3rd, 2024! 💕</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
