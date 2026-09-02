export type ScriptCommand =
    | { type: 'PLAY_BGM'; track: string; loop: boolean; fadeInMs: number }
    | { type: 'STOP_BGM'; fadeOutMs: number }
    | { type: 'PAUSE_BGM' }
    | { type: 'RESUME_BGM' }
    | { type: 'RELEASE_BGM_LOOP'; fadeOutMs: number }
    | { type: 'PLAY_BGS'; track: string; loop: boolean; fadeInMs: number }
    | { type: 'STOP_BGS'; fadeOutMs: number }
    | { type: 'PAUSE_BGS' }
    | { type: 'RESUME_BGS' }
    | { type: 'PLAY_ME'; track: string }
    | { type: 'PLAY_SE'; track: string }
    | { type: 'FADE'; direction: 'in' | 'out'; color: string; duration: number }
    | { type: 'SHOW_GRAPHIC'; graphic: string; direction?: 'in' | 'out' }
    | { type: 'SHOW_DEMON_SPRITE'; sprite: string }
    | { type: 'SHOW_TRAINER_SPRITE'; sprite: string }
    | { type: 'TEXT'; key: string }
    | { type: 'CHOICE'; options: string[] }
    | { type: 'HELPER'; target: string }
    | { type: 'PROMPT'; key: string }
    | { type: 'LABEL'; name: string }
    | { type: 'NAME_BOX'; key: string | null }
    | { type: 'JUMP'; label: string }
    | { type: 'CUSTOMIZE_APPEARANCE' }
    | { type: 'CAMERA_MOVE'; x: number; y: number; durationMs: number }
    | { type: 'CAMERA_FOLLOW'; entityId: string };

export const SCRIPT_COMMAND_TYPES = [
  'PLAY_BGM',
  'STOP_BGM',
  'PAUSE_BGM',
  'RESUME_BGM',
  'RELEASE_BGM_LOOP',
  'PLAY_BGS',
  'STOP_BGS',
  'PAUSE_BGS',
  'RESUME_BGS',
  'PLAY_ME',
  'PLAY_SE',
  'FADE',
  'SHOW_GRAPHIC',
  'SHOW_DEMON_SPRITE',
  'SHOW_TRAINER_SPRITE',
  'TEXT',
  'CHOICE',
  'HELPER',
  'PROMPT',
  'LABEL',
  'NAME_BOX',
  'JUMP',
  'CUSTOMIZE_APPEARANCE',
  'CAMERA_MOVE',
  'CAMERA_FOLLOW',
] as const satisfies readonly ScriptCommand['type'][];

type MissingFromList = Exclude<ScriptCommand['type'], (typeof SCRIPT_COMMAND_TYPES)[number]>;
type AssertNoneMissing = [MissingFromList] extends [never]
  ? true
  : `Missing from SCRIPT_COMMAND_TYPES: ${MissingFromList}`;
export const _scriptCommandTypesComplete: AssertNoneMissing = true;
