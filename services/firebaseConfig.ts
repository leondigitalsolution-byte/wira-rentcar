
// @ts-ignore
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  setLogLevel
} from "firebase/firestore";
// @ts-ignore
import { getAnalytics } from "firebase/analytics";

// Configuration from Environment Variables (Vite standard)
// Casting import.meta to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

let db: any = null;
let analytics: any = null;
let app: any = null;

try {
    // Suppress minor clock skew warnings
    setLogLevel('error');

    // Initialize Firebase (Singleton pattern to prevent HMR errors)
    if (!getApps().length) {
        // Only initialize if config is present (prevents crash during build if env vars missing)
        if (firebaseConfig.apiKey) {
            app = initializeApp(firebaseConfig);
        }
    } else {
        app = getApp();
    }
    
    // Initialize Firestore
    if (app) {
        try {
            // Attempt to initialize with offline persistence
            // Note: This will throw if Firestore is already initialized (e.g. during fast refresh)
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager(),
                    cacheSizeBytes: CACHE_SIZE_UNLIMITED
                })
            });
            console.log("[Firebase] Persistence enabled.");
        } catch (e: any) {
            // If already initialized or persistence fails, fallback to existing instance
            if (e.code === 'failed-precondition' || e.message?.includes('already been initialized')) {
                 db = getFirestore(app);
            } else {
                console.warn("[Firebase] Persistence initialization failed. Falling back to standard.", e);
                try {
                    db = getFirestore(app);
                } catch (innerError) {
                    console.error("[Firebase] Fatal: Could not get Firestore instance.", innerError);
                }
            }
        }

        // @ts-ignore
        try {
            analytics = getAnalytics(app);
        } catch (e) {
            console.log("[Firebase] Analytics skipped.");
        }
        
        console.log("[Firebase] Initialized successfully.");
    } else {
        console.warn("[Firebase] API Keys missing. Running in offline/demo mode.");
    }
} catch (error) {
    console.error("[Firebase] Critical Initialization error:", error);
}

export { db, analytics };
