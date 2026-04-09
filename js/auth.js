// js/auth.js - Payza 2.0 Production Edition

let userLocData = "Fetching Location...";
let pendingEmail = "";
let pendingName = "";
let pendingPassword = "";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State Check
    if (localStorage.getItem('userEmail')) {
        window.location.href = 'html/dashboard.html';
    } else {
        initAuthSlider();
    }

    // 2. Fetch IP Location
    getUserLocation().then(l => userLocData = l);

    // 3. Auth Toggles (Login vs Signup)
    const toggleBtn = document.getElementById('toggle-auth-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const signupGroup = document.getElementById('signup-fields');
            const isSignup = signupGroup.style.display !== 'none';
            
            const title = document.getElementById('auth-title');
            const subtitle = document.getElementById('auth-subtitle');
            const sliderText = document.getElementById('auth-slider-text');

            if (isSignup) {
                signupGroup.style.display = 'none';
                toggleBtn.innerText = "Don’t have an account? Create Account";
                title?.innerText && (title.innerText = "Elite Vault");
                subtitle.innerText = "Authorized access required";
                if (sliderText) sliderText.innerText = "Authorize Entrance";
            } else {
                signupGroup.style.display = 'block';
                toggleBtn.innerText = "Already have an account? Log in";
                title?.innerText && (title.innerText = "Secure Entry");
                subtitle.innerText = "Secure your financial future";
                if (sliderText) sliderText.innerText = "Register Fingerprint";
            }
        });
    }

    const form = document.getElementById('auth-form');
    if (form) form.addEventListener('submit', (e) => e.preventDefault());
});

async function handleAuthSubmit() {
    const signupFields = document.getElementById('signup-fields');
    const isSignup = signupFields.style.display !== 'none';
    
    pendingEmail = document.getElementById('auth-email').value;
    pendingPassword = document.getElementById('auth-password').value;
    pendingName = document.getElementById('auth-name').value || "Elite Member";

    if (!pendingEmail || !pendingPassword) {
        showMsg('auth-msg', "Required fields missing.", true);
        resetSlider();
        return;
    }

    try {
        const hashedPass = hashPassword(pendingPassword);
        if (!isSignup) {
            // Step 1: Request OTP for Login
            const res = await serverCall('loginUser', pendingEmail, hashedPass, userLocData);
            if (res.mfaRequired) {
                showOTPUI("Verify Access Token");
            }
        } else {
            // Step 1: Request OTP for Signup
            const currency = document.getElementById('auth-currency').value || '₹';
            localStorage.setItem('userCurrency', currency);
            await serverCall('requestSignupOTP', pendingEmail, pendingName, userLocData);
            showOTPUI("Verify Identity");
        }
    } catch (err) {
        showMsg('auth-msg', err.message, true);
        resetSlider();
    }
}

function showOTPUI(subtitle) {
    document.getElementById('auth-form').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('otp-verify-group').style.display = 'block';
        document.getElementById('auth-otp').value = ''; // Clear stale OTP
        document.getElementById('auth-subtitle').innerText = subtitle;
        document.getElementById('toggle-auth-btn').style.display = 'none';
    }, 300);
}

function returnToAuth() {
    document.getElementById('otp-verify-group').style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('auth-form').style.opacity = '1';
    document.getElementById('toggle-auth-btn').style.display = 'inline-block';
    document.getElementById('auth-subtitle').innerText = "Enter your private vault";
    document.getElementById('auth-otp').value = ''; // Clear on return
    resetSlider();
}

async function verifyAccessCode() {
    const otp = document.getElementById('auth-otp').value;
    if (!otp || otp.length < 6) {
        showMsg('auth-msg', "Enter the 6-digit code.", true);
        return;
    }

    try {
        const isSignup = document.getElementById('signup-fields').style.display !== 'none';
        let res;
        const hashedPass = hashPassword(pendingPassword);
        
        if (isSignup) {
            res = await serverCall('completeSignup', pendingEmail, hashedPass, pendingName, otp);
        } else {
            res = await serverCall('completeLogin', pendingEmail, otp);
        }

        if (res.success) {
            sessionStorage.setItem('vaultKey', pendingPassword);
            localStorage.setItem('userEmail', res.email);
            localStorage.setItem('userName', res.name || pendingName);
            showMsg('auth-msg', "Security cleared. Authorized Access.");
            setTimeout(() => window.location.href = 'html/dashboard.html', 1000);
        } else {
            throw new Error("Invalid or expired token.");
        }
    } catch (err) {
        showMsg('auth-msg', err.message, true);
    }
}

function initAuthSlider() {
    const slider = document.getElementById('auth-slider');
    const thumb = document.getElementById('auth-slider-thumb');
    if (!slider || !thumb) return;

    let isDragging = false;
    let startX = 0;
    
    const onStart = (e) => {
        isDragging = true;
        startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        thumb.style.transition = 'none';
        this._maxTrack = slider.clientWidth - thumb.clientWidth - 10;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const currentX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        let delta = currentX - startX;
        if (delta < 0) delta = 0;
        if (delta > this._maxTrack) delta = this._maxTrack;
        thumb.style.left = (delta + 5) + 'px';
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const currentPos = parseInt(thumb.style.left) - 5;
        
        if (currentPos >= this._maxTrack * 0.9) {
            thumb.style.left = (this._maxTrack + 5) + 'px';
            thumb.innerHTML = '<span class="material-icons">check</span>';
            handleAuthSubmit();
        } else {
            resetSlider();
        }
    };

    thumb.addEventListener('mousedown', onStart);
    thumb.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
}

function resetSlider() {
    const thumb = document.getElementById('auth-slider-thumb');
    if (thumb) {
        thumb.style.transition = 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        thumb.style.left = '5px';
        thumb.innerHTML = '<span class="material-icons">chevron_right</span>';
    }
}
