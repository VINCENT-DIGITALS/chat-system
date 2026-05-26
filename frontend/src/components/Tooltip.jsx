// app-style tooltip — 200ms delay, "background-floating" surface, arrow caret.
export default function Tooltip({ children, label, side = 'right', className = '' }) {
  const positions = {
    right:
      'left-full top-1/2 -translate-y-1/2 ml-2',
    left:
      'right-full top-1/2 -translate-y-1/2 mr-2',
    top:
      'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom:
      'top-full left-1/2 -translate-x-1/2 mt-2',
  };
  const arrows = {
    right:
      'absolute right-full top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent border-r-[4px] border-r-app-floating',
    left:
      'absolute left-full top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-app-floating',
    top:
      'absolute top-full left-1/2 -translate-x-1/2 border-x-[4px] border-x-transparent border-t-[4px] border-t-app-floating',
    bottom:
      'absolute bottom-full left-1/2 -translate-x-1/2 border-x-[4px] border-x-transparent border-b-[4px] border-b-app-floating',
  };
  return (
    <div className={'has-tooltip relative inline-flex ' + className}>
      {children}
      <span
        role="tooltip"
        className={
          'tooltip pointer-events-none absolute z-50 px-2 py-1.5 rounded bg-app-floating text-app-interactive-active text-xs font-semibold whitespace-nowrap shadow-elevation opacity-0 ' +
          positions[side] +
          ' transition-opacity duration-100'
        }
      >
        {label}
        <span className={arrows[side]} />
      </span>
    </div>
  );
}
