import './App.css'
import {AuthProvider} from "./context/AuthContext.jsx";
import {Navigate, Route, Routes} from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import ProtectedRoute from "./protectedroute/ProtectedRoute.jsx";
import DailyDiary from "./pages/DailyDiary.jsx";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import Resolution from "./pages/Resolution.jsx";
import Calendar from "./pages/Calendar.jsx";
import HabitTracker from "./pages/HabitTracker.jsx";

function App() {

  return (
      <div className="App">
        <AuthProvider>
          <Routes>
            <Route 
                path="/" 
                element={<Navigate to="/login"/>}
            />
            <Route 
                path="/login"
                element={<AuthPage/>}
            />
            <Route 
                path="/daily-diary"
                element={
                    <ProtectedRoute>
                      <Sidebar/>
                      <DailyDiary/>
                    </ProtectedRoute>
                }
            />
            <Route 
                path="/habit-tracker" 
                element={
                    <ProtectedRoute>
                      <Sidebar/>
                      <HabitTracker/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/resolutions"
                element={
                    <ProtectedRoute>
                      <Sidebar/>
                      <Resolution/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/calendar" 
                element={
                    <ProtectedRoute>
                      <Sidebar/>
                      <Calendar/>
                    </ProtectedRoute>
                }
            />
          </Routes>
        </AuthProvider>
      </div>
  )
}

export default App
