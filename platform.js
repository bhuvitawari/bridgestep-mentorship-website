/* ============================================================
   BridgeStep Platform — core logic
   Runs in DEMO MODE out of the box (all data in this browser's
   localStorage — no account or setup needed to try it).
   The moment real keys are added to firebase-config.js, the
   auth calls below switch to real Firebase Authentication
   automatically. See README-PLATFORM.md.
   ============================================================ */

const DB_KEYS = ['users','sessions','resources','messages','notifications','announcements','programs'];

const db = firebase.firestore();

const DB = {
  async read(collectionName) {
    try {
      const snapshot = await db.collection(collectionName).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error reading collection:", e);
      return [];
    }
  },
  async write(collectionName, dataArray) {
    try {
      const batch = db.batch();
      dataArray.forEach(item => {
        const ref = db.collection(collectionName).doc(item.id);
        batch.set(ref, item, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error writing collection:", e);
    }
  }
};

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function fmtTime(iso){ const d=new Date(iso); return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

/* ---------------- Seed demo data (only runs once) ---------------- */
/* ---------------- Seed demo data (only runs once) ---------------- */
async function seedIfEmpty(){
  if(!window.USE_FIREBASE) return;
  const db = firebase.firestore();
  
  // Check if users collection already has data
  const snapshot = await db.collection('users').get();
  if(!snapshot.empty) return;

  console.log("Seeding initial database content...");

  // Seed default programs
  const programs = ['English Conversation','STEM Exploration','Research Skills','College Applications','Leadership','General Life Advice'];
  for(const p of programs){
    await db.collection('programs').add({ name: p });
  }

  // Seed default announcements
  await db.collection('announcements').add({
    text: 'Welcome to the new BridgeStep platform! Explore your dashboard and let us know what you think.',
    audience: 'all',
    date: nowISO()
  });

  // Seed sample resources
  const resources = [
    { title:'College Essay Starter Guide', type:'PDF', url:'#', uploadedBy:'admin', program:'College Applications' },
    { title:'STEM Study Habits Slides', type:'Slides', url:'#', uploadedBy:'admin', program:'STEM Exploration' },
    { title:'English Conversation Starters', type:'Worksheet', url:'#', uploadedBy:'admin', program:'English Conversation' }
  ];
  for(const r of resources){
    await db.collection('resources').add(r);
  }
}

/* ---------------- Auth ---------------- */
const Auth = {
  current(){ try{ return JSON.parse(sessionStorage.getItem('bs_current_user')); }catch(e){ return null; } },
  setCurrent(user){ sessionStorage.setItem('bs_current_user', JSON.stringify(user)); },
  logout(){ sessionStorage.removeItem('bs_current_user'); window.location.href='login.html'; },

  login(email, password){
    if(window.USE_FIREBASE){
      // Real Firebase path — activates automatically once firebase-config.js has real keys.
      return firebase.auth().signInWithEmailAndPassword(email, password)
        .then(cred => this._loadProfileAfterFirebaseAuth(cred.user));
    }
    const users = DB.read('users');
    const u = users.find(x => x.email.toLowerCase()===email.toLowerCase() && x.password===password);
    if(!u) return Promise.reject(new Error('Incorrect email or password.'));
    this.setCurrent(u);
    return Promise.resolve(u);
  },

  signup(data){
    if(window.USE_FIREBASE){
      return firebase.auth().createUserWithEmailAndPassword(data.email, data.password)
        .then(cred => {
          cred.user.sendEmailVerification();
          return this._createProfile(cred.user.uid, data);
        });
    }
    const users = DB.read('users');
    if(users.some(x=>x.email.toLowerCase()===data.email.toLowerCase())){
      return Promise.reject(new Error('An account with this email already exists.'));
    }
    const newUser = {
      id: uid(data.role),
      name: data.name, email: data.email, password: data.password, role: data.role,
      status: data.role==='admin' ? 'approved' : 'pending',
      mentorId: null, studentIds: data.role==='mentor' ? [] : undefined,
      goals: data.role==='student' ? [] : undefined,
      hoursTotal: 0, joinDate: nowISO(),
    };
    users.push(newUser); DB.write('users', users);
    if(newUser.status==='pending'){
      const admins = users.filter(u=>u.role==='admin');
      const notifs = DB.read('notifications');
      admins.forEach(a=>notifs.push({id:uid('n'), userId:a.id, text:`New ${data.role} application pending approval: ${data.name}.`, read:false, ts:nowISO()}));
      DB.write('notifications', notifs);
    }
    this.setCurrent(newUser);
    return Promise.resolve(newUser);
  },

  resetPassword(email){
    if(window.USE_FIREBASE){
      return firebase.auth().sendPasswordResetEmail(email);
    }
    const users = DB.read('users');
    const exists = users.some(u=>u.email.toLowerCase()===email.toLowerCase());
    return exists ? Promise.resolve() : Promise.reject(new Error('No account found with that email.'));
  },

  requireAuth(allowedRoles){
    const u = this.current();
    if(!u){ window.location.href='login.html'; return null; }
    if(allowedRoles && !allowedRoles.includes(u.role)){
      window.location.href = u.role + '.html';
      return null;
    }
    // keep in sync with latest stored data (e.g. after admin edits)
    const fresh = DB.read('users').find(x=>x.id===u.id);
    if(fresh){ this.setCurrent(fresh); return fresh; }
    return u;
  }
};

/* ---------------- Notifications ---------------- */
const Notif = {
  forUser(userId){ return DB.read('notifications').filter(n=>n.userId===userId).sort((a,b)=>new Date(b.ts)-new Date(a.ts)); },
  unreadCount(userId){ return this.forUser(userId).filter(n=>!n.read).length; },
  markAllRead(userId){
    const all = DB.read('notifications').map(n=> n.userId===userId ? {...n, read:true} : n);
    DB.write('notifications', all);
  },
  add(userId, text){
    const all = DB.read('notifications');
    all.push({id:uid('n'), userId, text, read:false, ts:nowISO()});
    DB.write('notifications', all);
  }
};

/* ---------------- Sidebar / topbar chrome ---------------- */
const NAV = {
  student: [
    {href:'student.html', icon:'🏠', label:'Dashboard'},
    {href:'resources.html', icon:'📚', label:'Resources'},
    {href:'session.html', icon:'🎥', label:'Join Session'},
  ],
  mentor: [
    {href:'mentor.html', icon:'🏠', label:'Dashboard'},
    {href:'resources.html', icon:'📚', label:'Resources'},
    {href:'session.html', icon:'🎥', label:'Start Session'},
  ],
  admin: [
    {href:'admin.html', icon:'🏠', label:'Dashboard'},
    {href:'resources.html', icon:'📚', label:'Resources'},
  ],
};

function renderChrome(user, activeHref){
  const nav = NAV[user.role] || [];
  const navHtml = nav.map(item => `<a href="${item.href}" class="${item.href===activeHref?'active':''}">${item.icon} ${item.label}</a>`).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">🌉 BridgeStep</div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-foot">
      <div class="role-tag">${user.role}</div>
      <button onclick="Auth.logout()">Log out</button>
    </div>`;

  const unread = Notif.unreadCount(user.id);
  document.getElementById('topbar-right').innerHTML = `
    <div class="bell" id="bellBtn">🔔${unread>0?'<span class="dot"></span>':''}</div>
    <div class="avatar" title="${user.name}">${initials(user.name)}</div>
    <div id="notifPanel" class="notif-panel"></div>`;

  document.getElementById('bellBtn').addEventListener('click', ()=>{
    const panel = document.getElementById('notifPanel');
    const items = Notif.forUser(user.id);
    panel.innerHTML = items.length ? items.map(n=>`<div class="notif-item">${n.text}<div class="time">${fmtDate(n.ts)} · ${fmtTime(n.ts)}</div></div>`).join('')
      : `<div class="notif-item">No notifications yet.</div>`;
    panel.classList.toggle('show');
    Notif.markAllRead(user.id);
    setTimeout(()=>{ const dot=document.querySelector('.bell .dot'); if(dot) dot.remove(); }, 400);
  });
}

/* Init demo data as soon as this script loads anywhere in the app */
seedIfEmpty();
