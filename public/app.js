(() => {
  const socket = io();
  const el = id => document.getElementById(id);
  let mode = null, myId = null, current = null, submitted = false, myFeedback = null;
  const alphabet = ['A','B','C','D'];
  const node = (tag, className, content) => { const x = document.createElement(tag); if(className)x.className=className; if(content!==undefined)x.textContent=content; return x; };
  function showToast(message) { const t=el('toast'); t.textContent=message;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3800); }
  function attach(parent, ...children) { children.forEach(c => parent.appendChild(c)); return parent; }
  function setScene(...children) { const root=el('scene'); root.replaceChildren(...children); }
  function action(label, event, extra='primary') { const b=node('button',extra,label); b.addEventListener('click',()=>socket.emit(event)); return b; }
  function setActions(...buttons) { el('controls').replaceChildren(attach(node('div','actions'),...buttons)); }
  function enterGame() { el('entry').classList.add('hidden');el('game').classList.remove('hidden'); }
  function newText(tag,css,text) { return node(tag,css,text); }
  function lobby(state) {
    const code = newText('div','joincode',state.code);
    const url = `${location.origin}/?room=${encodeURIComponent(state.code)}`;
    if (mode === 'host') {
      const desc=newText('p','lead','Share this code or join link with your class. Project this screen to show the live leaderboard.');
      const link = newText('div','joinurl',url);
      setScene(newText('div','label-small','LOBBY OPEN // WAITING FOR ARTISTS'),newText('h2','', 'YOUR STUDIO IS READY.'),code,desc,link);
      const start=action('START THE GAME →','host:start');start.disabled=state.playerCount<1;
      const copy=node('button','secondary','COPY JOIN LINK'); copy.onclick=()=>navigator.clipboard?.writeText(url).then(()=>showToast('Join link copied!')).catch(()=>showToast('Copy the room code instead.'));
      setActions(start,copy);
    } else {
      setScene(newText('div','label-small','CONNECTED // PLAYER READY'),newText('h2','','YOU’RE IN THE STUDIO.'),code,newText('p','lead','Your host will start the first question. Get ready to think like an artist.'));
      setActions();
    }
  }
  function question(state) {
    const prompt=newText('h2','',state.question.prompt);
    const choices=node('div','answergrid');
    state.question.answers.forEach((answer,i)=>{
      const btn=node('button','answer'+(submitted && myFeedback?.choice===i?' selected':''));
      btn.disabled = mode === 'host' || submitted;
      attach(btn,newText('strong','',alphabet[i]+'.'),newText('span','',answer));
      btn.addEventListener('click',()=>{
        if(submitted)return;
        submitted=true;myFeedback={choice:i}; socket.emit('player:answer',{answer:i});
        choices.querySelectorAll('button').forEach((b,j)=>{b.disabled=true;if(j===i)b.classList.add('selected');});
        const msg=newText('p','smallnote','ANSWER LOCKED IN // Waiting for reveal');
        el('scene').appendChild(msg);
      }); choices.appendChild(btn);
    });
    const intro=mode==='host'?'Question is live! Watch the responses come in.':'Choose your answer. Correct + fast = more points!';
    setScene(newText('div','label-small','QUICK THINKING // LEVEL '+String(state.questionIndex+1).padStart(2,'0')),prompt,newText('p','smallnote',intro),choices);
    if(mode==='host')setActions(action('REVEAL ANSWER EARLY →','host:reveal','secondary')); else setActions();
  }
  function reveal(state) {
    const q=state.question, rev=state.reveal;
    const choices=node('div','answergrid');
    q.answers.forEach((answer,i)=>{
      const correct=i===rev.correct;
      const btn=node('button','answer '+(correct?'correct':myFeedback?.choice===i?'wrong':''));btn.disabled=true;
      attach(btn,newText('strong','',alphabet[i]+'.'),newText('span','',answer+(correct?' ✓':'')));
      choices.appendChild(btn);
    });
    const explanation=newText('div','feedback',rev.note);
    const subtitle=mode==='host'?'The class can see the answer and current standings.':myFeedback ? (myFeedback.correct?'NICE WORK! +'+myFeedback.points+' POINTS':'GOOD TRY! KEEP EXPLORING.'):'Time is up — here’s the answer.';
    setScene(newText('div','label-small','ANSWER REVEALED'),newText('h2','',q.prompt),newText('p','lead',subtitle),choices,explanation);
    if(mode==='host')setActions(action(state.questionIndex===state.totalQuestions-1?'UNLOCK THE DRAWING →':'NEXT QUESTION →','host:next'));else setActions();
  }
  function finale(state) {
    const winner=state.leaderboard[0];
    const congratulations=mode==='host'?(winner?`TOP ARTIST: ${winner.name} · ${winner.score} PTS`:'GREAT WORK, ARTISTS!'):'You made it through all six questions!';
    setScene(attach(node('div','unlock'),newText('div','confetti','✦ ✳ ✦'),newText('div','giant','🔓'),newText('div','label-small','ACHIEVEMENT UNLOCKED'),newText('h2','','FRAGMENTED VALUE DRAWING'),newText('p','lead',congratulations),newText('div','steps','01 DRAW A CONTOUR  /  02 DIVIDE WITH A RULER  /  03 EXPLORE FIVE VALUES'),newText('p','', 'Your handouts are ready. Grab your pencil and ruler — now we make art.')));
    if(mode==='host')setActions(action('PLAY ANOTHER ROUND ↻','host:restart','secondary'));else setActions();
  }
  function renderBoard(state) {
    el('playerCount').textContent=state.playerCount+' PLAYER'+(state.playerCount===1?'':'S');
    const box=el('boardEntries');box.replaceChildren();
    if(!state.leaderboard.length) { box.appendChild(newText('div','empty','NO ARTISTS YET...'));return; }
    state.leaderboard.slice(0,12).forEach(p=>{
      const row=node('div','boardrow'+(p.id===myId?' me':''));
      attach(row,newText('span','rank',String(p.rank).padStart(2,'0')),newText('span','name',p.name+(state.stage==='question'&&p.answered?' ✓':'')),newText('span','points',p.score+' XP'));
      box.appendChild(row);
    });
  }
  function render(state) {
    const previous=current;
    current=state;
    if(previous?.questionIndex !== state.questionIndex || previous?.stage==='lobby' || (previous?.stage==='finale' && state.stage==='lobby')) { submitted=false;myFeedback=null; }
    // Avoid rebuilding the answers while a question is in progress; preserve the player's selected option.
    const sameQuestion=previous?.stage==='question' && state.stage==='question' && previous?.questionIndex===state.questionIndex;
    el('stageTag').textContent=({lobby:'LOBBY',question:'QUESTION LIVE',reveal:'ANSWER REVEALED',finale:'LEVEL COMPLETE'})[state.stage];
    el('progressLabel').textContent=state.stage==='lobby'?'WAITING FOR PLAYERS':state.stage==='finale'?'ALL SIX COMPLETE':`${state.questionIndex+1} / ${state.totalQuestions} · ${state.answeredCount}/${state.playerCount} ANSWERED`;
    el('progressFill').style.width=(state.stage==='finale'?100:state.stage==='lobby'?0:(state.questionIndex+1)/state.totalQuestions*100)+'%';
    renderBoard(state);
    if(!sameQuestion){ if(state.stage==='lobby')lobby(state);else if(state.stage==='question')question(state);else if(state.stage==='reveal')reveal(state);else if(state.stage==='finale')finale(state); }
    tick();
  }
  function tick() { if(current?.stage==='question'&&current.deadline){const secs=Math.max(0,Math.ceil((current.deadline-Date.now())/1000));el('clock').textContent=secs+'s';}else el('clock').textContent='--'; }
  setInterval(tick,200);
  el('hostBtn').addEventListener('click',()=>{mode='host';socket.emit('host:create');});
  el('joinBtn').addEventListener('click',()=>{
    const code=el('roomCode').value.trim(),name=el('playerName').value.trim();
    if(!code||!name)return showToast('Enter the room code and a name.');
    mode='player';socket.emit('player:join',{code,name});
  });
  for(const id of ['roomCode','playerName']) el(id).addEventListener('keydown',e=>{if(e.key==='Enter')el('joinBtn').click();});
  const code=new URLSearchParams(location.search).get('room');if(code)el('roomCode').value=code.toUpperCase();
  socket.on('connect',()=>el('connection').textContent='● ONLINE');
  socket.on('disconnect',()=>{el('connection').textContent='● DISCONNECTED';showToast('Connection lost. Refresh to rejoin.');});
  socket.on('host:created',()=>enterGame());
  socket.on('player:joined',p=>{myId=p.id;enterGame();});
  socket.on('room:state',render);
  socket.on('player:feedback',feedback=>{myFeedback={...myFeedback,...feedback};if(!feedback.correct)showToast('Good try! Keep going.');});
  socket.on('game:error',showToast);
  socket.on('room:closed',()=>{showToast('The host has closed this room.');setTimeout(()=>location.href='/',2000);});
})();
