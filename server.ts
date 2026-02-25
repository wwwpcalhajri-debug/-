import { Server } from "socket.io";
import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import path from "path";

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

const PUNISHMENTS = [
  "ارقص مصري 💃", "نظف الجلسة 🧹", "حب رأس واحد من اختيارك 😘", "اجلب موية للاعب يبي 🥤",
  "ارقص هندي مع أغنية 🕺", "غن أغنية قصيرة 🎤", "اجلس واقف دقيقتين 🧍", "العب بصلة لحالك 🧅",
  "اضحك من القلب 😂", "خلى اللاعبين يدغدغوك 🤭", "قل جملة طويلة باللهجة المصرية 🗣️",
  "غن أغنية من اختيار لاعب على يمينك 🎶", "غن دوها كاملة 🎵", "أعطِ لاعب ريال واحد 💸", "اجلس فاتح فمك دقيقتين 😮"
];

interface Player {
  id: string;
  name: string;
  emoji: string;
  isHost: boolean;
  score: number;
  errors: number;
  answered: boolean;
  lastAnswerCorrect: boolean | null;
}

interface Room {
  id: string;
  name: string;
  emoji: string;
  status: 'lobby' | 'countdown' | 'transition' | 'question' | 'results' | 'punishment';
  players: Player[];
  currentQuestionIndex: number;
  transitionLevel: 'easy' | 'medium' | 'hard' | null;
  punishments: { text: string; revealed: boolean; revealedBy: string | null }[];
  punishmentOrder: string[]; // Player IDs in order of errors
  currentPunishmentPlayerIndex: number;
}

const rooms = new Map<string, Room>();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create_room", ({ roomName, roomEmoji, playerName, playerEmoji }) => {
      const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const room: Room = {
        id: roomId,
        name: roomName,
        emoji: roomEmoji,
        status: 'lobby',
        players: [{
          id: socket.id,
          name: playerName,
          emoji: playerEmoji,
          isHost: true,
          score: 0,
          errors: 0,
          answered: false,
          lastAnswerCorrect: null
        }],
        currentQuestionIndex: -1,
        transitionLevel: null,
        punishments: PUNISHMENTS.map(p => ({ text: p, revealed: false, revealedBy: null })),
        punishmentOrder: [],
        currentPunishmentPlayerIndex: 0
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room_created", room);
    });

    socket.on("join_room", ({ roomId, playerName, playerEmoji }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        socket.emit("error", "الغرفة غير موجودة");
        return;
      }
      if (room.players.length >= 10) {
        socket.emit("error", "الغرفة ممتلئة");
        return;
      }
      if (room.status !== 'lobby') {
        socket.emit("error", "اللعبة بدأت بالفعل");
        return;
      }

      const newPlayer: Player = {
        id: socket.id,
        name: playerName,
        emoji: playerEmoji,
        isHost: false,
        score: 0,
        errors: 0,
        answered: false,
        lastAnswerCorrect: null
      };
      room.players.push(newPlayer);
      socket.join(roomId.toUpperCase());
      io.to(roomId.toUpperCase()).emit("room_updated", room);
    });

    socket.on("start_game", (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.find(p => p.id === socket.id)?.isHost) {
        room.status = 'countdown';
        io.to(roomId).emit("room_updated", room);
        
        setTimeout(() => {
          room.status = 'transition';
          room.transitionLevel = 'easy';
          io.to(roomId).emit("room_updated", room);
          
          setTimeout(() => {
            room.status = 'question';
            room.currentQuestionIndex = 0;
            room.players.forEach(p => { p.answered = false; p.lastAnswerCorrect = null; });
            io.to(roomId).emit("room_updated", room);
          }, 2000);
        }, 4000); // 3-2-1 countdown
      }
    });

    socket.on("submit_answer", ({ roomId, answerIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'question') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.answered) return;

      const question = QUESTIONS[room.currentQuestionIndex];
      player.answered = true;
      if (answerIndex === question.correct) {
        player.score += 10;
        player.lastAnswerCorrect = true;
      } else {
        player.errors += 1;
        player.lastAnswerCorrect = false;
      }

      io.to(roomId).emit("room_updated", room);
    });

    socket.on("next_question", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || !room.players.find(p => p.id === socket.id)?.isHost) return;

      // Check if any player didn't answer and mark as error
      room.players.forEach(p => {
        if (!p.answered) {
          p.errors += 1;
          p.lastAnswerCorrect = false;
        }
      });

      const nextIndex = room.currentQuestionIndex + 1;
      if (nextIndex >= QUESTIONS.length) {
        room.status = 'results';
        io.to(roomId).emit("room_updated", room);
      } else {
        const nextQuestion = QUESTIONS[nextIndex];
        const currentQuestion = QUESTIONS[room.currentQuestionIndex];
        
        if (nextQuestion.level !== currentQuestion.level) {
          room.status = 'transition';
          room.transitionLevel = nextQuestion.level as any;
          io.to(roomId).emit("room_updated", room);
          
          setTimeout(() => {
            room.status = 'question';
            room.currentQuestionIndex = nextIndex;
            room.players.forEach(p => { p.answered = false; p.lastAnswerCorrect = null; });
            io.to(roomId).emit("room_updated", room);
          }, 2000);
        } else {
          room.currentQuestionIndex = nextIndex;
          room.players.forEach(p => { p.answered = false; p.lastAnswerCorrect = null; });
          io.to(roomId).emit("room_updated", room);
        }
      }
    });

    socket.on("go_to_punishments", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || !room.players.find(p => p.id === socket.id)?.isHost) return;

      room.status = 'punishment';
      // Sort players by errors (descending)
      room.punishmentOrder = [...room.players]
        .sort((a, b) => b.errors - a.errors)
        .map(p => p.id);
      room.currentPunishmentPlayerIndex = 0;
      io.to(roomId).emit("room_updated", room);
    });

    socket.on("reveal_punishment", ({ roomId, punishmentIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'punishment') return;

      const currentPlayerId = room.punishmentOrder[room.currentPunishmentPlayerIndex];
      if (socket.id !== currentPlayerId) return;

      if (room.punishments[punishmentIndex].revealed) return;

      room.punishments[punishmentIndex].revealed = true;
      room.punishments[punishmentIndex].revealedBy = socket.id;
      io.to(roomId).emit("room_updated", room);
    });

    socket.on("close_punishment", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'punishment') return;

      const currentPlayerId = room.punishmentOrder[room.currentPunishmentPlayerIndex];
      if (socket.id !== currentPlayerId) return;

      room.currentPunishmentPlayerIndex += 1;
      
      // If all players in order finished, check if we should reset or end
      if (room.currentPunishmentPlayerIndex >= room.punishmentOrder.length) {
        // Check if all punishments revealed, if so shuffle
        if (room.punishments.every(p => p.revealed)) {
          io.to(roomId).emit("shuffling_punishments");
          setTimeout(() => {
            room.punishments = PUNISHMENTS
              .sort(() => Math.random() - 0.5)
              .map(p => ({ text: p, revealed: false, revealedBy: null }));
            room.currentPunishmentPlayerIndex = 0;
            io.to(roomId).emit("room_updated", room);
          }, 2000);
        } else {
          // Restart punishment round for fun or end? User said "بعد انتهاء جميع العقوبات"
          // Let's just keep it in punishment mode until they leave or host resets
        }
      }
      io.to(roomId).emit("room_updated", room);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            if (player.isHost) {
              room.players[0].isHost = true;
            }
            io.to(roomId).emit("room_updated", room);
          }
        }
      });
    });
  });

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
