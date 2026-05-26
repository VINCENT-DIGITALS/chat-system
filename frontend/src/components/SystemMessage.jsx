// app-style system message (joined/left/created/etc.).
// Renders inline with a green/red arrow icon and italic gray text — no avatar.
export default function SystemMessage({ message }) {
  const t = message.type;
  let icon, color, verb;
  if (t === 'system_join') { icon = '→'; color = 'text-app-green'; verb = 'joined the party!'; }
  else if (t === 'system_leave') { icon = '←'; color = 'text-app-red'; verb = 'left the server.'; }
  else if (t === 'system_create') { icon = '★'; color = 'text-app-yellow'; verb = 'created this server.'; }
  else { icon = 'ⓘ'; color = 'text-app-channel'; verb = message.content || ''; }

  const name = message.display_name || message.username;

  return (
    <div className="group/msg flex items-center gap-3 px-4 py-[2px] mt-1 hover:bg-[rgba(4,4,5,0.07)]">
      <div className="w-10 shrink-0 text-right pr-1">
        <span className={'inline-block ' + color + ' text-lg leading-none'}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1 text-[15px] text-app-header-secondary">
        <span className="font-medium text-app-interactive-active">{name}</span>{' '}
        <span>{message.content || verb}</span>
        <span className="ml-2 text-tiny text-app-muted">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
