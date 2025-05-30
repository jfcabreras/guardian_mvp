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
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [location, setLocation] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const fileInputRef = useRef(null);

  // Fetch reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const j_reports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(j_reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };
    fetchReports();
  }, []);

  // Handle file input change - store in memory, preview locally
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

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

      const newReport = await addDoc(collection(db, "reports"), {
        sender: currentUserUid,
        type: 'file',
        message,
        fileUrl: uploadedUrl,
        filename: file.name,
        category: 'undefined',
        timestamp: serverTimestamp(),
        location,
        comments: []
      });

      // Add to local state immediately for better UX
      setReports(prev => [{
        id: newReport.id,
        sender: currentUserUid,
        type: 'file',
        message,
        fileUrl: uploadedUrl,
        filename: file.name,
        category: 'undefined',
        timestamp: { toDate: () => new Date() },
        location,
        comments: []
      }, ...prev]);

      // Reset form
      setMessage('');
      setFile(null);
      setFilePreviewUrl('');
      setLocation(null);
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

  // Open image in modal
  const openImageInModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleOpenModal = () => {
    setShowNewReportModal(true);
  };

  return (
    <div className="main-section">
      <div className='report-log'>
        {reports.length < 1 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📱</div>
            <h3>No Reports Yet</h3>
            <p>Be the first to report something in your area</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="report-container">
              <div className="report-header">
                <img
                  src={report.fileUrl}
                  alt={report.filename || 'Report image'}
                  className="report-image"
                  onClick={() => openImageInModal(report.fileUrl)}
                />
                <div className="report-content">
                  <div className="report-timestamp">
                    {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : 'Just now'}
                  </div>
                  <h3 className="report-message">{report.message}</h3>
                  <span className="report-status">Active</span>
                </div>
              </div>

              {/* Comments Section - Always visible */}
              <div className="comments-section">
                <button 
                  className="comments-toggle"
                  onClick={() => toggleComments(report.id)}
                >
                  💬 {report.comments?.length || 0} Comments
                  {expandedComments[report.id] ? ' ▲' : ' ▼'}
                </button>

                {expandedComments[report.id] && (
                  <>
                    {/* Existing Comments */}
                    {report.comments?.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <div className="comment-author">{comment.author}</div>
                          <div className="comment-timestamp">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </div>
                          {currentUserUid === comment.userId && (
                            <button
                              className="comment-delete"
                              onClick={() => handleDeleteComment(report.id, comment.id)}
                              title="Delete comment"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div className="comment-text">{comment.text}</div>
                      </div>
                    ))}

                    {/* Add Comment Form - Only for verified users */}
                    {user?.emailVerified ? (
                      <div className="comment-form">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentInputs[report.id] || ''}
                          onChange={(e) => handleCommentInputChange(report.id, e.target.value)}
                          className="comment-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(report.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(report.id)}
                          className="comment-submit"
                          disabled={!commentInputs[report.id]?.trim()}
                        >
                          Post
                        </button>
                      </div>
                    ) : (
                      <div className="comment-login-prompt">
                        <button onClick={() => setSelectedSection('login')}>
                          Login to comment
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <button className="image-modal-close" onClick={() => setShowImageModal(false)}>×</button>
          <img src={selectedImage} alt="Full size" />
        </div>
      )}

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="modal-overlay" onClick={() => setShowNewReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowNewReportModal(false)}>×</button>
            <h3 className="modal-title">Report Incident</h3>

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
                  placeholder="What's happening? Describe the incident..."
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

      {/* Floating Action Button - only show if user is verified */}
      {user?.emailVerified && (
        <button onClick={handleOpenModal} className="fab" title="Create Report">
          +
        </button>
      )}

      {/* Login prompt for non-verified users */}
      {!user?.emailVerified && (
        <div className="login-prompt">
          <button onClick={() => setSelectedSection('login')}>
            📱 Login to Report Incidents
          </button>
        </div>
      )}
    </div>
  );
};

export default Main;