'use client';  // Marks the component as a Client Component

import '../globals.css';

const Nav = ({ setSelectedSection, handleLogout, user}) => {
  const handleSectionChange = (section) => {
    setSelectedSection(section);  // Update the selected section state in the parent component
  };

  return (
    <nav className="navigation">
      <div className="navigation-logo">
        <button onClick={() => handleSectionChange('main')}>
          <h1>Red Guardián</h1>
        </button>
      </div>
      {user && 
        <div className="navigation-options">
          <button onClick={() => handleSectionChange('messages')}>💬 Messages</button>
          <button onClick={() => handleSectionChange('profile')}>👤 Profile</button>
          <button onClick={handleLogout}>Salir</button>
        </div>
      }
    </nav>
  );
};

export default Nav;