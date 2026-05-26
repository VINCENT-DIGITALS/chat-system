const { supabase } = require('../config/supabase');

const AVATAR_BUCKET = 'chat-avatars';
const ATTACHMENT_BUCKET = 'chat-attachments';
let ensured = false;
let ensuredAttach = false;

async function ensureBucket(bucket = AVATAR_BUCKET) {
  if (!supabase) return false;
  if (ensured && bucket === AVATAR_BUCKET) return true;
  try {
    const { data: existing } = await supabase.storage.getBucket(bucket);
    if (!existing) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: '4MB',
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
    if (bucket === AVATAR_BUCKET) ensured = true;
    return true;
  } catch (e) {
    console.error('[storage] ensureBucket error:', e.message);
    return false;
  }
}

async function uploadAvatar({ userId, buffer, contentType, ext }) {
  if (!supabase) throw new Error('Supabase not configured');
  await ensureBucket();
  const filename = `${userId}-${Date.now()}.${ext || 'png'}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filename, buffer, {
      contentType: contentType || 'image/png',
      upsert: true,
      cacheControl: '3600',
    });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filename);
  return pub.publicUrl;
}

async function ensureAttachmentBucket() {
  if (!supabase) return false;
  if (ensuredAttach) return true;
  try {
    const { data: existing } = await supabase.storage.getBucket(ATTACHMENT_BUCKET);
    if (!existing) {
      const { error } = await supabase.storage.createBucket(ATTACHMENT_BUCKET, {
        public: true,
        fileSizeLimit: '25MB',
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
    ensuredAttach = true;
    return true;
  } catch (e) {
    console.error('[storage] ensureAttachmentBucket error:', e.message);
    return false;
  }
}

async function uploadAttachment({ userId, channelId, buffer, originalName, contentType }) {
  if (!supabase) throw new Error('Supabase not configured');
  await ensureAttachmentBucket();
  const safeName = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const key = `${channelId}/${userId}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(key, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: false,
      cacheControl: '3600',
    });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(key);
  return { url: pub.publicUrl, name: originalName, mime_type: contentType, size_bytes: buffer.length };
}

module.exports = { uploadAvatar, uploadAttachment, ensureBucket, AVATAR_BUCKET, ATTACHMENT_BUCKET };
