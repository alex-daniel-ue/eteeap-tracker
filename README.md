# ETEEAP Tracker

A offline-first, desktop application designed to securely streamline the tracking of ETEEAP student candidates, their enrollment timelines, and requirement documents.

## Key Features
*   **Intelligent Dashboard:** Automatically tracks student enrollment timelines, highlighting overdue candidates, recently enrolled students, and those closest to completion.
*   **Dynamic Requirement Management:** Build global checklist templates with drag-and-drop reordering, historical name aliasing, and local file attachment support with hash-based deduplication.
*   **Secure & Contained Data:** Runs entirely offline with a local SQLite database, automatic daily rolling JSON backups, and zero external cloud dependencies.

## Tech Stack
*   **UI / Frontend:** React, TailwindCSS, React-Bootstrap
*   **Internal Server:** Express.js
*   **Desktop Environment:** Electron, Electron-Vite
*   **Database:** SQLite (via `better-sqlite3`)
*   **File Handling:** Multer + Node `crypto` (Hash deduplication)

---

## Setup & Development

**Prerequisites:**
*   Node.js (v20 or v22 LTS recommended)

**Installation:**
```bash
npm install
```

**Run in Development:**
```bash
npm run dev
```

**Build for Production:**
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## Configuration (`config.json`)
The application generates a `config.json` file on its first launch. This file controls the logic for the dashboard warnings and automated backup limits. 

It is located in the user data folder alongside your database (see *File Structure* below). If you ever corrupt this file, delete it, and the app will generate a fresh one with default values on the next launch.

---

## Local File Structure
Because this is an Electron application, all user data, configuration, and uploaded files are stored safely in the OS-level application data folder (e.g., `%APPDATA%/eteeap-tracker/` on Windows).

```text
eteeap-tracker/
├── backups/
│   ├── backup-2023-10-01.eteeap.backup
│   └── backup-2023-10-02.eteeap.backup   <-- Daily rolling JSON backups
│
└── data/
    ├── config.json                       <-- Threshold & App settings
    ├── database.sqlite                   <-- Main SQLite Database
    ├── database.sqlite-wal               <-- SQLite Write-Ahead Log
    │
    └── uploads/
        └── students/
            ├── 1/                        <-- Student ID
            │   ├── 3/                    <-- Requirement Template ID
            │   │   ├── birthcert_a1b2c3d4.pdf
            │   │   └── .hidden.old_file_a1b2c3d4.pdf
            │   └── 5/
            │       └── id_picture_f9e8d7c6.png
            └── 2/
                └── ...
```

---

## Domain Logic & Terminology

### Reordering Requirements
Requirement checklists are global. When you change the order of a requirement in the settings, the app updates the `display_order` integer in the database. This ensures that the checklist appears in the exact same logical order across every single student's profile, keeping administrative data entry uniform.

### Historical Aliases
If a government or university requirement changes its name (e.g., from "NSO Birth Certificate" to "PSA Birth Certificate"), simply rename it in the app. The app preserves the old name in the `requirement_aliases` table. This ensures that when reviewing students enrolled years ago, staff have context on what the requirement used to be called without needing to create duplicate templates.

### Archive vs. Permanent Delete
*   **Archive:** Soft-deletes the student. They are removed from the main directory and dashboard calculations but remain safely in the database. Their files, timelines, and remarks are preserved, allowing them to be restored at any time.
*   **Permanent Delete:** Hard-deletes the student. This irreversibly wipes their record from the `students` table, destroys their `student_requirements` mapping links, and is meant only for accidental entries or data purging.