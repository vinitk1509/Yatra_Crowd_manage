# YatraFlow: Amarnath Yatra Crowd Management Platform

A high-performance, real-time crowd intelligence, QR movement tracking, and machine-learning-based crowd prediction platform for high-altitude pilgrimage management along the Amarnath Yatra corridors (Baltal & Pahalgam).

---

## 🚀 System Architecture & Tech Stack

```
yatra-flow-dashboard-development/
├── backend/                  # Spring Boot 3.3.4 (Java 22) REST & WebSocket Service
│   ├── src/main/java/        # Controllers, Services, Entities, Repositories, Security, ML Providers
│   ├── src/main/resources/   # application.yml, Embedded ML Model JSON weights
│   └── pom.xml               # Maven configuration (Spring Data JPA, JJWT, STOMP)
├── ml/                       # Python Physical Crowd Simulation & GBDT Training Pipeline
│   ├── synthetic_generator.py # Greenshields Speed-Density Physical Simulator (NO LLM / Generative AI)
│   ├── dataset_validator.py  # Physics, conservation, and boundary validator
│   ├── feature_engineering.py# Time-lagged feature matrices & multi-horizon targets
│   └── train_models.py       # Persistence vs Ridge vs Random Forest vs GBDT Regressors
├── app/                      # Next.js 16 (React 19 / Turbopack) App Router
├── components/               # Role-based dashboards, Scanner Station, Digital Pass, AuthModal
├── lib/                      # api-client.ts, auth-context.tsx, websocket-client.ts
└── SUPERVISOR_PRESENTATION_GUIDE.md # Official demonstration script & presentation notes
```

### Core Technologies:
* **Backend**: Spring Boot 3.3.4, Java 22, Spring Data JPA, Spring Security 6, JJWT (HMAC-SHA256), Spring STOMP WebSockets, In-Memory H2 Database.
* **Frontend**: Next.js 16 (App Router), TypeScript, TailwindCSS, Recharts, Framer Motion, Lucide Icons, STOMP.js client.
* **Machine Learning**: Scikit-Learn, NumPy, Pandas (Greenshields physics simulation, multi-horizon GBDT forecasting with 95% analytical uncertainty bounds).

---

## 🛠️ Step-by-Step Setup & Running Guide

### 1. Prerequisites
Ensure you have the following installed:
* **Java**: JDK 22 or JDK 21 (`java -version`)
* **Maven**: 3.9+ (`mvn -version`)
* **Node.js**: 18+ or 20+ (`node -v`) & `npm`
* **Python**: 3.10+ (*Optional: only needed if re-generating synthetic training data or retraining models*)

---

### 2. Backend Setup (Spring Boot)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Build and run the Spring Boot service:
   ```bash
   mvn clean spring-boot:run
   ```
3. The backend starts on port `8080`:
   * **API Base URL**: `http://localhost:8080/api`
   * **WebSocket STOMP Broker**: `http://localhost:8080/ws`
   * **H2 Database Console**: `http://localhost:8080/h2-console`
     * **JDBC URL**: `jdbc:h2:mem:yatraflowdb`
     * **Username**: `sa`
     * **Password**: *(leave empty)*

4. *(Optional)* Run backend integration and unit tests:
   ```bash
   mvn test
   ```
   *(All 36 tests across Auth, QR, Scans, Crowd Engine, WebSockets, Analytics, and ML will pass).*

---

### 3. Frontend Setup (Next.js)

1. Open a second terminal in the project root directory:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to:
   * **Public Landing Page**: `http://localhost:3000`

---

### 4. Machine Learning Pipeline (Python Simulation & Training)

*The trained GBDT model weights are already packaged into the backend resources at `backend/src/main/resources/models/crowd_forecast_model.json`.*

If you want to re-run the physical simulation and model training:
```bash
cd ml
pip install -r requirements.txt
python run_pipeline.py
```
This generates `synthetic_crowd_data.csv` (14,400 physical rows across 10 operational scenarios using Greenshields physics) and exports updated weights to the backend.

---

## 🔐 Pre-Seeded Operational Accounts (Role-Based Access Control)

You can click **"Sign In / Roles"** on the UI to quickly switch between any of the 6 roles:

| Persona | Role | Email | Password | Primary Workspace |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `ADMIN` | `admin@yatraflow.gov.in` | `Admin@12345` | `/dashboard` (Master Admin Console) |
| **Control Room Lead** | `CONTROL_ROOM_OPERATOR` | `control@yatraflow.gov.in` | `Control@12345` | `/dashboard` (Real-Time Control Room) |
| **Gate Officer** | `CHECKPOINT_OPERATOR` | `checkpoint@yatraflow.gov.in` | `Checkpoint@12345` | `/pilgrims` (Camera Scanner Station) |
| **Emergency Dispatcher** | `EMERGENCY_OFFICER` | `emergency@yatraflow.gov.in` | `Emergency@12345` | `/emergency` (Coming Soon) |
| **Field Supervisor** | `SUPERVISOR` | `supervisor@yatraflow.gov.in` | `Supervisor@12345` | `/dashboard` (Supervision Hub) |
| **Pilgrim Yatri** | `PILGRIM` | `pilgrim@yatraflow.gov.in` | `Pilgrim@12345` | `/pilgrims` (Digital QR Pass) |

---

## 📡 Key REST & WebSocket API Endpoints

### Authentication & RBAC
* `POST /api/auth/login` — Authenticate and obtain JWT token
* `POST /api/auth/register` — Register a new account
* `GET /api/auth/me` — Get profile of authenticated user

### Pilgrims & QR Codes
* `POST /api/pilgrims` — Register pilgrim & auto-issue cryptographic QR pass
* `GET /api/pilgrims` — List all registered pilgrims
* `POST /api/qr/validate` — Verify QR code integrity and route eligibility

### Scans & Checkpoints
* `POST /api/scans` — Record physical gate scan event (triggers STOMP live broadcast)
* `GET /api/checkpoints` — List all 5 mountain checkpoints (CP-01 to CP-05)

### Crowd Intelligence & Real-Time Engine
* `GET /api/crowd/live` — Live network metrics (crowd, capacity, net flow, speed, bottleneck alerts)
* `GET /api/crowd/checkpoints/{id}` — Metrics for a specific gate
* `WebSocket STOMP Topics`: `/topic/global`, `/topic/checkpoints`, `/topic/scans`, `/topic/alerts`

### Historical Analytics
* `GET /api/analytics/crowd?interval=15m` — Time-bucket aggregated historical profiles
* `GET /api/analytics/ml-dataset` — $t-4$ to $t$ time-lagged feature matrices

### Machine Learning Predictions (Phase 6)
* `GET /api/predictions/live` — Network-wide multi-horizon forecast (+15m, +30m, +60m)
* `GET /api/predictions/checkpoints/{id}` — Gate-specific predictions with 95% confidence intervals and explainable signals

---

## 🎤 Presentation Guide for Supervisors

For a full script, click-by-click instructions, and answers to supervisor questions, refer to:
📄 **[SUPERVISOR_PRESENTATION_GUIDE.md](./SUPERVISOR_PRESENTATION_GUIDE.md)**

