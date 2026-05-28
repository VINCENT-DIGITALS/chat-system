import { initials } from '../lib/utils';

const statusColor = {
  online: 'bg-app-green',
  idle: 'bg-app-yellow',
  dnd: 'bg-app-red',
  offline: 'bg-app-offline',
};

function colorFor(name) {
  // Stable monochrome palette per identity — graded grays, all dark enough
  // to keep white initials legible.
  const palette = ['#5c5f66', '#46484e', '#6e7178', '#3a3c42', '#7a7d84', '#52545a', '#646770', '#2f3136'];
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function Avatar({ name, src, size = 36, status }) {
  const dim = { width: size, height: size };
  const bg = colorFor(name);
  const ringSize = Math.max(2, Math.round(size / 14));
  const dot = Math.max(10, Math.round(size / 3.2));
  return (
    <div className="relative inline-block no-drag" style={dim}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="rounded-full object-cover w-full h-full"
          draggable={false}
        />
      ) : (
        <div
          className="rounded-full text-white flex items-center justify-center font-bold select-none tracking-tight"
          style={{ ...dim, backgroundColor: bg, fontSize: Math.round(size / 2.8) }}
        >
          {initials(name)}
        </div>
      )}
      {status && (
        <span
          className={
            'absolute -bottom-0.5 -right-0.5 rounded-full ' +
            (statusColor[status] || statusColor.offline)
          }
          style={{
            width: dot,
            height: dot,
            boxShadow: `0 0 0 ${ringSize}px rgb(var(--app-surface-900))`,
          }}
        />
      )}
    </div>
  );
}
