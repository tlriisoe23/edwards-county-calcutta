"use client";
import { cloneElement, useId, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Contextual help that reveals on hover AND keyboard focus (desktop), and on tap (touch, which
// fires no hover events) — one component instead of scattered small info icons. A short close
// delay lets the pointer travel from the trigger onto the content without it vanishing first.
//
// Both auto-focus behaviours are suppressed: this is a tooltip, not a dialog, so it must never
// move focus. Radix would otherwise focus the content on open (stealing focus from whatever the
// operator was typing into, e.g. the bid field) and focus the trigger again on close *without*
// `preventScroll`, which scrolled the trigger back into view — the operator-reported "page jumps
// back to the top while I'm scrolling", since these triggers sit in the nav at the top of the page.
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
        <PopoverContent id={id} className="help-tip-content" side="bottom" align="start" onOpenAutoFocus={ev => ev.preventDefault()} onCloseAutoFocus={ev => ev.preventDefault()} onMouseEnter={show} onMouseLeave={hide}>
            <p>{children}</p>
        </PopoverContent>
    </Popover>;
}

// The same contextual help attached directly to a control the operator already uses, rather than
// to a separate info icon beside it: "what does this button do, and where does it take me?".
// Built on the tooltip primitive (not the popover above) because a tooltip never takes focus and
// never swallows the wrapped control's own click.
//
// When a ControlTip is itself the child of another `asChild` trigger — the compact console's
// Setup steps button sits inside a CollapsibleTrigger — that trigger's props (onClick,
// aria-expanded, aria-controls) arrive here, not on the control. They are passed through to the
// wrapped control; without that the control renders and does nothing (OC-6).
export function ControlTip({ text, children, ...passthrough }: { text: string; children: ReactElement } & Record<string, unknown>) {
    const control = Object.keys(passthrough).length ? cloneElement(children as ReactElement<Record<string, unknown>>, passthrough) : children;
    return <Tooltip>
        <TooltipTrigger asChild>{control}</TooltipTrigger>
        <TooltipContent className="control-tip" side="bottom" sideOffset={6}>{text}</TooltipContent>
    </Tooltip>;
}
