const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
const QUESTION_MS = 20000;
const rooms = new Map();

const questions = [
  { prompt: 'What is a contour line?', answers: ['A line describing the edges of a form', 'A line used only for shadows', 'A line that blends two colors', 'A line that must always be straight'], correct: 0, note: 'Contour lines trace an object’s visible edges and important boundaries.' },
  { prompt: 'What does VALUE mean in art?', answers: ['The price of a painting', 'How light or dark something appears', 'The size of a drawing', 'The number of colors used'], correct: 1, note: 'Value refers to lightness and darkness—not price!' },
  { prompt: 'Which pair gives you the strongest VALUE contrast?', answers: ['Light gray + white', 'Medium gray + dark gray', 'Black + white', 'Two similar medium grays'], correct: 2, note: 'Black against white gives the widest light–dark contrast.' },
  { prompt: 'Which tool is most helpful for drawing a straight grid?', answers: ['A blending stump', 'A paintbrush', 'An eraser', 'A ruler'], correct: 3, note: 'A ruler helps us draw our horizontal and vertical divisions.' },
  { prompt: 'When we divide a drawing into sections, what can we explore?', answers: ['Different values in each section', 'Only one shade everywhere', 'Erasing the entire contour', 'Avoiding all dark values'], correct: 0, note: 'Fragmenting creates sections for experimenting with different values.' },
  { prompt: 'What if your first contour drawing looks imperfect?', answers: ['You must start again', 'Keep exploring and develop the drawing', 'You cannot add any value', 'You must copy a classmate’s'], correct: 1, note: 'Your first marks are a starting point. Experimentation is part of drawing.' }
];

function generateCode() {
  let code;
  do { code = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
  return code;
}
function leaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score || a.joined - b.joined)
    .map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score, answered: p.answeredAt !== null }));
}
function publish(room) {
  const q = questions[room.index] || null;
  io.to(room.code).emit('room:state', {
    code: room.code, stage: room.stage, questionIndex: room.index,
    totalQuestions: questions.length,
    question: q ? {prompt:q.prompt,answers:q.answers} : null,
    reveal: room.stage === 'reveal' ? { correct:q.correct, note:q.note } : null,
    deadline: room.stage === 'question' ? room.deadline : null,
    leaderboard: leaderboard(room),
    playerCount: room.players.size,
    answeredCount: [...room.players.values()].filter(p => p.answeredAt !== null).length
  });
}
function clearQuestionTimer(room) { if (room.timer) clearTimeout(room.timer); room.timer = null; }
function reveal(room) {
  if (room.stage !== 'question') return;
  clearQuestionTimer(room);
  room.stage = 'reveal'; room.deadline = null;
  publish(room);
}
function beginQuestion(room, index) {
  clearQuestionTimer(room);
  room.index = index; room.stage = 'question'; room.deadline = Date.now() + QUESTION_MS;
  for (const p of room.players.values()) { p.answeredAt = null; p.lastAnswer = null; }
  room.timer = setTimeout(() => reveal(room), QUESTION_MS);
  publish(room);
}
function err(socket, message) { socket.emit('game:error', message); }
function findHosted(socket) {
  const code = socket.data.hosting;
  const room = code && rooms.get(code);
  if (!room || room.hostSocket !== socket.id) { err(socket, 'Only the host can do that.'); return null; }
  return room;
}
io.on('connection', socket => {
  socket.on('host:create', () => {
    if (socket.data.hosting || socket.data.playing) return err(socket, 'You are already in a room.');
    const code = generateCode();
    const room = { code, hostSocket:socket.id, stage:'lobby', index:-1, players:new Map(), deadline:null, timer:null, created:Date.now() };
    rooms.set(code, room); socket.data.hosting = code; socket.join(code);
    socket.emit('host:created', {code}); publish(room);
  });
  socket.on('player:join', ({code, name} = {}) => {
    code = String(code || '').trim().toUpperCase();
    name = String(name || '').trim().replace(/[<>]/g, '').slice(0, 22);
    const room = rooms.get(code);
    if (!room) return err(socket, 'That room code was not found.');
    if (!name) return err(socket, 'Enter a name or nickname to join.');
    if (socket.data.hosting || socket.data.playing) return err(socket, 'You are already in a room.');
    if (room.stage === 'finale') return err(socket, 'This round has finished. Ask the host to restart.');
    if (room.players.size >= 80) return err(socket, 'This room is full.');
    const id = crypto.randomUUID();
    room.players.set(id, {id, socketId:socket.id, name, score:0, answeredAt:null, lastAnswer:null, joined:Date.now() });
    socket.data.playing = {code, id}; socket.join(code);
    socket.emit('player:joined', {code,id,name}); publish(room);
  });
  socket.on('player:answer', ({answer} = {}) => {
    const p = socket.data.playing;
    const room = p && rooms.get(p.code);
    const player = room && room.players.get(p.id);
    if (!room || !player || room.stage !== 'question' || player.answeredAt !== null) return;
    if (!Number.isInteger(answer) || answer < 0 || answer >= questions[room.index].answers.length) return;
    if (Date.now() > room.deadline) return;
    player.answeredAt = Date.now(); player.lastAnswer = answer;
    const good = answer === questions[room.index].correct;
    const timeRemaining = Math.max(0, room.deadline - player.answeredAt);
    const points = good ? 100 + Math.floor(timeRemaining / 1000) * 5 : 0;
    player.score += points;
    socket.emit('player:feedback', {correct:good,points});
    publish(room);
    if ([...room.players.values()].every(v => v.answeredAt !== null)) reveal(room);
  });
  socket.on('host:start', () => {
    const room = findHosted(socket);
    if (room && room.stage === 'lobby' && room.players.size > 0) beginQuestion(room,0);
  });
  socket.on('host:reveal', () => { const room=findHosted(socket); if(room) reveal(room); });
  socket.on('host:next', () => {
    const room = findHosted(socket);
    if (!room || room.stage !== 'reveal') return;
    if (room.index === questions.length-1) { room.stage='finale'; publish(room); }
    else beginQuestion(room,room.index+1);
  });
  socket.on('host:restart', () => {
    const room=findHosted(socket); if(!room || room.stage!=='finale') return;
    room.stage='lobby'; room.index=-1;
    room.players.forEach(p=>{p.score=0;p.answeredAt=null;p.lastAnswer=null;});
    publish(room);
  });
  socket.on('disconnect', () => {
    if (socket.data.hosting) {
      const room = rooms.get(socket.data.hosting);
      if (room) { clearQuestionTimer(room); io.to(room.code).emit('room:closed'); rooms.delete(room.code); }
    }
    if (socket.data.playing) {
      const {code,id}=socket.data.playing;
      const room=rooms.get(code);
      if (room) { room.players.delete(id); publish(room); }
    }
  });
});
server.listen(PORT, () => console.log(`THE VALUE GAME → http://localhost:${PORT}`));
