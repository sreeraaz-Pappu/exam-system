# 🎓 Secure Online Examination System

A full-stack, production-ready online examination platform with strict anti-cheat measures, admin control panel, and complete result management.

---

## 📁 Project Structure

```
exam-system/
│
├── backend/                      # Node.js + Express API Server
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── Student.js            # Student schema (login tracking)
│   │   ├── Question.js           # Question + answer schema
│   │   ├── Response.js           # Submission + score storage
│   │   └── ExamSettings.js       # Timer, title, active status
│   ├── middleware/
│   │   └── auth.js               # JWT verification (student + admin)
│   ├── routes/
│   │   ├── studentAuth.js        # POST /api/student/login
│   │   ├── exam.js               # GET /api/exam/questions, POST /submit
│   │   └── admin.js              # All admin APIs
│   ├── server.js                 # Express server entry point
│   ├── package.json
│   └── .env.example              # Copy to .env and configure
│
└── frontend/
    ├── shared/
    │   └── styles.css            # Common styles for all pages
    ├── student/
    │   ├── login.html            # Student login page
    │   ├── instructions.html     # Exam rules & fullscreen entry
    │   └── exam.html             # Live exam page (all anti-cheat)
    └── admin/
        ├── login.html            # Admin login
        └── dashboard.html        # Full admin panel (SPA)
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** v16+ — https://nodejs.org
- **MongoDB** (local or Atlas) — https://mongodb.com

### 2. Install Dependencies
```bash
cd exam-system/backend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings:
nano .env
```

Key settings in `.env`:
```
MONGO_URI=mongodb://localhost:27017/examdb
JWT_SECRET=change_this_to_random_string
JWT_ADMIN_SECRET=change_this_to_different_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPassword123
```

### 4. Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 5. Access the System
| Role    | URL                               |
|---------|-----------------------------------|
| Student | http://localhost:5000/student/login.html |
| Admin   | http://localhost:5000/admin/login.html   |

---

## 🛡 Security Features

### Anti-Cheat (Client-Side)
| Feature | Behavior |
|---------|----------|
| Tab switching | 1st = Warning, 2nd = Auto-submit |
| Fullscreen exit | 1st = Warning, 2nd = Auto-submit |
| Right-click | Disabled |
| Ctrl+C, Ctrl+V, Ctrl+U | Disabled |
| F12 / DevTools shortcuts | Disabled |
| Page refresh | Blocked with confirmation |
| Back button | Disabled |
| Text selection | Disabled |
| Copy/Paste events | Blocked |

### Backend Security
- Correct answers **never sent to frontend** (excluded at query level)
- Server-side answer evaluation only
- JWT authentication for all protected routes
- Rate limiting on login endpoints (10 req / 15 min)
- One-attempt enforcement via database flag
- Helmet.js for HTTP security headers
- Admin and student tokens use different secrets

---

## 👤 Student Flow

1. Visit `/student/login.html`
2. Enter Roll Number + Full Name
3. Read instructions at `/student/instructions.html`
4. Check "I agree" checkbox
5. Click **"Start Exam"** → Full-screen enabled
6. Answer questions → Submit
7. See confirmation: **"Your response has been recorded."**
   - ❌ No score shown
   - ❌ No correct answers shown
   - ❌ No retry option

---

## 🛡 Admin Flow

1. Visit `/admin/login.html`
2. Login with admin credentials
3. Admin Panel sections:
   - **Dashboard** — Stats + top performers
   - **Questions** — Add / Edit / Delete MCQ & Fill-in-blank
   - **Exam Settings** — Title, duration, activate/deactivate exam
   - **Results** — All submissions sorted by score, view individual answers
   - **Students** — View registrations, export data

---

## 📊 Admin Features

### Question Types Supported
- **MCQ** — Up to 4 options, mark correct by index
- **Fill in the Blank** — Exact text match (case-insensitive)

### Exports
- 📥 **Export Results** → `exam_results.xlsx` (ranked by score)
- 📥 **Export Students** → `student_data.xlsx` (login data)

### Result Columns (Excel)
Rank, Roll Number, Full Name, Score, Max Marks, %, Submitted At, Submission Type, Tab Switches, FS Exits, Time Taken

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGO_URI` | MongoDB connection string | localhost/examdb |
| `JWT_SECRET` | Student token secret | (required) |
| `JWT_ADMIN_SECRET` | Admin token secret | (required) |
| `ADMIN_USERNAME` | Admin login username | admin |
| `ADMIN_PASSWORD` | Admin login password | Admin@123456 |
| `EXAM_DURATION_MINUTES` | Default exam duration | 30 |
| `FRONTEND_URL` | CORS allowed origin | * |

---

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong, random JWT secrets (32+ chars)
3. Change default admin credentials
4. Use MongoDB Atlas for cloud database
5. Deploy with PM2: `pm2 start server.js --name exam-system`
6. Use Nginx as reverse proxy for SSL termination
7. Enable MongoDB authentication

---

## 📡 API Endpoints

### Student APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/student/login` | — | Login with roll no + name |
| GET | `/api/exam/questions` | Student JWT | Get questions (no answers) |
| POST | `/api/exam/submit` | Student JWT | Submit answers |

### Admin APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | — | Admin login |
| GET | `/api/admin/dashboard` | Admin JWT | Stats + top students |
| GET/PUT | `/api/admin/settings` | Admin JWT | Exam settings |
| GET/POST | `/api/admin/questions` | Admin JWT | List/Add questions |
| PUT/DELETE | `/api/admin/questions/:id` | Admin JWT | Edit/Delete question |
| GET | `/api/admin/results` | Admin JWT | All results |
| GET | `/api/admin/results/:id` | Admin JWT | Result detail |
| GET | `/api/admin/students` | Admin JWT | All students |
| DELETE | `/api/admin/students/:id` | Admin JWT | Delete student |
| GET | `/api/admin/export/results` | Admin JWT | Download Excel results |
| GET | `/api/admin/export/students` | Admin JWT | Download Excel students |

---

## 🔧 Troubleshooting

**MongoDB not connecting?**
```bash
# Start MongoDB locally
mongod --dbpath /data/db
```

**Port already in use?**
```bash
# Change PORT in .env or kill process
lsof -ti:5000 | xargs kill
```

**Students can't login?**
- Check exam is set to **Active** in Admin → Exam Settings

---

*Built with Node.js + Express + MongoDB + Vanilla JS*
