/* ============================================================
   BridgeStep Platform — core logic
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
  },

  async addResource(resourceObj) {
    if (window.USE_FIREBASE) {
      const ref = await firebase.firestore().collection('resources').add(resourceObj);
      return ref.id;
    }
    const resources = await this.read('resources');
    resources.push(resourceObj);
    await this.write('resources', resources);
  },

  async getMessages(userAId, userBId) {
    if (!window.USE_FIREBASE) return [];
    try {
      const snapshot = await firebase.firestore().collection('messages').get();
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return all.filter(m => 
        (m.fromId === userAId && m.toId === userBId) || 
        (m.fromId === userBId && m.toId === userAId)
      ).sort((a, b) => new Date(a.ts) - new Date(b.ts));
    } catch (e) {
      console.error("Error reading messages:", e);
      return [];
    }
  },

  async sendMessage(fromId, toId, text) {
    const msgObj = {
      id: uid('msg'),
      fromId: fromId,
      toId: toId,
      text: text,
      ts: nowISO()
    };
    if (window.USE_FIREBASE) {
      await firebase.firestore().collection('messages').doc(msgObj.id).set(msgObj);
    }
    return msgObj;
  }
};

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function fmtTime(iso){ const d=new Date(iso); return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

/* ---------------- Seed demo data (only runs once) ---------------- */
async function seedIfEmpty(){
  if(!window.USE_FIREBASE) return;
  
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

  async _createProfile(uid, data) {
    const userDoc = {
      id: uid,
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'student',
      status: data.role === 'admin' ? 'approved' : 'pending',
      mentorId: null,
      hoursTotal: 0,
      joinDate: nowISO()
    };

    if (data.role === 'mentor') {
      userDoc.studentIds = [];
    }
    if (data.role === 'student') {
      userDoc.goals = [];
    }

    await firebase.firestore().collection('users').doc(uid).set(userDoc);
    this.setCurrent(userDoc);
    return userDoc;
  },

  async signup(data) {
    if (window.USE_FIREBASE) {
      const cred = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
      if (cred.user) {
        try {
          await cred.user.sendEmailVerification();
        } catch (e) {
          console.warn("Email verification could not be sent immediately:", e);
        }
        return await Auth._createProfile(cred.user.uid, data);
      }
    }
    const users = await DB.read('users');
    if (users.some(x => x.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser = {
      id: uid(data.role),
      name: data.name, email: data.email, password: data.password, role: data.role,
      status: data.role === 'admin' ? 'approved' : 'pending',
      mentorId: null,
      hoursTotal: 0, joinDate: nowISO(),
    };
    if (data.role === 'mentor') newUser.studentIds = [];
    if (data.role === 'student') newUser.goals = [];

    users.push(newUser); 
    await DB.write('users', users);
    this.setCurrent(newUser);
    return newUser;
  },

  async _loadProfileAfterFirebaseAuth(firebaseUser) {
    const doc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
    if (doc.exists) {
      const user = doc.data();
      this.setCurrent(user);
      return user;
    }
    throw new Error('User profile not found in database.');
  },

  async login(email, password){
    if(window.USE_FIREBASE){
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      return await Auth._loadProfileAfterFirebaseAuth(cred.user);
    }
    const users = await DB.read('users');
    const u = users.find(x => x.email.toLowerCase()===email.toLowerCase() && x.password===password);
    if(!u) throw new Error('Incorrect email or password.');
    this.setCurrent(u);
    return u;
  },
   
  async resetPassword(email){
    if(window.USE_FIREBASE){
      return firebase.auth().sendPasswordResetEmail(email);
    }
    const users = await DB.read('users');
    const exists = users.some(u=>u.email.toLowerCase()===email.toLowerCase());
    return exists ? Promise.resolve() : Promise.reject(new Error('No account found with that email.'));
  },

  async requireAuth(allowedRoles){
    // Wait for Firebase Auth state to resolve first
    if (window.USE_FIREBASE && window.firebaseAuthReady) {
      await window.firebaseAuthReady;
    }

    const fbUser = firebase.auth().currentUser;
    if (window.USE_FIREBASE && !fbUser) {
      window.location.href = 'login.html';
      return null;
    }

    const u = this.current();
    if (!u) { window.location.href = 'login.html'; return null; }

    // Fetch fresh profile doc from Firestore
    const users = await DB.read('users');
    const fresh = users.find(x => x.id === (fbUser ? fbUser.uid : u.id)) || u;
    this.setCurrent(fresh);

    // ENFORCE APPROVAL: Block non-admins who aren't approved
    if (fresh.role !== 'admin' && fresh.status !== 'approved') {
      document.body.innerHTML = `
        <div style="padding: 100px 20px; text-align: center; font-family: 'Inter', sans-serif;">
          <h2>Account Pending Approval</h2>
          <p style="color: #64748b; margin-bottom: 20px;">An admin must approve your BridgeStep application before you can access the platform.</p>
          <button style="padding: 8px 16px; background: #1e293b; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="Auth.logout()">Log Out</button>
        </div>`;
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(fresh.role)) {
      window.location.href = fresh.role + '.html';
      return null;
    }

    return fresh;
  }
};

/* ---------------- Notifications ---------------- */
const Notif = {
  async forUser(userId){ 
    const all = await DB.read('notifications');
    return all.filter(n => n.userId === userId).sort((a,b) => new Date(b.ts) - new Date(a.ts)); 
  },
  async unreadCount(userId){ 
    const userNotifs = await this.forUser(userId);
    return userNotifs.filter(n => !n.read).length; 
  },
  async markAllRead(userId){
    const all = await DB.read('notifications');
    const updated = all.map(n => n.userId === userId ? {...n, read:true} : n);
    await DB.write('notifications', updated);
  },
  async add(userId, text){
    const all = await DB.read('notifications');
    all.push({id:uid('n'), userId, text, read:false, ts:nowISO()});
    await DB.write('notifications', all);
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

async function renderChrome(user, activeHref){
  const nav = NAV[user.role] || [];
  const navHtml = nav.map(item => `<a href="${item.href}" class="${item.href===activeHref?'active':''}">${item.icon} ${item.label}</a>`).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">🌉 BridgeStep</div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-foot">
      <div class="role-tag">${user.role}</div>
      <button onclick="Auth.logout()">Log out</button>
    </div>`;

  const unread = await Notif.unreadCount(user.id);
  document.getElementById('topbar-right').innerHTML = `
    <div class="bell" id="bellBtn">🔔${unread>0?'<span class="dot"></span>':''}</div>
    <div class="avatar" title="${user.name}">${initials(user.name)}</div>
    <div id="notifPanel" class="notif-panel"></div>`;

  document.getElementById('bellBtn').addEventListener('click', async ()=>{
    const panel = document.getElementById('notifPanel');
    const items = await Notif.forUser(user.id);
    panel.innerHTML = items.length ? items.map(n=>`<div class="notif-item">${n.text}<div class="time">${fmtDate(n.ts)} · ${fmtTime(n.ts)}</div></div>`).join('')
      : `<div class="notif-item">No notifications yet.</div>`;
    panel.classList.toggle('show');
    await Notif.markAllRead(user.id);
    setTimeout(()=>{ const dot=document.querySelector('.bell .dot'); if(dot) dot.remove(); }, 400);
  });
}
