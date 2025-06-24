# Hanna's Habits – Frontend 💻

This is the **frontend** of the fullstack project *Hanna’s Habits* – a habit-tracking and journaling web app built with React and .NET backend.

🔗 **Backend repository**: [hannas-habits-backend](https://github.com/YOUR_USERNAME/hannas-habits-backend)  
🔗 **Main project overview**: [hannas-habits](https://github.com/YOUR_USERNAME/hannas-habits)

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
- Backend API running (see [backend setup](https://github.com/YOUR_USERNAME/hannas-habits-backend))

#### Steps

```bash
git clone https://github.com/YOUR_USERNAME/hannas-habits-frontend.git
cd hannas-habits-frontend

npm install
npm run dev```

App will be running at:
👉 http://localhost:5173

⸻

## ⚙️ API Configuration

Set your backend base URL in .env file:
VITE_API_URL=http://localhost:5000/api
(Adjust the port depending on your backend configuration.)

## ✨ Features
	•	📅 Custom habit creation and tracking
	•	🧘 Journal entry interface
	•	🔒 Login and registration with JWT tokens
	•	📱 Mobile-first responsive design
	•	🔄 Axios interceptors for token refresh (optional)

## 📁 Project Structure
/src
  /components        → Reusable UI components
  /containers        → State-aware components (connected to API)
  /pages             → Page views (daily tracker, habits, etc.)
  /services          → API interaction layer
  /hooks             → Custom React hooks

## 🧑‍💻 Author

Yevgen Panych – Umschüler zum Fachinformatiker AE

📫 [LinkedIn](https://www.linkedin.com/in/yevgen-panych)  
🌐 [Portfolio](https://panych.site)  
