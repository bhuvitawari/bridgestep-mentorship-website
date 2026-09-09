/* ============================================================
   Fill this in with your real Firebase project's config once
   you've created one (see README-PLATFORM.md, Part 2).
   Until you do, apiKey stays empty and the whole platform runs
   in DEMO MODE automatically — real accounts, sessions, hours
   etc. are simulated in this browser's storage so you can test
   and demo the product today.
   ============================================================ */

window.USE_FIREBASE = true;

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Keep Firebase auth state synced with your browser session
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Firebase Auth Active:", user.uid);
  } else {
    console.warn("No active Firebase Auth user detected.");
  }
});
