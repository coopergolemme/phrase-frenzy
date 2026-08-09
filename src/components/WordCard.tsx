interface WordCardProps {
  word: string;
}

export function WordCard({ word }: WordCardProps) {
  return (
    <div className="word-card" key={word}>
      <span className="word-card__text">{word}</span>
    </div>
  );
}
