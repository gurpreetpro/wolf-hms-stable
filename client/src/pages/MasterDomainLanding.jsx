/**
 * MasterDomainLanding.jsx
 * Landing page for master domain (developers.wolfhms.com or similar)
 * Access point for multi-tenant administration
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/axiosInstance";

const MasterDomainLanding = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setIsAuthenticated(!!token && user?.role === "admin");
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/api/hospitals/stats");
      setStats(response.data);
    } catch {
      // Stats fetch failed silently - not critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      {/* Header */}
      <nav className="navbar navbar-dark py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-3">
            <i className="bi bi-grid-1x2-fill text-primary me-2"></i>
            Wolf HMS Developer Portal
          </span>
          <div>
            {isAuthenticated ? (
              <Link to="/admin/superadmin" className="btn btn-primary">
                <i className="bi bi-speedometer2 me-2"></i>Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn btn-outline-light">
                <i className="bi bi-box-arrow-in-right me-2"></i>Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container py-5">
        <div className="row align-items-center min-vh-50">
          <div className="col-lg-6 text-white">
            <h1 className="display-4 fw-bold mb-4">
              Multi-Tenant Hospital
              <span className="text-primary d-block">Management System</span>
            </h1>
            <p className="lead text-secondary mb-4">
              Onboard hospitals, manage tenants, configure domains, and monitor
              your healthcare SaaS platform from a single developer dashboard.
            </p>
            <div className="d-flex gap-3">
              {isAuthenticated ? (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate("/admin/superadmin")}
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  Open Dashboard
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate("/login")}
                >
                  <i className="bi bi-shield-lock me-2"></i>
                  Developer Login
                </button>
              )}
              <a
                href="https://docs.wolfhms.com"
                className="btn btn-outline-light btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-book me-2"></i>
                Documentation
              </a>
            </div>
          </div>
          <div className="col-lg-6 mt-5 mt-lg-0">
            {/* Stats Cards */}
            {!loading && stats && (
              <div className="row g-3">
                <div className="col-6">
                  <div className="card bg-dark border-0 h-100">
                    <div className="card-body text-center py-4">
                      <h2 className="display-4 fw-bold text-primary mb-0">
                        {stats.total_hospitals || 0}
                      </h2>
                      <small className="text-secondary">Total Hospitals</small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card bg-dark border-0 h-100">
                    <div className="card-body text-center py-4">
                      <h2 className="display-4 fw-bold text-success mb-0">
                        {stats.active_hospitals || 0}
                      </h2>
                      <small className="text-secondary">Active Tenants</small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card bg-dark border-0 h-100">
                    <div className="card-body text-center py-4">
                      <h2 className="display-4 fw-bold text-info mb-0">
                        {stats.essential || 0}
                      </h2>
                      <small className="text-secondary">Small Clinics</small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card bg-dark border-0 h-100">
                    <div className="card-body text-center py-4">
                      <h2 className="display-4 fw-bold text-warning mb-0">
                        {(stats.professional || 0) + (stats.enterprise || 0)}
                      </h2>
                      <small className="text-secondary">Large Hospitals</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card bg-dark border-0 h-100">
              <div className="card-body text-center p-4">
                <div className="display-4 text-primary mb-3">
                  <i className="bi bi-building-add"></i>
                </div>
                <h5 className="text-white">Hospital Onboarding</h5>
                <p className="text-secondary mb-0">
                  5-step wizard to provision new hospitals with custom branding,
                  domains, and admin accounts.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-dark border-0 h-100">
              <div className="card-body text-center p-4">
                <div className="display-4 text-success mb-3">
                  <i className="bi bi-globe"></i>
                </div>
                <h5 className="text-white">Custom Domains</h5>
                <p className="text-secondary mb-0">
                  Wildcard subdomains with optional custom domain support via
                  CNAME verification.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-dark border-0 h-100">
              <div className="card-body text-center p-4">
                <div className="display-4 text-info mb-3">
                  <i className="bi bi-shield-lock"></i>
                </div>
                <h5 className="text-white">2FA Security</h5>
                <p className="text-secondary mb-0">
                  TOTP authenticator app support with backup codes for developer
                  accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 mt-5 border-top border-secondary">
        <div className="container text-center text-secondary">
          <small>
            &copy; 2024 Wolf HMS. Multi-Tenant Healthcare Management System.
          </small>
        </div>
      </footer>
    </div>
  );
};

export default MasterDomainLanding;
