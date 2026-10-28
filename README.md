# Allocalens

**Allocalens** is a web-based application designed to help users manage and analyze employee allocation data. The application aims to make employee data management and validation more organized, efficient, and accessible.

## About the Project

Allocalens is a capstone project that consists of a frontend application and a backend API. The frontend provides the user interface, while the backend handles application logic and data processing.

## Features

- Employee data management
- Employee data validation
- Display of valid and invalid employee records
- Frontend and backend separation for modular development

*Note: The features listed above should be adjusted to match the functionality currently implemented in the application.*

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js / Express.js *(adjust to the actual backend stack)*
- **Database:** Supabase *(if used by the current application)*
- **API Testing:** Postman
- **Version Control:** Git and GitHub

## Project Structure

```text
Allocalens/
├── backend/
├── frontend/
├── .gitignore
└── README.md
```

- `frontend/` — Contains the user interface and client-side application.
- `backend/` — Contains the backend API and server-side logic.
- `.gitignore` — Specifies files and folders excluded from Git tracking.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/nuralikapandoyo/Allocalens.git
cd Allocalens
```

### 2. Run the Frontend

```bash
cd frontend
npm install
npm start
```

If the frontend uses Vite, use `npm run dev` instead of `npm start`.

### 3. Run the Backend

Open a separate terminal:

```bash
cd backend
npm install
```

Then run the backend using the script configured in `backend/package.json`, for example:

```bash
npm run dev
```

Check the backend configuration and environment variables before running the application.

## Development Status

Allocalens is under development. Frontend and backend components are maintained in separate directories to support modular development and integration.

## Contributors

Developed as part of a capstone project.

## License

No license has been specified yet.
