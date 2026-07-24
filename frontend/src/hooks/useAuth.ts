import { useState, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import api from '../api';

export function useAuth() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const posthog = usePostHog();

    const fetchUser = async () => {
        setLoading(true);
        try {
            const response = await api.get('/profile');
            setUserData(response.data);

            // PostHog kullanıcı kimliği — analitiği kullanıcıya bağlar.
            // KVKK/minimum PII: yalnızca rol ve eğitim seviyesi; e-posta gönderilmez.
            const u = response.data;
            if (posthog && u?.user_id != null) {
                posthog.identify(String(u.user_id), {
                    role: u.role,
                    education_level: u.education_level,
                });
            }
        } catch (err) {
            console.error("Failed to fetch user profile", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return { userData, loading, error, refresh: fetchUser };
}
