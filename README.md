
# Hanna's Habits – Frontend 💻

This is the **frontend** of the fullstack project *Hanna’s Habits* – a habit-tracking and journaling web app built with React and .NET backend.

🔗 **Backend repository**: [hannas-habits-backend](https://github.com/iseaman89/hannas-habits-server)  
🔗 **Main project overview**: [hannas-habits](https://github.com/iseaman89/hannas-habits)

---

## ⚙️ Stack

- React (with Vite)
- Tailwind CSS
- Axios for API requests
- Zustand or Redux Toolkit (state management)
- React Router

---

## 🚀 Running the App

### 🧪 Local development

#### Prerequisites
- Node.js (v18+ recommended)
- Backend API running (see [backend setup](https://github.com/iseaman89/hannas-habits-server))

#### Steps

```bash
git clone https://github.com/iseaman89/hannas-habits-ui.git
cd hannas-habits-ui

npm install
npm run dev
```

App will be running at:  
👉 `http://localhost:5173`

---

## ⚙️ API Configuration

Copy `.env.example` to `.env` and fill it in:

```
VITE_API_URL=https://localhost:7054/api
VITE_GOOGLE_CLIENT_ID=<your OAuth client id>
```

*(Adjust the URL to your backend. Both values are public: Vite inlines them into the bundle at build time, so never put secrets there.)*

---

## ✨ Features

- 📅 Custom habit creation and tracking  
- 🧘 Journal entry interface  
- 🔒 Login and registration with JWT tokens  
- 📱 Mobile-first responsive design  
- 🔄 Axios interceptors for token refresh (optional)

---

## 📁 Project Structure

```
/src
  /components        → Reusable UI components
  /containers        → State-aware components (connected to API)
  /pages             → Page views (daily tracker, habits, etc.)
  /services          → API interaction layer
  /hooks             → Custom React hooks
  /store             → Zustand / Redux store
```

---

## 🧑‍💻 Author

**Yevgen Panych** – Umschüler zum Fachinformatiker AE  

📫 [LinkedIn](https://www.linkedin.com/in/yevgen-panych)  
🌐 [Portfolio](https://panych.site)
