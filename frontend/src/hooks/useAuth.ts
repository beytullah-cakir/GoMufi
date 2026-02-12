import { useState, useEffect } from 'react';
import api from '../api';

export function useAuth() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/profile');
                setUserData(response.data);
            } catch (err) {
                console.error("Failed to fetch user profile", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { userData, loading, error };
}
