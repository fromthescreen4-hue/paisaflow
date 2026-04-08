// js/auth.js

let userLocData = "Fetching Location...";
let pendingEmail = "";
let pendingName = "";
let pendingPassword = "";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Splash logic
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                
                if (!localStorage.getItem('userEmail')) {
                    const intro = document.getElementById('intro-screen');
                    if (intro) {
                        intro.style.display = 'flex';
                        rotateIntroQuotes();
                    }
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 600);
        }, 2500);
    }

    // 2. Fetch IP Location
    getUserLocation().then(l => userLocData = l);

    // 3. Auth Toggles
    const toggleBtn = document.getElementById('toggle-auth-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const signupGroup = document.getElementById('signup-form-group');
            const isSignup = signupGroup.style.display !== 'none';
            
            const title = document.getElementById('auth-title');
            const subtitle = document.getElementById('auth-subtitle');
            const submitBtn = document.getElementById('auth-submit-btn');
            const form = document.getElementById('auth-form');

            // Apply cinematic entrance/exit
            form.classList.add('exit-animation');

            setTimeout(() => {
                if (isSignup) {
                    signupGroup.style.display = 'none';
                    toggleBtn.innerText = "Don’t have an account? Create Account";
                    title.innerText = "Welcome to Paisa Flow";
                    subtitle.innerText = "Sign in to continue";
                    if (sliderText) sliderText.innerText = "Slide to Authorize";
                } else {
                    signupGroup.style.display = 'block';
                    toggleBtn.innerText = "Already have an account? Log in";
                    title.innerText = "Create Account";
                    subtitle.innerText = "Sign up to get started";
                    if (sliderText) sliderText.innerText = "Slide to Register";
                }
                
                form.classList.remove('exit-animation');
                form.classList.add('enter-animation');
                setTimeout(() => form.classList.remove('enter-animation'), 600);
            }, 300);
        });
    }

    initAuthSlider();

    const form = document.getElementById('auth-form');
    if (form) form.addEventListener('submit', handleAuthSubmit);

    // OTP Input logic
    const otpInput = document.getElementById('signup-otp');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length === 6) {
                verifySignupOTP();
            }
        });
    }
});

function rotateIntroQuotes() {
  const quotes = [
    {q: '"Wealth begins with awareness."', i: "📈"},
    {q: '"Beware of little expenses; a small leak will sink a great ship."', i: "💸"},
    {q: '"Financial freedom starts with tracking."', i: "🔒"},
    {q: '"Turn spending into strategy."', i: "🎯"},
    {q: '"Master your money habits."', i: "🧠"}
  ];
  const selected = quotes[Math.floor(Math.random() * quotes.length)];
  const qEl = document.getElementById('intro-quote');
  const iEl = document.getElementById('intro-icon');
  if(qEl) qEl.innerText = selected.q;
  if(iEl) iEl.innerText = selected.i;
}

function showAuthPortal() {
    const intro = document.getElementById('intro-screen');
    const auth = document.getElementById('onboarding-container');
    
    // Cinematic exit for intro
    intro.style.transition = 'all 0.6s cubic-bezier(0.64, 0, 0.78, 0)';
    intro.style.opacity = '0';
    intro.style.transform = 'translateY(-30px) scale(0.95)';
    intro.style.filter = 'blur(10px)';
    
    setTimeout(() => {
        intro.style.display = 'none';
        auth.style.display = 'flex';
        // Note: The cardEntrance animation in CSS handles the auth entrance
    }, 500);
}

function checkSession() {
    if (localStorage.getItem('userEmail')) {
        window.location.href = 'dashboard.html';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const isSignup = document.getElementById('signup-form-group').style.display !== 'none';
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value || "User";

    if (!email || !password) {
        showMsg('auth-msg', "Email and Password are required.", true);
        return;
    }

    if (!isSignup) {
        // Step 1: Login Request (Verify Pass + Trigger MFA)
        try {
            const res = await serverCall('loginUser', email, password, userLocData);
            if (res.mfaRequired) {
                pendingEmail = email;
                pendingName = ""; // Not needed for login
                pendingPassword = password;
                
                document.getElementById('auth-form').style.display = 'none';
                document.getElementById('otp-verify-group').style.display = 'block';
                document.getElementById('auth-title').innerText = "Access Override";
                document.getElementById('auth-subtitle').innerText = "Enter the secure token sent to your email.";
                showMsg('auth-msg', "Verification code sent to email.");
            }
        } catch (err) {
            showMsg('auth-msg', err.message, true);
        }
    } else {
        // Signup Request OTP
        try {
            await serverCall('requestSignupOTP', email, name, userLocData);
            pendingEmail = email;
            pendingName = name;
            pendingPassword = password;
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('otp-verify-group').style.display = 'block';
            showMsg('auth-msg', "Verification code sent to email.");
        } catch (err) {
            showMsg('auth-msg', err.message, true);
        }
    }
}

function initAuthSlider() {
    const slider = document.getElementById('auth-slider');
    const thumb = document.getElementById('auth-slider-thumb');
    if (!slider || !thumb) return;

    let isDragging = false;
    let startX = 0;
    
    // Set initial state
    thumb.style.left = '4px';

    const onStart = (e) => {
        isDragging = true;
        startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        thumb.style.transition = 'none';
        // Calculate maxTrack on start to ensure we have correct dimensions even if 
        // the slider was hidden at page load.
        this._maxTrack = slider.clientWidth - thumb.clientWidth - 8;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault(); // Block scroll
        
        const currentX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        let delta = currentX - startX;
        if (delta < 0) delta = 0;
        if (delta > this._maxTrack) delta = this._maxTrack;
        thumb.style.left = (delta + 4) + 'px';
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const currentPos = parseInt(thumb.style.left) - 4;
        
        if (currentPos >= this._maxTrack * 0.9) {
            thumb.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            thumb.style.left = (this._maxTrack + 5) + 'px';
            thumb.classList.add('verify-success');
            thumb.innerHTML = '<span class="material-icons">check</span>';
            
            // Success Haptic/Visual feedback
            slider.style.animation = 'vaultUnlocking 0.6s ease';

            // Trigger Auth with a cinematic coordinated sequence
            setTimeout(() => {
                handleAuthSubmit(new Event('submit'));
                
                // If the screen stays (e.g. error or waiting for OTP)
                setTimeout(() => {
                    const onboarding = document.getElementById('onboarding-container');
                    if (onboarding && onboarding.style.display !== 'none') {
                        thumb.style.transition = 'left 0.4s ease';
                        thumb.style.left = '5px';
                        thumb.classList.remove('verify-success');
                        thumb.innerHTML = '<span class="material-icons">chevron_right</span>';
                        slider.style.animation = 'none';
                    }
                }, 4000);
            }, 400);
        } else {
            thumb.style.transition = 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            thumb.style.left = '5px';
        }
    };

    thumb.addEventListener('mousedown', onStart);
    thumb.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
}

async function verifyAccessCode() {
    const otp = document.getElementById('signup-otp').value;
    const btn = document.getElementById('otp-btn');
    if(!btn) return;
    btn.disabled = true;
    btn.innerText = "Verifying Identity...";

    const isLoginFlow = document.getElementById('auth-title').innerText === "Access Override";

    try {
        let res;
        if (isLoginFlow) {
            res = await serverCall('completeLogin', pendingEmail, otp);
            sessionStorage.setItem('vaultKey', pendingPassword);
        } else {
            res = await serverCall('completeSignup', pendingEmail, pendingPassword, pendingName, otp);
            sessionStorage.setItem('vaultKey', pendingPassword);
        }
        
        localStorage.setItem('userEmail', res.email);
        localStorage.setItem('userName', res.name || "User");
        showMsg('auth-msg', "Security Clear. Redirecting...", false);
        setTimeout(() => window.location.href = 'dashboard.html', 800);
    } catch (err) {
        btn.disabled = false;
        btn.innerText = isLoginFlow ? "Bypass Security Lock" : "Complete Signup";
        showMsg('auth-msg', err.message, true);
    }
}
