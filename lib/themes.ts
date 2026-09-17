/** Curated event presentation, shared by operator, public board and TV. */
export const themeIds = ['classic', 'high-contrast', 'dark-event', 'light-event'] as const;
export type ThemeId = typeof themeIds[number];
export const themePresets: { id: ThemeId; name: string; description: string }[] = [
    { id: 'classic', name: 'Classic ECGC', description: 'Familiar cream, clubhouse green and gold.' },
    { id: 'high-contrast', name: 'High Contrast', description: 'Bold black, white and yellow for daylight and projectors.' },
    { id: 'dark-event', name: 'Dark Event', description: 'Dark surfaces and bright values for indoor evening events.' },
    { id: 'light-event', name: 'Light Event', description: 'Clean white surfaces and strong blue accents for bright rooms.' },
];
export function normalizeTheme(value: unknown): ThemeId {
    return themeIds.includes(value as ThemeId) ? value as ThemeId : 'classic';
}
