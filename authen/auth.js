/**
 * Supabase Authentication & Profile Management
 * Major Web Project
 */

// --- CONFIGURATION ---
// Replace placeholders with your own Supabase credentials
const SUPABASE_URL = 'https://vnxbssygayuoxbefawev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueGJzc3lnYXl1b3hiZWZhd2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDEwMjMsImV4cCI6MjA5MDUxNzAyM30.ZFOWl2hQm4tzWSFD9XS6WZDGCSHf9_3oerhKHdPN79M';
// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileForm = document.getElementById('profileForm');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const messageDiv = document.getElementById('message');

// Utility for showing messages
const displayMessage = (msg, isError = false) => {
    messageDiv.textContent = msg;
    messageDiv.className = isError ? 'mt-3 small text-center text-danger' : 'mt-3 small text-center text-success';
};

// --- AUTHENTICATION FLOW ---

// 1. Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        displayMessage('Authenticating...');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Login Failed:', error.message, error.status);
            displayMessage(error.message, true);
        } else {
            displayMessage('Login successful. Redirecting...');
            setTimeout(() => {
                window.location.href = '../Lander.html';
            }, 1500);
        }
    });
}

// Real-time Password Validation
const regPasswordInput = document.getElementById('reg-password');
const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqNumber = document.getElementById('req-number');
const reqSpecial = document.getElementById('req-special');

if (regPasswordInput) {
    regPasswordInput.addEventListener('input', () => {
        const val = regPasswordInput.value;
        const requirements = {
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(val)
        };

        // Update UI
        reqLength.classList.toggle('valid', requirements.length);
        reqUpper.classList.toggle('valid', requirements.upper);
        reqNumber.classList.toggle('valid', requirements.number);
        reqSpecial.classList.toggle('valid', requirements.special);
    });
}

// 2. Handle Registration Step 1 (Auth Signup)
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = regPasswordInput.value;

        // Final validation before submission
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            displayMessage('Password does not meet requirements.', true);
            return;
        }

        displayMessage('Creating account...');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            displayMessage(error.message, true);
        } else if (data.user) {
            displayMessage('Account created. Please complete your profile.');
            // Move to Step 2
            step1.classList.add('d-none');
            step2.classList.remove('d-none');
            // Pre-fill email in step 2
            document.getElementById('profile-email').value = email;
            // Store user ID for later use
            window.currentUserID = data.user.id;

            // If session is present (auto-logged in), store it
            if (data.session) {
                console.log('User auto-logged in.');
            } else {
                displayMessage('Account created. Please confirm your email to continue.', false);
            }
        }
    });
}

// 3. Handle Registration Step 2 (Profile Data)
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Robust ID check: try session first, then fallback to variable
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : window.currentUserID;

        if (!userId) {
            displayMessage('Authentication error. Please sign in again or check your email verification.', true);
            return;
        }

        const profileData = {
            id: userId, // Linked to the user's Auth ID
            email: document.getElementById('profile-email').value,
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value,
            nickname: document.getElementById('nickname').value,
            callsign: document.getElementById('callsign').value,
            telephone: document.getElementById('telephone').value,
            birthdate: document.getElementById('birthdate').value,
            school: document.getElementById('school').value,
            grade: document.getElementById('grade').value,
            major: document.getElementById('major').value,
        };

        displayMessage('Saving profile data...');

        // Upsert into 'profiles' table
        const { data, error } = await supabase
            .from('profiles')
            .upsert(profileData);

        if (error) {
            console.error('DATABASE ERROR:', error);
            if (error.code === '42501') {
                displayMessage('PERMISSION DENIED: You must confirm your email before saving your profile, OR disable "Confirm Email" in Supabase -> Auth -> Settings.', true);
            } else if (error.message.includes('relation "profiles" does not exist')) {
                displayMessage('DATABASE ERROR: The "profiles" table was not found. Please run the SQL setup script.', true);
            } else {
                displayMessage(`Error saving to database: ${error.message} (${error.code || 'No code'})`, true);
            }
        } else {
            console.log('Profile saved successfully:', data);
            // Show Success Modal instead of immediate redirect
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();

            // Handle the redirect manually
            const goToLoginBtn = document.getElementById('goToLogin');
            goToLoginBtn.addEventListener('click', () => {
                successModal.hide();
                window.location.href = 'login.html';
            });
        }
    });
}

// 4. Session & Page Manager
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.toLowerCase();
    const isMainPage = path.endsWith('index.html') || path.endsWith('/') || path === '';
    const isRegisterPage = path.endsWith('register.html');
    const isLanderPage = path.endsWith('lander.html');

    const { data: { session } } = await supabase.auth.getSession();

    // Protect Lander page
    if (isLanderPage) {
        if (!session) {
            window.location.href = 'authen/login.html';
        } else {
            console.log('User session active:', session.user.email);
        }
    }

    // On landing page, if user is already logged in, maybe show a "Go to Hub" button instead of redirect?
    // For now, I'll just leave it as is so the landing page is public.

    // Auto-resume Step 2 on Register page if user is logged in but profile is missing
    if (isRegisterPage && session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

        if (!profile) {
            step1.classList.add('d-none');
            step2.classList.remove('d-none'); // show profile form
            document.getElementById('profile-email').value = session.user.email;
            window.currentUserID = session.user.id;
            displayMessage('Session active. Please complete your registration profile.');
        }
    }
});

export { supabase };
