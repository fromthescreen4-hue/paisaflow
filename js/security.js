// js/security.js - Paisa Flow Vault Security Core (Hybrid Native Edition)

const VaultSecurity = {
    PIN_HASH_KEY: 'paisa_flow_vault_pin',
    BIO_ENABLED_KEY: 'paisa_flow_biometrics',
    SESSION_UNLOCKED: 'vault_session_unlocked',
    
    async init() {
        console.log("Vault Security Initializing [Hybrid Mode]...");
        this.setupUpdateListener();
        
        // Check for lock state using the native bridge
        await this.checkLockState();
    },

    setupUpdateListener() {
        window.addEventListener('app-update-available', () => {
            const banner = document.getElementById('app-update-banner');
            if (banner) banner.style.display = 'flex';
        });
    },

    forceUpdate() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.waiting) {
                    reg.waiting.postMessage({ action: 'skipWaiting' });
                }
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    },

    async checkLockState() {
        const isRegistered = await PaisaNative.getItem(this.PIN_HASH_KEY);
        const isUnlocked = sessionStorage.getItem(this.SESSION_UNLOCKED);

        if (!isRegistered) {
            console.log("Registration Required for Native Vault.");
            return; 
        }

        if (!isUnlocked) {
            this.showLockScreen();
        }
    },

    async showLockScreen() {
        const overlay = document.getElementById('vault-lock-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.renderPinPad('lock-pin-display', 'lock-pin-pad', (pin) => this.verifyUnlock(pin));
            
            // Auto-trigger native biometrics if enabled
            const bioEnabled = await PaisaNative.getItem(this.BIO_ENABLED_KEY);
            if (bioEnabled === 'true') {
                setTimeout(() => this.triggerBiometrics(), 500);
            }
        }
    },

    showRegistration() {
        const overlay = document.getElementById('security-setup-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.renderPinPad('setup-pin-display', 'setup-pin-pad', (pin) => this.finalizeRegistration(pin));
        }
    },

    renderPinPad(displayId, padId, callback) {
        const display = document.getElementById(displayId);
        const pad = document.getElementById(padId);
        if (!display || !pad) return;

        let currentPin = "";
        const dots = display.querySelectorAll('.pin-dot');

        const updateDots = () => {
            dots.forEach((dot, index) => {
                if (index < currentPin.length) dot.classList.add('filled');
                else dot.classList.remove('filled');
            });
        };

        pad.innerHTML = "";
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 'fingerprint', 0, 'back'].forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'pin-btn';
            
            if (key === 'fingerprint') {
                btn.innerHTML = '<span class="material-icons">fingerprint</span>';
                btn.onclick = () => this.triggerBiometrics();
            } else if (key === 'back') {
                btn.innerHTML = '<span class="material-icons">backspace</span>';
                btn.onclick = () => {
                    currentPin = currentPin.slice(0, -1);
                    updateDots();
                };
            } else {
                btn.innerText = key;
                btn.onclick = () => {
                    if (currentPin.length < 4) {
                        currentPin += key;
                        updateDots();
                        if (currentPin.length === 4) {
                            setTimeout(() => {
                                callback(currentPin);
                                currentPin = "";
                                updateDots();
                            }, 200);
                        }
                    }
                };
            }
            pad.appendChild(btn);
        });
    },

    async triggerBiometrics() {
        const success = await PaisaNative.triggerBiometric();
        if (success) {
            this.verifyUnlock("BIOMETRIC_SUCCESS");
        }
    },

    async verifyUnlock(pin) {
        const savedHash = await PaisaNative.getItem(this.PIN_HASH_KEY);
        const inputHash = CryptoJS.SHA256(pin).toString();

        if (inputHash === savedHash || pin === "BIOMETRIC_SUCCESS") {
            sessionStorage.setItem(this.SESSION_UNLOCKED, 'true');
            const overlay = document.getElementById('vault-lock-overlay');
            if (overlay) overlay.style.display = 'none';
        } else {
            const display = document.getElementById('lock-pin-display');
            display.classList.add('shake');
            setTimeout(() => display.classList.remove('shake'), 400);
        }
    },

    async finalizeRegistration(pin) {
        const hash = CryptoJS.SHA256(pin).toString();
        await PaisaNative.setItem(this.PIN_HASH_KEY, hash);
        await PaisaNative.setItem(this.BIO_ENABLED_KEY, 'true'); 
        
        sessionStorage.setItem(this.SESSION_UNLOCKED, 'true');
        const overlay = document.getElementById('security-setup-overlay');
        if (overlay) overlay.style.display = 'none';
        
        showMsg('auth-msg', "Vault Security Registered Native.", false);
    },

    async forgotPin() {
        const email = await PaisaNative.getItem('userEmail');
        if (!email) {
            alert("No registered email found. Please reset the app.");
            return;
        }

        try {
            await serverCall('sendPINResetOTP', email);
            alert("A recovery code has been sent to your email.");
        } catch (e) {
            alert(e.message);
        }
    }
};

// Start security on boot
document.addEventListener('DOMContentLoaded', () => VaultSecurity.init());
