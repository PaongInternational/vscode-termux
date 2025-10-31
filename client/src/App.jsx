import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import io from 'socket.io-client';
export default function App(){
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const termRef = useRef(null);
  const socketRef = useRef(null);
  const [loading,setLoading]=useState(true);
  const [token,setToken]=useState('');
  useEffect(()=>{
    setTimeout(()=>setLoading(false),800);
    socketRef.current = io();
    socketRef.current.on('terminal:data', d => {
      if(termRef.current) termRef.current.write(d);
      else console.log('term',d);
    });
    // init monaco
    monacoRef.current = monaco.editor.create(document.getElementById('editor'),{
      value: '// Start coding\nconsole.log(\'hello world\')',
      language: 'javascript',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    // xterm
    import('xterm').then(({Terminal})=>{
      const term = new Terminal();
      term.open(document.getElementById('terminal'));
      termRef.current = term;
      term.onData(d => socketRef.current.emit('terminal:input', d));
    });
  },[]);
  async function saveToken(){
    if(!token) return alert('token required');
    const res = await fetch('/api/token', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ token })});
    const j = await res.json();
    if(j.ok) alert('Token saved'); else alert('failed');
  }
  return (
    <div className='app'>
      {loading && <div className='loading'><img src='https://cdn.yupra.my.id/yp/qm656enk.jpg' alt='logo' style={{width:96}}/><h2>Initializing Workspace...</h2></div>}
      <aside className='sidebar'>
        <div className='brand'><img src='https://cdn.yupra.my.id/yp/qm656enk.jpg' alt='logo' style={{width:36}}/> <strong>Termux VS</strong></div>
        <hr/>
        <div><button onClick={()=>window.location='/auth/github'}>Login with GitHub</button></div>
        <div style={{marginTop:12}}>
          <input placeholder='paste PAT here' value={token} onChange={e=>setToken(e.target.value)} style={{width:'100%'}}/>
          <button onClick={saveToken}>Save Token</button>
        </div>
      </aside>
      <main className='main'>
        <div id='editor' style={{height:'60vh',border:'1px solid #ddd'}}></div>
        <div id='terminal' style={{height:180,marginTop:8}}></div>
      </main>
    </div>
  );
}
