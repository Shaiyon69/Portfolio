# Personal Portfolio Website

## Project Structure

```
├── frontend/         # Static frontend files
│   ├── components/  # Additional pages
│   ├── css/         # Stylesheets
│   ├── data/        # Local portfolio and dev log data
│   ├── js/          # JavaScript files
│   └── images/      # Image assets
│    
├── README.md        # This file
└── index.html   # Main HTML file
```

## Manual Portfolio Posting

Manual posting means you can place portfolio content by editing data files and adding assets, without changing HTML, CSS, or JavaScript.

- Add or update projects in `frontend/data/projects.json`. Each project can define the repo name, description, category, links, tech stack, features, and image.
- Add dev logs in `frontend/data/manual-devlogs.json`. Each log can define title, date, project, tags, description/body, what changed, technical notes, comments, and links.
- Add images to `frontend/images/` or use repo preview images in the project `image` field.
- Replace the playable game build by dropping a new web export into `webvallaria/` while keeping `webvallaria/Convallaria.html` as the playable entry file.

## GitHub Projects and Dev Logs

The portfolio uses the public GitHub API for live project activity and commit-based dev logs. The configured account is `Shaiyon69`.

- GitHub activity is supplemental. Manually written dev logs stay the main portfolio posts.
- The site works without an API token, but public GitHub API requests are rate-limited. Local JSON data remains as the fallback.

For local testing, serve the project over HTTP so JSON fetches work:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.
