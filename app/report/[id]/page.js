
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [params.id]);

  const fetchReport = async () => {
    try {
      const q = query(collection(db, "reports"), where("reportId", "==", params.id));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const reportData = snapshot.docs[0].data();
        setReport({ id: snapshot.docs[0].id, ...reportData });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching report:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="loading">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-page">
        <div className="not-found">
          <h2>Report not found</h2>
          <p>This report may have been removed or the link is invalid.</p>
          <button onClick={() => router.push('/')} className="back-home-btn">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-container">
        <button onClick={() => router.push('/')} className="back-btn">
          ← Back to Reports
        </button>
        
        <div className="shared-report">
          <div className="report-header">
            <div className={`report-type-badge ${report.reportType || 'problem'}`}>
              {report.reportType === 'solution' ? '💡 Solution' : '🚨 Problem'}
            </div>
            <div className="report-date">
              {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : 'Recently'}
            </div>
          </div>

          <div className="report-media">
            {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={report.fileUrl}
                controls
                className="report-video"
              />
            ) : (
              <img
                src={report.fileUrl}
                alt="Report"
                className="report-image"
              />
            )}
          </div>

          <div className="report-content">
            <h1 className="report-title">{report.message}</h1>
            
            {report.collaborators && report.collaborators.length > 0 && (
              <div className="collaborators-section">
                <h3>Collaborators</h3>
                <div className="collaborators-list">
                  {report.collaborators.map(email => (
                    <span key={email} className="collaborator-tag">{email}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="report-stats">
              <span>💬 {report.comments?.length || 0} comments</span>
              <span>📅 {report.timestamp?.toDate().toLocaleDateString()}</span>
            </div>

            <div className="report-actions">
              <button 
                onClick={() => router.push('/')}
                className="view-all-btn"
              >
                View All Reports
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                }}
                className="copy-link-btn"
              >
                🔗 Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
