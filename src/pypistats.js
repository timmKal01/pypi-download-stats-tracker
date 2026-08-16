const BASE_URL = 'https://pypistats.org/api/packages';

function toDateOnly(date) {
    return date.toISOString().slice(0, 10);
}

/** Sums the "without_mirrors" daily download counts within [startDate, endDate] (inclusive). */
async function fetchPackageTotal(pkg, startDate, endDate) {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(pkg)}/overall?mirrors=false`, {
        headers: { Connection: 'close' },
    });
    if (res.status === 404) return null; // unknown package
    if (!res.ok) throw new Error(`pypistats.org request failed for "${pkg}": ${res.status} ${res.statusText}`);

    const body = await res.json();
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);

    return (body.data ?? [])
        .filter((row) => row.date >= start && row.date <= end)
        .reduce((sum, row) => sum + row.downloads, 0);
}

export async function fetchDownloadStats({ packages, daysBack }) {
    const currentEnd = new Date();
    const currentStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(previousEnd.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return Promise.all(
        packages.map(async (pkg) => {
            const [currentDownloads, previousDownloads] = await Promise.all([
                fetchPackageTotal(pkg, currentStart, currentEnd),
                fetchPackageTotal(pkg, previousStart, previousEnd),
            ]);
            const percentChange =
                currentDownloads !== null && previousDownloads
                    ? Number((((currentDownloads - previousDownloads) / previousDownloads) * 100).toFixed(2))
                    : null;

            return {
                package: pkg,
                currentPeriodDownloads: currentDownloads,
                currentPeriodStart: toDateOnly(currentStart),
                currentPeriodEnd: toDateOnly(currentEnd),
                previousPeriodDownloads: previousDownloads,
                previousPeriodStart: toDateOnly(previousStart),
                previousPeriodEnd: toDateOnly(previousEnd),
                percentChange,
            };
        }),
    );
}
