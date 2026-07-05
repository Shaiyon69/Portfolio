(function () {
    const githubApi = 'https://api.github.com';
    const username = 'Shaiyon69';
    const projectDataUrl = '../data/projects.json';
    const manualLogsUrl = '../data/manual-devlogs.json';

    const state = {
        logs: [],
        activeType: 'All',
        activeQuery: ''
    };

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load ${url}`);
        return response.json();
    };

    const formatDate = (value) => new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(value));

    const cleanCommitMessage = (message) => String(message || 'No commit message').split('\n')[0].trim();

    const sentenceCase = (value) => {
        const text = cleanCommitMessage(value).replace(/^(feat|major|release|milestone|initial|redesign|refactor)(\(.+\))?:\s*/i, '');
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Meaningful project update';
    };

    const scoreCommit = (commit) => {
        const message = String(commit && commit.commit && commit.commit.message || '').trim();
        const subject = cleanCommitMessage(message).toLowerCase();
        const body = message.split('\n').slice(1).join('\n').trim();
        const stats = commit.stats || {};
        const files = commit.files || [];
        let score = 0;

        if (!message) return -20;
        if (/\b(typo|formatting|minor fix|readme only|readme-only|dependency bump|deps|bump|chore only)\b/i.test(subject)) score -= 8;
        if (/^chore(\(.+\))?:/i.test(subject) && body.length < 80) score -= 5;
        if (files.length && files.every((file) => /^README/i.test(file.filename || ''))) score -= 8;
        if (/^(feat|major|release|milestone|initial|redesign)(\(.+\))?:/i.test(subject)) score += 8;
        if (/\b(redesign|release|milestone|initial|launched|implemented|built|added)\b/i.test(subject)) score += 4;
        if (/^refactor(\(.+\))?:/i.test(subject)) score += files.length >= 6 || (stats.total || 0) >= 180 ? 5 : 1;
        if (files.length >= 8) score += 4;
        if ((stats.total || 0) >= 220) score += 4;
        if (body.length >= 120 || message.length >= 180) score += 3;
        return score;
    };

    const getCommitSummary = (commit) => {
        const files = commit.files || [];
        const stats = commit.stats || {};
        const scope = files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'project files';
        const total = stats.total ? ` and ${stats.total} changed line${stats.total === 1 ? '' : 's'}` : '';
        return `${sentenceCase(commit.commit.message)} across ${scope}${total}.`;
    };

    const getFilteredLogs = () => {
        const query = state.activeQuery.toLowerCase();

        return state.logs
            .filter((log) => state.activeType === 'All' || log.type === state.activeType)
            .filter((log) => {
                if (!query) return true;
                return [
                    log.title,
                    log.project,
                    log.description,
                    log.body,
                    log.comments,
                    ...(log.whatChanged || []),
                    ...(log.technicalNotes || []),
                    ...(log.tags || [])
                ].join(' ').toLowerCase().includes(query);
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const renderFilters = () => {
        const filterContainer = document.getElementById('devlogFilters');
        if (!filterContainer) return;

        ['All', 'Manual', 'GitHub'].forEach((type) => {
            const button = filterContainer.querySelector(`[data-devlog-type="${type}"]`);
            if (button) button.classList.toggle('is-active', state.activeType === type);
        });
    };

    const renderLogs = () => {
        const container = document.getElementById('postsContainer');
        const count = document.getElementById('devlogCount');
        if (!container) return;

        const logs = getFilteredLogs();
        if (count) count.textContent = `${logs.length} log${logs.length === 1 ? '' : 's'}`;

        if (!logs.length) {
            container.innerHTML = '<div class="empty-state">No dev logs match your search yet.</div>';
            return;
        }

        container.innerHTML = logs.map((log) => `
            <article class="devlog-entry reveal-card">
                <div class="devlog-header">
                    <div class="devlog-title-row">
                        <h2 class="devlog-title">${escapeHtml(log.title)}</h2>
                        <span class="devlog-source">${escapeHtml(log.type)}</span>
                    </div>
                    <div class="devlog-meta">
                        <span class="devlog-date">${escapeHtml(formatDate(log.date))}</span>
                        <span class="devlog-author">${escapeHtml(log.project)}</span>
                    </div>
                </div>
                <p class="devlog-content">${escapeHtml(log.description || log.body)}</p>
                ${log.body && log.body !== log.description ? `<p class="devlog-body">${escapeHtml(log.body)}</p>` : ''}
                ${(log.whatChanged || []).length ? `
                    <div class="devlog-detail-grid">
                        <section class="devlog-detail-block">
                            <h3>What changed</h3>
                            <ul>
                                ${log.whatChanged.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                            </ul>
                        </section>
                    </div>
                ` : ''}
                ${(log.technicalNotes || []).length ? `
                    <div class="devlog-detail-grid">
                        <section class="devlog-detail-block">
                            <h3>Technical notes</h3>
                            <ul>
                                ${log.technicalNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                            </ul>
                        </section>
                    </div>
                ` : ''}
                ${log.comments ? `
                    <aside class="devlog-notes">
                        <strong>Notes</strong>
                        <p>${escapeHtml(log.comments)}</p>
                    </aside>
                ` : ''}
                <div class="devlog-tags">
                    ${(log.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
                ${(log.links || []).length ? `
                    <div class="devlog-links">
                        ${log.links.map((link) => `<a href="${escapeHtml(link.url)}" target="${link.url.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}
                    </div>
                ` : ''}
            </article>
        `).join('');
    };

    const initInteractions = () => {
        const searchInput = document.getElementById('devlogSearch');
        const filterContainer = document.getElementById('devlogFilters');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                state.activeQuery = searchInput.value;
                renderLogs();
            });
        }

        if (filterContainer) {
            filterContainer.addEventListener('click', (event) => {
                const button = event.target.closest('[data-devlog-type]');
                if (!button) return;
                state.activeType = button.dataset.devlogType;
                renderFilters();
                renderLogs();
            });
        }
    };

    const loadManualLogs = async () => {
        try {
            const data = await fetchJson(manualLogsUrl);
            return (data.logs || []).map((log) => ({
                ...log,
                type: 'Manual',
                title: log.title,
                description: log.description || log.body,
                whatChanged: log.whatChanged || [],
                technicalNotes: log.technicalNotes || [],
                comments: log.comments || log.notes || '',
                links: log.links || []
            }));
        } catch (error) {
            console.warn('Manual dev logs unavailable:', error);
            return [];
        }
    };

    const loadGitHubLogs = async () => {
        try {
            const projectData = await fetchJson(projectDataUrl);
            const repos = (projectData.featuredRepos || []).slice(0, 6);
            const logs = await Promise.all(repos.map(async (repo) => {
                try {
                    const commits = await fetchJson(`${githubApi}/repos/${projectData.githubUsername || username}/${repo}/commits?per_page=12`);
                    const detailed = await Promise.all(commits.slice(0, 8).map(async (commit) => {
                        try {
                            return fetchJson(`${githubApi}/repos/${projectData.githubUsername || username}/${repo}/commits/${commit.sha}`);
                        } catch (error) {
                            console.warn(`GitHub commit detail unavailable for ${repo}:`, error);
                            return commit;
                        }
                    }));
                    const meaningful = detailed
                        .map((commit) => ({ commit, score: scoreCommit(commit) }))
                        .filter((item) => item.score >= 4)
                        .sort((a, b) => b.score - a.score || new Date(b.commit.commit.committer.date) - new Date(a.commit.commit.committer.date))
                        .slice(0, 3)
                        .map((item) => item.commit);

                    if (!meaningful.length) return [];

                    const latest = meaningful.slice().sort((a, b) => new Date(b.commit.commit.committer.date) - new Date(a.commit.commit.committer.date))[0];
                    return [{
                        id: `${repo}-${latest.sha}`,
                        type: 'GitHub',
                        title: `${repo}: ${sentenceCase(latest.commit.message)}`,
                        date: latest.commit.committer.date,
                        project: repo,
                        tags: ['GitHub', 'Meaningful Update', latest.commit.author && latest.commit.author.name].filter(Boolean),
                        description: `${meaningful.length} meaningful ${repo} update${meaningful.length === 1 ? '' : 's'} grouped from recent GitHub activity.`,
                        body: meaningful.map(getCommitSummary).join('\n'),
                        whatChanged: meaningful.map((commit) => sentenceCase(commit.commit.message)),
                        technicalNotes: meaningful.map((commit) => {
                            const stats = commit.stats || {};
                            const files = commit.files || [];
                            return `${commit.sha.slice(0, 7)} touched ${files.length || 'unknown'} file${files.length === 1 ? '' : 's'}${stats.total ? ` with ${stats.total} changed lines` : ''}.`;
                        }),
                        links: [
                            ...meaningful.map((commit) => ({
                                label: `View ${commit.sha.slice(0, 7)}`,
                                url: commit.html_url
                            })),
                            {
                                label: 'Repository',
                                url: `https://github.com/${projectData.githubUsername || username}/${repo}`
                            }
                        ]
                    }];
                } catch (error) {
                    console.warn(`GitHub commits unavailable for ${repo}:`, error);
                    return [];
                }
            }));

            return logs.flat();
        } catch (error) {
            console.warn('GitHub dev logs unavailable:', error);
            return [];
        }
    };

    const initTheme = () => {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        if (!themeToggle || !themeIcon) return;

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    };

    function applyTheme(theme) {
        const themeIcon = document.getElementById('themeIcon');
        document.body.classList.toggle('dark-mode', theme === 'dark');
        document.body.classList.toggle('light-mode', theme !== 'dark');
        if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    }

    const initDevLogs = async () => {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading-state">Loading dev logs...</div>';
        initInteractions();
        renderFilters();

        const [manualLogs, githubLogs] = await Promise.all([
            loadManualLogs(),
            loadGitHubLogs()
        ]);

        state.logs = [...manualLogs, ...githubLogs];
        renderLogs();
    };

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initDevLogs();
    });
}());
