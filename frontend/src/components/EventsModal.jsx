import { useEffect, useState } from 'react';
import api from '../services/api';
import { CloseIcon, SpeakerIcon } from './icons';

const CalIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z" />
  </svg>
);

export default function EventsModal({ serverId, serverName, isAdmin, channels = [], onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/events/server/${serverId}`);
      setEvents(data.events);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [serverId]);

  if (creating) {
    return (
      <CreateEventWizard
        serverId={serverId}
        channels={channels}
        onClose={() => setCreating(false)}
        onCreated={() => { setCreating(false); load(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-app-floating rounded-md w-full max-w-lg shadow-elevation overflow-hidden animate-modal-in">
        <div className="px-5 py-4 flex items-center gap-3">
          <CalIcon size={20} className="text-app-interactive-active" />
          <div className="text-lg font-bold text-app-header">Events</div>
          {isAdmin && (
            <button
              onClick={() => setCreating(true)}
              className="ml-auto bg-app-500 hover:bg-app-400 text-white text-sm font-medium px-3 py-1.5 rounded press-feedback"
            >
              Create Event
            </button>
          )}
          <button onClick={onClose} className="text-app-interactive hover:text-app-interactive-active p-1 press-feedback">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="px-5 pb-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {loading && <div className="text-center text-app-header-secondary py-8 text-sm">Loading…</div>}

          {!loading && events.length === 0 && (
            <div className="text-center py-10">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-3 rounded-full bg-app-700 flex items-center justify-center text-app-interactive-active">
                  <CalIcon size={32} />
                </div>
                <span className="absolute top-2 right-3 text-app-link text-xl">✦</span>
                <span className="absolute bottom-3 left-2 text-app-yellow">✦</span>
              </div>
              <h3 className="text-lg font-bold text-app-header mt-4">There are no upcoming events.</h3>
              <p className="text-sm text-app-header-secondary mt-1">
                {isAdmin ? 'Schedule an event for any planned activity in your server.' : 'Admins can schedule events for the server.'}
              </p>
            </div>
          )}

          {!loading && events.map((e) => (
            <EventCard key={e.id} event={e} channels={channels} onChanged={load} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, channels, onChanged }) {
  const channel = channels.find((c) => c.id === event.channel_id);
  async function toggle() {
    if (event.is_interested) await api.delete(`/events/${event.id}/interested`);
    else await api.post(`/events/${event.id}/interested`);
    onChanged();
  }
  return (
    <div className="bg-app-secondary-alt rounded-lg p-4 mt-3 ring-1 ring-app-divider">
      {event.cover_url && (
        <img src={event.cover_url} alt={event.topic} className="w-full h-32 object-cover rounded mb-3" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-tiny uppercase font-bold tracking-wide text-app-link">
            {new Date(event.starts_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          <div className="font-semibold text-app-header mt-0.5 truncate">{event.topic}</div>
          {event.description && <div className="text-sm text-app-header-secondary mt-1 whitespace-pre-wrap">{event.description}</div>}
          <div className="mt-2 flex items-center gap-1 text-tiny text-app-header-secondary">
            {channel ? <><SpeakerIcon size={12} /> {channel.name}</> : event.external_location || 'Somewhere'}
          </div>
        </div>
        <button
          onClick={toggle}
          className={
            'shrink-0 text-xs font-semibold px-3 py-1.5 rounded press-feedback ' +
            (event.is_interested
              ? 'bg-app-green/20 text-app-green'
              : 'bg-app-700 hover:bg-app-600 text-app-interactive-active')
          }
        >
          {event.is_interested ? '✓ Interested' : 'Interested'}
        </button>
      </div>
      <div className="text-tiny text-app-header-secondary mt-2">
        {event.interested_count} interested
      </div>
    </div>
  );
}

// 3-step wizard like Discord
function CreateEventWizard({ serverId, channels, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [channelId, setChannelId] = useState(channels.find((c) => c.type === 'voice')?.id || '');
  const [external, setExternal] = useState('');
  const [where, setWhere] = useState('voice'); // voice | external
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date(Date.now() + 60 * 60 * 1000).toTimeString().slice(0, 5));
  const [freq, setFreq] = useState('does_not_repeat');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setErr(null);
    setSubmitting(true);
    try {
      const starts_at = new Date(`${date}T${time}`).toISOString();
      await api.post(`/events/server/${serverId}`, {
        topic,
        description,
        starts_at,
        frequency: freq,
        channel_id: where === 'voice' ? channelId || null : null,
        external_location: where === 'external' ? external : null,
      });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-app-floating rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
        <div className="grid grid-cols-3 h-[6px]">
          <span className={'transition-colors ' + (step >= 0 ? 'bg-app-link' : 'bg-app-divider')} />
          <span className={'transition-colors ml-1 ' + (step >= 1 ? 'bg-app-link' : 'bg-app-divider')} />
          <span className={'transition-colors ml-1 ' + (step >= 2 ? 'bg-app-link' : 'bg-app-divider')} />
        </div>
        <div className="px-6 py-2 flex gap-4 text-xs font-semibold">
          <span className={step === 0 ? 'text-app-link' : 'text-app-header-secondary'}>Location</span>
          <span className={step === 1 ? 'text-app-link' : 'text-app-header-secondary'}>Event Info</span>
          <span className={step === 2 ? 'text-app-link' : 'text-app-header-secondary'}>Review</span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 0 && (
            <>
              <h3 className="text-lg font-bold text-app-header">Where is your event?</h3>
              <p className="text-sm text-app-header-secondary">So no one gets lost on where to go.</p>
              <div className="space-y-2 pt-2">
                <ChoiceCard active={where === 'voice'} onClick={() => setWhere('voice')} title="🔊 Voice Channel" sub="Hang out with voice, video, screenshare, and Go Live." />
                <ChoiceCard active={where === 'external'} onClick={() => setWhere('external')} title="📍 Somewhere Else" sub="Text channel, external link, or in-person location." />
              </div>
              {where === 'voice' && (
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active text-sm"
                >
                  <option value="">— select a voice channel —</option>
                  {channels.filter((c) => c.type === 'voice' || c.type === 'video').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {where === 'external' && (
                <input
                  value={external}
                  onChange={(e) => setExternal(e.target.value)}
                  placeholder="Add a location, link, or text channel"
                  className="w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active text-sm"
                />
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h3 className="text-lg font-bold text-app-header">What's your event about?</h3>
              <p className="text-sm text-app-header-secondary">Fill out the details of your event.</p>
              <div>
                <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Event Topic <span className="text-app-red">*</span></label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What's your event?" className="mt-1 w-full bg-app-950 outline-none rounded px-3 py-2.5 text-app-interactive-active" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Start Date <span className="text-app-red">*</span></label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active" />
                </div>
                <div>
                  <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Start Time <span className="text-app-red">*</span></label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active" />
                </div>
              </div>
              <div>
                <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Event Frequency <span className="text-app-red">*</span></label>
                <select value={freq} onChange={(e) => setFreq(e.target.value)} className="mt-1 w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active">
                  <option value="does_not_repeat">Does not repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Tell people a little more about your event." className="mt-1 w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active text-sm resize-none" />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h3 className="text-lg font-bold text-app-header">Here's a preview of your event.</h3>
              <p className="text-sm text-app-header-secondary">This event will auto start when it's time.</p>
              <div className="bg-app-secondary-alt rounded p-3">
                <div className="text-tiny uppercase font-bold tracking-wide text-app-link">
                  📅 {new Date(`${date}T${time}`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div className="font-semibold text-app-header mt-0.5">{topic || '(no topic)'}</div>
                <div className="text-tiny text-app-header-secondary mt-2">
                  {where === 'voice'
                    ? '🔊 ' + (channels.find((c) => c.id === channelId)?.name || 'voice channel')
                    : '📍 ' + (external || 'somewhere')}
                </div>
              </div>
            </>
          )}
          {err && <div className="text-app-red text-sm bg-app-red/15 rounded px-3 py-2">{err}</div>}
        </div>

        <div className="bg-app-900 px-6 py-4 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-app-interactive-active text-sm hover:underline">Back</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-app-interactive-active text-sm hover:underline px-3 py-2">Cancel</button>
            {step < 2 ? (
              <button onClick={() => setStep(step + 1)} className="bg-app-500 hover:bg-app-400 text-white text-sm font-medium rounded px-5 py-2 press-feedback">Next</button>
            ) : (
              <button onClick={submit} disabled={submitting} className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded px-5 py-2 press-feedback">
                {submitting ? 'Creating…' : 'Create Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ active, onClick, title, sub }) {
  return (
    <button onClick={onClick} className={'w-full text-left flex items-center gap-3 rounded p-3 transition-colors ' + (active ? 'bg-app-500/15 ring-1 ring-app-500' : 'bg-app-secondary-alt ring-1 ring-app-divider hover:ring-app-channel')}>
      <span className={'w-4 h-4 rounded-full ' + (active ? 'bg-app-500' : 'bg-app-700')} />
      <span>
        <span className="block text-sm font-medium text-app-interactive-active">{title}</span>
        <span className="block text-tiny text-app-header-secondary mt-0.5">{sub}</span>
      </span>
    </button>
  );
}
