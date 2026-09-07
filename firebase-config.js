/* ============================================================
   Fill this in with your real Firebase project's config once
   you've created one (see README-PLATFORM.md, Part 2).
   Until you do, apiKey stays empty and the whole platform runs
   in DEMO MODE automatically — real accounts, sessions, hours
   etc. are simulated in this browser's storage so you can test
   and demo the product today.
   ============================================================ */

const firebaseConfig = {
  apiKey: "",              // <-- paste from Firebase Console > Project settings
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Do not edit below this line.
window.USE_FIREBASE = !!firebaseConfig.apiKey;
if(window.USE_FIREBASE){
  firebase.initializeApp(firebaseConfig);
}
