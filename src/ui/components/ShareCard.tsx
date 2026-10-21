/** "Called it" share card (1200×630 ratio): the call, its grade and the moment. Display name only; no prize language. */
export function ShareCard({ displayName, title, grade, moment }: { displayName: string; title: string; grade: string; moment: string }): React.JSX.Element {
  return (
    <figure className="ui-share" aria-label={`Share card: ${title}`}>
      <span className="ui-share-brand">ALTER EGO</span>
      <p className="ui-share-title">{title}</p>
      <figcaption className="ui-share-foot">
        <span>{displayName} · {moment}</span>
        <span className="ui-share-grade tabular">{grade}</span>
      </figcaption>
    </figure>
  );
}
