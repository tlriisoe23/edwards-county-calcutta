"use client";
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Contextual help that reveals on hover AND keyboard focus (desktop), and on tap (touch, which
// fires no hover events) — one component instead of scattered small info icons. A short close
// delay lets the pointer travel from the trigger onto the content without it vanishing first.
export function HelpTip({ label, children, iconOnly }: { label: string; children: ReactNode; iconOnly?: boolean }) {
    const [open, setOpen] = useState(false);
    const id = useId();
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const show = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
    const hide = () => { closeTimer.current = setTimeout(() => setOpen(false), 100); };
    return <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <button type="button" className="help-tip-trigger" aria-label={iconOnly ? 'What is ' + label + '?' : undefined} aria-describedby={open ? id : undefined} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={() => setOpen(o => !o)}>
                <Info size={13} aria-hidden="true"/>{!iconOnly && <span>{label}</span>}
            </button>
        </PopoverTrigger>
        <PopoverContent id={id} className="help-tip-content" side="bottom" align="start" onMouseEnter={show} onMouseLeave={hide}>
            <p>{children}</p>
        </PopoverContent>
    </Popover>;
}
