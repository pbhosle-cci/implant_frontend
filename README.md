# IMPLANZ Frontend

Next.js + React + TypeScript frontend for the IMPLANZ dental implant planning web application.

## Requirements

- Node.js ^24
- Backend running at `http://localhost:8000` (see implanz-backend repo)

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

App runs at `http://localhost:3000`

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 6 (strict mode)
- vtk.js — 3D bone surface and implant mesh rendering

## Features

- Load NIfTI CT scans (.nii .nii.gz)
- Axial / Coronal / Sagittal slice views
- 3D bone surface rendering
- Implant mesh positioning (mouse drag + keyboard)
- BV/TV bone density computation
- Export mesh and NIfTI results
