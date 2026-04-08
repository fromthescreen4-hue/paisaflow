// js/native-bridge.js - Paisa Flow Native Capacitor Bridge

const PaisaNative = {
    // 1. NATIVE STORAGE (Preferences Plugin)
    async setItem(key, value) {
        if (typeof window.Capacitor !== 'undefined') {
            await window.Capacitor.Plugins.Preferences.set({ key, value });
        } else {
            localStorage.setItem(key, value);
        }
    },

    async getItem(key) {
        if (typeof window.Capacitor !== 'undefined') {
            const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
            return value;
        } else {
            return localStorage.getItem(key);
        }
    },

    // 2. NATIVE BIOMETRICS (Fingerprint Plugin)
    async triggerBiometric() {
        if (typeof window.Capacitor !== 'undefined') {
            try {
                const result = await window.Capacitor.Plugins.NativeBiometric.verify({
                    reason: "Authenticate to reveal your vault",
                    title: "Paisa Flow Security",
                    subtitle: "Confirm identity",
                    description: "Use your fingerprint or FaceID",
                });
                return !!result;
            } catch (e) {
                console.warn("Native biometric cancelled or failed", e);
                return false;
            }
        } else {
            // WEB FALLBACK
            if (window.PublicKeyCredential) {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                return available;
            }
            return false;
        }
    },

    // 3. PUSH NOTIFICATIONS (Ready for Firebase)
    async initPush() {
        if (typeof window.Capacitor !== 'undefined') {
            const { PushNotifications } = window.Capacitor.Plugins;
            
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn("Push permission denied");
                return;
            }

            await PushNotifications.register();

            PushNotifications.addListener('registration', token => {
                console.log('Push registration success. Token available in vault.');
            });

            PushNotifications.addListener('pushNotificationReceived', notification => {
                console.log('Vault Notification Received:', notification);
            });
        }
    }
};

// Initialize push infrastructure on load if native
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.Capacitor !== 'undefined') {
        PaisaNative.initPush();
    }
});
