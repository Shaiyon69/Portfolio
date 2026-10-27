// Shared helpers for every page: escaping, data loading, theme, nav state, Apptic releases.
window.SD = (function () {
    const RELEASE_TTL = 60 * 60 * 1000;

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

    const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} loading ${url}`);
        return response.json();
    };

    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value || '');
        return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };

    const store = {
        get(key) {
            try { return JSON.parse(localStorage.getItem(key)); } catch (error) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage blocked: skip caching */ }
        }
    };

    // Unauthenticated GitHub API allows 60 requests/hour per visitor, so cache each release for an hour.
    const latestRelease = async (repo) => {
        const key = `release:${repo}`;
        const cached = store.get(key);
        if (cached && Date.now() - cached.at < RELEASE_TTL) return cached.release;

        const data = await fetchJson(`https://api.github.com/repos/${repo}/releases/latest`);
        const release = {
            tag: data.tag_name,
            date: data.published_at,
            notes: data.body || '',
            url: data.html_url,
            assets: (data.assets || []).map((asset) => ({ name: asset.name, url: asset.browser_download_url, size: asset.size }))
        };
        store.set(key, { at: Date.now(), release });
        return release;
    };

    const platform = () => {
        const agent = navigator.userAgent;
        if (/Android/i.test(agent)) return 'android';
        if (/Windows/i.test(agent)) return 'windows';
        if (/iPhone|iPad|Macintosh/i.test(agent)) return 'apple';
        if (/Linux/i.test(agent)) return 'linux';
        return 'other';
    };

    const PLATFORM_LABEL = { windows: 'Windows', linux: 'Linux', android: 'Android' };

    // Matches each platform's file-name pattern against the release assets.
    const downloadsFor = (app, release) => Object.entries(app.assets || {}).flatMap(([os, pattern]) => {
        const asset = release && release.assets.find((item) => new RegExp(pattern, 'i').test(item.name));
        return asset ? [{ os, label: PLATFORM_LABEL[os] || os, ...asset }] : [];
    });

    const platformsOf = (app) => [
        ...Object.keys(app.assets || {}).map((os) => PLATFORM_LABEL[os] || os),
        ...(app.web ? ['Web'] : []),
        ...(app.play ? ['Game'] : [])
    ];

    const appIcon = (app, size = '') => app.icon
        ? `<img class="app-icon ${size}" src="${esc(app.icon)}" alt="" loading="lazy" width="64" height="64">`
        : `<span class="app-icon app-icon-mono ${size}" aria-hidden="true">${esc(app.name.charAt(0))}</span>`;

    const appUrl = (app) => `/apptic/?app=${encodeURIComponent(app.id)}`;

    const appCard = (app) => {
        let action = '<span class="btn btn-sm" aria-disabled="true">Coming soon</span>';
        if (app.repo) action = `<a class="btn btn-sm" href="${esc(appUrl(app))}" data-get="${esc(app.id)}">Get</a>`;
        else if (app.play) action = `<a class="btn btn-sm" href="${esc(app.play)}">Play</a>`;
        else if (app.web) action = `<a class="btn btn-sm" href="${esc(app.web)}" rel="noopener">Open</a>`;

        return `
            <article class="card app-card">
                <div class="app-top">
                    ${appIcon(app)}
                    <div>
                        <h3><a href="${esc(appUrl(app))}">${esc(app.name)}</a></h3>
                        <span class="meta" data-version="${esc(app.id)}">${esc(platformsOf(app).join(' · ') || 'In the works')}</span>
                    </div>
                </div>
                <p class="tagline">${esc(app.tagline)}</p>
                <div class="row">${action}</div>
            </article>`;
    };

    // Swap each card's "Get" link for the visitor's platform download once the release is known.
    const hydrateCards = (apps) => {
        const os = platform();
        apps.filter((app) => app.repo).forEach(async (app) => {
            try {
                const release = await latestRelease(app.repo);
                const version = document.querySelector(`[data-version="${CSS.escape(app.id)}"]`);
                if (version) version.textContent = `${release.tag} · ${platformsOf(app).join(' · ')}`;
                const match = downloadsFor(app, release).find((item) => item.os === os);
                const button = document.querySelector(`[data-get="${CSS.escape(app.id)}"]`);
                if (button && match) {
                    button.href = match.url;
                    button.textContent = `Get for ${match.label}`;
                } else if (button) {
                    button.textContent = 'View';
                }
            } catch (error) {
                // Card keeps linking to the app page, which falls back to GitHub's releases page.
            }
        });
    };

    // Scrappbook has two sources: structured dev logs and the older long-form posts.
    const loadPosts = async () => {
        const [logs, legacy] = await Promise.all([
            fetchJson('/data/logs.json').catch(() => ({ logs: [] })),
            fetchJson('/data/posts.json').catch(() => ({ posts: [] }))
        ]);
        return [
            ...(logs.logs || []).map((log) => ({ ...log, id: String(log.id), summary: log.description || log.body })),
            ...(legacy.posts || []).map((post) => ({
                id: String(post.id),
                title: post.title,
                date: post.date,
                project: (post.tags || []).includes('Convallaria') ? 'Convallaria' : '',
                tags: post.tags || [],
                summary: post.excerpt,
                content: post.content,
                readingTime: post.readingTime
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const postRow = (post) => `
        <a class="card post-row" href="/scrappbook/?post=${encodeURIComponent(post.id)}">
            <div class="post-meta">
                <span>${esc(formatDate(post.date))}</span>
                ${post.project ? `<span class="project">${esc(post.project)}</span>` : ''}
            </div>
            <h3>${esc(post.title)}</h3>
            <p>${esc(post.summary)}</p>
        </a>`;

    const formatSize = (bytes) => bytes ? `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB` : '';

    const initTheme = () => {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            const current = document.documentElement.dataset.theme
                || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem('theme', next); } catch (error) { /* storage blocked: theme lasts this visit only */ }
        });
    };

    const initNav = () => {
        const path = location.pathname;
        document.querySelectorAll('.tabs a').forEach((link) => {
            if (path.startsWith(new URL(link.href).pathname)) link.setAttribute('aria-current', 'page');
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initNav();
    });

    return { esc, fetchJson, formatDate, latestRelease, platform, downloadsFor, platformsOf, appIcon, formatSize, loadPosts, appUrl, appCard, hydrateCards, postRow };
}());
