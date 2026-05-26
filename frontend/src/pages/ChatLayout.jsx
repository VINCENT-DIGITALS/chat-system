import { useEffect } from 'react';
import ServerSidebar from '../components/ServerSidebar';
import ChannelSidebar from '../components/ChannelSidebar';
import ChatArea from '../components/ChatArea';
import DMSidebar from '../components/DMSidebar';
import DMArea from '../components/DMArea';
import MemberList from '../components/MemberList';
import MaintenanceBanner from '../components/MaintenanceBanner';
import { useChatStore } from '../store/chat';
import { useUIStore } from '../store/ui';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { classNames } from '../lib/utils';

export default function ChatLayout() {
  const loadServers = useChatStore((s) => s.loadServers);
  const loadDMs     = useChatStore((s) => s.loadDMs);
  const currentChannelId      = useChatStore((s) => s.currentChannelId);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const currentServerId       = useChatStore((s) => s.currentServerId);
  const { leftOpen, rightOpen, closeAll } = useUIStore();
  useSocketEvents();

  useEffect(() => {
    loadServers().catch(() => {});
    loadDMs().catch(() => {});
  }, [loadServers, loadDMs]);

  // Auto-close drawers when channel / conversation changes (mobile UX)
  useEffect(() => {
    closeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId, currentConversationId]);

  const inDMMode = !currentServerId;

  return (
    <div className="h-[100dvh] flex flex-col bg-app-950 text-app-text overflow-hidden">
      <MaintenanceBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {(leftOpen || rightOpen) && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeAll}
            className="md:hidden absolute inset-0 bg-black/60 z-30 animate-fade-in"
          />
        )}

        <div
          className={classNames(
            'absolute md:static inset-y-0 left-0 z-40 flex h-full md:h-auto md:translate-x-0 transition-transform duration-200 ease-out shadow-elevation md:shadow-none',
            leftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <ServerSidebar />
          {inDMMode ? <DMSidebar /> : <ChannelSidebar />}
        </div>

        {inDMMode ? <DMArea /> : <ChatArea />}

        {!inDMMode && (
          <div
            className={classNames(
              'absolute lg:static inset-y-0 right-0 z-40 lg:translate-x-0 transition-transform duration-200 ease-out shadow-elevation lg:shadow-none',
              rightOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
            )}
          >
            <MemberList />
          </div>
        )}
      </div>
    </div>
  );
}
