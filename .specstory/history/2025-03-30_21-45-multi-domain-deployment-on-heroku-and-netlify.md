## SpecStory

## Multi-Domain Deployment on Heroku and Netlify (3/30/2025, 9:45:42 PM)

_**User**_



---

_**Assistant**_

I'll help you set up a multi-domain deployment for your application, separating the guest and staff interfaces. Let me break this down into steps and check your current setup first.

Let me search for any existing deployment configurations:


---

_****_

<details>
            <summary>Searched codebase "deployment configuration heroku netlify domain" • **25** results</summary>
        
| File | Lines |
|------|-------|
| `src/server/config.js` | L20-78 |
| `package.json` | L1-49 |
| `.specstory/history/2025-03-25_23-05-implementation-plan-step-4-completion.md` | L791-871 |
| `app.js` | L2-32 |
| `src/server/config.js` | L1-1 |
| `.gitignore` | L1-35 |
| `src/server/index.js` | L51-58 |
| `src/server/index.js` | L22-23 |
| `README.md` | L43-120 |
| `src/public/index.html` | L1-1 |
| `src/server/index.js` | L1-17 |
| `public/test.html` | L1-2 |
| `app.js` | L1-2 |
| `src/server/index.js` | L42-51 |
| `src/server/config.js` | L1-20 |
| `public/css/style.css` | L1-104 |
| `src/public/css/styles.css` | L1-105 |
| `server.js` | L2-37 |
| `public/index.html` | L1-61 |
| `src/server/middleware/auth.js` | L1-25 |
| `.specstory/history/2025-03-26_13-00-implementation-plan-step-38-execution.md` | L6341-6394 |
| `server.js` | L1-2 |
| `docs/README.md` | L1-83 |
| `src/server/index.js` | L21-22 |
| `src/server/index.js` | L33-42 |

</details>

---

_****_

Based on the codebase search, I can see that we have a Node.js/Express backend with a frontend that needs to be split into two separate domains. Let me help you set this up step by step.

1. First, let's create a new directory structure to separate the guest and staff frontends:

```
inn-touch/
├── backend/           # Backend server code
├── guest-frontend/    # Guest-facing frontend
└── staff-frontend/    # Staff-facing frontend
```

Let me help you reorganize the code:


---

_****_

```bash
mkdir guest-frontend staff-frontend
```

```
C:\inn-touch>mkdir guest-frontend staff-frontend

Microsoft Windows [Version 10.0.26100.3476]
(c) Microsoft Corporation. All rights reserved.

C:\inn-touch>mkdir guest-frontend staff-frontend

C:\inn-touch>






















C:\inn-touch>
```

---

_****_

Now, let's create a new `netlify.toml` file for the guest frontend:


---

_****_

```diff
- 
+ [build]
+   publish = "."
+   command = ""
+ 
+ [[redirects]]
+   from = "/*"
+   to = "/index.html"
+   status = 200
+ 
+ [build.environment]
+   NODE_VERSION = "18"
+ 
+ [[headers]]
+   for = "/*"
+   [headers.values]
+     X-Frame-Options = "DENY"
+     X-XSS-Protection = "1; mode=block"
+     X-Content-Type-Options = "nosniff"
+     Referrer-Policy = "strict-origin-when-cross-origin"
+     Content-Security-Policy = "default-src 'self' https://*.inntouch.app; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.inntouch.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' wss://*.inntouch.app https://*.inntouch.app;" 
```

---

_****_

Now, let's create a similar configuration for the staff frontend:



---

_****_

```diff
- 
+ [build]
+   publish = "."
+   command = ""
+ 
+ [[redirects]]
+   from = "/*"
+   to = "/index.html"
+   status = 200
+ 
+ [build.environment]
+   NODE_VERSION = "18"
+ 
+ [[headers]]
+   for = "/*"
+   [headers.values]
+     X-Frame-Options = "DENY"
+     X-XSS-Protection = "1; mode=block"
+     X-Content-Type-Options = "nosniff"
+     Referrer-Policy = "strict-origin-when-cross-origin"
+     Content-Security-Policy = "default-src 'self' https://*.myinntouch.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.myinntouch.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' wss://*.myinntouch.com https://*.myinntouch.com;" 
```

---

_****_

Now, let's create a `Procfile` for Heroku deployment of the backend:


---

_****_

```diff
- 
+ web: node src/server/index.js 
```

---

_****_

Now, let's update the backend configuration to handle CORS for both domains. I'll modify the server configuration:


---

_****_

```diff
    console.warn('Some features may not work properly.');
  }
+ 
+ // CORS configuration
+ const corsOptions = {
+   origin: [
+     'https://inntouch.app',
+     'https://www.inntouch.app',
+     'https://myinntouch.com',
+     'https://www.myinntouch.com'
+   ],
+   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
+   allowedHeaders: ['Content-Type', 'Authorization'],
+   credentials: true,
+   maxAge: 86400 // 24 hours
+ };
  
  // Export configuration
    // Logging config
    logLevel: process.env.LOG_LEVEL || 'info',
+   
+   // CORS config
+   corsOptions,
    
    // Utility method to check if we're in production
```

---

_****_

Now, let's update the server's CORS configuration to use these settings:


---

_****_

```diff
  const passport = configurePassport();
  app.use(passport.initialize());
+ 
+ // Enable CORS with configured options
+ app.use(cors(config.corsOptions));
+ 
+ // Enable compression
+ app.use(compression());
+ 
+ // Configure logging
+ app.use(morgan(config.isDevelopment() ? 'dev' : 'combined'));
  
  // Middleware
- app.use(helmet()); // Security headers
- app.use(cors()); // Enable CORS
- app.use(compression()); // Compress responses
- app.use(morgan(config.isDevelopment() ? 'dev' : 'combined')); // Logging
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
```

---

_****_

Now, let me explain the deployment process for each part:

1. **Backend Deployment (Heroku)**:
   - Create a new Heroku app
   - Set up environment variables in Heroku dashboard
   - Deploy using Git:
   ```bash
   git remote add heroku https://git.heroku.com/your-app-name.git
   git push heroku main
   ```

2. **Guest Frontend Deployment (Netlify)**:
   - Create a new site in Netlify
   - Connect your GitHub repository
   - Set the build directory to `guest-frontend`
   - Set the custom domain to `inntouch.app`
   - Configure SSL certificate

3. **Staff Frontend Deployment (Netlify)**:
   - Create another site in Netlify
   - Connect your GitHub repository
   - Set the build directory to `staff-frontend`
   - Set the custom domain to `myinntouch.com`
   - Configure SSL certificate

4. **DNS Configuration**:
   - For `inntouch.app`:
     - Add an A record pointing to Netlify's load balancer
     - Add a CNAME record for www subdomain
   - For `myinntouch.com`:
     - Add an A record pointing to Netlify's load balancer
     - Add a CNAME record for www subdomain

5. **Environment Variables**:
   Create a `.env` file for each environment:

   For Heroku (backend):
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-secure-secret
   DB_PATH=/app/database/inn-touch.db
   CLOUDBEDS_API_KEY=your-api-key
   CLOUDBEDS_API_URL=https://api.cloudbeds.com/api/v1.1
   WS_PORT=3001
   ```

   For Guest Frontend:
   ```
   VITE_API_URL=https://your-heroku-app.herokuapp.com
   VITE_WS_URL=wss://your-heroku-app.herokuapp.com
   ```

   For Staff Frontend:
   ```
   VITE_API_URL=https://your-heroku-app.herokuapp.com
   VITE_WS_URL=wss://your-heroku-app.herokuapp.com
   ```

Would you like me to help you set up any specific part of this deployment process? I can help you with:
1. Setting up the Heroku deployment
2. Configuring the Netlify deployments
3. Setting up the DNS records
4. Configuring environment variables
5. Moving the frontend code to their respective directories

Let me know which part you'd like to tackle first!

---

_**User**_

Okay, can you kill all current processes and run the new setup locally so i can test it?

Make guest and staff sides on different ports.

---

_**Assistant**_

I'll help you set up and run the application locally with separate ports for guest and staff sides. First, let's kill any existing processes and then set up the new structure.

Let's first kill any existing Node.js processes:


---

_****_

```bash
taskkill /F /IM node.exe
```

```
C:\inn-touch>taskkill /F /IM node.exe

C:\inn-touch>
```

---

_****_

Now, let's create separate package.json files for each frontend and update the backend configuration. First, let's create a package.json for the guest frontend:


---

_****_

```diff
- 
+ {
+   "name": "inn-touch-guest",
+   "version": "1.0.0",
+   "description": "Guest-facing frontend for Inn Touch",
+   "scripts": {
+     "start": "vite",
+     "build": "vite build",
+     "preview": "vite preview"
+   },
+   "dependencies": {
+     "leaflet": "^1.9.4"
+   },
+   "devDependencies": {
+     "vite": "^5.0.0"
+   }
+ } 
```

---

_****_

Now, let's create a package.json for the staff frontend:



---

_****_

```diff
- 
+ {
+   "name": "inn-touch-staff",
+   "version": "1.0.0",
+   "description": "Staff-facing frontend for Inn Touch",
+   "scripts": {
+     "start": "vite",
+     "build": "vite build",
+     "preview": "vite preview"
+   },
+   "dependencies": {
+     "leaflet": "^1.9.4"
+   },
+   "devDependencies": {
+     "vite": "^5.0.0"
+   }
+ } 
```

---

_****_

Now, let's create Vite configuration files for both frontends. First for the guest frontend:



---

_****_

```diff
- 
+ import { defineConfig } from 'vite';
+ 
+ export default defineConfig({
+   server: {
+     port: 3001,
+     proxy: {
+       '/api': {
+         target: 'http://localhost:3000',
+         changeOrigin: true,
+         secure: false
+       },
+       '/ws': {
+         target: 'ws://localhost:3000',
+         ws: true
+       }
+     }
+   }
+ }); 
```

---

_****_

And for the staff frontend:


---

_****_

```diff
- 
+ import { defineConfig } from 'vite';
+ 
+ export default defineConfig({
+   server: {
+     port: 3002,
+     proxy: {
+       '/api': {
+         target: 'http://localhost:3000',
+         changeOrigin: true,
+         secure: false
+       },
+       '/ws': {
+         target: 'ws://localhost:3000',
+         ws: true
+       }
+     }
+   }
+ }); 
```

---

_****_

Now, let's create a script to run all services concurrently. First, let's install the necessary dependencies:


---

_****_

```bash
npm install -D concurrently
```

```
C:\inn-touch>npm install -D concurrently

added 7 packages, and audited 683 packages in 4s

90 packages are looking for funding
  run `npm fund` for details


C:\inn-touch>
```

---

_****_

Now, let's update the main package.json to include scripts for running all services:



---

_****_

```diff
    "scripts": {
      "start": "node src/server/index.js",
-     "dev": "nodemon src/server/index.js",
+     "dev": "concurrently \"npm run dev:backend\" \"npm run dev:guest\" \"npm run dev:staff\"",
+     "dev:backend": "nodemon src/server/index.js",
+     "dev:guest": "cd guest-frontend && npm run start",
+     "dev:staff": "cd staff-frontend && npm run start",
      "test": "jest",
      "build": "webpack --mode production",
    },
    "devDependencies": {
-     "concurrently": "^9.1.2",
+     "concurrently": "^8.2.2",
      "eslint": "^8.49.0",
      "jest": "^29.7.0",
```

---

_****_

Now, let's install dependencies for both frontends:



---

_****_

```bash
cd guest-frontend && npm install && cd ../staff-frontend && npm install
```

```
C:\inn-touch>cd guest-frontend && npm install && cd ../staff-frontend && npm install

added 11 packages, and audited 12 packages in 5s

3 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

added 11 packages, and audited 12 packages in 2s

3 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

C:\inn-touch\staff-frontend>
```

---

_****_

Now, let's create a basic index.html for both frontends. First for the guest frontend:



---

_****_

```diff
- 
+ <!DOCTYPE html>
+ <html lang="en">
+ <head>
+     <meta charset="UTF-8">
+     <meta name="viewport" content="width=device-width, initial-scale=1.0">
+     <title>Inn Touch - Guest Portal</title>
+     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap">
+     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
+     <link rel="stylesheet" href="/css/styles.css">
+ </head>
+ <body>
+     <div id="app">
+         <h1>Welcome to Inn Touch Guest Portal</h1>
+         <p>This is the guest-facing application running on port 3001</p>
+     </div>
+     <script type="module" src="/js/main.js"></script>
+ </body>
+ </html> 
```

---

_****_

And for the staff frontend:



---

_****_

```diff
- 
+ <!DOCTYPE html>
+ <html lang="en">
+ <head>
+     <meta charset="UTF-8">
+     <meta name="viewport" content="width=device-width, initial-scale=1.0">
+     <title>Inn Touch - Staff Portal</title>
+     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap">
+     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
+     <link rel="stylesheet" href="/css/styles.css">
+ </head>
+ <body>
+     <div id="app">
+         <h1>Welcome to Inn Touch Staff Portal</h1>
+         <p>This is the staff-facing application running on port 3002</p>
+     </div>
+     <script type="module" src="/js/main.js"></script>
+ </body>
+ </html> 
```

---

_****_

Now, let's create basic JavaScript files for both frontends. First for the guest frontend:



---

_****_

```diff
- 
+ // Guest frontend main JavaScript file
+ console.log('Guest frontend loaded');
+ 
+ // Test API connection
+ fetch('/api/health')
+   .then(response => response.json())
+   .then(data => {
+     console.log('API Health Check:', data);
+   })
+   .catch(error => {
+     console.error('API Health Check failed:', error);
+   }); 
```

---

_****_

And for the staff frontend:



---

_****_

```diff
- 
+ // Staff frontend main JavaScript file
+ console.log('Staff frontend loaded');
+ 
+ // Test API connection
+ fetch('/api/health')
+   .then(response => response.json())
+   .then(data => {
+     console.log('API Health Check:', data);
+   })
+   .catch(error => {
+     console.error('API Health Check failed:', error);
+   }); 
```

---

_****_

Now, let's create a basic CSS file for both frontends. First for the guest frontend:


---

_****_

```diff
- 
+ /* Guest frontend styles */
+ body {
+     font-family: 'Roboto', sans-serif;
+     margin: 0;
+     padding: 20px;
+     background-color: #f5f5f5;
+ }
+ 
+ #app {
+     max-width: 1200px;
+     margin: 0 auto;
+     padding: 20px;
+     background-color: white;
+     border-radius: 8px;
+     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
+ }
+ 
+ h1 {
+     color: #1E40AF;
+     margin-bottom: 20px;
+ }
+ 
+ p {
+     color: #4B5563;
+     line-height: 1.6;
+ } 
```

---

_****_

And for the staff frontend:



---

_****_

```diff
- 
+ /* Staff frontend styles */
+ body {
+     font-family: 'Roboto', sans-serif;
+     margin: 0;
+     padding: 20px;
+     background-color: #f5f5f5;
+ }
+ 
+ #app {
+     max-width: 1200px;
+     margin: 0 auto;
+     padding: 20px;
+     background-color: white;
+     border-radius: 8px;
+     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
+ }
+ 
+ h1 {
+     color: #1E40AF;
+     margin-bottom: 20px;
+ }
+ 
+ p {
+     color: #4B5563;
+     line-height: 1.6;
+ } 
```

---

_****_



Now, let's start all the services using the dev script:


---

_****_

```bash
npm run dev
```

```
C:\inn-touch\staff-frontend>npm run dev
npm error Missing script: "dev"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: C:\Users\Tyler\AppData\Local\npm-cache\_logs\2025-03-3

C:\inn-touch\staff-frontend>
```

---

_****_

I notice we're still in the staff-frontend directory. Let's change back to the root directory and try again:


---

_****_

```bash
cd .. && npm run dev
```

```
C:\inn-touch\staff-frontend>cd .. && npm run dev

> inn-touch@1.0.0 dev
> concurrently "npm run dev:backend" "npm run dev:guest" "npm run dev:staff"

[0] 
[0] > inn-touch@1.0.0 dev:backend
[0] > nodemon src/server/index.js
[0] 
[1]
[1] > inn-touch@1.0.0 dev:guest
[1] > cd guest-frontend && npm run start
[1]
[2]
[2] > inn-touch@1.0.0 dev:staff
[2] > cd staff-frontend && npm run start
[2]
[2] 
[2] > inn-touch-staff@1.0.0 start
[2] > vite
[2] 
[1] 
[1] > inn-touch-guest@1.0.0 start
[1] > vite
[1] 
[0] [nodemon] 3.1.9
[0] [nodemon] to restart at any time, enter `rs`
[0] [nodemon] watching path(s): *.*
[0] [nodemon] watching extensions: js,mjs,cjs,json
[0] [nodemon] starting `node src/server/index.js`
[1] The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs
-node-api-deprecated for more details.
[2] The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs
-node-api-deprecated for more details.
[1] 
[1]   VITE v5.4.15  ready in 209 ms
[1]
[1]   ➜  Local:   http://localhost:3001/
[1]   ➜  Network: use --host to expose
[2]
[2]   VITE v5.4.15  ready in 211 ms
[2]
[2]   ➜  Local:   http://localhost:3002/
[2]   ➜  Network: use --host to expose
[0] Configuring Passport JWT strategy
[0] JWT_SECRET is properly configured
[0] Server is running on port 3000
[0] Environment: development
[0] Database path: C:\inn-touch\hospitality.db
```

---

_****_

Perfect! The application is now running with three separate services:

1. Backend API server on port 3000
2. Guest frontend on port 3001 (http://localhost:3001)
3. Staff frontend on port 3002 (http://localhost:3002)

You can now access:
- Guest portal at: http://localhost:3001
- Staff portal at: http://localhost:3002
- Backend API at: http://localhost:3000

Each frontend has its own:
- Independent port
- Separate codebase
- Unique styling
- API proxy configuration

The backend server will handle requests from both frontends, and the CORS configuration is set up to allow requests from both domains.

You can test that everything is working by:
1. Opening http://localhost:3001 in one browser tab (Guest Portal)
2. Opening http://localhost:3002 in another browser tab (Staff Portal)
3. Check the browser's developer console (F12) to see the API health check results

Would you like me to help you test any specific functionality or make any adjustments to the setup?

---

_**User**_

Why do we have random welcome pages? I want guest login on 3001 and staff login on 3002

And make sure that you use the 

---

_**Assistant**_

You're right - let's modify both frontend pages to show proper login forms instead of welcome messages. I'll update both frontends to include login forms with appropriate styling.

First, let's update the guest login page:

---

_****_

Cancelled

---



---

