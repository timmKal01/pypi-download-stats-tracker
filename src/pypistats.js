const BASE_URL = 'https://pypistats.org/api/packages';
const REQUEST_TIMEOUT_MS = 30_000;

function toDateOnly(date) {
    return date.toISOString().slice(0, 10);
}

/** pypistats.org is occasionally slow or 429s/5xxs under load — retry with backoff rather than
 *  ever treating a throttle or timeout as "no data." */
async function fetchWithRetry(url, { retries = 4, baseDelayMs = 1500 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const res = await fetch(url, { headers: { Connection: 'close' }, signal: controller.signal });
            if (res.status === 404) return res; // unknown package — not retryable, caller handles it
            if (res.ok) return res;
            if (![429, 500, 502, 503, 504].includes(res.status)) {
                throw new Error(`pypistats.org request failed: ${res.status} ${res.statusText}`);
            }
            lastErr = new Error(`pypistats.org returned ${res.status}`);
        } catch (err) {
            lastErr = err.name === 'AbortError' ? new Error('pypistats.org request timed out') : err;
        } finally {
            clearTimeout(timeout);
        }
        if (attempt < retries) {
            await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
        }
    }
    throw lastErr;
}

/** Sums the "without_mirrors" daily download counts within [startDate, endDate] (inclusive). */
async function fetchPackageTotal(pkg, startDate, endDate) {
    const res = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(pkg)}/overall?mirrors=false`);
    if (res.status === 404) return null; // unknown package

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
            try {
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
            } catch (err) {
                return { package: pkg, error: err.message };
            }
        }),
    );
}
