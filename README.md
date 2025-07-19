# 🎓 EduCircle Backend

EduCircle is a full-stack assignment management platform for students and educators to create, manage, submit, and evaluate assignments. This is the backend part of the project, built using Node.js, Express.js, MongoDB, and Firebase for authentication and authorization.

---

## 🌐 Live Server

> 🔗 https://edu-circle-server-seven.vercel.app/


---

## 🧰 Tech Stack

- **Node.js** & **Express.js** - Server framework
- **MongoDB Atlas** - Cloud database
- **Firebase Admin SDK** - Auth token verification
- **dotenv** - Environment variable management
- **CORS** - Middleware for secure cross-origin requests

---

## 📁 Folder Structure

🔐 Middleware Functions
verifyFirebaseToken
Verifies Firebase ID token from the Authorization header (Bearer <token>)

Attaches decoded user info to req.user

verifyTokenEmail
Validates if the email in the query string matches req.user.email

________

✅ Features Implemented (per requirement)
✅ Firebase authentication (JWT via ID Token)

✅ Middleware to protect routes

✅ Create / Read / Update / Delete Assignments

✅ Only creator can delete assignments

✅ Submit Assignments (with notes & Google Docs link)

✅ Marking Submissions with marks & feedback

✅ Filter & Search by difficulty and title

✅ Prevent user from marking their own assignment

✅ No crash on route reload (tested for CORS/404/504 errors)



🔄 Deployment Checklist
✅ Connected to MongoDB Atlas
✅ Firebase Admin SDK setup and secured
✅ All API routes tested
✅ CORS working in production
✅ .env properly configured
✅ Live link reachable without 404 errors
✅ Domain added to Firebase auth for deployment

🔗 Related Repositories
Frontend: EduCircle Client

Backend: EduCircle Server

📬 Submission Information
🔗 Live Site: https://edu-circle-admin.web.app/

📂 GitHub Server Repo: https://github.com/your-username/educircle-server

📂 GitHub Client Repo: https://github.com/your-username/educircle-client

🛡️ Security Best Practices
🔒 Never commit .env files to GitHub

🔒 Always validate user input

🔒 Handle all sensitive tokens with care (Firebase service keys, DB creds)

🔒 Use base64 encoding for Firebase credentials

👨‍💻 Author
Najmus Sakib
EduCircle Project | July 2025

