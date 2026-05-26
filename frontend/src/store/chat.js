import { create } from 'zustand';
import api from '../services/api';

export const useChatStore = create((set, get) => ({
  // Server context
  servers: [],
  currentServerId: null,
  channels: [],
  channelCategories: [],
  currentChannelId: null,
  members: [],
  messages: [],

  // DM context
  dmConversations: [],
  currentConversationId: null,
  dmMessages: [],

  // Cross-cutting state
  presence: {},      // userId -> 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'
  customStatus: {},  // userId -> { text, emoji, until }
  typing: {},        // channelId|conversationId -> { userId: username }
  loadingMessages: false,
  replyTo: null,     // message being replied to in the input
  editingId: null,   // message currently being edited inline
  error: null,

  // ── Servers ─────────────────────────────────────────────────────
  async loadServers() {
    const { data } = await api.get('/servers');
    set({ servers: data.servers });
    return data.servers;
  },

  async createServer(name) {
    const { data } = await api.post('/servers', { name });
    set({ servers: [...get().servers, data.server] });
    return data.server;
  },

  async joinServer(invite_code) {
    const { data } = await api.post('/servers/join', { invite_code });
    const exists = get().servers.find((s) => s.id === data.server.id);
    if (!exists) set({ servers: [...get().servers, data.server] });
    return data.server;
  },

  async selectServer(serverId) {
    set({
      currentServerId: serverId,
      currentChannelId: null,
      currentConversationId: null,
      channels: [],
      channelCategories: [],
      members: [],
      messages: [],
      replyTo: null,
      editingId: null,
    });
    if (!serverId) return;
    const [{ data: chRes }, { data: memRes }] = await Promise.all([
      api.get(`/channels/server/${serverId}`),
      api.get(`/servers/${serverId}/members`),
    ]);
    set({
      channels: chRes.channels,
      channelCategories: chRes.categories || [],
      members: memRes.members,
    });
    const firstText = chRes.channels.find((c) => c.type === 'text');
    if (firstText) await get().selectChannel(firstText.id);
  },

  async selectChannel(channelId) {
    set({
      currentChannelId: channelId,
      currentConversationId: null,
      messages: [],
      loadingMessages: true,
      replyTo: null,
      editingId: null,
    });
    try {
      const ch = get().channels.find((c) => c.id === channelId);
      if (ch && (ch.type === 'text' || ch.type === 'announcement')) {
        const { data } = await api.get(`/messages/channel/${channelId}`);
        set({ messages: data.messages });
      }
    } finally {
      set({ loadingMessages: false });
    }
  },

  async createChannel(serverId, name, type, extras = {}) {
    const { data } = await api.post(`/channels/server/${serverId}`, { name, type, ...extras });
    set({ channels: [...get().channels, data.channel] });
    return data.channel;
  },

  // ── Direct messages ─────────────────────────────────────────────
  async loadDMs() {
    const { data } = await api.get('/dms');
    set({ dmConversations: data.conversations });
    return data.conversations;
  },

  async openDMWith(userId) {
    const { data } = await api.post(`/dms/with/${userId}`);
    await get().loadDMs();
    await get().selectConversation(data.conversation_id);
    return data.conversation_id;
  },

  async createGroupDM(name, userIds) {
    const { data } = await api.post('/dms/group', { name, user_ids: userIds });
    await get().loadDMs();
    await get().selectConversation(data.conversation.id);
    return data.conversation;
  },

  async selectConversation(conversationId) {
    set({
      currentConversationId: conversationId,
      currentServerId: null,
      currentChannelId: null,
      dmMessages: [],
      replyTo: null,
      editingId: null,
    });
    if (!conversationId) return;
    set({ loadingMessages: true });
    try {
      const { data } = await api.get(`/dms/${conversationId}/messages`);
      set({ dmMessages: data.messages });
    } finally {
      set({ loadingMessages: false });
    }
  },

  // ── Message mutations (channel) ─────────────────────────────────
  addMessage(message) {
    if (message.channel_id !== get().currentChannelId) return;
    set({ messages: [...get().messages, message] });
  },

  applyMessageEdit(updated) {
    if (updated.channel_id !== get().currentChannelId) return;
    set({
      messages: get().messages.map((m) =>
        m.id === updated.id ? { ...m, ...updated } : m
      ),
    });
  },

  applyMessageDelete({ message_id, channel_id }) {
    if (channel_id !== get().currentChannelId) return;
    set({
      messages: get().messages.map((m) =>
        m.id === message_id
          ? { ...m, deleted_at: new Date().toISOString(), content: '', attachments: [] }
          : m
      ),
    });
  },

  applyMessagePin({ message_id, channel_id, pinned }) {
    if (channel_id !== get().currentChannelId) return;
    set({
      messages: get().messages.map((m) =>
        m.id === message_id ? { ...m, pinned } : m
      ),
    });
  },

  applyReactionUpdate({ message_id, reactions }) {
    set({
      messages: get().messages.map((m) =>
        m.id === message_id ? { ...m, reactions } : m
      ),
      dmMessages: get().dmMessages.map((m) =>
        m.id === message_id ? { ...m, reactions } : m
      ),
    });
  },

  setReplyTo(message) {
    set({ replyTo: message || null });
  },

  setEditingId(id) {
    set({ editingId: id || null });
  },

  // ── DM message handlers ─────────────────────────────────────────
  addDmMessage(message) {
    if (message.conversation_id !== get().currentConversationId) {
      // Bump last_message_at in the DM list view
      set({
        dmConversations: get().dmConversations.map((c) =>
          c.id === message.conversation_id
            ? { ...c, last_message_at: message.created_at, last_message: message }
            : c
        ),
      });
      return;
    }
    set({ dmMessages: [...get().dmMessages, message] });
  },

  // ── Cross-cutting ──────────────────────────────────────────────
  setPresence(userId, status) {
    set({ presence: { ...get().presence, [userId]: status } });
  },

  setCustomStatus(userId, payload) {
    set({ customStatus: { ...get().customStatus, [userId]: payload } });
  },

  setTyping(scopeId, userId, username, on) {
    const map = { ...(get().typing[scopeId] || {}) };
    if (on) map[userId] = username;
    else delete map[userId];
    set({ typing: { ...get().typing, [scopeId]: map } });
  },

  reset() {
    set({
      servers: [],
      currentServerId: null,
      channels: [],
      channelCategories: [],
      currentChannelId: null,
      members: [],
      messages: [],
      dmConversations: [],
      currentConversationId: null,
      dmMessages: [],
      presence: {},
      customStatus: {},
      typing: {},
      replyTo: null,
      editingId: null,
    });
  },
}));
