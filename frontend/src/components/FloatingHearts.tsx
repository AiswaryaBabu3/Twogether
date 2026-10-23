
export interface FloatingHeartItem {
  id: number;
  x: number;
  size: number;
  color: string;
}

interface FloatingHeartsProps {
  hearts: FloatingHeartItem[];
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ hearts }) => {
  return (
    <div className="floating-hearts-container" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="floating-heart"
          style={{
            left: `${h.x}%`,
            fontSize: `${h.size}px`,
            color: h.color,
          }}
        >
          💖
        </span>
      ))}
    </div>
  );
};
