# Prajwal Backend — Architecture Documentation

This document provides a comprehensive technical overview of the **Prajwal Backend** codebase (Medhwan / Prajwal EdTech Platform). It details the architectural paradigms, technology stack, directory layout, domain models, end-to-end request pipelines, external service integrations, and operational maintenance jobs.

---

## 1. System Overview & Context

**Prajwal** is an educational technology backend designed to support Indian school curricula across educational boards (such as GSEB, CBSE, and ICSE), mediums (English, Gujarati, Hindi), and standard grades (Grades 1–12).

### Core Functional Capabilities:
- **Authentication & User Management**: Multi-factor identity validation supporting Phone OTP (MSG91), Email/Password, Email verification links, Device session tracking, and IP subnet anomaly checks.
- **Academic Content Hierarchy**: Subjects $\rightarrow$ Chapters $\rightarrow$ Educational Assets (Questions, Videos, Notes, Mind Maps, Hotlines, Practice Papers).
- **Embedded AI & Semantic Search**: In-process inference using local Transformers (`@xenova/transformers` with `all-MiniLM-L6-v2`) computing 384-dimensional dense vectors and cosine similarities for semantic question retrieval.
- **Monetization & Commercials**: Razorpay order management, HMAC-SHA256 signature verification, 1-year subject licenses, dynamic coupon discounts, and a 120-hour free-trial anti-abuse tracking system.
- **Background Maintenance**: Automated scheduled routines (`node-cron`) to maintain relational integrity, synchronize subject counters, clean temporary storage, and prune orphaned data.

---

## 2. Technology Stack

| Layer | Technologies / Packages | Purpose |
|---|---|---|
| **Runtime & Framework** | Node.js (CommonJS), Express.js 4.19 | HTTP server, REST routing, middleware orchestration |
| **Database & ODM** | MongoDB, Mongoose 8.5 | Schematized data storage, indexing, lifecycle hooks |
| **Local Machine Learning** | `@xenova/transformers` (`all-MiniLM-L6-v2`) | In-memory text embeddings generation without external API dependencies |
| **Security & Cryptography** | `jsonwebtoken`, `bcrypt`, `helmet`, `cors`, `crypto` | JWT tokens, password hashing, security headers, HMAC verification |
| **Payment Gateway** | Razorpay SDK (`razorpay`) | Order generation, digital payments, webhook validation |
| **Communication / Messaging** | `msg91` (SMS OTP), `nodemailer` (SMTP) | Phone OTP delivery, email verification, job application alerts |
| **File & Media Handling** | `multer` (memoryStorage) | JSON file uploads, resume handling |
| **Job Scheduling** | `node-cron` | Cron-based background synchronization |
| **Environment & Tooling** | `dotenv`, `nodemon`, bash deployment scripts | Configuration management and local execution |

---

## 3. High-Level Architectural Diagram

```mermaid
flowchart TD
    Client["Client Applications\n(Mobile App / Web Portal)"]

    subgraph Entry ["Server Entry & Middleware Pipeline"]
        Server["server.js / app.js"]
        Security["Security Middlewares\n(Helmet, CORS, CookieParser)"]
        AuthMid["Auth Middlewares\n(isAuthenticated, isAdmin, isSameIP)"]
        UploadMid["File Upload Middleware\n(Multer memoryStorage)"]
    end

    subgraph Controllers ["Controllers & Business Logic"]
        UserController["User & Auth Controller"]
        SearchController["AI Semantic Search Controller\n(@xenova/transformers)"]
        ContentController["Academic Content Controllers\n(Subject, Chapter, Question, Video, Note)"]
        PracticeController["Practice Papers & Subjects"]
        PaymentController["Payment & Purchase Controller\n(Razorpay + Coupons)"]
        SyncController["Sync & Maintenance Controller"]
    end

    subgraph External ["External Services & Gateways"]
        MSG91["MSG91 SMS Gateway\n(with Mock Fallback)"]
        RazorpayGW["Razorpay Payment Gateway\n(with Mock Fallback)"]
        SMTP["SMTP Mail Server\n(Nodemailer)"]
    end

    subgraph Database ["Data & Persistence Layer"]
        MongoDB[("MongoDB Database\n(Medhwan Collection)")]
    end

    subgraph Schedulers ["Background Tasks"]
        CronJob["Node-Cron Scheduler\n(Sunday 3:00 AM - 3:40 AM)"]
    end

    Client -->|HTTP / REST| Server
    Server --> Security
    Security --> AuthMid
    Security --> UploadMid
    AuthMid --> Controllers

    UserController -->|SMS OTP| MSG91
    UserController -->|Verification & Reset Emails| SMTP
    PaymentController -->|Order & Verification| RazorpayGW

    Controllers -->|Mongoose ODM| MongoDB
    CronJob -->|Periodic Sync| SyncController
    SyncController --> MongoDB
```

---

## 4. Directory & Module Structure

```
prajwal_backend/
├── app.js                      # Express application setup, middlewares, and route mounting
├── server.js                   # Application entry point: initializes DB and starts HTTP server
├── run.sh                      # Shell deployment script (git pull, port kill, nodemon start)
├── package.json                # Dependencies and run scripts
├── test-db-connection.js       # Standalone diagnostic utility for MongoDB connectivity
│
├── config/                     # Service Configurations & Gateways
│   ├── database.js             # Mongoose connection options, pooling, timeouts & lifecycle
│   ├── msg91.js                # MSG91 SMS OTP service client with mock fallback
│   └── razorpay.js             # Razorpay API client with mock fallback
│
├── controllers/                # Business Logic Handlers
│   ├── aiSearch.js             # Xenova transformers model initialization & cosine vector search
│   ├── chapter.js              # Chapter CRUD operations
│   ├── connect.js              # Hiring/job application contact form handler
│   ├── coupon.js               # Coupon creation, validation, and usage tracking
│   ├── course.js               # Course bundle management
│   ├── hotLine.js              # Hotline content controller
│   ├── message.js              # Noticeboard / broadcast message operations
│   ├── mindMap.js              # Mind map educational assets
│   ├── note.js                 # Revision notes controller
│   ├── payment.js              # Legacy / direct payment handling
│   ├── practicePaper.js        # Practice test papers
│   ├── practiceSubject.js      # Practice subjects grouping
│   ├── preference.js           # User learning preferences (board, medium, standard)
│   ├── purchase.js             # Razorpay order generation and subject license activation
│   ├── question.js             # Question CRUD, batch JSON upload, and paginated queries
│   ├── subject.js              # Subject management and user created-subject references
│   ├── sync.js                 # Database reconciliation routines (counts, bookmarks, cleanup)
│   ├── user.js                 # Authentication, OTP, profile, devices, trials, bookmarks
│   └── video.js                # Video lesson URLs and metadata
│
├── middlewares/                # Express Middlewares
│   ├── auth.js                 # JWT verification (isAuthenticated, isLoggedIn), isAdmin, isSameIP
│   ├── fileUpload.js           # In-memory multer middleware for JSON file uploads
│   └── sendEmail.js            # Nodemailer transport wrapper for automated emails
│
├── models/                     # Mongoose Schemas & Lifecycle Hooks
│   ├── chapter.js              # Chapter schema
│   ├── coupon.js               # Promotional discount coupons
│   ├── course.js               # Course model
│   ├── deletedUserTrial.js     # Deleted account free-trial history to prevent trial reuse
│   ├── hotLine.js              # Hotline schema
│   ├── message.js              # Notice/bulletin messages
│   ├── mindMap.js              # Visual mind map schemas
│   ├── note.js                 # Study note schema
│   ├── payment.js              # Razorpay payment orders and receipts
│   ├── practice_subjects.js    # Practice subject model
│   ├── practicePaper.js        # PDF / link practice papers
│   ├── preference.js           # User educational preferences (board, medium, standard)
│   ├── question.js             # Question schema (includes 384-dim vector embeddings)
│   ├── subject.js              # Academic subjects with question-type counters
│   ├── user.js                 # Core user schema with pre/post hooks and helper methods
│   └── video.js                # Video content schema
│
├── routes/                     # REST API Endpoint Definitions
│   ├── chapter.js              # /api/v1/chapter
│   ├── connect.js              # /api/v1/connect
│   ├── coupon.js               # /api/v1/coupon
│   ├── hotLine.js              # /api/v1/hot-line
│   ├── message.js              # /api/v1/message
│   ├── mindMap.js              # /api/v1/mind-map
│   ├── note.js                 # /api/v1/note
│   ├── payment.js              # /api/v1/payment
│   ├── practicePaper.js        # /api/v1/practice-papers
│   ├── practiceSubject.js      # /api/v1/practice-subjects
│   ├── preference.js           # /api/v1/preferences
│   ├── purchase.js             # /api/v1/purchase
│   ├── question.js             # /api/v1/question
│   ├── search.js               # /api/v1/search & /api/v1/generate-embeddings
│   ├── subject.js              # /api/v1/subject
│   ├── sync.js                 # /api/v1/sync
│   ├── user.js                 # /api/v1/register, login, me, otp, passwords
│   └── video.js                # /api/v1/video
│
├── maintenance/                # Scheduled Cron Tasks
│   └── scheduler.js            # Schedules weekly synchronization & cleanup jobs
│
└── scripts/                    # Offline / Administrative Utilities
    └── generateEmbeddings.js   # Script to generate vector embeddings for all questions
```

---

## 5. Domain Models & Entity Relationships

```mermaid
erDiagram
    USER ||--o| PREFERENCE : "has one"
    USER ||--o{ PAYMENT : "makes"
    USER ||--o{ PURCHASED_SUBJECT : "owns license"
    USER ||--o{ BOOKMARKED_QUESTION : "bookmarks"
    USER ||--o{ LOGGED_IN_DEVICE : "tracks"
    
    SUBJECT ||--o{ CHAPTER : "contains"
    SUBJECT ||--o{ QUESTION : "contains"
    SUBJECT ||--o{ VIDEO : "contains"
    SUBJECT ||--o{ NOTE : "contains"
    SUBJECT ||--o{ MIND_MAP : "contains"
    SUBJECT ||--o{ HOT_LINE : "contains"

    PRACTICE_SUBJECT ||--o{ PRACTICE_PAPER : "groups"

    QUESTION ||--o| CHAPTER : "belongs to"
    VIDEO ||--o| CHAPTER : "belongs to"
    NOTE ||--o| CHAPTER : "belongs to"
    MIND_MAP ||--o| CHAPTER : "belongs to"
    HOT_LINE ||--o| CHAPTER : "belongs to"

    PAYMENT ||--o| COUPON : "optional discount"
    USER ||--o| DELETED_USER_TRIAL : "checked against on signup"

    USER {
        string user_id "e.g. 2025000001"
        string mobile_number "unique"
        string email_id
        string password
        boolean is_mobile_verified
        boolean is_registered
        boolean is_pro
        boolean freeTrialActive
        datetime freeTrialEnd "120 hours"
        string UserIP "tracked for subnet consistency"
    }

    QUESTION {
        string question_id "unique"
        string question
        string question_type "mcq, blank, 2_marks, etc."
        float[] embedding "384-dimensional vector"
        string embedding_text
        int marks
    }

    SUBJECT {
        string subject_id
        string title
        string medium "eng, guj, hin"
        string board "gseb, cbse, icse"
        string standard "10, 12, etc."
        object details "question type counts"
    }
```

### Critical Model Mechanisms:
1. **Automated User ID Generation (`models/user.js`)**:
   - A `pre('save')` hook queries the highest serial user for the current calendar year (e.g., `2026000042`) and increments it automatically (`YYYY + 6-digit serial`).
2. **120-Hour Free Trial**:
   - Automatically initializes `freeTrialStart` and sets `freeTrialEnd = Date.now() + 120 hours`.
   - On modification, another hook ensures `freeTrialActive` transitions to `false` once `Date.now() > freeTrialEnd`.
   - When accounts are purged, trial records are saved into `DeletedUserTrial` to prevent re-registering for infinite free access.
3. **Cascading Preferences**:
   - A `post('save')` hook on `User` automatically creates a default `Preference` entry (`board: GSEB`, `medium: ENG`, `standard: 10`, `theme: system`, `language: en`).
4. **IP Subnet Security (`UserIP`)**:
   - The user model tracks `UserIP`. Requests through `isSameIP` match the first three octets of IPv4 (`X.X.X.*`) to prevent account sharing while accommodating minor mobile network changes.

---

## 6. Key Request & Data Flow Pipelines

### 6.1 Authentication Pipeline (Phone OTP & Device Locking)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as User Controller
    participant MSG91 as MSG91 Service
    participant DB as MongoDB (User)
    
    Client->>API: POST /api/v1/register/phone { mobile_number }
    API->>DB: Check if user exists
    alt User Does Not Exist
        API->>DB: Create user with placeholder email & generate 6-digit OTP
    else User Exists
        API->>DB: Update phoneOtp & phoneOtpExpire (10 min expiry)
    end
    API->>MSG91: sendOTP(mobile_number, otp)
    API-->>Client: { success: true, message: "OTP sent successfully" }

    Client->>API: POST /api/v1/verify/otp { mobile_number, otp }
    API->>DB: Find user with +phoneOtp & +phoneOtpExpire
    alt OTP Valid & Not Expired
        API->>DB: Mark is_mobile_verified = true, clear OTP fields
        API->>DB: Invalidate previous logged_in_devices, append new device
        API->>API: Generate JWT (expires in 30d/90d)
        API-->>Client: { success: true, token, user }
    else Invalid or Expired OTP
        API-->>Client: 400 Bad Request
    end
```

---

### 6.2 Payment Verification & Course Entitlement

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as Purchase Controller
    participant Razorpay as Razorpay API
    participant DB as MongoDB
    
    Client->>API: POST /api/v1/createOrder { amount, receipt }
    API->>Razorpay: orders.create({ amount * 100, currency: "INR", receipt })
    Razorpay-->>API: { id: "order_xyz", ... }
    API->>DB: Payment.create({ razorpayOrderId, amount, status: "created", owner })
    API-->>Client: { order, razorpayKey }

    Note over Client: User completes payment on Razorpay SDK

    Client->>API: POST /api/v1/purchase/courses { orderId, paymentId, signature, subjectId, couponCode }
    API->>API: Compute HMAC SHA-256 (orderId + "|" + paymentId, SECRET)
    alt Signature Matches
        API->>DB: Payment.findOneAndUpdate({ status: "paid", paymentId, signature })
        alt Coupon Provided
            API->>DB: Validate coupon dates, max_users & increment used_count
        end
        API->>DB: User.purchasedSubjects.push({ subject: subjectId, validTill: +365 days })
        API->>DB: User.is_pro = true
        API-->>Client: 200 OK { success: true, message: "Purchase successful", validTill }
    else Signature Mismatch
        API->>DB: Payment.findOneAndUpdate({ status: "failed" })
        API-->>Client: 400 Bad Request { message: "Invalid payment signature" }
    end
```

---

### 6.3 Semantic Question Search Engine

Unlike typical search setups that require external services like Pinecone or ElasticSearch, this backend implements an **in-process neural search engine** using `@xenova/transformers`.

```mermaid
flowchart TD
    Init["Server Boot / Route Trigger\ncontrollers/aiSearch.js"] --> Load["Load Xenova/all-MiniLM-L6-v2 pipeline\n(Task: feature-extraction)"]
    
    QueryReq["GET /api/v1/search?subject=...&query=..."] --> CheckModel["Ensure Transformer Pipeline is Loaded"]
    CheckModel --> FetchDocs["MongoDB: Query questions for subject_id\nwhere embedding exists"]
    FetchDocs --> EmbedQuery["Compute Query Embedding:\nmodel(query, { pooling: 'mean', normalize: true })\n-> Float32Array(384)"]
    
    EmbedQuery --> Cosine["Calculate Cosine Similarity:\ncos_sim(q_emb, doc_emb) for each document"]
    Cosine --> Sort["Sort Results by Score Descending"]
    Sort --> Bookmarks["Join User Bookmarks (isBookmarked)"]
    Bookmarks --> Paginate["Apply Pagination (page, limit)"]
    Paginate --> Return["JSON Response: Matching Questions & Similarity Scores"]
```

#### Cosine Similarity Formula:
$$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\|_2 \|\mathbf{B}\|_2 + 10^{-12}} = \frac{\sum_{i=1}^{384} A_i B_i}{\sqrt{\sum_{i=1}^{384} A_i^2} \sqrt{\sum_{i=1}^{384} B_i^2} + 10^{-12}}$$

---

### 6.4 Scheduled Maintenance & Data Reconciliation

The server initializes an automated cron suite (`maintenance/scheduler.js`) using `node-cron`, executing every Sunday during low-traffic hours:

| Schedule (Cron) | Trigger Time | Action / Target Function | Operational Impact |
|---|---|---|---|
| `0 3 * * 0` | Sun 03:00 AM | `syncCoursesWithQuestions()` | Tallies questions per subject and updates question type statistics (`total_mcq_questions`, `total_2m_questions`, etc.). |
| `10 3 * * 0` | Sun 03:10 AM | `clearUploadsDirectory()` | Purges temporary staging files from the disk storage. |
| `20 3 * * 0` | Sun 03:20 AM | `syncUserBookmarkedQuestions()` | Verifies bookmarked question IDs against existing questions in DB and prunes dangling references. |
| `30 3 * * 0` | Sun 03:30 AM | `clearNonExistingUserPreferences()` | Deletes preference documents whose associated `user` ObjectId no longer exists. |
| `40 3 * * 0` | Sun 03:40 AM | `syncPaidCoursesWithUsers()` | Audits paid course entitlements against active subscriptions. |

---

## 7. Database Resiliency & Optimization

Following earlier connection latency challenges, the repository incorporates specific MongoDB reliability configurations (`config/database.js`):

```javascript
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30s selection window
  socketTimeoutMS: 45000,          // 45s socket lifetime
  connectTimeoutMS: 30000,         // 30s connection timeout
  maxPoolSize: 10,                 // Pool bounded to 10 connections
  minPoolSize: 1,
  maxIdleTimeMS: 30000,            // Reclaim connections idle > 30s
  retryWrites: true,
  w: "majority",
};
```

### Strategic Indexes:
- **`User` Collection**:
  - `user_id`: 1
  - `mobile_number`: 1 (unique)
  - `email_id`: 1
  - `bookmarked_questions`: 1
  - `UserIP`: 1
- **`Question` Collection**:
  - `question_id`: 1 (unique)
  - `category_id`: 1
  - `subject`: 1
  - `chapter`: 1
- **Individual Operation Timeouts**:
  - Critical lookup operations incorporate `.maxTimeMS(5000)` (e.g. `isAuthenticated` token verification and bookmark modifications) to prevent request thread starvation during query stalls.

---

## 8. REST API Endpoint Catalog

All routes are mounted under the `/api/v1` namespace in `app.js`.

### 8.1 Authentication & User Routes (`routes/user.js`)
| Method | Route | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/check-auth` | `isLoggedIn` | Verifies JWT and returns current user session status |
| `POST` | `/api/v1/register` | Public | Standard email/password registration |
| `POST` | `/api/v1/register/phone` | Public | Generates and sends 6-digit phone OTP |
| `POST` | `/api/v1/register/user` | Public | Sets display name for newly created phone user |
| `POST` | `/api/v1/resend/otp` | Public | Re-triggers phone OTP |
| `POST` | `/api/v1/verify/otp` | Public | Verifies OTP, logs into new device, and issues JWT |
| `POST` | `/api/v1/login` | Public | Email and password login |
| `GET` | `/api/v1/logout` | `isAuthenticated` | Clears cookie and session |
| `POST` | `/api/v1/update/password` | `isAuthenticated` | Changes user password |
| `POST` | `/api/v1/update/profile` | `isAuthenticated` | Updates profile name, school, district |
| `DELETE` | `/api/v1/delete/me` | `isAuthenticated` | Purges account and logs trial in `DeletedUserTrial` |
| `GET` | `/api/v1/me` | `isAuthenticated` | Returns authenticated user profile |
| `GET` | `/api/v1/users` | `isAuthenticated` | Lists all users |
| `POST` | `/api/v1/password/forgot` | Public | Generates password reset token |
| `POST` | `/api/v1/password/reset/:token` | Public | Resets password using token |
| `POST` | `/api/v1/bookmark/:id` | `isAuthenticated` | Toggles bookmark for specified question ID |

### 8.2 Academic Content & Curriculum Routes
| Route File | Base Path / Endpoints | Auth Level | Purpose |
|---|---|---|---|
| `subject.js` | `GET /subjects`<br>`POST /subject/create`<br>`GET /subject/:id` | `isAuthenticated` + `isSameIP` | Subjects list, subject metadata, and owner links |
| `chapter.js` | `GET /chapters`<br>`POST /chapter/create`<br>`GET /chapter/:id` | `isAuthenticated` | Chapters within subjects |
| `question.js` | `GET /questions`<br>`POST /question` (Admin)<br>`POST /questions/upload`<br>`GET /question/paginated` | `isAuthenticated` | Question bank, pagination, bulk JSON import |
| `practiceSubject.js` | `GET /practice-subjects`<br>`POST /create/practice-subjects` | Public / Authed | Practice subjects groupings |
| `practicePaper.js` | `GET /practice-papers`<br>`POST /practice-paper`<br>`POST /practice-papers/bulk` | Public / Authed | Practice papers and PDFs |
| `video.js` | `GET /videos`<br>`GET /videos/by-chapter`<br>`POST /video/create` | `isAuthenticated` | Video lessons by chapter and topic |
| `note.js` | `GET /note`<br>`GET /note/by-chapter`<br>`POST /note` | Public / Authed | Study and revision notes |
| `mindMap.js` | `GET /mind-map`<br>`GET /mind-map/by-chapter`<br>`POST /mind-map` | Public / Authed | Visual mind maps |
| `hotLine.js` | `GET /hot-lines`<br>`GET /hot-line/by-chapter`<br>`POST /hot-line` | Public / Authed | Hotline educational content |

### 8.3 AI Search Routes (`routes/search.js`)
| Method | Route | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/search` | `isAuthenticated` | Semantic vector search across questions in a subject |
| `POST` | `/api/v1/generate-embeddings` | Public / Internal | Generates dense embeddings for subject questions |

### 8.4 Commercial & Purchases (`routes/purchase.js`, `routes/payment.js`, `routes/coupon.js`)
| Method | Route | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/createOrder` | `isAuthenticated` | Initializes Razorpay order and returns `order_id` |
| `POST` | `/api/v1/purchase/courses` | `isAuthenticated` | Verifies payment, applies coupon, activates 1-year subject access |
| `POST` | `/api/v1/createCoupon` | `isAuthenticated` | Creates promotional discount coupon |
| `GET` | `/api/v1/getAllCoupons` | `isAuthenticated` | Lists active coupons |

### 8.5 Operations, Sync & Communication (`routes/sync.js`, `routes/message.js`, `routes/connect.js`)
| Method | Route | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/sync/subjects` | `isAdmin` | Syncs question counters with subjects |
| `GET` | `/api/v1/sync/bookmarks` | `isAdmin` | Removes orphaned bookmark references |
| `GET` | `/api/v1/sync/preferences` | `isAdmin` | Cleans orphaned user preference documents |
| `POST` | `/api/v1/message` | Public | Posts system notice/bulletin |
| `GET` | `/api/v1/message/latest` | Public | Retrieves latest system broadcast message |
| `POST` | `/api/v1/connect` | Public (Multer) | Job applicant hiring form (emails resume via SMTP) |

---

## 9. Deployment & Operational Lifecycle

### Deployment Flow via `run.sh`:
The repository provides an automated server restart and maintenance script:
1. **Branch Checkout & Pull**: Fetches and pulls the specified Git branch (`main`).
2. **Dependency Refresh**: Purges `node_modules` and `package-lock.json` and runs clean `npm install`.
3. **Port Conflict Resolution**: Identifies active processes on `PORT` (e.g. 3000) using `lsof -ti:$PORT` and invokes `kill -9` to prevent `EADDRINUSE` errors.
4. **Execution**: Boots the application via `npm run dev` (`nodemon server.js`).

### Graceful Shutdown:
The application hooks into process termination events (`SIGINT` in `config/database.js`) to close active MongoDB connection pools gracefully before exiting.
