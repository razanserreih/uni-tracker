// src/pages/AdminDashboard.js
import React from 'react';
import './AdminDashboard.css';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const navigate = useNavigate(); // ✅ Fix: add navigate

  return (
    <div className="admin-dashboard">
      <header>
        <h1>Welcome, Admin</h1>
        <p>This is your dashboard. Choose a section to manage:</p>
      </header>

      <div className="dashboard-grid">
        <div className="card" onClick={() => navigate('/manage-courses')}>
          📚 Manage Courses
        </div>
        <div className="card" onClick={() => navigate('/manage-students')}>
          🎓 Manage Students
        </div>

      <div className="card" onClick={() => navigate('/manage-offerings')}>
        📖 Manage Offerings
      </div>

      <div className="card" onClick={() => navigate('/manage-lectures')}>
        🏫 Manage Lectures
      </div>
      
      <div className="card" onClick={() => navigate("/attendance")}>
        📅 Attendance
      </div>
      
      <div className="card" onClick={() => navigate('/grades')}>
        📝 Grades
      </div>



      </div>
    </div>
  );
}

export default AdminDashboard;
