# Matcha

One-line description: A full-stack collaboration platform for discovering projects, evaluating ideas, and matching with teammates.

## Overview / Purpose

Matcha is a full-stack web application designed to help builders move from idea to collaboration in one workspace. It combines a Django REST API backend with a React + Vite frontend to support project discovery, AI-assisted idea evaluation, teammate matching, profile management, and connection workflows.

The project is built for local development first, with a lightweight default SQLite setup and optional PostgreSQL support for more advanced environments.

## Features List

- User registration and JWT-based authentication
- Public and private profile views
- Project creation and project detail pages
- Personal "My Projects" workspace
- Project join request flow
- Connection request and collaboration inbox flow
- Legacy library / project directory browsing
- AI-powered idea evaluation workflow
- Teammate matching experience
- Media upload support for user profile photos
- Local-first configuration with SQLite, plus optional PostgreSQL

## Screenshots or Demo

Demo flow for local development:

1. Start the backend on `http://127.0.0.1:8001`
2. Start the frontend on `http://127.0.0.1:5173`
3. Open the frontend in your browser and create an account

If you want to add live screenshots again later, place current app images in the repository and link them here.

## Tech Stack

### Frontend

- React 19
- React Router 7
- Axios
- Vite
- Tailwind CSS 4

### Backend

- Python 3
- Django 6
- Django REST Framework
- Simple JWT
- django-cors-headers

### Database / AI Integration

- SQLite by default
- PostgreSQL optionally
- Ollama-compatible model endpoint for idea evaluation

## Requirements (Prerequisites)

Install these before running the project:

- Node.js 18+ recommended
- npm 9+ recommended
- Python 3.10+ recommended
- pip
- Git (recommended for cloning and collaboration)

Optional:

- PostgreSQL if you do not want to use SQLite
- Ollama or another compatible local model service if you want idea evaluation features backed by a local model endpoint

### Ollama and Mistral setup

If you want the AI idea evaluator to work locally with the default configuration, set up Ollama with the `mistral:7b` model.

1. Install Ollama from the official site for your operating system
2. Start the Ollama app or background service
3. Pull the model:

```bash
ollama pull mistral:7b
```

4. Verify the model is available:

```bash
ollama list
```

5. Make sure your backend environment uses these values:

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral:7b
OLLAMA_TIMEOUT=60
```

If you use a different model, update `OLLAMA_MODEL` in `backend/.env` to match.

## Installation Steps

### Option 1: Automated setup

From the project root:

```bash
node setup.js
```

This script:

- checks `python` / `python3`, `node`, and `npm`
- installs backend dependencies from `backend/requirements.txt`
- runs `npm install` in `frontend`
- starts backend and frontend servers together

### Option 2: Manual setup

#### Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 8001
```

If your system uses `python` instead of `python3`, replace the command accordingly.

#### Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Usage Instructions

1. Open `http://127.0.0.1:5173`
2. Register a new account or log in
3. Complete your profile
4. Browse projects in the legacy library
5. Create your own project or request to join another one
6. Use the teammate matcher to find collaborators
7. Submit an idea through the idea evaluator for AI-assisted feedback

## Project Structure

```text
matcha stable/
├── backend/
│   ├── config/              # Django settings, URL config, WSGI/ASGI
│   ├── core/                # Main app: models, views, serializers, URLs
│   ├── media/               # Uploaded profile and media assets
│   ├── manage.py            # Django management entrypoint
│   ├── requirements.txt     # Python dependencies
│   └── db.sqlite3           # Default local SQLite database
├── frontend/
│   ├── public/              # Static public assets such as the logo
│   ├── src/
│   │   ├── api/             # Axios client and API helpers
│   │   ├── components/      # Shared UI components
│   │   ├── hooks/           # Frontend hooks
│   │   ├── pages/           # Route-level pages
│   │   ├── utils/           # Frontend utility helpers
│   │   ├── App.jsx          # App routes
│   │   └── main.jsx         # Frontend entrypoint
│   ├── index.html           # Vite HTML template
│   └── package.json         # Frontend scripts and dependencies
├── stitch_matcha_team_matching_ui/  # Design references and screens
├── setup.js                 # Automated cross-platform setup/start script
└── README.md
```

## Configuration Details

### Backend configuration

- Django settings live in `backend/config/settings.py`
- The backend loads environment variables from `backend/.env`
- Default database mode is SQLite
- To use PostgreSQL, set `DB_ENGINE=postgres` and provide the required `POSTGRES_*` values
- CORS is preconfigured for common Vite development ports such as `5173` and `4173`
- The idea evaluator expects an Ollama-compatible generation endpoint and defaults to the `mistral:7b` model

### Frontend configuration

- The frontend uses Vite
- The API base URL defaults to `http://127.0.0.1:8001/api`
- You can override the API base URL with `VITE_API_BASE_URL`

## Environment Variables

Create `backend/.env` using `backend/.env.example` as a starting point.

### Backend variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django secret key | `change-this-secret-key` |
| `DJANGO_DEBUG` | Enables debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `127.0.0.1,localhost` |
| `DB_ENGINE` | Database engine selection | `sqlite` or `postgres` |
| `SQLITE_PATH` | SQLite database file path | `db.sqlite3` |
| `POSTGRES_DB` | PostgreSQL database name | `legacy_library` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `OLLAMA_URL` | Model generation endpoint | `http://localhost:11434/api/generate` |
| `OLLAMA_MODEL` | Model name used for idea evaluation | `mistral:7b` |
| `OLLAMA_TIMEOUT` | Timeout in seconds for model calls | `60` |

### Frontend variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL for API requests | `http://127.0.0.1:8001/api` |

## API Endpoints

Base URL: `http://127.0.0.1:8001/api`

### Authentication

- `POST /auth/register/` - Register a new user
- `POST /auth/login/` - Obtain JWT access and refresh tokens
- `POST /auth/refresh/` - Refresh the access token

### Profiles

- `GET /profiles/<user_id>/` - View a public profile
- `GET /profile/` - Get the authenticated user's profile
- `PUT /profile/` or `PATCH /profile/` - Create or update the authenticated user's profile

### Projects

- `GET /projects/` - List projects
- `POST /projects/` - Create a project
- `GET /projects/mine/` - List projects owned by or associated with the current user
- `GET /projects/<id>/` - Get project detail
- `POST /projects/<project_id>/leave/` - Leave a project
- `POST /projects/<project_id>/members/<user_id>/remove/` - Remove a project member
- `POST /projects/<project_id>/join-request/` - Request to join a project
- `POST /project-join-requests/<id>/action/` - Accept or reject a join request

### Collaboration / Matching

- `GET /legacy-library/` - Browse the project directory
- `POST /connections/send/` - Send a connection request
- `GET /connections/incoming/` - List incoming connection requests
- `GET /connections/status/` - List connection states
- `POST /connections/<id>/action/` - Accept or reject a connection request
- `GET /matches/` - Get teammate match suggestions

### Ideas

- `POST /ideas/submit/` - Submit an idea for evaluation

## Scripts / Commands

### Root

```bash
node setup.js
```

### Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 8001
python3 manage.py test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

## Troubleshooting / Common Issues

### `python` or `python3` not found

Install Python and make sure it is available in your terminal PATH.

### `node` or `npm` not found

Install Node.js from the official installer, then reopen your terminal.

### Frontend cannot reach the backend

Check that:

- the Django server is running on port `8001`
- `VITE_API_BASE_URL` is correct
- CORS settings in `backend/config/settings.py` include your frontend port

### Database migration issues

Run:

```bash
cd backend
python3 manage.py migrate
```

If you switched databases, verify the related `.env` values first.

### Idea evaluator is not responding

Check that:

- your Ollama or compatible model endpoint is running
- `OLLAMA_URL` points to the correct endpoint
- the configured `OLLAMA_MODEL` exists locally

### Port already in use

If `5173` or `8001` is already occupied, stop the conflicting process or update your dev server configuration.

## Roadmap / Future Plans

- Add deployment-ready production configuration
- Add test coverage for key API and frontend workflows
- Add role-based permissions for project owners and members
- Improve onboarding with seeded demo data
- Add notifications and real-time collaboration updates
- Expand AI idea evaluation and matching explanations
- Add Docker support for one-command environment setup

## Contributing Guidelines

Contributions are welcome.

Suggested flow:

1. Fork the repository
2. Create a feature branch
3. Make focused changes with clear commit messages
4. Test the frontend and backend locally
5. Open a pull request with a short summary and screenshots if UI changes are included

Before submitting:

- keep changes scoped and readable
- update documentation when behavior changes
- verify that API and frontend flows still work locally

## License

No license has been specified yet. Add a license file before distributing or open-sourcing the project broadly.

## Author / Credits

- Matcha project contributors
- UI concept and design references in `stitch_matcha_team_matching_ui/`

## Contact / Support Info

If you are maintaining this project for a team or portfolio, add your preferred contact method here:

- GitHub Issues for bug reports and feature requests
- Project maintainer email
- LinkedIn or portfolio link

Current placeholder support path:

- Open an issue in the project repository
