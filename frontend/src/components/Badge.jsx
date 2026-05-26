// app-style inline badges (BOT, ADMIN, OWNER)
export function BotBadge({ size = 'sm' }) {
  const sizes = {
    sm: 'text-[10px] px-[5px] py-[1px] h-4',
    md: 'text-[11px] px-[6px] py-[1.5px] h-[18px]',
  };
  return (
    <span
      className={
        'inline-flex items-center justify-center rounded-[4px] bg-app-500 text-white font-bold uppercase tracking-wide leading-none ml-1 align-middle ' +
        (sizes[size] || sizes.sm)
      }
      title="Bot account"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="mr-0.5">
        <path d="M12 2c.6 0 1 .4 1 1v1.05A8 8 0 0 1 20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a8 8 0 0 1 7-7.95V3c0-.6.4-1 1-1z" />
      </svg>
      BOT
    </span>
  );
}

export function AdminBadge() {
  return (
    <span
      title="System Admin"
      className="inline-flex items-center justify-center rounded-[4px] bg-app-link/20 text-app-link text-[10px] px-[5px] py-[1px] h-4 font-bold uppercase tracking-wide leading-none ml-1 align-middle"
    >
      ADMIN
    </span>
  );
}
