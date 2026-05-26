// app-style SVG icon set.

const base = 'inline-block flex-shrink-0';

function S({ children, className = '', size = 20, viewBox = '0 0 24 24', stroke = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : undefined}
      strokeWidth={stroke ? 2 : undefined}
      strokeLinecap={stroke ? 'round' : undefined}
      strokeLinejoin={stroke ? 'round' : undefined}
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Discord's exact hashtag glyph (two pairs of diagonal lines, no horizontal bars).
export const HashIcon = (p) => (
  <S {...p}>
    <path d="M14.5 3.5l-1 4h-3l1-4a1 1 0 1 0-2-.5l-1 4.5H5a1 1 0 0 0 0 2h3l-1 4H4a1 1 0 0 0 0 2h2.5l-1 4a1 1 0 1 0 2 .5l1.1-4.5h3l-1 4a1 1 0 1 0 2 .5l1.1-4.5H17a1 1 0 0 0 0-2h-3l1-4h3a1 1 0 0 0 0-2h-2.5l1-4a1 1 0 1 0-2-.5zM10 9.5h3l-1 4h-3l1-4z" />
  </S>
);

// Cleaner speaker waves (matches Discord's icon-set proportions)
export const SpeakerIcon = (p) => (
  <S {...p}>
    <path d="M11.38 3.05a1 1 0 0 1 .62.93v16.04a1 1 0 0 1-1.66.75L5.34 16H3a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.34l5-4.77a1 1 0 0 1 1.04-.18zM14.83 7.7a1 1 0 0 1 1.42 0 6 6 0 0 1 0 8.59 1 1 0 1 1-1.42-1.42 4 4 0 0 0 0-5.76 1 1 0 0 1 0-1.41zM17.66 4.87a1 1 0 0 1 1.41 0 10 10 0 0 1 0 14.14 1 1 0 0 1-1.41-1.41 8 8 0 0 0 0-11.32 1 1 0 0 1 0-1.41z" />
  </S>
);

// Discord's video-channel camera glyph
export const VideoIcon = (p) => (
  <S {...p}>
    <path d="M21.5 5.5a1.5 1.5 0 0 0-2.27-1.29l-3.23 1.94v8.69l3.23 1.94a1.5 1.5 0 0 0 2.27-1.29V5.5zM3 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
  </S>
);

export const PlusIcon = (p) => (
  <S {...p} stroke><path d="M12 5v14M5 12h14" /></S>
);

export const MenuIcon = (p) => (
  <S {...p} stroke><path d="M4 6h16M4 12h16M4 18h16" /></S>
);

export const UsersIcon = (p) => (
  <S {...p}><path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 19a7 7 0 0 1 14 0v1H2v-1zm16-1v2h4v-1.5A4.5 4.5 0 0 0 17.5 14h-.7a5.97 5.97 0 0 1 1.2 4z" /></S>
);

export const CogIcon = (p) => (
  <S {...p}><path d="M19.14 12.94c.04-.31.06-.62.06-.94 0-.32-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4c-.25 0-.45.18-.49.42l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.63 8.48c-.13.22-.07.49.12.61l2.03 1.58c-.04.31-.06.63-.06.94 0 .31.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.39 1.03.7 1.62.94l.36 2.54c.04.24.24.42.49.42h4c.25 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 0 7z" /></S>
);

export const LogoutIcon = (p) => (
  <S {...p} stroke><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>
);

export const SendIcon = (p) => (
  <S {...p}><path d="M3 12l18-8-4 18-5-7-9-3z" /></S>
);

export const SearchIcon = (p) => (
  <S {...p} stroke><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></S>
);

export const CloseIcon = (p) => (
  <S {...p} stroke><path d="M18 6L6 18M6 6l12 12" /></S>
);

// Discord's "Explore Public Servers" compass — circle with NESW diamond inside.
export const CompassIcon = (p) => (
  <S {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-3-5l1.4-4.6L15 9l-1.4 4.6L9 15zm3-7a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </S>
);

export const InboxIcon = (p) => (
  <S {...p} stroke>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </S>
);

export const AtSignIcon = (p) => (
  <S {...p} stroke>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
  </S>
);

export const ChevronDownIcon = (p) => (
  <S {...p} stroke><path d="M6 9l6 6 6-6" /></S>
);

export const TrashIcon = (p) => (
  <S {...p} stroke><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></S>
);

export const ShieldIcon = (p) => (
  <S {...p} stroke><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></S>
);

export const CrownIcon = (p) => (
  <S {...p}><path d="M3 7l4 4 5-6 5 6 4-4-2 11H5L3 7z" /></S>
);

export const EditIcon = (p) => (
  <S {...p} stroke>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </S>
);

export const ImageIcon = (p) => (
  <S {...p} stroke>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </S>
);

export const KeyIcon = (p) => (
  <S {...p} stroke>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M21 2l-9.6 9.6M15 8l3 3M19 5l3 3" />
  </S>
);

export const BellIcon = (p) => (
  <S {...p} stroke>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </S>
);

export const PaintIcon = (p) => (
  <S {...p} stroke>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.5 0 1-.5 1-1v-1c0-.5-.5-1-1-1-1 0-2-1-2-2s1-2 2-2h2c3.3 0 6-2.7 6-6 0-4.5-4.5-7-8-7z" />
  </S>
);

export const BotIcon = (p) => (
  <S {...p}>
    <path d="M12 2c.6 0 1 .4 1 1v1.05A8 8 0 0 1 20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a8 8 0 0 1 7-7.95V3c0-.6.4-1 1-1zM8 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
  </S>
);

export const LockIcon = (p) => (
  <S {...p} stroke>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </S>
);

export const MicIcon = (p) => (
  <S {...p}><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" /></S>
);

export const HeadphoneIcon = (p) => (
  <S {...p} stroke>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1v-7h2a2 2 0 0 1 1 0v5zM3 19a2 2 0 0 0 2 2h1v-7H4a2 2 0 0 0-1 0v5z" />
  </S>
);

export const StarIcon = (p) => (
  <S {...p}><path d="M12 2l3 6.5 7 1-5 5 1.5 7L12 18l-6.5 3.5L7 14.5 2 9.5l7-1L12 2z" /></S>
);

export const ChevronRightIcon = (p) => (
  <S {...p} stroke><path d="M9 6l6 6-6 6" /></S>
);

export const UploadIcon = (p) => (
  <S {...p} stroke>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5M12 3v12" />
  </S>
);

export const CheckIcon = (p) => (
  <S {...p} stroke><path d="M20 6L9 17l-5-5" /></S>
);

export const ChatBubbleIcon = (p) => (
  <S {...p} stroke>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </S>
);

export const HelpIcon = (p) => (
  <S {...p} stroke>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </S>
);

export const GiftIcon = (p) => (
  <S {...p}>
    <path d="M20 7h-2.7a2.5 2.5 0 1 0-4.3-2.5A2.5 2.5 0 1 0 8.7 7H6a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h6V8h2v4h6a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2zm-9-2a1 1 0 1 1 0 2h-1V6a1 1 0 0 1 1-1zm3 2h-1V5a1 1 0 1 1 1 2zM5 13v7a2 2 0 0 0 2 2h4v-9H5zm14 0h-6v9h4a2 2 0 0 0 2-2v-7z" />
  </S>
);

export const GifIcon = (p) => (
  <S {...p}>
    <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zm3.1 4h1.4v.85c0 .25-.06.46-.18.65a1.21 1.21 0 0 1-.52.45c-.22.1-.47.15-.75.15s-.53-.07-.74-.19a1.36 1.36 0 0 1-.5-.55c-.12-.23-.18-.49-.18-.78v-1.86c0-.3.07-.55.2-.78.14-.22.34-.4.59-.51A2.04 2.04 0 0 1 5.4 10c.39 0 .73.07 1 .22.27.15.48.35.62.6.14.26.21.55.21.88h-1.4c0-.13-.03-.24-.08-.32a.51.51 0 0 0-.2-.2.65.65 0 0 0-.32-.07.61.61 0 0 0-.42.15.55.55 0 0 0-.17.42v1.88c0 .19.07.34.2.45a.7.7 0 0 0 .5.16.74.74 0 0 0 .39-.09.6.6 0 0 0 .24-.26c.05-.11.08-.25.08-.41V13H5.1v-1zM9 10h1.4v4H9v-4zm2.5 0h3.1v.93h-1.7v.75h1.5v.92h-1.5V14h-1.4v-4zm4 0h3.1v.93h-1.7v.78h1.5v.92h-1.5V14h-1.4v-4z" />
  </S>
);

export const StickerIcon = (p) => (
  <S {...p} stroke>
    <path d="M21 14l-7 7H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9z" />
    <path d="M14 21v-5a2 2 0 0 1 2-2h5" />
  </S>
);

export const EmojiIcon = (p) => (
  <S {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM8 9.5A1.5 1.5 0 1 1 9.5 11 1.5 1.5 0 0 1 8 9.5zm5 0A1.5 1.5 0 1 1 14.5 11 1.5 1.5 0 0 1 13 9.5zM16.16 14.16C15.32 15.4 13.96 16 12 16s-3.32-.6-4.16-1.84a1 1 0 1 1 1.66-1.12c.46.68 1.26 1.06 2.5 1.06s2.04-.38 2.5-1.06a1 1 0 1 1 1.66 1.12z" />
  </S>
);

export const ReplyIcon = (p) => (
  <S {...p} stroke>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 5 5v6" />
  </S>
);

export const ShareIcon = (p) => (
  <S {...p}>
    <path d="M22 11L13 2v5C7 8 4 12 3 17c2.5-3.5 6-5 10-5v5l9-6z" />
  </S>
);

export const MoreHIcon = (p) => (
  <S {...p}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </S>
);

export const PinIcon = (p) => (
  <S {...p}>
    <path d="M16 2l6 6-3 1-1 5-4-4-7 7-1-1 7-7-4-4 5-1 2-2z" />
  </S>
);

export const InboxStackIcon = (p) => (
  <S {...p} stroke>
    <path d="M3 12h6l2 3h2l2-3h6" />
    <path d="M5 5l-2 7v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6l-2-7H5z" />
  </S>
);

export const BellNotifIcon = (p) => (
  <S {...p} stroke>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </S>
);

export const AddMemberIcon = (p) => (
  <S {...p}>
    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 5v2h11v-2c0-1.5.5-2.7 1.3-3.7C12.7 13.3 10.7 13 9 13zm10-3h-2v-3h-2v3h-3v2h3v3h2v-3h2v-2z" />
  </S>
);

export const HashChevronIcon = (p) => (
  <S {...p} stroke><path d="M6 9l6 6 6-6" /></S>
);

export const InvitePeopleIcon = (p) => (
  <S {...p}>
    <path d="M14 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-4 6c-4 0-8 2-8 6v2h12v-2c0-1.8.7-3.3 1.8-4.5C13.7 14.2 12 14 10 14zm10-2v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z" />
  </S>
);

export const ServerBoostIcon = (p) => (
  <S {...p}>
    <path d="M12 2L4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4zm-1 6l3 3-3 3-3-3 3-3z" />
  </S>
);

export const LeaveIcon = (p) => (
  <S {...p} stroke>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </S>
);

export const ThreadIcon = (p) => (
  <S {...p}>
    <path d="M19 4H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3v4l4-4h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-2 8H7v-2h10v2zm0-4H7V6h10v2z" />
  </S>
);

export const PollIcon = (p) => (
  <S {...p}>
    <path d="M4 4h2v16H4V4zm4 6h2v10H8V10zm4-4h2v14h-2V6zm4 8h2v6h-2v-6z" />
  </S>
);

export const AppsIcon = (p) => (
  <S {...p}>
    <path d="M12 2l3 5 5 1-3.5 3.5L17 17l-5-2.5L7 17l.5-5.5L4 8l5-1z" />
  </S>
);

export const VoteIcon = (p) => (
  <S {...p} stroke>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </S>
);

// app-exact: a hash with a small padlock for private text channels.
export const LockedHashIcon = (p) => (
  <S {...p}>
    <path d="M14 3.5l-1 4h-3l1-4a1 1 0 1 0-2-.5L8 7.5H5a1 1 0 0 0 0 2h2.5l-1 4H4a1 1 0 0 0 0 2h2l-.9 4a1 1 0 1 0 2 .5L8.1 15.5h3l-.9 4a1 1 0 1 0 2 .5l1.1-4.5h2.3a1 1 0 0 0 0-2h-1.9l1-4h2a1 1 0 0 0 0-2h-1.6l1-4a1 1 0 1 0-2-.5zM9.5 9.5h3l-1 4h-3l1-4zM16 11h6v4h-6v-4zm5-1h-4V8.5a2 2 0 0 1 4 0V10z" />
  </S>
);

// Padlock that sits before voice/video channel names in Discord
export const LockedChannelIcon = (p) => (
  <S {...p}>
    <path d="M17 9V7a5 5 0 0 0-10 0v2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM9 7a3 3 0 0 1 6 0v2H9V7z" />
  </S>
);

// Discord's calendar/Events icon — clean grid with header bar.
export const CalendarIcon = (p) => (
  <S {...p}>
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" />
  </S>
);

// Wumpus-ish home / DMs button
export const HomeIcon = (p) => (
  <S {...p}>
    <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zM8 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 19c2.21 0 4-1.34 4-3H8c0 1.66 1.79 3 4 3z" />
  </S>
);
