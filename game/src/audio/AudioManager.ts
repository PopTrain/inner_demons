export type AudioChannel = "bgm" | "bgs" | "se" | "me";

export type PlayLoopableOptions = {
  /** BGM/BGS default to looping (they're meant to underscore a whole scene); pass `loop: false` to play once. */
  loop?: boolean;
  /** 0-1, multiplied by the channel's volume (setChannelVolume). Defaults to 1. */
  volume?: number;
  /** Crossfade duration: the new track fades in and, if something was already playing, it fades out over the same span. 0/omitted = instant cut. */
  fadeInSec?: number;
};

export type StopOptions = {
  /** Ramp down to silence over this many seconds instead of cutting off immediately. */
  fadeOutSec?: number;
};

export type PlayOneShotOptions = {
  volume?: number;
};

const AUDIO_BASE_PATH: Record<AudioChannel, string> = {
  bgm: "audio/bgm",
  bgs: "audio/bgs",
  se: "audio/se",
  me: "audio/me",
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

interface Track {
  name: string;
  buffer: AudioBuffer;
  source: AudioBufferSourceNode;
  gain: GainNode;
  loop: boolean;
  /** context.currentTime this track's buffer-position-0 would have started at - lets pause/resume compute elapsed position as `currentTime - startedAt`, offset already folded in. */
  startedAt: number;
  /** Target volume (0-1) before the channel's own volume multiplier is applied. */
  requestedVolume: number;
}

interface PausedTrack {
  buffer: AudioBuffer;
  name: string;
  loop: boolean;
  offset: number;
  requestedVolume: number;
}

/**
 * Four-channel audio system modeled on RPG Maker's BGM/BGS/SE/ME split:
 *  - BGM: one looping music track at a time. Starting a new one stops the old.
 *  - BGS: one looping ambience track at a time, independent of BGM (rain can
 *    keep playing under different music).
 *  - SE: fire-and-forget one-shots. Any number can overlap.
 *  - ME: a one-shot "jingle" that ducks BGM out (pausing it, not stopping it)
 *    for its duration and resumes BGM from where it left off when it ends -
 *    BGS is untouched, matching RPG Maker's behavior.
 *
 * Built on the Web Audio API rather than <audio> elements specifically so
 * BGM/BGS fades can use real gain automation (sample-accurate, no jank from
 * driving volume by hand off a rAF loop) and SE can overlap freely without
 * juggling a pool of <audio> tags.
 *
 * Loads tracks from public/audio/<channel>/<name>.ogg on first use and
 * caches the decoded buffer, so repeated plays of the same track are free
 * after the first. Vorbis/Ogg has no native decode support in Safari/WKWebView
 * (iOS Capacitor builds), only Chromium-based targets (desktop browsers,
 * Electron, Android) - .ogg is fine for now but iOS will need a fallback
 * format (e.g. .m4a) with feature detection before that platform ships audio.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  static get instance(): AudioManager {
    if (!this._instance) this._instance = new AudioManager();
    return this._instance;
  }

  private readonly context = new AudioContext();
  private readonly bufferCache = new Map<string, Promise<AudioBuffer>>();
  private readonly channelVolume: Record<AudioChannel, number> = { bgm: 1, bgs: 1, se: 1, me: 1 };

  private bgm: Track | null = null;
  private bgs: Track | null = null;
  private me: Track | null = null;
  /** BGM that playMe() paused mid-playback, to be resumed once the ME finishes. */
  private duckedBgm: PausedTrack | null = null;

  private constructor() {}

  /**
   * Browsers suspend AudioContext until a user gesture; nothing plays until
   * this resolves. Safe to call repeatedly - a no-op once already running.
   */
  async resume(): Promise<void> {
    if (this.context.state === "suspended") await this.context.resume();
  }

  getChannelVolume(channel: AudioChannel): number {
    return this.channelVolume[channel];
  }

  /** Applies live to whatever's currently looping on bgm/bgs; se/me are one-shots so there's nothing ongoing to update. */
  setChannelVolume(channel: AudioChannel, volume: number): void {
    this.channelVolume[channel] = clamp01(volume);
    const track = channel === "bgm" ? this.bgm : channel === "bgs" ? this.bgs : null;
    if (track) this.applyVolumeNow(track, channel);
  }

  private applyVolumeNow(track: Track, channel: AudioChannel): void {
    const now = this.context.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(track.requestedVolume * this.channelVolume[channel], now);
  }

  private async loadBuffer(channel: AudioChannel, name: string): Promise<AudioBuffer> {
    const key = `${channel}/${name}`;
    let promise = this.bufferCache.get(key);
    if (!promise) {
      promise = fetch(`${AUDIO_BASE_PATH[channel]}/${name}.ogg`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load audio "${key}.ogg": ${res.status} ${res.statusText}`);
          return res.arrayBuffer();
        })
        .then((data) => this.context.decodeAudioData(data));
      // Don't cache a rejected load - a later retry (e.g. after adding the missing file) should try again.
      promise.catch(() => this.bufferCache.delete(key));
      this.bufferCache.set(key, promise);
    }
    return promise;
  }

  async playBgm(name: string, options: PlayLoopableOptions = {}): Promise<void> {
    const loop = options.loop ?? true;
    if (this.bgm?.name === name && this.bgm.loop === loop) return; // already playing this track

    const buffer = await this.loadBuffer("bgm", name);
    this.stopBgm({ fadeOutSec: options.fadeInSec ?? 0 }); // crossfade the outgoing track over the same span as the incoming fade-in
    this.bgm = this.start("bgm", name, buffer, loop, options.volume ?? 1, options.fadeInSec ?? 0);
  }

  stopBgm(options: StopOptions = {}): void {
    this.duckedBgm = null; // an explicit stop/replace cancels any pending "resume after ME" restore
    if (!this.bgm) return;
    this.stop(this.bgm, options.fadeOutSec ?? 0);
    this.bgm = null;
  }

  async playBgs(name: string, options: PlayLoopableOptions = {}): Promise<void> {
    const loop = options.loop ?? true;
    if (this.bgs?.name === name && this.bgs.loop === loop) return;

    const buffer = await this.loadBuffer("bgs", name);
    this.stopBgs({ fadeOutSec: options.fadeInSec ?? 0 });
    this.bgs = this.start("bgs", name, buffer, loop, options.volume ?? 1, options.fadeInSec ?? 0);
  }

  stopBgs(options: StopOptions = {}): void {
    if (!this.bgs) return;
    this.stop(this.bgs, options.fadeOutSec ?? 0);
    this.bgs = null;
  }

  /** Fire-and-forget; any number of SE can overlap. */
  async playSe(name: string, options: PlayOneShotOptions = {}): Promise<void> {
    const buffer = await this.loadBuffer("se", name);
    this.start("se", name, buffer, false, options.volume ?? 1, 0);
  }

  /** Ducks (pauses, not stops) BGM for the jingle's duration and resumes it automatically when the jingle ends. BGS is untouched. */
  async playMe(name: string, options: PlayOneShotOptions = {}): Promise<void> {
    const buffer = await this.loadBuffer("me", name);

    if (this.me) this.stop(this.me, 0);
    this.duckBgmForMe();

    const track = this.start("me", name, buffer, false, options.volume ?? 1, 0);
    this.me = track;
    track.source.onended = () => {
      if (this.me === track) this.me = null;
      this.restoreBgmAfterMe();
    };
  }

  private duckBgmForMe(): void {
    if (!this.bgm) return;
    // startedAt already has the original offset folded in (see start()), so
    // currentTime - startedAt IS the buffer position directly - no separate
    // offset to add back in. For a looping track that position can be many
    // multiples of the buffer's length, so it has to be wrapped: passing an
    // offset past the buffer's duration to AudioBufferSourceNode.start()
    // plays nothing at all rather than wrapping on its own.
    const position = this.context.currentTime - this.bgm.startedAt;
    const offset = this.bgm.loop
      ? position % this.bgm.buffer.duration
      : Math.min(position, this.bgm.buffer.duration);

    this.duckedBgm = {
      buffer: this.bgm.buffer,
      name: this.bgm.name,
      loop: this.bgm.loop,
      offset,
      requestedVolume: this.bgm.requestedVolume,
    };
    this.bgm.source.onended = null; // this stop is expected - don't let it look like natural playback end
    this.bgm.source.stop();
    this.bgm = null;
  }

  private restoreBgmAfterMe(): void {
    const paused = this.duckedBgm;
    this.duckedBgm = null;
    if (!paused) return;
    this.bgm = this.start("bgm", paused.name, paused.buffer, paused.loop, paused.requestedVolume, 0, paused.offset);
  }

  private start(
    channel: AudioChannel,
    name: string,
    buffer: AudioBuffer,
    loop: boolean,
    requestedVolume: number,
    fadeInSec: number,
    offset = 0,
  ): Track {
    const gain = this.context.createGain();
    gain.connect(this.context.destination);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);

    const now = this.context.currentTime;
    const targetVolume = requestedVolume * this.channelVolume[channel];
    if (fadeInSec > 0) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInSec);
    } else {
      gain.gain.setValueAtTime(targetVolume, now);
    }

    source.start(0, offset);

    return { name, buffer, source, gain, loop, startedAt: now - offset, requestedVolume };
  }

  private stop(track: Track, fadeOutSec: number): void {
    track.source.onended = null;
    if (fadeOutSec > 0) {
      const now = this.context.currentTime;
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(track.gain.gain.value, now);
      track.gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
      track.source.stop(now + fadeOutSec);
    } else {
      track.source.stop();
    }
  }

  /** Stops everything and releases the AudioContext. */
  dispose(): void {
    this.stopBgm();
    this.stopBgs();
    if (this.me) this.stop(this.me, 0);
    this.me = null;
    void this.context.close();
  }
}
