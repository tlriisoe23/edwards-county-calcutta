"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { normalizeTheme, themePresets, type ThemeId } from '@/lib/themes';

type Props = {
    theme: unknown;
    busy: boolean;
    save: (theme: ThemeId) => Promise<unknown>;
};
export function ThemeSettings({ theme, busy, save }: Props) {
    const current = normalizeTheme(theme);
    const [choice, setChoice] = useState<ThemeId | null>(null);
    const selected = choice ?? current;
    return <form className="panel settings-card theme-settings" onSubmit={async ev => {
        ev.preventDefault();
        if (await save(selected)) setChoice(null);
    }}>
        <fieldset disabled={busy}>
            <legend>Event theme</legend>
            <p className="muted" id="theme-help">One saved theme for the operator desk, public board and TV. Changes appear on connected displays.</p>
            <div className="theme-options" role="radiogroup" aria-label="Event theme" aria-describedby="theme-help">
                {themePresets.map(preset => <label className="theme-option" key={preset.id} data-selected={selected === preset.id}>
                    <input type="radio" name="event-theme" value={preset.id} checked={selected === preset.id} onChange={() => setChoice(preset.id)}/>
                    <span><strong>{preset.name}</strong><span>{preset.description}</span>{current === preset.id && <small>Currently saved</small>}</span>
                </label>)}
            </div>
            <Button type="submit" disabled={busy || selected === current}>Save theme</Button>
        </fieldset>
    </form>;
}
