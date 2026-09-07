/* ============================================================
   BridgeStep Platform — core logic
   Runs in DEMO MODE out of the box (all data in this browser's
   localStorage — no account or setup needed to try it).
   The moment real keys are added to firebase-config.js, the
   auth calls below switch to real Firebase Authentication
   automatically. See README-PLATFORM.md.
   ============================================================ */

const DB_KEYS = ['users','sessions','resources','messages','notifications','announcements','programs'];

const DB = {
  read(key){ try{ return JSON.parse(localStorage.getItem('bs_'+key)) || []; }catch(e){ return []; } },
  write(key, val){ localStorage.setItem('bs_'+key, JSON.stringify(val)); },
};

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function fmtTime(iso){ const d=new Date(iso); return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

/* ---------------- Seed demo data (only runs once) ---------------- */
function seedIfEmpty(){
  if(DB.read('users').length) return;

  const users = [
    {id:'admin_1', name:'Bhuvi (Admin)', email:'admin@bridgestep.org', password:'admin123', role:'admin', status:'approved', joinDate:nowISO()},
    {id:'mentor_1', name:'Layla Haddad', email:'layla.mentor@bridgestep.org', password:'mentor123', role:'mentor', status:'approved', bio:'CS student, mentors in STEM & College Apps.', studentIds:['student_1','student_2'], hoursTotal:18, joinDate:nowISO()},
    {id:'mentor_2', name:'Omar Fakih', email:'omar.mentor@bridgestep.org', password:'mentor123', role:'mentor', status:'approved', bio:'Mentors in English & Leadership.', studentIds:['student_3'], hoursTotal:9, joinDate:nowISO()},
    {id:'student_1', name:'Sara Youssef', email:'sara.student@bridgestep.org', password:'student123', role:'student', status:'approved', mentorId:'mentor_1', goals:['Improve research writing','Prep for college essays'], hoursTotal:6, joinDate:nowISO()},
    {id:'student_2', name:'Karim Aziz', email:'karim.student@bridgestep.org', password:'student123', role:'student', status:'approved', mentorId:'mentor_1', goals:['STEM fundamentals'], hoursTotal:4, joinDate:nowISO()},
    {id:'student_3', name:'Nour Saleh', email:'nour.student@bridgestep.org', password:'student123', role:'student', status:'pending', mentorId:null, goals:['English conversation practice'], hoursTotal:0, joinDate:nowISO()},
  ];
  DB.write('users', users);

  const t = Date.now();
  const day = 86400000;
  const sessions = [
    {id:uid('sess'), studentId:'student_1', mentorId:'mentor_1', start:new Date(t+2*day).toISOString(), status:'upcoming', durationMinutes:60, notes:null, attendance:{}},
    {id:uid('sess'), studentId:'student_2', mentorId:'mentor_1', start:new Date(t+3*day).toISOString(), status:'upcoming', durationMinutes:60, notes:null, attendance:{}},
    {id:uid('sess'), studentId:'student_1', mentorId:'mentor_1', start:new Date(t-3*day).toISOString(), status:'completed', durationMinutes:55, notes:{summary:'Reviewed college essay draft #1.', homework:'Revise intro paragraph.', nextGoals:'Tackle essay #2.', feedback:'Great engagement today.'}, attendance:{student:true,mentor:true}},
    {id:uid('sess'), studentId:'student_2', mentorId:'mentor_1', start:new Date(t-6*day).toISOString(), status:'completed', durationMinutes:50, notes:{summary:'Algebra fundamentals.', homework:'Practice set 3.', nextGoals:'Move to geometry.', feedback:'Solid progress.'}, attendance:{student:true,mentor:true}},
  ];
  DB.write('sessions', sessions);

  const resources = [
    {id:uid('res'), title:'College Essay Starter Guide', type:'PDF', url:'#', uploadedBy:'mentor_1', program:'College Applications'},
    {id:uid('res'), title:'STEM Study Habits Slides', type:'Slides', url:'#', uploadedBy:'mentor_1', program:'STEM Exploration'},
    {id:uid('res'), title:'English Conversation Starters', type:'Worksheet', url:'#', uploadedBy:'mentor_2', program:'English Conversation'},
  ];
  DB.write('resources', resources);

  DB.write('messages', [
    {id:uid('msg'), from:'mentor_1', to:'student_1', text:'Looking forward to our session Thursday!', ts:new Date(t-day).toISOString()},
    {id:uid('msg'), from:'student_1', to:'mentor_1', text:'Me too — I finished the homework 🎉', ts:new Date(t-day+3600000).toISOString()},
  ]);

  DB.write('notifications', [
    {id:uid('n'), userId:'student_1', text:'Upcoming session with Layla Haddad in 2 days.', read:false, ts:nowISO()},
    {id:uid('n'), userId:'student_1', text:'New resource added: College Essay Starter Guide.', read:false, ts:nowISO()},
    {id:uid('n'), userId:'mentor_1', text:'Sara Youssef completed her homework.', read:false, ts:nowISO()},
    {id:uid('n'), userId:'admin_1', text:'New student application pending approval: Nour Saleh.', read:false, ts:nowISO()},
  ]);

  DB.write('announcements', [
    {id:uid('an'), text:'Welcome to the new BridgeStep platform! Explore your dashboard and let us know what you think.', audience:'all', date:nowISO()},
  ]);

  DB.write('programs', ['English Conversation','STEM Exploration','Research Skills','College Applications','Leadership','General Life Advice']);
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
