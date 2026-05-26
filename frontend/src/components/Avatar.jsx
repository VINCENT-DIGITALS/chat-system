import { initials } from '../lib/utils';

const statusColor = {
  online: 'bg-app-green',
  idle: 'bg-app-yellow',
  dnd: 'bg-app-red',
  offline: 'bg-[#80848e]',
};

function colorFor(name) {
  // app-style stable palette per identity
  const palette = ['#5865f2', '#23a55a', '#f0b232', '#f23f43', '#9b59b6', '#1abc9c', '#e91e63', '#11806a'];
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
            boxShadow: `0 0 0 ${ringSize}px #2b2d31`,
          }}
        />
      )}
    </div>
  );
}
