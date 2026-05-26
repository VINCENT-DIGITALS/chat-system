import { useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  VideoConference,
  useParticipants,
  ConnectionStateToast,
} from '@livekit/components-react';
import '@livekit/components-styles';
import api from '../services/api';
import { CloseIcon, SpeakerIcon, VideoIcon } from './icons';

// ---- Voice room (audio-only): custom app-style tile grid ----
function VoiceLayout({ channelName, onLeave }) {
  const participants = useParticipants();
  return (
    <div className="flex-1 flex flex-col bg-app-800 min-w-0">
      <div className="h-12 px-4 sm:px-6 flex items-center gap-2 shadow-channel-header bg-app-800 shrink-0">
        <SpeakerIcon size={18} className="text-app-green" />
        <div className="text-sm font-semibold text-app-header tracking-tight">
          {channelName}
        </div>
        <span className="text-app-header-secondary text-xs">— {participants.length} connected</span>
        <button
          onClick={onLeave}
          className="ml-auto bg-app-red hover:bg-app-red/80 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 press-feedback"
          title="Leave room"
        >
          <CloseIcon size={14} /> Disconnect
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin">
        {participants.length === 0 ? (
          <div className="text-center text-app-header-secondary py-12">
            Connecting…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {participants.map((p) => {
              const name = p.name || p.identity || '?';
              const muted = p.isMicrophoneEnabled === false;
              return (
                <div
                  key={p.identity}
                  className={
                    'aspect-square rounded-lg bg-app-900 flex flex-col items-center justify-center text-center px-3 py-4 ring-1 ring-black/20 relative transition-shadow ' +
                    (p.isSpeaking ? 'shadow-[0_0_0_2px_#23a55a]' : '')
                  }
                >
                  <div className="w-16 h-16 rounded-full bg-app-500 text-white flex items-center justify-center font-extrabold text-xl tracking-tight">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-app-interactive-active truncate w-full">
                    {name}
                  </div>
                  <div className="text-tiny mt-0.5">
                    {p.isSpeaking ? (
                      <span className="text-app-green">Speaking…</span>
                    ) : muted ? (
                      <span className="text-app-red">Muted</span>
                    ) : (
                      <span className="text-app-header-secondary">Idle</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RoomAudioRenderer />
      <ConnectionStateToast />

      <div className="bg-app-900 border-t border-app-divider px-2 py-2" data-lk-theme="default">
        <ControlBar
          variation="minimal"
          controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: true }}
        />
      </div>
    </div>
  );
}

// ---- Video room: use LiveKit's prebuilt conference layout (grid + speaker view + share) ----
function VideoLayout({ channelName, onLeave }) {
  return (
    <div className="flex-1 flex flex-col bg-app-800 min-w-0">
      <div className="h-12 px-4 sm:px-6 flex items-center gap-2 shadow-channel-header bg-app-800 shrink-0 z-10">
        <VideoIcon size={18} className="text-app-green" />
        <div className="text-sm font-semibold text-app-header tracking-tight">{channelName}</div>
        <button
          onClick={onLeave}
          className="ml-auto bg-app-red hover:bg-app-red/80 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 press-feedback"
        >
          <CloseIcon size={14} /> Disconnect
        </button>
      </div>
      <div className="flex-1 min-h-0" data-lk-theme="default">
        <VideoConference />
      </div>
    </div>
  );
}

// ---- Lobby (pre-join): hero + button + stub info if backend isn't configured ----
function Lobby({ channel, mode, onJoin, loading, error, tokenInfo }) {
  const Icon = mode === 'video' ? VideoIcon : SpeakerIcon;
  const title = mode === 'video' ? 'Video Channel' : 'Voice Channel';
  const verb = mode === 'video' ? 'Join Video Room' : 'Join Voice Room';

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 bg-app-800 overflow-y-auto">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-app-500/15 animate-pulse-soft" />
        <div className="absolute inset-3 rounded-full bg-app-500/30" />
        <div className="absolute inset-6 rounded-full bg-app-500 text-white flex items-center justify-center">
          <Icon size={32} />
        </div>
      </div>
      <div className="text-tiny uppercase tracking-wider text-app-header-secondary mt-5 font-bold">
        {title}
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-app-header mt-1 tracking-tight">
        {channel.name}
      </h2>
      <p className="text-app-header-secondary mt-2 max-w-md text-sm">
        {mode === 'video'
          ? 'Turn on your camera and microphone to start a video call with everyone in this channel.'
          : 'Hop in and start talking. Anyone in this channel will hear you.'}
      </p>

      <div className="mt-6 w-full max-w-md">
        <button
          onClick={onJoin}
          disabled={loading}
          className="w-full sm:w-auto bg-app-green hover:bg-[#1f8d4d] disabled:opacity-60 text-white px-6 py-2.5 rounded-md font-semibold transition-colors press-feedback shadow-elevation"
        >
          {loading ? 'Connecting…' : verb}
        </button>

        {error && (
          <div className="mt-3 text-app-red text-sm bg-app-red/15 rounded px-3 py-2">
            {error}
          </div>
        )}

        {tokenInfo && tokenInfo.stub && (
          <div className="mt-5 text-left bg-app-900 rounded-md p-4 text-xs text-app-text border border-app-divider">
            <div className="font-semibold text-app-yellow">LiveKit not yet configured</div>
            <p className="text-app-header-secondary mt-1">{tokenInfo.message}</p>
            <div className="mt-3 font-mono text-[11px] space-y-0.5">
              <div>room: <span className="text-app-interactive-active">{tokenInfo.room}</span></div>
              <div>identity: <span className="text-app-interactive-active">{tokenInfo.identity}</span></div>
            </div>
            <details className="mt-3 text-app-header-secondary" open>
              <summary className="cursor-pointer text-app-link hover:underline font-semibold">How to enable voice/video</summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-tiny leading-relaxed">
                <li>Sign up at <a className="text-app-link hover:underline" href="https://cloud.livekit.io" target="_blank" rel="noreferrer">cloud.livekit.io</a> (free tier — no card needed).</li>
                <li>Create a project. Copy the <code>API Key</code>, <code>API Secret</code>, and the <code>wss://</code> Project URL.</li>
                <li>Open <code>backend/.env</code> and set:
                  <pre className="bg-black/40 rounded mt-1 p-2 text-[10px] leading-snug overflow-x-auto">{`LIVEKIT_API_KEY=APIxxxxx
LIVEKIT_API_SECRET=secret-xxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud`}</pre>
                </li>
                <li>Restart the backend (<code>npm run dev</code> in <code>backend/</code>) and click Join again.</li>
              </ol>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveKitRoomProvider({ channel, mode = 'audio' }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function join() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/livekit/token', { channel_id: channel.id });
      setTokenInfo(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function leave() {
    setTokenInfo(null);
  }

  // Connected: real token + URL → enter the live room.
  if (tokenInfo && tokenInfo.token && tokenInfo.url) {
    return (
      <LiveKitRoom
        token={tokenInfo.token}
        serverUrl={tokenInfo.url}
        connect={true}
        audio={true}
        video={mode === 'video'}
        onDisconnected={leave}
        onError={(e) => setError(e.message)}
        data-lk-theme="default"
        className="flex-1 flex min-h-0"
      >
        {mode === 'video'
          ? <VideoLayout channelName={channel.name} onLeave={leave} />
          : <VoiceLayout channelName={channel.name} onLeave={leave} />}
      </LiveKitRoom>
    );
  }

  // Lobby (not connected yet, or backend returned a stub).
  return (
    <Lobby
      channel={channel}
      mode={mode}
      onJoin={join}
      loading={loading}
      error={error}
      tokenInfo={tokenInfo}
    />
  );
}
