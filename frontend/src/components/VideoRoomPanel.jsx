import LiveKitRoomProvider from './LiveKitRoomProvider';

export default function VideoRoomPanel({ channel }) {
  return <LiveKitRoomProvider channel={channel} mode="video" />;
}
