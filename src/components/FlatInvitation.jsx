'use client';

// The invitation as plain HTML + CSS, for devices that can't run the 3D book
// (no WebGL2, the GPU gave up, or it ran out of memory). Same content, same
// event colours, no canvas: it works on anything that can show a web page.

const Lines = ({ text }) =>
  String(text)
    .split('\n')
    .map((line, i, all) => (
      <span key={i}>
        {line}
        {i < all.length - 1 && <br />}
      </span>
    ));

const Text = ({ as: Tag = 'p', className, value }) =>
  value ? (
    <Tag className={className}>
      <Lines text={value} />
    </Tag>
  ) : null;

/** A small foil lotus, like the one printed on the 3D card. */
const Lotus = () => (
  <svg className="flat__emblem" viewBox="0 0 64 40" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
      <path d="M32 4c6 8 6 20 0 30-6-10-6-22 0-30Z" />
      <path d="M31 33C24 28 18 20 17 11c8 3 13 11 15 21" />
      <path d="M33 33c7-5 13-13 14-22-8 3-13 11-15 21" />
      <path d="M30 34C22 33 12 28 6 20c9-1 18 4 24 13" />
      <path d="M34 34c8-1 18-6 24-14-9-1-18 4-24 13" />
      <path d="M12 36h40" strokeLinecap="round" />
    </g>
  </svg>
);

export default function FlatInvitation({ couple, header, events, selected, onSelect }) {
  const event = events[selected] || events[0];
  const d = event?.detail || {};
  const theme = event?.theme || {};
  const cardStyle = {
    '--card-paper': theme.paper,
    '--card-ink': theme.ink,
    '--card-soft': theme.soft,
    '--card-accent': theme.accent,
  };

  return (
    <div className="flat">
      <div className="flat__inner">
        <header className="flat__cover">
          <p className="flat__mono" aria-hidden="true">
            {couple.monogram.first}
            <i>&amp;</i>
            {couple.monogram.second}
          </p>
          <h1 className="flat__names">{couple.names}</h1>
          <p className="flat__place">{couple.location}</p>
        </header>

        <nav className="flat__tabs" aria-label="Wedding events">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className={`flat__tab ${i === selected ? 'is-active' : ''}`}
              aria-pressed={i === selected}
              onClick={() => onSelect(i)}
              style={{ '--tab-paper': e.theme?.paper, '--tab-ink': e.theme?.ink, '--tab-accent': e.theme?.accent }}
            >
              <span className="flat__swatch" aria-hidden="true" />
              {e.title}
            </button>
          ))}
        </nav>

        {event && (
          <article key={event.id} className="flat__card" style={cardStyle} aria-live="polite">
            <Text className="flat__blessing" value={header.blessing} />
            {header.emblemImage ? (
              // a plain <img>: optional user artwork, no Next image pipeline needed
              // eslint-disable-next-line @next/next/no-img-element
              <img className="flat__emblem flat__emblem--image" src={header.emblemImage} alt="" />
            ) : (
              <Lotus />
            )}
            <Text className="flat__hosts" value={header.hosts} />
            <Text className="flat__hosts" value={d.invitationLine} />
            <Text className="flat__person" value={header.bride} />
            <Text className="flat__joiner" value={header.joiner} />
            <Text className="flat__person" value={header.groom} />
            <Text className="flat__parents" value={header.groomParents} />
            <span className="flat__divider" aria-hidden="true" />
            <Text as="h2" className="flat__title" value={event.title} />
            <Text className="flat__tagline" value={d.tagline} />
            <div className="flat__when">
              <Text className="flat__date" value={d.date} />
              <Text className="flat__time" value={d.time} />
            </div>
            <div className="flat__where">
              <Text className="flat__venue" value={d.venue} />
              <Text className="flat__address" value={d.address} />
            </div>
            {(d.dressCode || d.note) && (
              <div className="flat__extra">
                <Text className="flat__dress" value={d.dressCode} />
                <Text className="flat__note" value={d.note} />
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
