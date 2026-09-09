window.USE_FIREBASE = true;

const firebaseConfig = {
  apiKey: "AIzaSyDSUhzjJMKcvzq5Oyuf1vh9Bs0rGFvT68c",
  authDomain: "bridgestep-mentorship-website.firebaseapp.com",
  projectId: "bridgestep-mentorship-website",
  storageBucket: "bridgestep-mentorship-website.firebasestorage.app",
  messagingSenderId: "71500992177",
  appId: "1:71500992177:web:46290fa57f129b1331dc90",
  measurementId: "G-RB3XTCDQPS"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Ensure Auth persistence is set to LOCAL so reloads keep you logged in
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Helper promise to wait for Firebase Auth state to resolve
window.firebaseAuthReady = new Promise((resolve) => {
  const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log("Firebase Auth Active:", user.uid);
    } else {
      console.warn("No active Firebase Auth user detected.");
    }
    unsubscribe();
    resolve(user);
  });
});
