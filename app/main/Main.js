
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const Main = ({ setSelectedSection, user }) => {
  const currentUserUid = auth.currentUser?.uid;
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [location, setLocation] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [reportType, setReportType] = useState('problem');
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [problemReports, setProblemReports] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const fileInputRef = useRef(null);
  const fullscreenRef = useRef(null);
  const touchStartY = useRef(null);
  const isScrolling = useRef(false);

  // Fetch reports and users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch reports
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const j_reports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(j_reports);
        setFilteredReports(j_reports);
        setProblemReports(j_reports.filter(report => report.reportType === 'problem'));

        // Fetch users for collaborator selection
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllUsers(users);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Filter reports based on type
  useEffect(() => {
    let filtered = reports;
    if (filterType === 'problem') {
      filtered = reports.filter(report => report.reportType === 'problem');
    } else if (filterType === 'solution') {
      filtered = reports.filter(report => report.reportType === 'solution');
    }
    setFilteredReports(filtered);
  }, [reports, filterType]);

  // Handle file input change - store in memory, preview locally
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const MAX_SIZE = 1073741824; // 1GB in bytes

    if (selectedFile.size > MAX_SIZE) {
      alert("File size exceeds 1GB. Please upload a smaller file.");
      e.target.value = ""; // Reset file input
      return;
    }

    setFile(selectedFile);
    setFilePreviewUrl(URL.createObjectURL(selectedFile));
  };


  // Upload file to Firebase on submission
  const uploadToStorage = useCallback(async (file, pathPrefix) => {
    const filename = `${pathPrefix}/${currentUserUid}/${uuidv4()}`;
    const fileRef = ref(storage, filename);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }, [currentUserUid]);

  // Submit new report
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!file || !message.trim()) {
      alert("Please provide a file and summary.");
      return;
    }

    try {
      const uploadedUrl = await uploadToStorage(file, 'files');
      const reportId = uuidv4();

      const newReportData = {
        sender: currentUserUid,
        senderEmail: user?.email,
        type: 'file',
        reportType,
        message,
        fileUrl: uploadedUrl,
        filename: file.name,
        category: 'undefined',
        timestamp: serverTimestamp(),
        location,
        comments: [],
        collaborators: collaborators,
        linkedProblems: reportType === 'solution' ? selectedProblems : [],
        reportId: reportId,
        shareableLink: `${window.location.origin}/report/${reportId}`
      };

      const newReport = await addDoc(collection(db, "reports"), newReportData);

      // Add to local state immediately for better UX
      const localReport = {
        id: newReport.id,
        ...newReportData,
        timestamp: { toDate: () => new Date() }
      };

      setReports(prev => [localReport, ...prev]);

      // Reset form
      setMessage('');
      setFile(null);
      setFilePreviewUrl('');
      setLocation(null);
      setReportType('problem');
      setSelectedProblems([]);
      setCollaborators([]);
      setCollaboratorEmail('');
      setShowNewReportModal(false);
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  };

  // Add comment to report
  const handleAddComment = async (reportId) => {
    const commentText = commentInputs[reportId];
    if (!commentText?.trim() || !user?.emailVerified) return;

    try {
      const reportRef = doc(db, "reports", reportId);
      const newComment = {
        id: uuidv4(),
        text: commentText.trim(),
        author: user.email,
        timestamp: new Date().toISOString(),
        userId: currentUserUid
      };

      await updateDoc(reportRef, {
        comments: arrayUnion(newComment)
      });

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, comments: [...(report.comments || []), newComment] }
          : report
      ));

      // Clear input
      setCommentInputs(prev => ({ ...prev, [reportId]: '' }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Delete comment
  const handleDeleteComment = async (reportId, commentId) => {
    try {
      const report = reports.find(r => r.id === reportId);
      const updatedComments = report.comments.filter(comment => comment.id !== commentId);
      
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, {
        comments: updatedComments
      });

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, comments: updatedComments }
          : r
      ));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // Toggle comments visibility
  const toggleComments = (reportId) => {
    setExpandedComments(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  // Handle comment input change
  const handleCommentInputChange = (reportId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [reportId]: value
    }));
  };

  // Add collaborator
  const addCollaborator = () => {
    if (collaboratorEmail.trim() && !collaborators.includes(collaboratorEmail.trim())) {
      setCollaborators(prev => [...prev, collaboratorEmail.trim()]);
      setCollaboratorEmail('');
    }
  };

  // Remove collaborator
  const removeCollaborator = (email) => {
    setCollaborators(prev => prev.filter(collab => collab !== email));
  };

  // Toggle problem selection for solution reports
  const toggleProblemSelection = (problemId) => {
    setSelectedProblems(prev => 
      prev.includes(problemId) 
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  // Copy share link
  const copyShareLink = (report) => {
    const link = report.shareableLink || `${window.location.origin}/report/${report.reportId || report.id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  // Open image in full screen modal
  const openFullScreenImage = (report) => {
    const reportIndex = reports.findIndex(r => r.id === report.id);
    setCurrentReportIndex(reportIndex);
    setSelectedReport(report);
    setShowImageModal(true);
    setShowReportDetails(false);
  };

  // Close full screen modal
  const closeFullScreenModal = () => {
    setShowImageModal(false);
    setSelectedReport(null);
    setShowReportDetails(false);
  };

  // Navigate to next report in full screen
  const navigateToNextReport = () => {
    if (currentReportIndex < reports.length - 1) {
      const nextIndex = currentReportIndex + 1;
      setCurrentReportIndex(nextIndex);
      setSelectedReport(reports[nextIndex]);
      setShowReportDetails(false);
    }
  };

  // Navigate to previous report in full screen
  const navigateToPreviousReport = () => {
    if (currentReportIndex > 0) {
      const prevIndex = currentReportIndex - 1;
      setCurrentReportIndex(prevIndex);
      setSelectedReport(reports[prevIndex]);
      setShowReportDetails(false);
    }
  };

  // Handle touch events for scroll navigation
  const handleTouchStart = (e) => {
    if (showReportDetails) return;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  };

  const handleTouchMove = (e) => {
    if (showReportDetails || !touchStartY.current || isScrolling.current) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY.current - touchY;
    
    // Threshold for scroll detection (50px)
    if (Math.abs(deltaY) > 50) {
      isScrolling.current = true;
      
      if (deltaY > 0) {
        // Scrolling up - next report
        navigateToNextReport();
      } else {
        // Scrolling down - previous report
        navigateToPreviousReport();
      }
      
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    setTimeout(() => {
      isScrolling.current = false;
    }, 100);
  };

  // Handle wheel events for desktop scroll navigation
  const handleWheel = (e) => {
    if (showReportDetails || isScrolling.current) return;
    
    e.preventDefault();
    isScrolling.current = true;
    
    if (e.deltaY > 0) {
      // Scrolling down - next report
      navigateToNextReport();
    } else {
      // Scrolling up - previous report
      navigateToPreviousReport();
    }
    
    setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  };

  const handleOpenModal = () => {
    setShowNewReportModal(true);
  };

  return (
    <div className="main-section">
      {/* Filter Buttons */}
      <div className="filter-section">
        <button 
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Reports
        </button>
        <button 
          className={`filter-btn ${filterType === 'problem' ? 'active' : ''}`}
          onClick={() => setFilterType('problem')}
        >
          Problems
        </button>
        <button 
          className={`filter-btn ${filterType === 'solution' ? 'active' : ''}`}
          onClick={() => setFilterType('solution')}
        >
          Solutions
        </button>
      </div>

      <div className='report-feed'>
        {filteredReports.length < 1 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📱</div>
            <h3>No Reports Yet</h3>
            <p>Be the first to report something in your area</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="feed-item">
              <div className="feed-image-container" onClick={() => openFullScreenImage(report)}>
                {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
                  <>
                  <video
                    src={report.fileUrl}
                    className="feed-image"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  </>
                ) : (
                  <img
                    src={report.fileUrl}
                    alt={report.filename || 'Report image'}
                    className="feed-image"
                  />
                )}
                <div className="feed-overlay">
                  <div className={`feed-type ${report.reportType || 'problem'}`}>
                    {report.reportType === 'solution' ? '💡 SOLUTION' : '🚨 PROBLEM'}
                  </div>
                  <div className="feed-time">
                    {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>
              <div className="feed-content">
                <div className="feed-author">
                  <button 
                    className="author-name-btn"
                    onClick={() => setSelectedSection(`profile-${report.sender}`)}
                  >
                    👤 {report.senderEmail || 'Anonymous'}
                  </button>
                </div>
                <h3 className="feed-message">{report.message}</h3>
                <div className="feed-actions">
                  <button 
                    className="feed-action-btn"
                    onClick={() => toggleComments(report.id)}
                  >
                    💬 {report.comments?.length || 0}
                  </button>
                  <button 
                    className="feed-action-btn"
                    onClick={() => copyShareLink(report)}
                  >
                    🔗 Share
                  </button>
                  <button className="feed-action-btn">
                    📍 Location
                  </button>
                </div>
                
                {/* Compact Comments */}
                {expandedComments[report.id] && (
                  <div className="feed-comments">
                    {report.comments?.slice(0, 2).map((comment) => (
                      <div key={comment.id} className="feed-comment">
                        <span className="feed-comment-author">{comment.author}</span>
                        <span className="feed-comment-text">{comment.text}</span>
                        {currentUserUid === comment.userId && (
                          <button
                            className="feed-comment-delete"
                            onClick={() => handleDeleteComment(report.id, comment.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {report.comments?.length > 2 && (
                      <button 
                        className="feed-view-more"
                        onClick={() => openFullScreenImage(report)}
                      >
                        View all {report.comments.length} comments
                      </button>
                    )}

                    {user?.emailVerified ? (
                      <div className="feed-comment-form">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentInputs[report.id] || ''}
                          onChange={(e) => handleCommentInputChange(report.id, e.target.value)}
                          className="feed-comment-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(report.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(report.id)}
                          className="feed-comment-submit"
                          disabled={!commentInputs[report.id]?.trim()}
                        >
                          Post
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="feed-login-btn"
                        onClick={() => setSelectedSection('login')}
                      >
                        Login to comment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full Screen Image Modal */}
      {showImageModal && selectedReport && (
        <div 
          className="fullscreen-modal"
          ref={fullscreenRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <button className="fullscreen-close" onClick={closeFullScreenModal}>×</button>
          
          {/* Navigation indicators */}
          <div className="fullscreen-nav-indicators">
            <div className="nav-indicator">
              {currentReportIndex + 1} / {reports.length}
            </div>
            {currentReportIndex > 0 && (
              <div className="nav-hint nav-hint-up">↑ Swipe up for previous</div>
            )}
            {currentReportIndex < reports.length - 1 && (
              <div className="nav-hint nav-hint-down">↓ Swipe down for next</div>
            )}
          </div>

          <div className="fullscreen-image-container">
            {selectedReport.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                key={selectedReport.id} // Force re-render only when report changes
                src={selectedReport.fileUrl}
                className="fullscreen-image"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                key={selectedReport.id} // Force re-render only when report changes
                src={selectedReport.fileUrl}
                alt="Full size"
                className="fullscreen-image"
              />
            )}
          </div>
          
          {/* Report Details Tab */}
          <div className={`report-details-tab ${showReportDetails ? 'expanded' : ''}`}>
            <div className="tab-handle" onClick={() => setShowReportDetails(!showReportDetails)}>
              <div className="tab-indicator"></div>
              <div className="tab-preview">
                <h4>{selectedReport.message}</h4>
                <span>{selectedReport.comments?.length || 0} comments</span>
              </div>
              <div className="tab-arrow">{showReportDetails ? '▼' : '▲'}</div>
            </div>
            
            {showReportDetails && (
              <div className="tab-content">
                <div className="report-full-details">
                  <div className="report-meta">
                    <div className="report-author-full">
                      <button 
                        className="author-name-btn-full"
                        onClick={() => {
                          setSelectedSection(`profile-${selectedReport.sender}`);
                          closeFullScreenModal();
                        }}
                      >
                        👤 {selectedReport.senderEmail || 'Anonymous'}
                      </button>
                    </div>
                    <div className="report-timestamp">
                      {selectedReport.timestamp?.toDate ? selectedReport.timestamp.toDate().toLocaleString() : 'Just now'}
                    </div>
                    <span className="report-status-full">🔴 ACTIVE INCIDENT</span>
                  </div>
                  <h3 className="report-message-full">{selectedReport.message}</h3>
                </div>

                  {/* Report Type Info */}
                  <div className="report-type-info">
                    <span className={`report-type-badge ${selectedReport.reportType || 'problem'}`}>
                      {selectedReport.reportType === 'solution' ? '💡 Solution' : '🚨 Problem'}
                    </span>
                  </div>

                  {/* Collaborators */}
                  {selectedReport.collaborators && selectedReport.collaborators.length > 0 && (
                    <div className="collaborators-section">
                      <h4>Collaborators</h4>
                      <div className="collaborators-list">
                        {selectedReport.collaborators.map(email => (
                          <span key={email} className="collaborator-tag">{email}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Problems */}
                  {selectedReport.linkedProblems && selectedReport.linkedProblems.length > 0 && (
                    <div className="linked-problems-section">
                      <h4>Solves These Problems</h4>
                      <div className="linked-problems-list">
                        {selectedReport.linkedProblems.map(problemId => {
                          const problem = reports.find(r => r.id === problemId);
                          return problem ? (
                            <div key={problemId} className="linked-problem-item">
                              <span>🚨 {problem.message.substring(0, 80)}...</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Share Link */}
                  <div className="share-section">
                    <button 
                      className="share-btn"
                      onClick={() => copyShareLink(selectedReport)}
                    >
                      🔗 Copy Share Link
                    </button>
                  </div>
                  
                  {/* All Comments */}
                  <div className="comments-section-full">
                    <h4>Comments ({selectedReport.comments?.length || 0})</h4>
                    {selectedReport.comments?.map((comment) => (
                      <div key={comment.id} className="comment-full">
                        <div className="comment-header-full">
                          <span className="comment-author-full">{comment.author}</span>
                          <span className="comment-time-full">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                          {currentUserUid === comment.userId && (
                            <button
                              className="comment-delete-full"
                              onClick={() => handleDeleteComment(selectedReport.id, comment.id)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <p className="comment-text-full">{comment.text}</p>
                      </div>
                    ))}
                    
                    {user?.emailVerified ? (
                      <div className="comment-form-full">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentInputs[selectedReport.id] || ''}
                          onChange={(e) => handleCommentInputChange(selectedReport.id, e.target.value)}
                          className="comment-input-full"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(selectedReport.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(selectedReport.id)}
                          className="comment-submit-full"
                          disabled={!commentInputs[selectedReport.id]?.trim()}
                        >
                          Post
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="login-prompt-full"
                        onClick={() => setSelectedSection('login')}
                      >
                        Login to comment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="modal-overlay" onClick={() => setShowNewReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowNewReportModal(false)}>×</button>
            <h3 className="modal-title">Create Report</h3>

            {/* Report Type Selection */}
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <div className="report-type-selection">
                <button
                  type="button"
                  className={`type-btn ${reportType === 'problem' ? 'active' : ''}`}
                  onClick={() => setReportType('problem')}
                >
                  🚨 Problem
                </button>
                <button
                  type="button"
                  className={`type-btn ${reportType === 'solution' ? 'active' : ''}`}
                  onClick={() => setReportType('solution')}
                >
                  💡 Solution
                </button>
              </div>
            </div>

            {/* Link to Problems (only for solutions) */}
            {reportType === 'solution' && problemReports.length > 0 && (
              <div className="form-group">
                <label className="form-label">Link to Problems (Optional)</label>
                <div className="problem-selection">
                  {problemReports.map(problem => (
                    <div key={problem.id} className="problem-item">
                      <input
                        type="checkbox"
                        id={`problem-${problem.id}`}
                        checked={selectedProblems.includes(problem.id)}
                        onChange={() => toggleProblemSelection(problem.id)}
                      />
                      <label htmlFor={`problem-${problem.id}`} className="problem-label">
                        {problem.message.substring(0, 60)}...
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaborators (only for solutions) */}
            {reportType === 'solution' && (
              <div className="form-group">
                <label className="form-label">Collaborators (Optional)</label>
                <div className="collaborator-input">
                  <input
                    type="email"
                    placeholder="Enter collaborator email"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    className="form-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCollaborator();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCollaborator}
                    className="add-collaborator-btn"
                    disabled={!collaboratorEmail.trim()}
                  >
                    Add
                  </button>
                </div>
                {collaborators.length > 0 && (
                  <div className="collaborator-list">
                    {collaborators.map(email => (
                      <div key={email} className="collaborator-item">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(email)}
                          className="remove-collaborator-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local Preview */}
            {filePreviewUrl && (
              <div className="file-preview">
                {file?.type.startsWith('image/') && (
                  <img src={filePreviewUrl} alt="preview" />
                )}
                {file?.type.startsWith('video/') && (
                  <video controls src={filePreviewUrl} />
                )}
              </div>
            )}

            <form onSubmit={handleSubmitReport}>
              <div className="form-group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder={
                    reportType === 'problem' 
                      ? "What's the problem? Describe the issue..." 
                      : "How does this solve the problem? Describe your solution..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-textarea"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={!file || !message.trim()}
                className="form-button"
              >
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="bottom-action-bar">
        {user?.emailVerified ? (
          <button onClick={handleOpenModal} className="report-btn">
            🚨 Report Incident
          </button>
        ) : (
          <button onClick={() => setSelectedSection('login')} className="login-action-btn">
            Login to Report
          </button>
        )}
      </div>
    </div>
  );
};

export default Main;
