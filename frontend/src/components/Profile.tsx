import React, { useState, useEffect } from 'react';
import api from "../api";

const Profile: React.FC = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      setUsername(response.data.username);
      setEmail(response.data.email);
    } catch (error) {
      console.error("Error fetching profile", error);
    }
  };

    useEffect(() => {
    fetchProfile();
  }, []);
    
    return (
    <div>
      <h2>My Profile</h2>
      <pre>{`Username: ${username}\nEmail: ${email}`}</pre>
    </div>
  );
};

export default Profile;