const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketio = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
require('dotenv').config();
const upload = multer({ dest: 'uploads/' });
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PLUGINS_DIR = path.join(__dirname, 'plugins');
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
app.use(bodyParser.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'dev', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((u,done)=>done(null,u));
passport.deserializeUser((obj,done)=>done(null,obj));
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback';
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: CALLBACK_URL
  }, (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
    return done(null, profile);
  }));
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));
  app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }), (req,res)=> res.redirect('/?auth=ok'));
} else {
  console.warn('GITHUB_CLIENT_ID/SECRET not set — OAuth disabled. Use PAT or set env vars.');
  app.get('/auth/github', (req,res)=> res.redirect('/?auth=disabled'));
  app.get('/auth/github/callback', (req,res)=> res.redirect('/?auth=disabled'));
}
// token injection endpoint
app.post('/api/token', (req,res)=>{
  const token = req.body && req.body.token;
  if(!token) return res.status(400).json({ error: 'token required' });
  const envPath = path.join(__dirname,'.env');
  let env = {};
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath,'utf8').split(/\r?\n/).forEach(line=>{ if(!line) return; const i=line.indexOf('='); if(i>0) env[line.substring(0,i)]=line.substring(i+1); });
  }
  env.GITHUB_TOKEN = token;
  const content = Object.keys(env).map(k=>`${k}=${env[k]}`).join('\n');
  fs.writeFileSync(envPath, content, {encoding:'utf8'});
  return res.json({ ok:true });
});
// upload endpoint
app.post('/api/upload', upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).json({ error: 'no file' });
  return res.json({ ok:true, filename: req.file.originalname });
});
app.get('/api/plugins', (req,res)=>{
  const items = fs.readdirSync(PLUGINS_DIR, { withFileTypes:true }).filter(d=>d.isDirectory()).map(d=>({name:d.name}));
  res.json(items);
});
app.use(express.static(path.join(__dirname,'..','client','dist')));
// try to init node-pty
let pty;
try {
  pty = require('node-pty');
} catch(e) {
  console.warn('node-pty not available; terminal will fallback to echo mode.');
}
io.on('connection', socket=>{
  if(pty){
    const shell = process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : 'sh');
    const term = pty.spawn(shell, [], { name: 'xterm-color', cols: 80, rows: 24, cwd: process.cwd(), env: process.env });
    term.on('data', data=> socket.emit('terminal:data', data));
    socket.on('terminal:input', d=> term.write(d));
    socket.on('terminal:resize', ({cols,rows})=> term.resize(cols,rows));
    socket.on('disconnect', ()=> { try{ term.kill(); }catch(e){} });
  } else {
    socket.on('terminal:input', data => {
      socket.emit('terminal:data', '\r\n'+'Echo: '+data);
    });
  }
});
// SPA fallback
app.get('*', (req,res)=>{
  const index = path.join(__dirname,'..','client','dist','index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.send('<h3>Client not built. Run npm install && npm run build in client/</h3>');
});
const port = process.env.PORT || 4000;
server.listen(port, ()=> console.log('Server listening on', port));
