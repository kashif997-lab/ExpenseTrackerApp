import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DailyExpenseTracker from "./components/DailyExpenseTracker";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
     <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DailyExpenseTracker />
      </ProtectedRoute>
    }
  />
</Routes>

    </Router>
  );
}

export default App;
