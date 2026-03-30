import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

const ClassroomPage = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const closedRef = useRef(false);
    const [joined, setJoined] = useState(false);

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || 'GoMufi-Room';
    const role = params.get('role') || 'student';
    const displayName = role === 'instructor' ? 'Eğitmen' : 'Öğrenci';

    const closeNow = () => {
        if (closedRef.current) return;
        closedRef.current = true;
        document.documentElement.style.visibility = 'hidden';
        if (apiRef.current) {
            try { apiRef.current.dispose(); } catch (_) { /* */ }
        }
        window.close();
    };

    // Kendi butonumuz: hangup + anında kapat
    const handleLeave = () => {
        if (apiRef.current) {
            try { apiRef.current.executeCommand('hangup'); } catch (_) { /* */ }
        }
        // Jitsi'nin event'ini bekleme, direkt kapat
        closeNow();
    };

    const initJitsi = () => {
        if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

        // Önceki instance varsa temizle
        if (apiRef.current) {
            try { apiRef.current.dispose(); } catch (_) { /* */ }
            apiRef.current = null;
        }

        const toolbarButtons =
            role === 'instructor'
                ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'recording', 'mute-everyone']
                : ['microphone', 'camera', 'desktop', 'chat', 'raisehand'];
        // NOT: 'hangup' butonunu Jitsi toolbar'dan KALDIRDIK — kendi butonumuzu kullanacağız

        apiRef.current = new window.JitsiMeetExternalAPI('meet.element.io', {
            roomName: room,
            parentNode: containerRef.current,
            userInfo: { displayName },
            configOverwrite: {
                prejoinPageEnabled: false,
                prejoinConfig: { enabled: false },
                disableDeepLinking: true,
                startWithAudioMuted: role !== 'instructor',
                startWithVideoMuted: role !== 'instructor',
                enableLobbyChat: false,
                toolbarButtons,
                enableFeedbackAnimation: false,
                feedbackPercentage: 0,
                disableInviteFunctions: true,
                hideConferenceSubject: true,
                disableProfile: true,
                disableShowMoreStats: true,
                disableSelfView: false,
                disableSelfViewSettings: true,
                resolution: 720,
                constraints: {
                    video: {
                        height: { ideal: 720, max: 720, min: 180 },
                        width: { ideal: 1280, max: 1280, min: 320 },
                    },
                },
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                SHOW_BRAND_WATERMARK: false,
                SHOW_POWERED_BY: false,
                SETTINGS_SECTIONS: [],
                VIDEO_QUALITY_LABEL_DISABLED: true,
                TOOLBAR_ALWAYS_VISIBLE: true,
            },
        });

        apiRef.current.addEventListener('videoConferenceJoined', () => {
            setJoined(true);
        });

        // Yine de fallback: Jitsi kendi hangup'ını tetiklerse yakala
        apiRef.current.addEventListener('videoConferenceLeft', closeNow);
        apiRef.current.addEventListener('readyToClose', closeNow);
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://meet.element.io/external_api.js';
        script.async = true;
        script.onload = () => initJitsi();
        document.head.appendChild(script);

        return () => {
            if (apiRef.current) {
                try { apiRef.current.dispose(); } catch (_) { /* */ }
            }
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Kendi kapatma butonumuz — Jitsi'nin hangup butonunu bypass eder */}
            {joined && (
                <button
                    onClick={handleLeave}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 99999,
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '14px 28px',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 24px rgba(220, 38, 38, 0.5)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#b91c1c';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <span style={{ fontSize: '20px' }}>✕</span>
                    Toplantıyı Bitir
                </button>
            )}
        </div>
    );
};

export default ClassroomPage;
