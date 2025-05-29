'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

const Main = ({ setSelectedSection }) => {
  const router = useRouter();
  const currentUserUid = auth.currentUser?.uid;

  // Fetch user channels
  useEffect(() => {
    if (!currentUserUid) return;

    const q = query(
      collection(db, 'channels'),
      where('participants', 'array-contains', currentUserUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channels = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setListOfChannels(channels);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  return (
    <div className="main-section" style={{ padding: '20px' }}>
      <h1>Main Section</h1>
    </div>
  );
};

const styles = {
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    background: '#fff',
    padding: '20px',
    width: '90%',
    maxWidth: '400px',
    borderRadius: '10px',
    position: 'relative',
  },
  close: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    fontSize: '20px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  button: {
    marginRight: '10px',
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  channelRow: {
    padding: '15px',
    backgroundColor: '#f4f4f4',
    marginBottom: '10px',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default Main;