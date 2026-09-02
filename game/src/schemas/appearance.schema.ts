import { z } from 'zod';

export const CharacterAppearanceSchema = z.object({
  skinToneId: z.string(),
  eyeColorId: z.string(),
  hairStyleId: z.string(),
  hairColorId: z.string(),
  outfitId: z.string(),
  outfitColorId: z.string(),
});
export type CharacterAppearance = z.infer<typeof CharacterAppearanceSchema>;

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  skinToneId: 'tone_medium',
  eyeColorId: 'eye_brown',
  hairStyleId: 'style_short',
  hairColorId: 'hair_black',
  outfitId: 'outfit_default',
  outfitColorId: 'color_crimson',
};

const SwatchOptionSchema = z.object({
  id: z.string(),
  hex: z.string(),
  labelKey: z.string(),
});
export type SwatchOption = z.infer<typeof SwatchOptionSchema>;

const StyleOptionSchema = z.object({
  id: z.string(),
  labelKey: z.string(),
});
export type StyleOption = z.infer<typeof StyleOptionSchema>;

export const AppearanceOptionsSchema = z.object({
  skinTones: z.array(SwatchOptionSchema),
  eyeColors: z.array(SwatchOptionSchema),
  hairColors: z.array(SwatchOptionSchema),
  outfitColors: z.array(SwatchOptionSchema),
  hairStyles: z.array(StyleOptionSchema),
  outfits: z.array(StyleOptionSchema),
});
export type AppearanceOptions = z.infer<typeof AppearanceOptionsSchema>;

export const EMPTY_APPEARANCE_OPTIONS: AppearanceOptions = {
  skinTones: [],
  eyeColors: [],
  hairColors: [],
  outfitColors: [],
  hairStyles: [],
  outfits: [],
};
