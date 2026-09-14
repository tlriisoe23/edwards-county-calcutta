export function eventPath(path: '/' | '/tv' | '/admin', eventId?: string | null) {
    return path + (eventId ? '?event=' + encodeURIComponent(eventId) : '');
}

export function shareLinks(origin: string, eventId: string) {
    const base = new URL(origin);
    if (!['http:', 'https:'].includes(base.protocol)) throw Error('Unsupported public origin.');
    const board = new URL(eventPath('/', eventId), base.origin), tv = new URL(eventPath('/tv', eventId), base.origin);
    return { board: board.href, tv: tv.href, local: ['localhost','127.0.0.1','[::1]'].includes(base.hostname) };
}
