// Tiny toast — appears at bottom-center with a brief fade/slide.
export default function Toast({ show, children, kind = 'success' }) {
  const kinds = {
    success: 'bg-app-green text-white',
    info: 'bg-app-500 text-white',
    danger: 'bg-app-red text-white',
  };
  return (
    <div
      aria-live="polite"
      className={
        'fixed left-1/2 -translate-x-1/2 bottom-6 z-[100] px-4 py-2 rounded-full text-xs font-semibold shadow-elevation transition-all duration-150 ease-app ' +
        kinds[kind] +
        (show
          ? ' opacity-100 translate-y-0 pointer-events-auto'
          : ' opacity-0 translate-y-3 pointer-events-none')
      }
    >
      {children}
    </div>
  );
}
