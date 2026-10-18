/** Completed-week viewing is the only source for the HQ spotlight. There is
 * no realtime concurrency feed, and a committed subscriber count is not viewing. */
export const getStreamingHqViewingSpotlight = (rows: readonly { title: string; viewingAccounts: number }[]) => {
    const mostWatched = rows.filter(row => Number.isSafeInteger(row.viewingAccounts) && row.viewingAccounts > 0)
        .slice().sort((a, b) => b.viewingAccounts - a.viewingAccounts)[0];
    return mostWatched ? {
        title: mostWatched.title,
        watching: mostWatched.viewingAccounts,
        periodLabel: 'watched this week',
        headingLabel: 'MOST WATCHED THIS WEEK',
    } : undefined;
};
