(function () {
    const githubApi = 'https://api.github.com';
    const username = 'Shaiyon69';
    const projectDataUrl = 'frontend/data/projects.json';
    const manualLogsUrl = 'frontend/data/manual-devlogs.json';

    const state = {
        projects: [],
        repoMeta: new Map(),
        latestCommits: new Map(),
        activeFilter: 'All'
    };

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const formatDate = (value) => {
        if (!value) return 'No activity yet';
        return new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date(value));
    };

    const cleanCommitMessage = (message) => String(message || 'No commit message').split('\n')[0].trim();

    const isMeaningfulCommit = (commit) => {
        const message = String(commit && commit.commit && commit.commit.message || '').trim();
        const subject = cleanCommitMessage(message).toLowerCase();
        const body = message.split('\n').slice(1).join('\n').trim();
        const noisy = /\b(typo|formatting|minor fix|readme|dependency bump|deps|bump|chore only)\b/i;
        const meaningful = /^(feat|major|release|milestone|initial|redesign)(\(.+\))?:|\b(redesign|release|milestone|initial)\b/i;

        if (!message || noisy.test(subject)) return false;
        if (meaningful.test(subject)) return true;
        if (/^refactor(\(.+\))?:/i.test(subject) && (body.length > 80 || message.length > 120)) return true;
        return body.length > 120 || message.length > 160;
    };

    const getProjectStack = (project, repo) => {
        const stack = new Set(project.techStack || []);
        if (repo && repo.language) stack.add(repo.language);
        return Array.from(stack).filter(Boolean);
    };

    const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load ${url}`);
        return response.json();
    };

    const renderProjectFilters = () => {
        const filterContainer = document.getElementById('projectFilters');
        if (!filterContainer) return;

        const filters = ['All', 'Featured', ...new Set(state.projects.flatMap((project) => [
            project.category,
            ...(project.techStack || [])
        ]).filter(Boolean))];

        filterContainer.innerHTML = filters.map((filter) => `
            <button class="filter-chip${filter === state.activeFilter ? ' is-active' : ''}" type="button" data-project-filter="${escapeHtml(filter)}">
                ${escapeHtml(filter)}
            </button>
        `).join('');

        filterContainer.querySelectorAll('[data-project-filter]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeFilter = button.dataset.projectFilter;
                renderProjectFilters();
                renderProjects();
            });
        });
    };

    const projectMatchesFilter = (project) => {
        if (state.activeFilter === 'All') return true;
        if (state.activeFilter === 'Featured') return Boolean(project.featured);
        return project.category === state.activeFilter || (project.techStack || []).includes(state.activeFilter);
    };

    const renderProjects = () => {
        const container = document.getElementById('projectContainer');
        if (!container) return;

        const visibleProjects = state.projects.filter(projectMatchesFilter);

        if (!visibleProjects.length) {
            container.innerHTML = '<div class="empty-state">No projects match this filter yet.</div>';
            return;
        }

        container.innerHTML = visibleProjects.map((project) => {
            const repo = state.repoMeta.get(project.repo);
            const latestCommit = state.latestCommits.get(project.repo);
            const stack = getProjectStack(project, repo);
            const description = repo && repo.description ? repo.description : project.description;
            const pushedAt = repo ? repo.pushed_at : latestCommit && latestCommit.date;
            const githubUrl = project.githubUrl || (repo && repo.html_url) || `https://github.com/${username}/${project.repo}`;

            return `
                <article class="project-card reveal-card">
                    <div class="project-image-container">
                        <img src="${escapeHtml(project.image || 'frontend/images/task.svg')}" alt="${escapeHtml(project.name)} project preview" class="project-image">
                        ${project.featured ? '<span class="featured-badge">Featured</span>' : ''}
                    </div>
                    <div class="project-content">
                        <div class="project-heading">
                            <h3>${escapeHtml(project.name)}</h3>
                            <span>${escapeHtml(project.category || 'Project')}</span>
                        </div>
                        <p><i>${escapeHtml(description)}</i></p>
                        <div class="project-tags">
                            ${stack.slice(0, 5).map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}
                        </div>
                        <div class="project-activity">
                            <span>Latest activity</span>
                            <strong>${escapeHtml(formatDate(pushedAt))}</strong>
                            ${latestCommit ? `<a href="${escapeHtml(latestCommit.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanCommitMessage(latestCommit.message))}</a>` : '<em>Meaningful activity will appear after GitHub responds.</em>'}
                        </div>
                        ${project.purpose ? `
                            <div class="project-detail">
                                <span>Purpose</span>
                                <p>${escapeHtml(project.purpose)}</p>
                            </div>
                        ` : ''}
                        ${(project.features || []).length ? `
                            <div class="project-detail">
                                <span>Major features</span>
                                <ul>
                                    ${project.features.slice(0, 4).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${(project.relatedDevLogs || []).length ? `
                            <div class="project-related">
                                <span>Related dev logs</span>
                                ${(project.relatedDevLogs || []).slice(0, 3).map((id) => `<a href="frontend/components/blog-post.html?id=${encodeURIComponent(id)}">${escapeHtml(id.replace(/-/g, ' '))}</a>`).join('')}
                            </div>
                        ` : ''}
                        <div class="button-container project-actions">
                            <a href="${escapeHtml(githubUrl)}" class="btn" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>

                            ${project.liveUrl ? `
                                <a
                                    href="${project.liveUrl.startsWith('scroll:') ? '#' : escapeHtml(project.liveUrl)}"
                                    class="btn btn-ghost project-live-btn"
                                    ${project.liveUrl.startsWith('scroll:')
                                        ? `data-scroll="${escapeHtml(project.liveUrl.replace('scroll:', ''))}"`
                                        : `target="_blank" rel="noopener noreferrer"`}
                                >
                                    Live
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
        document.querySelectorAll('.project-live-btn[data-scroll]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();

            const target = document.querySelector(button.dataset.scroll);

            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    };

    const renderRecentActivity = () => {
        const container = document.getElementById('recentActivityContainer');
        if (!container) return;

        const commits = Array.from(state.latestCommits.entries())
            .map(([repo, commit]) => ({ repo, ...commit }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4);

        if (!commits.length) {
            container.innerHTML = '<div class="empty-state">Recent activity will appear after GitHub responds.</div>';
            return;
        }

        container.innerHTML = commits.map((commit) => `
            <a href="${escapeHtml(commit.url)}" class="activity-item" target="_blank" rel="noopener noreferrer">
                <span>${escapeHtml(commit.repo)}</span>
                <strong>${escapeHtml(cleanCommitMessage(commit.message))}</strong>
                <small>${escapeHtml(formatDate(commit.date))}</small>
            </a>
        `).join('');
    };

    const loadGitHubData = async (data) => {
        try {
            const repos = await fetchJson(`${githubApi}/users/${data.githubUsername || username}/repos?sort=updated&per_page=100`);
            repos.forEach((repo) => state.repoMeta.set(repo.name, repo));
        } catch (error) {
            console.warn('GitHub repository metadata unavailable:', error);
        }

        await Promise.all(state.projects.map(async (project) => {
            try {
                const commits = await fetchJson(`${githubApi}/repos/${data.githubUsername || username}/${project.repo}/commits?per_page=8`);
                const commit = commits.find(isMeaningfulCommit) || commits[0];
                if (commit) {
                    state.latestCommits.set(project.repo, {
                        message: commit.commit.message,
                        date: commit.commit.committer.date,
                        url: commit.html_url
                    });
                }
            } catch (error) {
                console.warn(`Commit metadata unavailable for ${project.repo}:`, error);
            }
        }));
    };

    const initProjects = async () => {
        const container = document.getElementById('projectContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading-state">Loading GitHub projects...</div>';

        try {
            const data = await fetchJson(projectDataUrl);
            state.projects = data.projects || [];
            renderProjectFilters();
            renderProjects();
            renderRecentActivity();
            await loadGitHubData(data);
            renderProjectFilters();
            renderProjects();
            renderRecentActivity();
        } catch (error) {
            console.error('Unable to load project data:', error);
            container.innerHTML = '<div class="empty-state">Unable to load projects right now.</div>';
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

    const initRecentPosts = async () => {
        const container = document.getElementById('recentPostsContainer');
        if (!container) return;

        try {
            const data = await fetchJson(manualLogsUrl);
            const posts = (data.logs || [])
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 4);

            if (!posts.length) {
                container.innerHTML = '<div class="empty-state">No dev logs yet. Check back soon.</div>';
                return;
            }

            container.innerHTML = posts.map((post) => `
                <article class="recent-post-card reveal-card">
                    <h3>${escapeHtml(post.title)}</h3>
                    <div class="recent-post-meta">
                        <span>${escapeHtml(formatDate(post.date))}</span>
                        <span>${escapeHtml(post.project || 'Portfolio')}</span>
                    </div>
                    <p>${escapeHtml(post.description || post.body)}</p>
                    ${(post.whatChanged || []).length ? `
                        <ul class="recent-post-highlights">
                            ${(post.whatChanged || []).slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div class="recent-post-tags">
                        ${(post.tags || []).map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <a href="frontend/components/blog-post.html?id=${encodeURIComponent(post.id)}">Read Dev Log</a>
                </article>
            `).join('');
        } catch (error) {
            console.error('Error loading dev logs:', error);
            container.innerHTML = '<div class="empty-state">Unable to load dev logs.</div>';
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initProjects();
        initRecentPosts();
    });
}());
