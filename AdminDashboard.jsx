import React, { useState } from "react";
import { Users, Briefcase, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [adminName] = useState("Alex Johnson (Admin)");
  const [lastAction, setLastAction] = useState("");
  const navigate = useNavigate();

  const handleNavigation = (destination) => {
    if (destination === "Student") {
      navigate("/admin/student-management");
      setLastAction(`Navigated to Student Management`);
    } else if (destination === "Teacher") {
      // Navigate to Teacher Management when clicked
      navigate("/admin/teacher-management");
      setLastAction(`Navigated to Teacher Management`);
    } else {
      const message = `Navigating to ${destination} Management...`;
      console.log(message);
      setLastAction(message);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="header">
          <h1>Welcome to the Management Portal</h1>
          <p>Hello, {adminName}!</p>
        </div>

        {/* Buttons */}
        <div className="button-grid">
          <button
            onClick={() => handleNavigation("Student")}
            className="nav-button student"
          >
            <div className="btn-content">
              <Users size={36} color="#4f46e5" />
              <span>Student Management</span>
            </div>
            <ChevronRight size={24} color="#4f46e5" />
          </button>

          <button
            onClick={() => handleNavigation("Teacher")}
            className="nav-button teacher"
          >
            <div className="btn-content">
              <Briefcase size={36} color="#16a34a" />
              <span>Teacher Management</span>
            </div>
            <ChevronRight size={24} color="#16a34a" />
          </button>
        </div>
      </div>

      {/* Status Area */}
      {lastAction && (
        <div className="status-box">
          <strong>Last Action:</strong> {lastAction} (Check console for full log)
        </div>
      )}

      {/* Inline CSS */}
      <style>{`
        .dashboard {
          min-height: 100vh;
          background-color: #f3f4f6;
          padding: 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dashboard-container {
          background: #fff;
          border-top: 8px solid #4f46e5;
          border-radius: 1rem;
          padding: 2.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 900px;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header h1 {
          font-size: 2rem;
          color: #1f2937;
          font-weight: 800;
        }

        .header p {
          margin-top: 0.5rem;
          color: #4f46e5;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .button-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .button-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .nav-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-radius: 1rem;
          border: 2px solid transparent;
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.05);
          font-size: 1.2rem;
          font-weight: 700;
          transition: all 0.3s ease;
          cursor: pointer;
          background: #f9fafb;
        }

        .nav-button .btn-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-button.student {
          border-color: #c7d2fe;
          background-color: #eef2ff;
        }

        .nav-button.student:hover {
          background-color: #e0e7ff;
          box-shadow: 0 5px 15px rgba(79, 70, 229, 0.3);
        }

        .nav-button.teacher {
          border-color: #bbf7d0;
          background-color: #dcfce7;
        }

        .nav-button.teacher:hover {
          background-color: #bbf7d0;
          box-shadow: 0 5px 15px rgba(22, 163, 74, 0.3);
        }

        .status-box {
          margin-top: 2rem;
          padding: 1rem;
          background-color: #fef9c3;
          border: 1px solid #facc15;
          color: #854d0e;
          border-radius: 0.5rem;
          text-align: center;
          width: 100%;
          max-width: 900px;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
