// Message-list loading skeleton — Discord shows a similar shimmer.
export function MessageSkeletons({ count = 6 }) {
  return (
    <div className="px-4 py-2 space-y-4">
      {Array.from({ length: count }).map((_, i) => {
        const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12', 'w-4/6', 'w-3/5'];
        return (
          <div key={i} className="flex gap-4">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex gap-2">
                <div className={'skeleton h-3 ' + (i % 2 ? 'w-24' : 'w-32')} />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className={'skeleton h-3 ' + widths[i % widths.length]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChannelSkeletons({ count = 4 }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-7 w-full rounded" />
      ))}
    </div>
  );
}
