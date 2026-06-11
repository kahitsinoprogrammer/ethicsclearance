# Render Deploy

Use this flow when you want Render to pick up the latest backend, frontend, and database schema changes for this project.

## Backend

For the `ethics-clearance-backend` service:

- Set the Root Directory to `backend`.
- Set the Build Command to `npm install`.
- Set the Start Command to `npm start`.
- Set the Pre-Deploy Command to `npm run migrate`.
- Make sure `DATABASE_URL` points to the Render PostgreSQL instance used by `ethics-clearance-db`.
- Make sure `CLIENT_URL` points to the deployed frontend URL.

The backend also runs the SQL schema sync during startup, so redeploying the backend applies the latest schema automatically.

## Frontend

For the `ethics-clearance-frontend` service:

- Set the Root Directory to `frontend`.
- Set the Build Command to `npm install && npm run build`.
- Set the Publish Directory to `dist`.
- Set `VITE_API_URL` to your backend URL with `/api`, for example `https://your-backend.onrender.com/api`.

## Database

The backend migration step applies these SQL files to Render in order:

1. `backend/sql/create_forms_schema.sql`
2. `backend/sql/create_form_applications_schema.sql`
3. `backend/sql/drop_timestamp_defaults.sql`

This keeps the hosted schema aligned with the latest code, including the `form_application_question_comments` table.

## Important

These migrations update the database schema. They do not copy live row data from another PostgreSQL instance.

If you also need to move actual records from a local or old database into Render, export a PostgreSQL dump from the source database and import it into `ethics-clearance-db` separately.
