/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Users, 
  Play, 
  Trophy, 
  AlertCircle,
  ChevronRight,
  Moon,
  Star,
  Link as LinkIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EMOJIS = ['❤️', '🎶', '👻', '🐨', '🦄', '🦑', '🕸️', '🦴', '👀', '🧠', '🦷'];
const ROOM_EMOJIS = ['🌙', '⭐', '🕌', '🏮', '🥘', '📅'];

const QUESTIONS = [
  // Easy
  { id: 1, text: "في أي شهر يبدأ رمضان حسب التقويم الهجري؟", options: ["شوال", "رمضان", "ذو الحجة"], correct: 1, level: "easy" },
  { id: 2, text: "عدد ركعات صلاة الفجر؟", options: ["2", "4", "3"], correct: 0, level: "easy" },
  { id: 3, text: "الطبق التقليدي في رمضان بمصر؟", options: ["كشري", "فتة", "ملوخية"], correct: 1, level: "easy" },
  { id: 4, text: "اسم الليلة التي يُنزّل فيها القرآن؟", options: ["ليلة القدر", "ليلة الإسراء", "ليلة النصف من شعبان"], correct: 0, level: "easy" },
  { id: 5, text: "الفاكهة الرمضانية الرمزية؟", options: ["تفاح", "تمر", "موز"], correct: 1, level: "easy" },
  // Medium
  { id: 6, text: "كم مرة تصوم السنة؟", options: ["مرة", "12", "6"], correct: 1, level: "medium" },
  { id: 7, text: "الدعاء المشهور عند الإفطار؟", options: ["اللهم صلِّ على النبي", "ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله", "سبحان الله"], correct: 1, level: "medium" },
  { id: 8, text: "الصحابي المعروف بـ \"سيف الله المسلول\"؟", options: ["علي بن أبي طالب", "خالد بن الوليد", "أبو بكر الصديق"], correct: 1, level: "medium" },
  { id: 9, text: "الاسم القديم لمكة؟", options: ["بدر", "بكة", "المدينة"], correct: 1, level: "medium" },
  { id: 10, text: "عدد أجزاء القرآن الكريم؟", options: ["20", "30", "25"], correct: 1, level: "medium" },
  // Hard
  { id: 11, text: "الدعاء عند السحور؟", options: ["اللهم بارك لنا في طعامنا", "ربنا تقبل منا", "اللهم اجعلنا من الفائزين"], correct: 0, level: "hard" },
  { id: 12, text: "الخليفة الذي جمع القرآن في مصحف واحد؟", options: ["عمر بن الخطاب", "أبو بكر الصديق", "عثمان بن عفان"], correct: 1, level: "hard" },
  { id: 13, text: "كم ليلة خصصت للتهجد في رمضان على الأقل؟", options: ["ليلة واحدة", "ليلة القدر", "كل الليالي"], correct: 1, level: "hard" },
  { id: 14, text: "اسم الزكاة الواجبة قبل العيد؟", options: ["زكاة الفطر", "زكاة المال", "صدقة جارية"], correct: 0, level: "hard" },
  { id: 15, text: "في أي ليلة من رمضان تُستحب صلاة التراويح أكثر؟", options: ["الليلة الأولى", "ليلة 27", "ليلة 15"], correct: 1, level: "hard" },
];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [view, setView] = useState<'home' | 'create' | 'join' | 'game'>('home');
  const [playerName, setPlayerName] = useState('');
  const [playerEmoji, setPlayerEmoji] = useState(EMOJIS[0]);
  const [roomName, setRoomName] = useState('');
  const [roomEmoji, setRoomEmoji] = useState(ROOM_EMOJIS[0]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [shuffling, setShuffling] = useState(false);

  useEffect(() => {
    const newSocket = io("https://game-pqit.onrender.com");
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    newSocket.on('room_created', (newRoom) => {
      setRoom(newRoom);
      setView('game');
    });

    newSocket.on('room_updated', (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === 'countdown') {
        startCountdown();
      }
    });

    newSocket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    newSocket.on('shuffling_punishments', () => {
      setShuffling(true);
      setTimeout(() => setShuffling(false), 2000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const startCountdown = () => {
    let count = 3;
    setCountdown(3);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleCreateRoom = () => {
    if (!playerName || !roomName) {
      setError('يرجى إدخال جميع البيانات');
      return;
    }
    socket?.emit('create_room', { roomName, roomEmoji, playerName, playerEmoji });
  };

  const handleJoinRoom = () => {
    if (!playerName || !joinRoomId) {
      setError('يرجى إدخال جميع البيانات');
      return;
    }
    socket?.emit('join_room', { roomId: joinRoomId, playerName, playerEmoji });
    setView('game');
  };

  const handleStartGame = () => {
    socket?.emit('start_game', room.id);
  };

  const handleSubmitAnswer = (index: number) => {
    socket?.emit('submit_answer', { roomId: room.id, answerIndex: index });
  };

  const handleNextQuestion = () => {
    socket?.emit('next_question', room.id);
  };

  const handleGoToPunishments = () => {
    socket?.emit('go_to_punishments', room.id);
  };

  const handleRevealPunishment = (index: number) => {
    socket?.emit('reveal_punishment', { roomId: room.id, punishmentIndex: index });
  };

  const handleClosePunishment = () => {
    socket?.emit('close_punishment', room.id);
  };

  const currentPlayer = room?.players.find((p: any) => p.id === socket?.id);
  const isHost = currentPlayer?.isHost;

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
        <div className="relative inline-block">
          <Moon className="w-24 h-24 text-yellow-400 fill-yellow-400" />
          <Star className="absolute top-0 right-0 w-8 h-8 text-yellow-200 fill-yellow-200 animate-pulse" />
        </div>
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">مين الغبي؟</h1>
        <p className="text-xl text-blue-200">لعبة رمضانية ممتعة للجمعات</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        <button onClick={() => setView('create')} className="w-full py-6 text-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl shadow-xl pulse-button flex items-center justify-center gap-3">
          <Plus className="w-8 h-8" />
          إنشاء غرفة
        </button>
        <button onClick={() => setView('join')} className="w-full py-6 text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl shadow-xl flex items-center justify-center gap-3">
          <LinkIcon className="w-8 h-8" />
          انضمام لغرفة
        </button>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      <div className="w-full max-w-sm glass-card p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center">إعداد الغرفة</h2>
        <div className="space-y-4">
          <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white" placeholder="اسمك" />
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setPlayerEmoji(e)} className={cn("w-10 h-10 flex items-center justify-center text-xl rounded-lg", playerEmoji === e ? "bg-emerald-500" : "bg-white/5")}>{e}</button>
            ))}
          </div>
          <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white" placeholder="اسم الغرفة" />
        </div>
        <button onClick={handleCreateRoom} className="w-full py-4 text-xl font-bold text-white bg-emerald-500 rounded-2xl">يلا نبدأ!</button>
        <button onClick={() => setView('home')} className="w-full text-blue-300 text-sm">رجوع</button>
      </div>
    </div>
  );

  const renderJoin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      <div className="w-full max-w-sm glass-card p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center">انضمام للغرفة</h2>
        <div className="space-y-4">
          <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white" placeholder="اسمك" />
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setPlayerEmoji(e)} className={cn("w-10 h-10 flex items-center justify-center text-xl rounded-lg", playerEmoji === e ? "bg-blue-500" : "bg-white/5")}>{e}</button>
            ))}
          </div>
          <input type="text" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center font-mono text-2xl" placeholder="ABCD" maxLength={5} />
        </div>
        <button onClick={handleJoinRoom} className="w-full py-4 text-xl font-bold text-white bg-blue-500 rounded-2xl">دخول</button>
        <button onClick={() => setView('home')} className="w-full text-blue-300 text-sm">رجوع</button>
      </div>
    </div>
  );

  const renderLobby = () => (
    <div className="flex flex-col min-h-screen p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center bg-orange-500 rounded-xl text-2xl">{room.emoji}</div>
          <div>
            <h2 className="text-2xl font-bold">{room.name}</h2>
            <div className="flex items-center gap-1 text-blue-300 text-sm"><Users className="w-4 h-4" /><span>{room.players.length} / 10 لاعبين</span></div>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-xs text-blue-300 block">كود الغرفة</span>
          <span className="text-xl font-mono font-bold tracking-widest">{room.id}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <h3 className="text-lg font-semibold text-blue-200">اللاعبين المتصلين:</h3>
        <div className="grid grid-cols-1 gap-3">
          {room.players.map((p: any) => (
            <motion.div key={p.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <span className="font-bold text-lg">{p.name}</span>
                {p.isHost && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">المضيف</span>}
              </div>
              {p.id === socket?.id && <span className="text-xs text-emerald-400">أنت</span>}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isHost ? (
          <button onClick={handleStartGame} disabled={room.players.length < 2} className={cn("w-full py-5 text-2xl font-bold text-white rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3", room.players.length < 2 ? "bg-gray-600 opacity-50 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-teal-600 pulse-button")}>
            <Play className="w-8 h-8" />بدء اللعبة
          </button>
        ) : (
          <div className="text-center p-6 bg-white/5 rounded-3xl border border-white/10"><p className="text-xl text-blue-200 animate-pulse">بانتظار بدء المضيف...</p></div>
        )}
      </div>
    </div>
  );

  const renderCountdown = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="text-[12rem] font-black text-yellow-400">{countdown}</motion.div>
      <p className="text-3xl font-bold text-blue-200">ورّينا قدراتك 😏</p>
    </div>
  );

  const renderTransition = () => {
    const level = room.transitionLevel;
    const config = {
      easy: { bg: 'from-emerald-600 to-teal-800', text: 'سهلة؟ لا تتحمس 😏', emojis: '😊🎉✨' },
      medium: { bg: 'from-yellow-600 to-orange-800', text: 'هنا تبدأ المصايب 😈', emojis: '🔥🤔⚡' },
      hard: { bg: 'from-red-600 to-rose-900', text: 'شد حيلك…🔥', emojis: '💀😱🌪️' }
    }[level as 'easy' | 'medium' | 'hard'] || { bg: 'from-slate-800 to-slate-900', text: '', emojis: '' };

    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6 bg-gradient-to-b", config.bg)}>
        <div className="text-6xl mb-4 animate-bounce">{config.emojis}</div>
        <h2 className="text-5xl font-black text-white leading-tight">{config.text}</h2>
        <div className="w-16 h-1 bg-white/30 rounded-full animate-pulse" />
      </div>
    );
  };

  const renderQuestion = () => {
    const question = QUESTIONS[room.currentQuestionIndex];
    const player = room.players.find((p: any) => p.id === socket?.id);
    const hasAnswered = player?.answered;

    return (
      <div className="flex flex-col min-h-screen p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-blue-300">السؤال {room.currentQuestionIndex + 1} / 15</span>
          <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">
            <AlertCircle className="w-4 h-4" /><span className="font-bold">{player?.errors} أخطاء</span>
          </div>
        </div>

        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${((room.currentQuestionIndex + 1) / 15) * 100}%` }} className="h-full bg-emerald-500" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <h2 className="text-3xl font-black leading-relaxed">{question.text}</h2>
          <div className="w-full grid grid-cols-1 gap-4">
            {question.options.map((opt, idx) => (
              <button key={idx} disabled={hasAnswered} onClick={() => handleSubmitAnswer(idx)} className={cn("w-full py-5 px-6 text-xl font-bold rounded-3xl transition-all border-2", hasAnswered ? idx === question.correct ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 opacity-50" : "bg-white/10 border-white/10 hover:bg-white/20 active:scale-95")}>{opt}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {room.players.map((p: any) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all", p.answered ? p.lastAnswerCorrect ? "bg-emerald-500/20 border-emerald-500" : "bg-red-500/20 border-red-500" : "bg-white/10 border-white/10")}>{p.emoji}</div>
              <span className="text-[10px] text-blue-300 truncate w-full text-center">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score || a.errors - b.errors);
    return (
      <div className="flex flex-col min-h-screen p-6 space-y-8 overflow-y-auto">
        <div className="text-center space-y-4"><Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-5xl font-black">النتائج النهائية</h2></div>
        <div className="space-y-4">
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className={cn("flex items-center justify-between p-5 rounded-3xl border-2", idx === 0 ? "bg-yellow-500/20 border-yellow-500" : "bg-white/5 border-white/10")}>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-blue-300">#{idx + 1}</span><span className="text-3xl">{p.emoji}</span>
                <div><h3 className="text-xl font-bold">{p.name}</h3><p className="text-sm text-blue-300">{p.score} نقطة | {p.errors} أخطاء</p></div>
              </div>
            </div>
          ))}
        </div>
        {isHost && <button onClick={handleGoToPunishments} className="w-full py-6 text-2xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-3xl shadow-xl pulse-button">انتقل للعقوبات 😈</button>}
      </div>
    );
  };

  const renderPunishment = () => {
    const currentPlayerId = room.punishmentOrder[room.currentPunishmentPlayerIndex];
    const isMyTurn = socket?.id === currentPlayerId;
    const currentP = room.players.find((p: any) => p.id === currentPlayerId);
    const revealedPunishment = room.punishments.find((p: any) => p.revealedBy === currentPlayerId && p.revealed);
    const isEveryoneDone = room.currentPunishmentPlayerIndex >= room.punishmentOrder.length;

    return (
      <div className="flex flex-col min-h-screen p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-red-500">وقت العقاب 😈</h2>
          {isEveryoneDone ? (
            <div className="space-y-4 py-4"><p className="text-2xl font-bold text-emerald-400">انتهت جميع العقوبات! ✨</p>{isHost && <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-500 text-white font-bold rounded-2xl shadow-lg">العودة للرئيسية</button>}</div>
          ) : (
            <><p className="text-blue-200">الدور على:</p><div className="flex items-center justify-center gap-3 bg-white/10 p-4 rounded-3xl border border-white/20"><span className="text-4xl">{currentP?.emoji}</span><span className="text-2xl font-bold">{currentP?.name}</span></div></>
          )}
        </div>

        {shuffling ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4"><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /><p className="text-2xl font-bold animate-pulse">جار تبديل العقوبات 🔄</p></div>
        ) : (
          <div className="flex-1 grid grid-cols-3 gap-3">
            {room.punishments.map((p: any, idx: number) => (
              <button key={idx} disabled={isEveryoneDone || !isMyTurn || p.revealed} onClick={() => handleRevealPunishment(idx)} className={cn("aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all border-2", p.revealed ? "bg-slate-800 border-slate-700 text-slate-600" : (!isEveryoneDone && isMyTurn) ? "bg-white/10 border-white/20 hover:bg-white/20 active:scale-95" : "bg-white/5 border-white/5 opacity-50")}>{p.revealed ? 'X' : idx + 1}</button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {revealedPunishment && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={isMyTurn ? handleClosePunishment : undefined} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 text-center">
              <motion.div initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} className="space-y-8">
                <div className="text-8xl mb-4">😈</div><h3 className="text-blue-300 text-xl">عقابك هو:</h3><p className="text-5xl font-black text-white leading-tight">{revealedPunishment.text}</p>{isMyTurn && <p className="text-sm text-blue-400 animate-pulse mt-12">اضغط في أي مكان للإغلاق</p>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="ramadan-bg min-h-screen text-white select-none">
      {error && (
        <div className="fixed top-6 left-6 right-6 z-[100]">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-red-500 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6" /><span className="font-bold">{error}</span><button onClick={() => setError('')} className="mr-auto">×</button>
          </motion.div>
        </div>
      )}
      {view === 'home' && renderHome()}
      {view === 'create' && renderCreate()}
      {view === 'join' && renderJoin()}
      {view === 'game' && room && (
        <>
          {room.status === 'lobby' && renderLobby()}
          {room.status === 'countdown' && renderCountdown()}
          {room.status === 'transition' && renderTransition()}
          {room.status === 'question' && renderQuestion()}
          {room.status === 'results' && renderResults()}
          {room.status === 'punishment' && renderPunishment()}
        </>
      )}
    </div>
  );
}
