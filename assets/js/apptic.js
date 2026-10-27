document.addEventListener('DOMContentLoaded', async () => {
    const SD = window.SD;
    const { esc } = SD;
    const FILTERS = ['All', 'Windows', 'Android', 'Linux', 'Web', 'Game'];
    const storeView = document.getElementById('storeView');
    const appView = document.getElementById('appView');
    const grid = document.getElementById('appGrid');

    let apps = [];
    try {
        apps = (await SD.fetchJson('/data/apptic.json')).apps;
    } catch (error) {
        grid.innerHTML = '<div class="empty">Couldn\'t load the app list. Refresh to try again.</div>';
        return;
    }

    const renderStore = () => {
        let active = 'All';
        const filters = document.getElementById('appFilters');
        const draw = () => {
            filters.innerHTML = FILTERS.map((name) =>
                `<button class="filter" type="button" aria-pressed="${name === active}" data-filter="${name}">${name}</button>`).join('');
            const shown = apps.filter((app) => active === 'All' || SD.platformsOf(app).includes(active));
            grid.innerHTML = shown.length
                ? shown.map(SD.appCard).join('')
                : '<div class="empty">Nothing for that platform yet.</div>';
            SD.hydrateCards(shown);
        };
        filters.addEventListener('click', (event) => {
            const button = event.target.closest('[data-filter]');
            if (!button) return;
            active = button.dataset.filter;
            draw();
        });
        draw();
    };

    // Release notes are Markdown; render headings, bullets, bold and code from already-escaped text only.
    const notesHtml = (text) => {
        const inline = (line) => esc(line)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        let html = '';
        let inList = false;
        text.split(/\r?\n/).forEach((raw) => {
            const line = raw.trim();
            const item = line.match(/^[-*]\s+(.*)/);
            if (inList && !item) {
                html += '</ul>';
                inList = false;
            }
            if (item) {
                if (!inList) html += '<ul>';
                inList = true;
                html += `<li>${inline(item[1])}</li>`;
            } else if (/^#{1,6}\s/.test(line)) {
                html += `<h3>${inline(line.replace(/^#+\s*/, ''))}</h3>`;
            } else if (line) {
                html += `<p>${inline(line)}</p>`;
            }
        });
        return html + (inList ? '</ul>' : '');
    };

    const renderApp = async (app) => {
        storeView.hidden = true;
        appView.hidden = false;
        document.title = `${app.name} · Apptic · Skibidevs`;

        const source = app.repo && !app.repo.endsWith('/apptic-releases') ? `https://github.com/${app.repo}` : '';
        appView.innerHTML = `
            <a class="back" href="/apptic/">&larr; All apps</a>
            <div class="app-hero">
                ${SD.appIcon(app, 'lg')}
                <div>
                    <h1>${esc(app.name)}</h1>
                    <p>${esc(app.tagline)}</p>
                </div>
            </div>
            <div class="card get-box" id="getBox" aria-live="polite"></div>
            <div class="detail-grid">
                <section class="card">
                    <h2>About</h2>
                    <p>${esc(app.description)}</p>
                    <div id="notes"></div>
                </section>
                <aside class="card">
                    <h2>Details</h2>
                    <dl class="facts" id="facts">
                        <div><dt>Platforms</dt><dd>${esc(SD.platformsOf(app).join(', ') || 'In the works')}</dd></div>
                        ${source ? `<div><dt>Source</dt><dd><a href="${esc(source)}" rel="noopener">GitHub</a></dd></div>` : ''}
                    </dl>
                    <div id="related"></div>
                </aside>
            </div>`;

        const getBox = document.getElementById('getBox');
        const secondary = [
            app.play ? `<a class="btn" href="${esc(app.play)}">Play in your browser</a>` : '',
            app.web ? `<a class="btn${app.repo ? ' btn-ghost' : ''}" href="${esc(app.web)}" rel="noopener">Open in browser</a>` : ''
        ].join('');

        if (!app.repo) {
            getBox.innerHTML = secondary
                ? `<div class="actions" style="margin-top:0">${secondary}</div>${app.web ? '<p class="meta">Desktop and phone downloads are coming soon.</p>' : ''}`
                : '<p>Coming soon. Downloads will show up here once the first build is published.</p>';
        } else {
            getBox.innerHTML = '<p class="meta">Checking the latest release&hellip;</p>';
            try {
                const release = await SD.latestRelease(app.repo);
                const downloads = SD.downloadsFor(app, release);
                const os = SD.platform();
                const primary = downloads.find((item) => item.os === os) || downloads[0];
                const others = downloads.filter((item) => item !== primary);

                getBox.innerHTML = `
                    <div class="actions" style="margin-top:0">
                        ${primary
                            ? `<a class="btn" href="${esc(primary.url)}">Get for ${esc(primary.label)}${primary.size ? ` <span class="meta" style="color:inherit;opacity:.8">${esc(SD.formatSize(primary.size))}</span>` : ''}</a>`
                            : `<a class="btn" href="${esc(release.url)}" rel="noopener">See release files</a>`}
                        ${secondary}
                    </div>
                    ${others.length ? `<div class="other"><span class="meta">Also for:</span>${others.map((item) =>
                        `<a class="btn btn-ghost btn-sm" href="${esc(item.url)}">${esc(item.label)}</a>`).join('')}</div>` : ''}
                    <p class="meta">${esc(release.tag)} &middot; released ${esc(SD.formatDate(release.date))}</p>`;

                document.getElementById('facts').insertAdjacentHTML('afterbegin', `
                    <div><dt>Version</dt><dd>${esc(release.tag)}</dd></div>
                    <div><dt>Released</dt><dd>${esc(SD.formatDate(release.date))}</dd></div>`);
                if (release.notes.trim()) {
                    document.getElementById('notes').innerHTML = `
                        <h2 style="margin-top:24px">What's new in ${esc(release.tag)}</h2>
                        <div class="notes">${notesHtml(release.notes.trim())}</div>`;
                }
            } catch (error) {
                getBox.innerHTML = `
                    <div class="actions" style="margin-top:0">
                        <a class="btn" href="https://github.com/${esc(app.repo)}/releases/latest" rel="noopener">Download from GitHub</a>
                        ${secondary}
                    </div>
                    <p class="meta">Couldn't reach GitHub just now, so this opens the release page instead.</p>`;
            }
        }

        const posts = (await SD.loadPosts()).filter((post) => (post.project || '').toLowerCase() === app.name.toLowerCase());
        if (posts.length) {
            document.getElementById('related').innerHTML = `
                <h2 style="margin-top:24px">From the Scrappbook</h2>
                <div class="post-list">${posts.slice(0, 3).map((post) =>
                    `<a href="/scrappbook/?post=${encodeURIComponent(post.id)}">${esc(post.title)}</a>`).join('')}</div>`;
        }
    };

    const id = new URLSearchParams(location.search).get('app');
    const app = id && apps.find((item) => item.id === id);
    if (app) renderApp(app);
    else renderStore();
});
