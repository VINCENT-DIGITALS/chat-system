// LiveKit token generation service (placeholder-friendly).
// Will return a real JWT if LIVEKIT_API_KEY + LIVEKIT_API_SECRET are configured.
// Otherwise returns a stub response so the UI can still be wired end-to-end.

let AccessToken;
try {
  ({ AccessToken } = require('livekit-server-sdk'));
} catch (_) {
  AccessToken = null;
}

async function createAccessToken({ identity, name, room, canPublish = true, canSubscribe = true }) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || '';

  if (!apiKey || !apiSecret || !AccessToken || apiSecret.includes('placeholder')) {
    return {
      token: null,
      url: livekitUrl,
      stub: true,
      message:
        'LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL in backend/.env to enable real voice/video rooms.',
      identity,
      room,
    };
  }

  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish,
    canSubscribe,
  });
  const token = await at.toJwt();
  return { token, url: livekitUrl, stub: false, identity, room };
}

module.exports = { createAccessToken };
