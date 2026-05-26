import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';

export function useSocketEvents() {
  const token = useAuthStore((s) => s.token);
  const currentChannelId = useChatStore((s) => s.currentChannelId);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(token);
    const store = useChatStore;

    const onMsgNew  = (msg) => store.getState().addMessage(msg);
    const onMsgEdit = (msg) => store.getState().applyMessageEdit(msg);
    const onMsgDel  = (p)   => store.getState().applyMessageDelete(p);
    const onMsgPin  = (p)   => store.getState().applyMessagePin(p);
    const onReactionUpdate = (p) => store.getState().applyReactionUpdate(p);
    const onDmMessage = (m) => store.getState().addDmMessage(m);

    const onPresence = ({ user_id, status }) =>
      store.getState().setPresence(user_id, status);
    const onCustomStatus = ({ user_id, text, emoji, until }) =>
      store.getState().setCustomStatus(user_id, { text, emoji, until });
    const onTypingStart = ({ channel_id, conversation_id, user_id, username }) =>
      store.getState().setTyping(channel_id || conversation_id, user_id, username, true);
    const onTypingStop = ({ channel_id, conversation_id, user_id }) =>
      store.getState().setTyping(channel_id || conversation_id, user_id, null, false);
    const onPollUpdate = ({ poll_id, votes }) => {
      const s = store.getState();
      const next = s.messages.map((m) =>
        m.poll && m.poll.id === poll_id ? { ...m, poll_votes: votes } : m
      );
      store.setState({ messages: next });
    };

    socket.on('message:new',  onMsgNew);
    socket.on('message:edit', onMsgEdit);
    socket.on('message:delete', onMsgDel);
    socket.on('message:pin',  onMsgPin);
    socket.on('reaction:update', onReactionUpdate);
    socket.on('dm:message',  onDmMessage);
    socket.on('presence:update', onPresence);
    socket.on('presence:custom_status', onCustomStatus);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop',  onTypingStop);
    socket.on('poll:update',  onPollUpdate);

    return () => {
      socket.off('message:new',  onMsgNew);
      socket.off('message:edit', onMsgEdit);
      socket.off('message:delete', onMsgDel);
      socket.off('message:pin',  onMsgPin);
      socket.off('reaction:update', onReactionUpdate);
      socket.off('dm:message',  onDmMessage);
      socket.off('presence:update', onPresence);
      socket.off('presence:custom_status', onCustomStatus);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop',  onTypingStop);
      socket.off('poll:update',  onPollUpdate);
    };
  }, [token]);

  // Channel rooms
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentChannelId) return;
    socket.emit('channel:join', { channel_id: currentChannelId });
    return () => {
      socket.emit('channel:leave', { channel_id: currentChannelId });
    };
  }, [currentChannelId]);

  // DM rooms
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentConversationId) return;
    socket.emit('dm:join', { conversation_id: currentConversationId });
    return () => {
      socket.emit('dm:leave', { conversation_id: currentConversationId });
    };
  }, [currentConversationId]);
}
