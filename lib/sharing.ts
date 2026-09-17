export function eventPath(path: '/' | '/tv' | '/admin', eventId?: string | null) {
    return path + (eventId ? '?event=' + encodeURIComponent(eventId) : '');
}

// Opens the TV route in its own OS-level window (not a tab sharing the operator's window),
// sized to fill the current screen so it looks right the moment it is made fullscreen.
// A real popup window lets the operator switch back to the console at any time — Alt-Tab
// or a taskbar click always reaches it — even while the TV window is fullscreen elsewhere.
export function openTvWindow(path: string) {
    const w = window.screen.availWidth, h = window.screen.availHeight;
    return window.open(path, 'ecgc-tv-display', `popup,width=${w},height=${h},left=0,top=0`);
}

export function shareLinks(origin: string, eventId: string) {
    const base = new URL(origin);
    if (!['http:', 'https:'].includes(base.protocol)) throw Error('Unsupported public origin.');
    const board = new URL(eventPath('/', eventId), base.origin), tv = new URL(eventPath('/tv', eventId), base.origin);
    return { board: board.href, tv: tv.href, local: ['localhost','127.0.0.1','[::1]'].includes(base.hostname) };
}
