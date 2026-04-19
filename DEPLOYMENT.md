# Deployment Guide

## Frontend Deployment (Vercel)

Your frontend is deployed at: **https://intl-business.vercel.app/**

### Steps:
1. Push changes to GitHub
2. Vercel automatically deploys on push
3. Set environment variable in Vercel dashboard:
   - `VITE_API_URL`: Your Render backend URL (e.g., https://intl-business-backend.onrender.com)

---

## Backend Deployment (Render)

### Quick Setup:
1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repository (select `server` folder)
4. Use this build command: `npm install`
5. Use this start command: `npm start`
6. Add environment variables (see below)

### Environment Variables for Render:
```
NODE_ENV=production
PORT=5000
CLIENT_URL=https://intl-business.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

### Update Frontend API URL:
Once your Render backend is deployed, update the Vercel environment variable:
- Go to Vercel dashboard → Project settings → Environment Variables
- Add: `VITE_API_URL=https://your-render-backend-url`

---

## API URL Update

After backend is deployed to Render, update:

**Frontend (.env for Vercel):**
```
VITE_API_URL=https://intl-business-backend.onrender.com
```

**Backend (.env for Render):**
```
CLIENT_URL=https://intl-business.vercel.app
```

---

## Local Development

For local testing, use:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Frontend API URL: http://localhost:5000/api
