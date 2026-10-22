/**
 * Stream-Delay Honesty Badge: how far behind real time the data is. Recorded replays say they are not live and when
 * the match was recorded; a live feed states its measured delay.
 */
export function StreamDelayBadge(props: { live: false; recordedAt: string } | { live: true; delaySeconds: number }): React.JSX.Element {
  const text = props.live
    ? `Live · about ${Math.round(props.delaySeconds)} s behind`
    : `Not live · recorded ${new Date(props.recordedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
  return <span className="ui-badge ui-delay" data-live={props.live} data-testid="delay-badge">{text}</span>;
}
