const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { connection: null, player: null, queue: [], playing: false, textChannel: null });
  }
  return queues.get(guildId);
}

async function connect(voiceChannel) {
  const guildId = voiceChannel.guild.id;
  const state = getQueue(guildId);

  if (state.connection && state.connection.state.status !== VoiceConnectionStatus.Ready) {
    try { state.connection.destroy(); } catch { /* ignoram */ }
    state.connection = null;
    state.player = null;
  }

  if (!state.connection) {
    state.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(state.connection, VoiceConnectionStatus.Ready, 20000);
    } catch (err) {
      try { state.connection.destroy(); } catch { /* ignoram */ }
      state.connection = null;
      state.player = null;
      throw err;
    }

    state.player = createAudioPlayer();
    state.connection.subscribe(state.player);

    state.player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    state.player.on('error', (err) => {
      console.error('Eroare audio player:', err.message);
      playNext(guildId);
    });
  }
  return state;
}

async function playNext(guildId) {
  const state = getQueue(guildId);
  if (!state.player || state.queue.length === 0) {
    state.playing = false;
    return;
  }

  const next = state.queue.shift();
  try {
    const resource = createAudioResource(next.stream, { inputType: next.type === 'arbitrary' ? undefined : next.type });
    state.player.play(resource);
    state.playing = true;
    if (state.textChannel) {
      state.textChannel.send(`🎵 Acum se canta: **${next.title}**`).catch(() => {});
    }
  } catch (err) {
    console.error('Eroare la redarea urmatoarei piese:', err.message);
    playNext(guildId);
  }
}

function disconnect(guildId) {
  const state = getQueue(guildId);
  if (state.connection) {
    try { state.connection.destroy(); } catch { /* ignoram */ }
  }
  queues.delete(guildId);
}

module.exports = { getQueue, connect, playNext, disconnect };
