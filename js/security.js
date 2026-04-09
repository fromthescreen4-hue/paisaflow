/* 
   =========================================================
   PAISA FLOW VAULT PROTECTION & HAPTIC SYSTEM
   ========================================================= 
*/

(function() {
    // 1. SECURITY LOCKS
    // Disable right-click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Disable text selection
    document.addEventListener('selectstart', e => e.preventDefault());

    // Disable common DevTools shortcuts
    document.addEventListener('keydown', e => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
        if (e.ctrlKey && (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74) || e.keyCode === 85 || e.keyCode === 83)) {
            e.preventDefault();
            return false;
        }
    });

    // 2. HAPTIC FEEDBACK CONTROLLER
    window.triggerHaptic = function(type = 'light') {
        const patterns = {
            'light': 15,
            'medium': 35,
            'heavy': 60,
            'success': [10, 30, 10],
            'error': [100, 40, 100]
        };

        if ('vibrate' in navigator) {
            navigator.vibrate(patterns[type] || patterns['light']);
        }
    };

    // 3. SEAMLESS SESSION VALIDATOR
    window.validateSession = function() {
        const isProtectedPage = window.location.pathname.includes('dashboard.html');
        const hasKey = sessionStorage.getItem('vaultKey');
        const hasEmail = localStorage.getItem('userEmail');

        if (isProtectedPage && (!hasKey || !hasEmail)) {
            console.warn("Unauthorized Access Attempt. Safeguarding Vault.");
            window.location.href = '../index.html';
        }
    };

    // Run Security Checks
    validateSession();

    // 4. AUTOMATIC BINDING
    function bindHaptics() {
        const selectors = '.pill-btn, .fab, .arrow-btn, .nav-item, .verify-thumb, .onboard-btn-next, .onboard-btn-secondary';
        document.querySelectorAll(selectors).forEach(el => {
            if (!el.dataset.hapticBound) {
                el.addEventListener('pointerdown', () => window.triggerHaptic('light'));
                el.dataset.hapticBound = "true";
            }
        });
    }

    // Run on load and whenever DOM changes (for dynamic elements)
    window.addEventListener('load', bindHaptics);
    const observer = new MutationObserver(bindHaptics);
    observer.observe(document.body, { childList: true, subtree: true });

})();
