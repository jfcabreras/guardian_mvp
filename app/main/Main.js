'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const Main = ({ setSelectedSection, user }) => {
  const currentUserUid = auth.currentUser?.uid;
  const [reports, setReports] = useState([]);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [location, setLocation] = useState(null); // Assuming you still want location
  const fileInputRef = useRef(null);

  // Fetch reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reports"));
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
      alert("Please provide a file, summary, and allow location access.");
      return;
    }

    try {
      const uploadedUrl = await uploadToStorage(file, 'files');

      await addDoc(collection(db, "reports"), {
        sender: currentUserUid,
        type: 'file',
        message,
        fileUrl: uploadedUrl,
        filename: file.name,
        category: 'undefined',
        timestamp: serverTimestamp(),
        location
      });

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

  const handleOpenModal = () => {
    setShowNewReportModal(true);
  };

  return (
    <div className="main-section" style={{ padding: '20px' }}>
      <div className='report-log'>
        {reports.length < 1 ? (
          <div>No Reports to Display Yet</div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="report-container">
              {/* <pre>{JSON.stringify(report, null, 2)}</pre> */}
              <p className="preview-row-field"><small>{report.timestamp?.toDate().toLocaleString()}</small></p>
              <img
                src={report.fileUrl}
                alt={report.filename || 'Image'}
                style={{
                  maxWidth: '70px',
                  maxHeight: '70px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
                onClick={() => openImageInModal(report.fileUrl)} // Clicking opens the modal
              />
              <h3>{report.message}</h3>
            </div>
          ))
        )}
      </div>

      {user?.emailVerified && (
        <>
          {showNewReportModal && (
            <div className="modal-overlay" onClick={() => setShowNewReportModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowNewReportModal(false)}>×</button>
                <h3>Create New Report</h3>

                {/* Local Preview */}
                <div style={{ marginBottom: '10px' }}>
                  {filePreviewUrl && (
                    <>
                      {file.type.startsWith('image/') && (
                        <img src={filePreviewUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      )}
                      {file.type.startsWith('video/') && (
                        <video controls src={filePreviewUrl} style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      )}
                    </>
                  )}
                </div>

                <form onSubmit={handleSubmitReport}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    style={{ marginBottom: '10px' }}
                  />
                  <input
                    type="text"
                    placeholder="Summary"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                  />
                  <button type="submit" disabled={!file || !message }>
                    Submit Report
                  </button>
                </form>
              </div>
            </div>
          )}
          <button onClick={handleOpenModal}>+ Create Report</button>
        </>
      )}
    </div>
  );
};

export default Main;