
import React, { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const Profile = ({ setSelectedSection, targetUserId = null }) => {
  const currentUserUid = auth.currentUser?.uid;
  const isOwnProfile = !targetUserId || targetUserId === currentUserUid;
  const profileUserId = targetUserId || currentUserUid;
  
  const [userReports, setUserReports] = useState([]);
  const [collaboratedReports, setCollaboratedReports] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('created');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    fetchUserData();
  }, [profileUserId]);

  const fetchUserData = async () => {
    try {
      // Fetch user info
      const userQuery = query(collection(db, "users"), where("uid", "==", profileUserId));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        setUserInfo(userSnapshot.docs[0].data());
      }

      // Fetch user's created reports
      const createdQuery = query(
        collection(db, "reports"), 
        where("sender", "==", profileUserId),
        orderBy("timestamp", "desc")
      );
      const createdSnapshot = await getDocs(createdQuery);
      const createdReports = createdSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserReports(createdReports);

      // Fetch collaborated reports
      const collaboratedQuery = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const collaboratedSnapshot = await getDocs(collaboratedQuery);
      const collaborated = collaboratedSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(report => 
          report.collaborators && 
          report.collaborators.includes(userInfo?.email || '')
        );
      setCollaboratedReports(collaborated);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleSendMessage = () => {
    // Implement direct messaging functionality
    console.log('Send message:', messageText);
    setShowMessageModal(false);
    setMessageText('');
  };

  const copyProfileLink = () => {
    const link = `${window.location.origin}/profile/${profileUserId}`;
    navigator.clipboard.writeText(link);
    alert('Profile link copied to clipboard!');
  };

  if (!userInfo && !isOwnProfile) {
    return (
      <div className="profile-section">
        <div className="profile-not-found">
          <h3>User not found</h3>
          <button onClick={() => setSelectedSection('main')} className="back-btn">
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-section">
      {/* Profile Header */}
      <div className="profile-header">
        <button onClick={() => setSelectedSection('main')} className="back-btn">
          ← Back
        </button>
        
        <div className="profile-info">
          <div className="profile-avatar">
            {userInfo?.photoURL ? (
              <img src={userInfo.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {userInfo?.displayName?.[0] || userInfo?.email?.[0] || '?'}
              </div>
            )}
          </div>
          
          <div className="profile-details">
            <h2>{userInfo?.displayName || 'Anonymous User'}</h2>
            <p className="profile-email">{userInfo?.email}</p>
            
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-number">{userReports.length}</span>
                <span className="stat-label">Reports Created</span>
              </div>
              <div className="stat">
                <span className="stat-number">{collaboratedReports.length}</span>
                <span className="stat-label">Collaborations</span>
              </div>
              <div className="stat">
                <span className="stat-number">
                  {userReports.filter(r => r.reportType === 'solution').length}
                </span>
                <span className="stat-label">Solutions</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {!isOwnProfile && (
            <button 
              onClick={() => setShowMessageModal(true)}
              className="message-btn"
            >
              💬 Message
            </button>
          )}
          <button onClick={copyProfileLink} className="share-profile-btn">
            🔗 Share Profile
          </button>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`}
          onClick={() => setActiveTab('created')}
        >
          Created Reports ({userReports.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'collaborated' ? 'active' : ''}`}
          onClick={() => setActiveTab('collaborated')}
        >
          Collaborations ({collaboratedReports.length})
        </button>
      </div>

      {/* Reports List */}
      <div className="profile-reports">
        {activeTab === 'created' && (
          <div className="reports-grid">
            {userReports.length > 0 ? (
              userReports.map(report => (
                <div key={report.id} className="profile-report-card">
                  <div className="report-image-container">
                    {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={report.fileUrl} className="report-thumbnail" />
                    ) : (
                      <img src={report.fileUrl} alt="Report" className="report-thumbnail" />
                    )}
                    <div className={`report-type-overlay ${report.reportType || 'problem'}`}>
                      {report.reportType === 'solution' ? '💡' : '🚨'}
                    </div>
                  </div>
                  <div className="report-card-content">
                    <h4>{report.message.substring(0, 60)}...</h4>
                    <div className="report-card-meta">
                      <span>{report.comments?.length || 0} comments</span>
                      <span>{report.timestamp?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-reports">
                <p>No reports created yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaborated' && (
          <div className="reports-grid">
            {collaboratedReports.length > 0 ? (
              collaboratedReports.map(report => (
                <div key={report.id} className="profile-report-card">
                  <div className="report-image-container">
                    {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={report.fileUrl} className="report-thumbnail" />
                    ) : (
                      <img src={report.fileUrl} alt="Report" className="report-thumbnail" />
                    )}
                    <div className="collaboration-badge">👥</div>
                  </div>
                  <div className="report-card-content">
                    <h4>{report.message.substring(0, 60)}...</h4>
                    <div className="report-card-meta">
                      <span>Collaborated</span>
                      <span>{report.timestamp?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-reports">
                <p>No collaborations yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowMessageModal(false)}>×</button>
            <h3 className="modal-title">Send Message to {userInfo?.displayName}</h3>
            
            <div className="form-group">
              <textarea
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="form-textarea"
                rows={4}
              />
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowMessageModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendMessage}
                className="send-btn"
                disabled={!messageText.trim()}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
