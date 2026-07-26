const fs = require('fs');

const loginPath = 'src/app/(auth)/login/page.tsx';
let loginCode = fs.readFileSync(loginPath, 'utf8');

// 1. Add Firebase imports
if (!loginCode.includes('import { getFirebaseAuth, isFirebaseConfigured }')) {
  loginCode = loginCode.replace(
    /import \{ useSettings \} from '@\/context\/SettingsContext';/,
    import { useSettings } from '@/context/SettingsContext';\nimport { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';\nimport { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
  );
}

// 2. Add Firebase state
if (!loginCode.includes('const [recaptchaVerifier')) {
  loginCode = loginCode.replace(
    /const \[isPhoneDetected, setIsPhoneDetected\] = useState\(false\);/,
    const [isPhoneDetected, setIsPhoneDetected] = useState(false);\n  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);\n  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  );
}

// 3. Add Firebase useEffect
if (!loginCode.includes('useEffect(() => {\\n    if (isFirebaseConfigured) {')) {
  loginCode = loginCode.replace(
    /const countryDropdownRef = useRef<HTMLDivElement>\(null\);/,
    const countryDropdownRef = useRef<HTMLDivElement>(null);\n\n  useEffect(() => {\n    if (isFirebaseConfigured) {\n      try {\n        const auth = getFirebaseAuth();\n        if (auth) {\n          const container = document.getElementById('recaptcha-container');\n          if (container) container.innerHTML = '';\n          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {\n            size: 'invisible',\n            callback: () => {},\n          });\n          setRecaptchaVerifier(verifier);\n        }\n      } catch (err) {\n        console.error('Failed to init recaptcha', err);\n      }\n    }\n  }, []);
  );
}

// 4. Update handleIdentifierSubmit for Phone to use Firebase
loginCode = loginCode.replace(
  /if \(type === 'phone'\) \{[\s\S]*?\} else \{/g,
  if (type === 'phone') {
      setLoginMethod('otp');
      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth && recaptchaVerifier) {
          try {
            const result = await signInWithPhoneNumber(auth, finalIdentifier, recaptchaVerifier);
            setConfirmationResult(result);
            setStep('otp');
            setTimer(30);
          } catch (error: any) {
            console.error('Firebase send SMS error:', error);
            showToast('Failed to send OTP', error.message || 'OTP delivery error', 'error');
            setStep('credential');
          }
        } else {
          showToast('Error', 'Firebase Auth system is not ready', 'error');
          setStep('credential');
        }
      } else {
        // Mock flow
        setStep('otp');
        setTimer(30);
      }
    } else {
);

// 5. Update handleCredentialSubmit for Phone to use Firebase (if password bypass was used, now user can go to OTP view)
loginCode = loginCode.replace(
  /if \(identifierType === 'email'\) \{\s*const res = await signInWithEmail\(email\);[\s\S]*?\} else \{\s*const res = await signInWithOtp\(phone\);[\s\S]*?\}/,
  if (identifierType === 'email') {
        const res = await signInWithEmail(email);
        if (res.error) {
          showToast('Failed to send OTP', res.error.message || 'Something went wrong', 'error');
        } else {
          setStep('otp');
          setTimer(30);
        }
      } else {
        if (isFirebaseConfigured) {
          const auth = getFirebaseAuth();
          if (auth && recaptchaVerifier) {
            try {
              const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
              setConfirmationResult(result);
              setStep('otp');
              setTimer(30);
            } catch (error: any) {
              console.error('Firebase send SMS error:', error);
              showToast('Failed to send OTP', error.message || 'OTP delivery error', 'error');
            }
          } else {
            showToast('Error', 'Firebase Auth system is not ready', 'error');
          }
        } else {
          setStep('otp');
          setTimer(30);
        }
      }
);

// 6. Update handleOtpSubmit to verify Firebase OTP
loginCode = loginCode.replace(
  /let error;[\s\S]*?if \(identifierType === 'email'\) \{[\s\S]*?error = res\.error;[\s\S]*?\} else \{[\s\S]*?error = res\.error;[\s\S]*?\}[\s\S]*?if \(error\) \{[\s\S]*?\} else \{[\s\S]*?finishLogin/g,
  let verifySuccess = false;

    if (identifierType === 'email') {
      const res = await verifyEmailOtp(email, activeOtp);
      if (!res.error) {
        verifySuccess = true;
      } else {
        showToast('Failed', res.error.message || 'Incorrect OTP code', 'error');
      }
    } else if (isFirebaseConfigured && confirmationResult) {
      try {
        await confirmationResult.confirm(activeOtp);
        verifySuccess = true;
      } catch (error: any) {
        showToast('Failed', error.message || 'Incorrect OTP code', 'error');
      }
    } else if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true') {
      if (activeOtp === '123456') {
        verifySuccess = true;
      } else {
        showToast('Failed', 'Incorrect simulated OTP. Use 123456.', 'error');
      }
    } else {
      showToast('Error', 'Phone verification service is not configured. Please contact support.', 'error');
    }

    if (verifySuccess) {
      if (identifierType === 'phone') {
        try {
          const res = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: phone.startsWith('+') ? phone : \+91\\,
            }),
          });
          if (res.ok) {
            await finishLogin();
          } else {
            const errData = await res.json();
            showToast('Failed to start session', errData.message || 'Database sync error', 'error');
          }
        } catch (err) {
          console.error('Failed to auth session in postgres:', err);
          showToast('Error', 'Verification session sync failed', 'error');
        }
      } else {
        await finishLogin();
      }
    }
    
    // finishLogin
);

// 7. Resend OTP handler for phone
loginCode = loginCode.replace(
  /const handleResendOtp = async \(\) => \{[\s\S]*?setTimer\(30\);[\s\S]*?\};/g,
  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    if (identifierType === 'email') {
      const res = await signInWithEmail(email);
      if (!res.error) setTimer(30);
    } else {
      const formattedPhone = phone.startsWith('+') ? phone : \+91\\;
      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth && recaptchaVerifier) {
          try {
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
            setConfirmationResult(result);
            setTimer(30);
          } catch (error: any) {
            showToast('Failed to resend OTP', error.message || 'Telephony error', 'error');
          }
        }
      } else {
        setTimer(30);
      }
    }
    setLoading(false);
  };
);

// 8. Add invisible recaptcha div
if (!loginCode.includes('id="recaptcha-container"')) {
  loginCode = loginCode.replace(
    /<div className=\{styles\.layoutLeft\}>/,
    <div id="recaptcha-container" style={{ display: 'none' }} />\n      <div className={styles.layoutLeft}>
  );
}

// 9. Add "Login with Password instead" to OTP view in login/page.tsx
if (!loginCode.includes('Login with Password instead')) {
  loginCode = loginCode.replace(
    /className=\{styles\.resendButton\}[\s\S]*?>[\s\S]*?Resend OTP[\s\S]*?<\/button>[\s\S]*?<\/div>/,
    className={styles.resendButton}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
                <div style={{ marginTop: 12, textAlign: 'center', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setStep('credential');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Login with Password instead
                  </button>
                </div>
              </div>
  );
}

fs.writeFileSync(loginPath, loginCode);


// ── AuthModal.tsx modifications ──
const modalPath = 'src/components/auth/AuthModal.tsx';
let modalCode = fs.readFileSync(modalPath, 'utf8');

if (!modalCode.includes('Login with Password instead')) {
  modalCode = modalCode.replace(
    /className=\{styles\.resendTextBtn\}[\s\S]*?>[\s\S]*?Resend OTP[\s\S]*?<\/button>[\s\S]*?\)}[\s\S]*?<\/div>/,
    className={styles.resendTextBtn}
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
              <div style={{ marginTop: 12, textAlign: 'center', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setView('credential');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Login with Password instead
                </button>
              </div>
            </div>
  );
  fs.writeFileSync(modalPath, modalCode);
}