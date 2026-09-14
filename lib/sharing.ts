export function shareLinks(origin: string, eventId: string) {
    const base = new URL(origin);
    if (!['http:', 'https:'].includes(base.protocol)) throw Error('Unsupported public origin.');
    const board = new URL('/', base.origin), tv = new URL('/tv', base.origin);
    board.searchParams.set('event', eventId); tv.searchParams.set('event', eventId);
    return { board: board.href, tv: tv.href, local: ['localhost','127.0.0.1','[::1]'].includes(base.hostname) };
}
