import LiveKitRoomProvider from './LiveKitRoomProvider';

export default function VoiceRoomPanel({ channel }) {
  return <LiveKitRoomProvider channel={channel} mode="audio" />;
}
