const { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');

const recordingsDir = path.join(__dirname, '..', 'recordings');
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

// guildId -> { connection, activeStreams: Map<userId, writeStream>, startedBy, startedAt, sessionDir }
const activeRecordings = new Map();

async function startRecording(voiceChannel, startedByUser) {
  const guildId = voiceChannel.guild.id;
  if (activeRecordings.has(guildId)) {
    throw new Error('Deja exista o inregistrare activa pe acest server.');
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 20000);

  const sessionId = `${Date.now()}`;
  const sessionDir = path.join(recordingsDir, `${guildId}-${sessionId}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const session = {
    connection,
    activeStreams: new Map(),
    startedBy: startedByUser.id,
    startedAt: Date.now(),
    sessionDir,
  };
  activeRecordings.set(guildId, session);

  const receiver = connection.receiver;
  receiver.speaking.on('start', (userId) => {
    if (session.activeStreams.has(userId)) return;

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });

    const pcmStream = opusStream.pipe(new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 }));
    const outFile = path.join(sessionDir, `${userId}-${Date.now()}.pcm`);
    const writeStream = fs.createWriteStream(outFile, { flags: 'a' });

    pcmStream.pipe(writeStream);
    session.activeStreams.set(userId, writeStream);

    opusStream.on('end', () => {
      session.activeStreams.delete(userId);
    });
  });

  return session;
}

function stopRecording(guildId) {
  const session = activeRecordings.get(guildId);
  if (!session) throw new Error('Nu exista o inregistrare activa.');

  for (const [, ws] of session.activeStreams) {
    ws.end();
  }
  session.connection.destroy();
  activeRecordings.delete(guildId);

  return {
    sessionDir: session.sessionDir,
    durationMs: Date.now() - session.startedAt,
    startedBy: session.startedBy,
  };
}

function isRecording(guildId) {
  return activeRecordings.has(guildId);
}

module.exports = { startRecording, stopRecording, isRecording };
