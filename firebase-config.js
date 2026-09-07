/* ============================================================
   Fill this in with your real Firebase project's config once
   you've created one (see README-PLATFORM.md, Part 2).
   Until you do, apiKey stays empty and the whole platform runs
   in DEMO MODE automatically — real accounts, sessions, hours
   etc. are simulated in this browser's storage so you can test
   and demo the product today.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDSUhzjJMKcvzq5Oyuf1vh9Bs0rGFvT68c",
  authDomain: "bridgestep-mentorship-website.firebaseapp.com",
  projectId: "bridgestep-mentorship-website",
  storageBucket: "bridgestep-mentorship-website.firebasestorage.app",
  messagingSenderId: "71500992177",
  appId: "1:71500992177:web:46290fa57f129b1331dc90",
  measurementId: "G-RB3XTCDQPS"
};

// Do not edit below this line.
window.USE_FIREBASE = !!firebaseConfig.apiKey;
if(window.USE_FIREBASE){
  firebase.initializeApp(firebaseConfig);
}
