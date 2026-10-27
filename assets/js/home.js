document.addEventListener('DOMContentLoaded', async () => {
    const { fetchJson, appCard, hydrateCards, loadPosts, postRow } = window.SD;
    const apps = document.getElementById('homeApps');
    const posts = document.getElementById('homePosts');

    try {
        const data = await fetchJson('/data/apptic.json');
        const featured = data.apps.filter((app) => app.featured).slice(0, 4);
        apps.innerHTML = featured.map(appCard).join('');
        hydrateCards(featured);
    } catch (error) {
        apps.innerHTML = '<div class="empty">Couldn\'t load the Apptic. <a href="/apptic/">Try the store page</a>.</div>';
    }

    const list = await loadPosts();
    posts.innerHTML = list.length
        ? list.slice(0, 3).map(postRow).join('')
        : '<div class="empty">No posts yet.</div>';
});
