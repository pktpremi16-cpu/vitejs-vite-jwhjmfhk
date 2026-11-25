import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Swords,
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Copy,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  Skull,
  Sparkles,
  LogOut,
  RotateCcw,
  Play,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bot,
  Trash2,
  ScrollText,
  HelpCircle,
  BookOpen,
  Sparkle,
} from 'lucide-react';

// ============================================================================
// INISIALISASI FIREBASE (MULTIPLAYER REAL-TIME & SINKRONISASI RUANGAN)
// ============================================================================
const firebaseConfig = {
  apiKey: 'AIzaSyACgiMu5DF5GLHnv7Kk4-gkZtGc3d4rcNA',
  authDomain: 'avalon-mabar.firebaseapp.com',
  projectId: 'avalon-mabar',
  storageBucket: 'avalon-mabar.firebasestorage.app',
  messagingSenderId: '890372490115',
  appId: '1:890372490115:web:ddffe979f848f022142cb6',
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'avalon-mabar';

// ============================================================================
// KONSTANTA ATURAN RESMI BOARD GAME AVALON (5 - 10 PEMAIN)
// ============================================================================
const PLAYER_MATRIX = {
  5: { good: 3, evil: 2, quests: [2, 3, 2, 3, 3], twoFailsQuest4: false },
  6: { good: 4, evil: 2, quests: [2, 3, 4, 3, 4], twoFailsQuest4: false },
  7: { good: 4, evil: 3, quests: [2, 3, 3, 4, 4], twoFailsQuest4: true },
  8: { good: 5, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true },
  9: { good: 6, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true },
  10: { good: 6, evil: 4, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true },
};

const ROLE_DEFINITIONS = {
  MERLIN: {
    id: 'MERLIN',
    name: 'Merlin',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Penyihir Agung yang mengetahui siapa saja pengkhianat.',
    ability:
      'Kamu mengetahui identitas seluruh anggota Kubu Mordred (kecuali Mordred jika aktif). Bimbing tim menuju 3 misi sukses tanpa ketahuan oleh Assassin di akhir permainan!',
  },
  PERCIVAL: {
    id: 'PERCIVAL',
    name: 'Percival',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Ksatria pelindung identitas Merlin.',
    ability:
      'Kamu dapat melihat siapa Merlin. Namun jika Morgana ikut bermain, kamu akan melihat Merlin dan Morgana sebagai dua kandidat tanpa tahu mana yang asli.',
  },
  LOYAL_SERVANT: {
    id: 'LOYAL_SERVANT',
    name: 'Pelayan Setia Arthur',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Ksatria setia kerajaan Camelot.',
    ability:
      'Kamu tidak memiliki penglihatan khusus. Amati pola penunjukan tim, cara voting pemain lain, dan argumen diskusi untuk mengungkap penyusup!',
  },
  ASSASSIN: {
    id: 'ASSASSIN',
    name: 'Assassin',
    alignment: 'EVIL',
    teamLabel: 'Kubu Jahat Mordred',
    badgeColor: 'red',
    shortDesc: 'Pembunuh bayaran pemburu Merlin.',
    ability:
      'Gagalkan misi secara diam-diam bersama rekan Kubu Mordred. Jika Kubu Arthur berhasil menang 3 misi, kamu mendapat satu tembakan terakhir untuk membunuh Merlin dan merebut kemenangan!',
  },
  MORGANA: {
    id: 'MORGANA',
    name: 'Morgana',
    alignment: 'EVIL',
    teamLabel: 'Kubu Jahat Mordred',
    badgeColor: 'red',
    shortDesc: 'Penyihir gelap yang menyamar sebagai Merlin.',
    ability:
      'Di mata Percival, kamu tampak sama seperti Merlin. Manfaatkan penyamaran ini untuk menipu Percival agar mempercayai tim sabotase!',
  },
  MORDRED: {
    id: 'MORDRED',
    name: 'Mordred',
    alignment: 'EVIL',
    teamLabel: 'Kubu Jahat Mordred',
    badgeColor: 'red',
    shortDesc: 'Penguasa kegelapan yang tak kasat mata bagi Merlin.',
    ability:
      'Identitas jahatmu tersembunyi sepenuhnya dari penglihatan batin Merlin. Merlin tidak tahu bahwa kamu adalah pengkhianat.',
  },
  OBERON: {
    id: 'OBERON',
    name: 'Oberon',
    alignment: 'EVIL',
    teamLabel: 'Kubu Jahat Mordred',
    badgeColor: 'red',
    shortDesc: 'Pengkhianat misterius yang bergerak sendiri.',
    ability:
      'Kamu tidak tahu siapa rekan Kubu Mordred lainnya, dan mereka pun tidak tahu bahwa kamu sekutu mereka—namun Merlin tetap dapat melihatmu!',
  },
  MINION: {
    id: 'MINION',
    name: 'Kaki Tangan Mordred',
    alignment: 'EVIL',
    teamLabel: 'Kubu Jahat Mordred',
    badgeColor: 'red',
    shortDesc: 'Penyusup setia pasukan Mordred.',
    ability:
      'Bekerjasamalah secara diam-diam dengan rekan Kubu Mordred untuk menyabotase 3 misi atau memicu 5 kali penolakan voting berturut-turut.',
  },
};

const ROLE_ORDER = [
  'MERLIN',
  'PERCIVAL',
  'LOYAL_SERVANT',
  'ASSASSIN',
  'MORGANA',
  'MORDRED',
  'OBERON',
  'MINION',
];

// ============================================================================
// CERITA NARATIF & BAB UNTUK SETIAP MISI (BAB I - BAB V)
// ============================================================================
const QUEST_STORIES = {
  1: {
    chapter: 'Bab I',
    title: 'Gerbang Hutan Brocéliande',
    subtitle: 'Pengintaian di Perbatasan Kuno Camelot',
    prologue:
      'Kabut perak menyelimuti gerbang batu kuno Hutan Brocéliande. Raja Arthur mengutus pasukan perintis pertama untuk menyalakan suar penjaga dan mengamankan jalur kuno sebelum bayangan Mordred merayap masuk ke wilayah Camelot.',
    successEpilogue:
      'Suar biru Camelot menyala terang menembus kabut Brocéliande! Pasukan perintis kembali membawa kabar kemenangan pertama, namun bisikan keraguan mulai tumbuh di antara kursi Meja Bundar.',
    failEpilogue:
      'Suar penjaga padam secara misterius sebelum fajar menyingsing! Jejak belati beracun ditemukan di balik gerbang batu—pengkhianat telah menyusup di dalam barisan kita!',
  },
  2: {
    chapter: 'Bab II',
    title: 'Biara Relik Glastonbury',
    subtitle: 'Penjagaan Pecahan Cawan Suci',
    prologue:
      'Di bawah cahaya bulan purnama, Biara Glastonbury menyimpan pecahan relik Cawan Suci yang melindungi muruah Camelot. Para ksatria terpilih harus berjaga di altar lilin semalaman agar relik suci itu tidak dicuri kekuatan gelap.',
    successEpilogue:
      'Cahaya bulan menyinari altar Glastonbury yang tetap utuh dan suci. Relik kerajaan berhasil diamankan, membuat kubu Mordred terdesak dalam bayang-bayang.',
    failEpilogue:
      'Lilin-lilin altar padam diterjang angin sihir hitam! Segel relik Glastonbury retak oleh sabotase dari dalam, memicu saling tuding panas di ruang sidang Camelot.',
  },
  3: {
    chapter: 'Bab III',
    title: 'Jembatan Kabut Danau Avalon',
    subtitle: 'Ritual Pemurnian Pedang Excalibur',
    prologue:
      'Jembatan batu melengkung membentang di atas perairan mistis Danau Avalon, tempat pedang legendaris Excalibur ditempa. Tim ekspedisi harus menyeberangi kabut tebal untuk memurnikan bilah cahaya dari kutukan Morgana.',
    successEpilogue:
      'Air Danau Avalon beriak memantulkan cahaya keemasan! Excalibur kembali bersinar murni di atas jembatan batu, membakar kabut ilusi yang menyelimuti danau.',
    failEpilogue:
      'Kabut ungu pekat menelan jembatan batu Avalon! Seseorang diam-diam menumpahkan ramuan kutukan ke dalam danau suci, meredupkan cahaya Excalibur.',
  },
  4: {
    chapter: 'Bab IV',
    title: 'Pengepungan Benteng Tintagel',
    subtitle: 'Pertahanan Tebing Karang di Tengah Badai',
    prologue:
      'Petir menyambar tebing karang terjal Benteng Tintagel saat pasukan bayangan mengepung tembok luar. Para kesatria terpilih harus mempertahankan gerbang utama hingga bala bantuan kerajaan tiba.',
    successEpilogue:
      'Di tengah gemuruh badai, panji singa emas tetap berkibar gagah di puncak Benteng Tintagel! Serangan malam pasukan gelap berhasil dipatahkan dengan gemilang.',
    failEpilogue:
      'Gerbang besi Tintagel terbuka dari dalam di puncak badai petir! Tembok pertahanan jebol akibat pengkhianatan keji, membawa Camelot ke ambang kehancuran.',
  },
  5: {
    chapter: 'Bab V',
    title: 'Pertempuran Terakhir di Bukit Camlann',
    subtitle: 'Penentuan Nasib Takhta Camelot',
    prologue:
      'Langit senja memerah darah di atas Bukit Camlann. Seluruh nasib Camelot bergantung pada pasukan terakhir ini—satu langkah keliru akan menenggelamkan kerajaan ke dalam kegelapan abadi.',
    successEpilogue:
      'Mentari fajar memecah langit merah Camlann! Kubu Setia Arthur memenangkan pertempuran terakhir—namun di balik kerumunan, Assassin diam-diam mengarahkan bidikannya mencari sang Merlin...',
    failEpilogue:
      'Langit Camlann runtuh dalam kobaran api dan pengkhianatan! Panji Camelot tumbang di medan laga saat kaki tangan Mordred merebut takhta kerajaan.',
  },
};

const BOT_NAMES = [
  'Sir Gawain (Bot)',
  'Lady Guinevere (Bot)',
  'Sir Tristan (Bot)',
  'Sir Kay (Bot)',
  'Lady Elaine (Bot)',
  'Sir Bedivere (Bot)',
  'Sir Galahad (Bot)',
  'Lady Lynette (Bot)',
  'Sir Bors (Bot)',
];

// ============================================================================
// FUNGSI BANTUAN LOGIKA GAME
// ============================================================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assignRolesToPlayers(players, settings) {
  const count = players.length;
  const matrix = PLAYER_MATRIX[count];
  if (!matrix) return players;

  const goodRoles = ['MERLIN'];
  const evilRoles = ['ASSASSIN'];

  if (
    settings.percivalMorgana &&
    evilRoles.length < matrix.evil &&
    goodRoles.length < matrix.good
  ) {
    goodRoles.push('PERCIVAL');
    evilRoles.push('MORGANA');
  }
  if (settings.mordred && evilRoles.length < matrix.evil) {
    evilRoles.push('MORDRED');
  }
  if (settings.oberon && evilRoles.length < matrix.evil) {
    evilRoles.push('OBERON');
  }

  while (goodRoles.length < matrix.good) {
    goodRoles.push('LOYAL_SERVANT');
  }
  while (evilRoles.length < matrix.evil) {
    evilRoles.push('MINION');
  }

  const allRoleDeck = shuffleArray([...goodRoles, ...evilRoles]);

  return players.map((player, idx) => {
    const roleId = allRoleDeck[idx];
    const roleDef = ROLE_DEFINITIONS[roleId];
    return {
      ...player,
      role: roleId,
      alignment: roleDef.alignment,
      readyRole: Boolean(player.isBot),
    };
  });
}

function getSecretVision(me, allPlayers, settings) {
  if (!me || !me.role) {
    return { targets: [], label: '', note: '' };
  }

  if (me.role === 'MERLIN') {
    const targets = allPlayers.filter(
      (p) => p.id !== me.id && p.alignment === 'EVIL' && p.role !== 'MORDRED'
    );
    return {
      targets,
      label: 'Terdeteksi sebagai Kubu Mordred',
      note: settings?.mordred
        ? 'Waspada: Mordred ikut bermain dan tidak terlihat dalam penglihatanmu!'
        : 'Jaga rahasiamu! Jangan sampai Assassin menebak identitasmu di akhir laga.',
    };
  }

  if (me.role === 'PERCIVAL') {
    const targets = allPlayers.filter(
      (p) => p.id !== me.id && (p.role === 'MERLIN' || p.role === 'MORGANA')
    );
    return {
      targets,
      label: 'Kandidat Merlin',
      note: settings?.percivalMorgana
        ? 'Salah satu adalah Merlin asli, dan satunya lagi adalah penyamaran Morgana!'
        : 'Inilah Merlin yang harus kamu lindungi identitasnya.',
    };
  }

  if (me.alignment === 'EVIL' && me.role !== 'OBERON') {
    const targets = allPlayers.filter(
      (p) => p.id !== me.id && p.alignment === 'EVIL' && p.role !== 'OBERON'
    );
    return {
      targets,
      label: 'Rekan Sekutu Kubu Mordred',
      note: settings?.oberon
        ? 'Catatan: Oberon adalah sekutumu, namun ia bergerak sendiri dan tidak terlihat di sini.'
        : 'Koordinasikan sabotase misi secara halus tanpa mencurigakan.',
    };
  }

  if (me.role === 'OBERON') {
    return {
      targets: [],
      label: '',
      note: 'Kamu bergerak dalam bayang-bayang sendiri. Kamu tidak mengenal rekan Kubu Mordred lainnya, dan mereka pun tidak mengenalmu—namun Merlin bisa melihatmu!',
    };
  }

  return {
    targets: [],
    label: '',
    note: 'Kamu tidak memiliki penglihatan batin. Perhatikan siapa yang terlalu ngotot meloloskan tim gagal!',
  };
}

// ============================================================================
// KOMPONEN UTAMA APLIKASI
// ============================================================================
export default function App() {
  // Auth & Reconnection State
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [roomData, setRoomData] = useState(null);

  // UI & Modal States
  const [loadingAction, setLoadingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPeekModal, setShowPeekModal] = useState(false);
  const [peekRevealed, setPeekRevealed] = useState(false);
  const [mainRoleRevealed, setMainRoleRevealed] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showGrimoireModal, setShowGrimoireModal] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [selectedAssassinTarget, setSelectedAssassinTarget] = useState(null);
  const [confirmAssassinate, setConfirmAssassinate] = useState(false);

  const botTimerRef = useRef(null);
  const resolverLockRef = useRef(false);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // 1. Inisialisasi Firebase Auth (RULE 3: Auth wajib sebelum akses Firestore)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Firebase Auth Error:', err);
        showToast(
          'Gagal terhubung ke server permainan. Pastikan Anonymous Auth aktif di Firebase.',
          'error'
        );
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Auto-Reconnect jika halaman ponsel tidak sengaja ter-refresh (disimpan di Firestore private user doc)
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const sessionRef = doc(
          db,
          'artifacts',
          appId,
          'users',
          user.uid,
          'avalon_session',
          'current'
        );
        const snap = await getDoc(sessionRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.playerName) setPlayerName(data.playerName);
          if (data.roomCode) {
            const roomRef = doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'avalon_rooms',
              data.roomCode
            );
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
              const rData = roomSnap.data();
              const stillInRoom = (rData.players || []).some(
                (p) => p.id === user.uid
              );
              if (stillInRoom) {
                setActiveRoomCode(data.roomCode);
              }
            }
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const saveUserSession = async (uid, code, name) => {
    try {
      const sessionRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        uid,
        'avalon_session',
        'current'
      );
      await setDoc(sessionRef, {
        roomCode: code,
        playerName: name,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Save session error:', err);
    }
  };

  // 3. Listener Real-Time Dokumen Ruangan
  useEffect(() => {
    if (!user || !activeRoomCode) {
      setRoomData(null);
      return;
    }

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      activeRoomCode
    );
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          showToast('Ruangan telah ditutup oleh Host.', 'error');
          setActiveRoomCode(null);
          setRoomData(null);
          saveUserSession(user.uid, null, playerName);
          return;
        }
        const data = snapshot.data();
        const amIStillInRoom = (data.players || []).some(
          (p) => p.id === user.uid
        );
        if (!amIStillInRoom) {
          showToast('Kamu telah dikeluarkan dari ruangan.', 'error');
          setActiveRoomCode(null);
          setRoomData(null);
          saveUserSession(user.uid, null, playerName);
          return;
        }
        setRoomData(data);
      },
      (error) => {
        console.error('Room snapshot error:', error);
        showToast(
          'Koneksi ruangan terganggu. Mencoba menyambung ulang...',
          'error'
        );
      }
    );

    return () => unsubscribe();
  }, [user, activeRoomCode]);

  // Reset reveal state saat fase berubah ke pembagian peran
  useEffect(() => {
    if (roomData?.status === 'ROLE_REVEAL') {
      setMainRoleRevealed(false);
    }
    if (roomData?.status !== 'ASSASSINATION') {
      setSelectedAssassinTarget(null);
      setConfirmAssassinate(false);
    }
  }, [roomData?.status]);

  // Derived Values
  const me = useMemo(() => {
    if (!roomData || !user) return null;
    return roomData.players.find((p) => p.id === user.uid) || null;
  }, [roomData, user]);

  const isHost = useMemo(() => {
    if (!roomData || !user) return false;
    return roomData.hostId === user.uid;
  }, [roomData, user]);

  // ============================================================================
  // HOST AUTOMATION: RESOLUSI FASE & AKSI BOT (TES SOLO)
  // ============================================================================
  useEffect(() => {
    if (!user || !roomData || !isHost) return;

    const resolveAndAutomate = async () => {
      if (resolverLockRef.current) return;
      const roomRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'avalon_rooms',
        roomData.roomCode
      );
      const players = roomData.players || [];
      const game = roomData.game || {};
      const matrix = PLAYER_MATRIX[players.length];

      // A. FASE ROLE_REVEAL -> Cek apakah semua pemain sudah siap
      if (roomData.status === 'ROLE_REVEAL') {
        const unreadyBots = players.filter((p) => p.isBot && !p.readyRole);
        if (unreadyBots.length > 0) {
          const updatedPlayers = players.map((p) =>
            p.isBot ? { ...p, readyRole: true } : p
          );
          resolverLockRef.current = true;
          try {
            await updateDoc(roomRef, {
              players: updatedPlayers,
              updatedAt: Date.now(),
            });
          } finally {
            resolverLockRef.current = false;
          }
          return;
        }

        const allReady =
          players.length >= 5 && players.every((p) => p.readyRole);
        if (allReady) {
          resolverLockRef.current = true;
          try {
            const firstLeader = players[0];
            await updateDoc(roomRef, {
              status: 'TEAM_PROPOSAL',
              'game.currentQuest': 1,
              'game.voteTrack': 1,
              'game.leaderIndex': 0,
              'game.proposedTeam': [],
              'game.teamVotes': {},
              'game.logs': [
                ...(game.logs || []),
                {
                  id: `start_${Date.now()}`,
                  quest: 1,
                  type: 'info',
                  text: `Permainan dimulai! ${firstLeader.name} menjadi Ketua Misi pertama.`,
                },
              ],
              updatedAt: Date.now(),
            });
          } finally {
            resolverLockRef.current = false;
          }
        }
        return;
      }

      // B. FASE TEAM_PROPOSAL -> Jika Ketua Misi adalah Bot, pilih tim otomatis
      if (roomData.status === 'TEAM_PROPOSAL' && matrix) {
        const leader = players[game.leaderIndex || 0];
        const reqSize = matrix.quests[(game.currentQuest || 1) - 1];
        if (
          leader &&
          leader.isBot &&
          (game.proposedTeam || []).length !== reqSize
        ) {
          resolverLockRef.current = true;
          try {
            const team = new Set([leader.id]);
            const others = shuffleArray(
              players.filter((p) => p.id !== leader.id)
            );
            if (leader.alignment === 'EVIL') {
              const goodOthers = others.filter((p) => p.alignment === 'GOOD');
              for (const g of goodOthers) {
                if (team.size < reqSize) team.add(g.id);
              }
            }
            for (const o of others) {
              if (team.size < reqSize) team.add(o.id);
            }
            const chosenIds = Array.from(team);
            const chosenNames = chosenIds
              .map((id) => players.find((p) => p.id === id)?.name)
              .filter(Boolean)
              .join(', ');

            await updateDoc(roomRef, {
              status: 'TEAM_VOTE',
              'game.proposedTeam': chosenIds,
              'game.teamVotes': {},
              'game.logs': [
                ...(game.logs || []),
                {
                  id: `prop_${Date.now()}`,
                  quest: game.currentQuest,
                  type: 'info',
                  text: `Misi ${game.currentQuest} (Usulan #${game.voteTrack}): ${leader.name} mengajukan tim [${chosenNames}].`,
                },
              ],
              updatedAt: Date.now(),
            });
          } finally {
            resolverLockRef.current = false;
          }
        }
        return;
      }

      // C. FASE TEAM_VOTE -> Bot memberikan suara & resolve jika semua sudah voting
      if (roomData.status === 'TEAM_VOTE') {
        const votes = game.teamVotes || {};
        const pendingBots = players.filter((p) => p.isBot && !votes[p.id]);

        if (pendingBots.length > 0) {
          resolverLockRef.current = true;
          try {
            const patch = { updatedAt: Date.now() };
            const proposedSet = new Set(game.proposedTeam || []);
            const evilCountOnTeam = players.filter(
              (p) => proposedSet.has(p.id) && p.alignment === 'EVIL'
            ).length;

            pendingBots.forEach((bot) => {
              let approve = false;
              if (game.voteTrack === 5) {
                approve = bot.alignment === 'GOOD' ? true : evilCountOnTeam > 0;
              } else if (bot.alignment === 'GOOD') {
                approve = proposedSet.has(bot.id)
                  ? Math.random() < 0.8
                  : Math.random() < 0.55;
              } else {
                approve =
                  evilCountOnTeam > 0
                    ? Math.random() < 0.8
                    : Math.random() < 0.25;
              }
              patch[`game.teamVotes.${bot.id}`] = approve
                ? 'APPROVE'
                : 'REJECT';
            });
            await updateDoc(roomRef, patch);
          } finally {
            resolverLockRef.current = false;
          }
          return;
        }

        // Semua pemain sudah voting -> Hitung hasil!
        if (Object.keys(votes).length >= players.length && players.length > 0) {
          resolverLockRef.current = true;
          try {
            let approveCount = 0;
            let rejectCount = 0;
            players.forEach((p) => {
              if (votes[p.id] === 'APPROVE') approveCount++;
              else rejectCount++;
            });

            const approved = approveCount > rejectCount;
            const voteSummary = {
              approved,
              approveCount,
              rejectCount,
              votes: { ...votes },
              proposalNumber: game.voteTrack,
              questNumber: game.currentQuest,
            };

            if (approved) {
              await updateDoc(roomRef, {
                status: 'QUEST_EXECUTION',
                'game.lastVoteResult': voteSummary,
                'game.questActions': {},
                'game.logs': [
                  ...(game.logs || []),
                  {
                    id: `vote_ok_${Date.now()}`,
                    quest: game.currentQuest,
                    type: 'approve',
                    text: `Voting Tim DISETUJUI (${approveCount} Setuju vs ${rejectCount} Tolak). Tim berangkat menjalankan Misi ${game.currentQuest}!`,
                  },
                ],
                updatedAt: Date.now(),
              });
            } else {
              // Ditolak! Cek apakah sudah 5 kali berturut-turut
              if ((game.voteTrack || 1) >= 5) {
                await updateDoc(roomRef, {
                  status: 'GAME_OVER',
                  'game.lastVoteResult': voteSummary,
                  'game.winner': 'EVIL',
                  'game.winReason':
                    '5 usulan tim ditolak berturut-turut! Kerajaan Arthur jatuh ke dalam kekacauan dan Kubu Mordred menang mutlak.',
                  'game.logs': [
                    ...(game.logs || []),
                    {
                      id: `vote_5fail_${Date.now()}`,
                      quest: game.currentQuest,
                      type: 'fail',
                      text: `Voting Tim ke-5 DITOLAK (${approveCount} Setuju vs ${rejectCount} Tolak). Kubu Mordred menang otomatis!`,
                    },
                  ],
                  updatedAt: Date.now(),
                });
              } else {
                const nextLeaderIndex =
                  ((game.leaderIndex || 0) + 1) % players.length;
                const nextLeader = players[nextLeaderIndex];
                await updateDoc(roomRef, {
                  status: 'TEAM_PROPOSAL',
                  'game.lastVoteResult': voteSummary,
                  'game.voteTrack': (game.voteTrack || 1) + 1,
                  'game.leaderIndex': nextLeaderIndex,
                  'game.proposedTeam': [],
                  'game.teamVotes': {},
                  'game.logs': [
                    ...(game.logs || []),
                    {
                      id: `vote_rej_${Date.now()}`,
                      quest: game.currentQuest,
                      type: 'reject',
                      text: `Voting Tim DITOLAK (${approveCount} Setuju vs ${rejectCount} Tolak). Penolakan naik ke ${
                        (game.voteTrack || 1) + 1
                      }/5. Ketua berikutnya: ${nextLeader.name}.`,
                    },
                  ],
                  updatedAt: Date.now(),
                });
              }
            }
          } finally {
            resolverLockRef.current = false;
          }
        }
        return;
      }

      // D. FASE QUEST_EXECUTION -> Bot anggota tim mengirim kartu misi & resolve hasil misi
      if (roomData.status === 'QUEST_EXECUTION' && matrix) {
        const teamIds = game.proposedTeam || [];
        const actions = game.questActions || {};
        const pendingTeamBots = players.filter(
          (p) => p.isBot && teamIds.includes(p.id) && !actions[p.id]
        );

        if (pendingTeamBots.length > 0) {
          resolverLockRef.current = true;
          try {
            const patch = { updatedAt: Date.now() };
            pendingTeamBots.forEach((bot) => {
              if (bot.alignment === 'GOOD') {
                patch[`game.questActions.${bot.id}`] = 'SUCCESS';
              } else {
                // Bot jahat kadang menyamar di Misi 1, lalu menyabotase di misi berikutnya
                const sabotage =
                  game.currentQuest === 1 ? Math.random() < 0.6 : true;
                patch[`game.questActions.${bot.id}`] = sabotage
                  ? 'FAIL'
                  : 'SUCCESS';
              }
            });
            await updateDoc(roomRef, patch);
          } finally {
            resolverLockRef.current = false;
          }
          return;
        }

        // Semua anggota tim sudah mengirim kartu misi -> Hitung hasil misi!
        if (
          teamIds.length > 0 &&
          Object.keys(actions).length >= teamIds.length
        ) {
          resolverLockRef.current = true;
          try {
            let successCount = 0;
            let failCount = 0;
            teamIds.forEach((id) => {
              if (actions[id] === 'FAIL') failCount++;
              else successCount++;
            });

            const qNum = game.currentQuest || 1;
            const failsNeeded = matrix.twoFailsQuest4 && qNum === 4 ? 2 : 1;
            const questSucceeded = failCount < failsNeeded;

            const updatedResults = [
              ...(game.questResults || [null, null, null, null, null]),
            ];
            updatedResults[qNum - 1] = {
              status: questSucceeded ? 'SUCCESS' : 'FAIL',
              successCount,
              failCount,
              teamIds: [...teamIds],
            };

            const teamNames = teamIds
              .map((id) => players.find((p) => p.id === id)?.name)
              .filter(Boolean);

            const revealData = {
              questNumber: qNum,
              status: questSucceeded ? 'SUCCESS' : 'FAIL',
              successCount,
              failCount,
              teamNames,
            };

            const totalSuccesses = updatedResults.filter(
              (r) => r?.status === 'SUCCESS'
            ).length;
            const totalFails = updatedResults.filter(
              (r) => r?.status === 'FAIL'
            ).length;

            const logEntry = {
              id: `quest_${qNum}_${Date.now()}`,
              quest: qNum,
              type: questSucceeded ? 'success' : 'fail',
              text: `Hasil Misi ${qNum}: ${
                questSucceeded ? 'SUKSES!' : 'GAGAL DISABOTASE!'
              } (${successCount} Sukses, ${failCount} Gagal) — Tim: ${teamNames.join(
                ', '
              )}.`,
            };

            if (totalFails >= 3) {
              await updateDoc(roomRef, {
                status: 'GAME_OVER',
                'game.questResults': updatedResults,
                'game.lastQuestReveal': revealData,
                'game.winner': 'EVIL',
                'game.winReason':
                  'Kubu Mordred berhasil menyabotase 3 misi kerajaan! Kegelapan menyelimuti Camelot.',
                'game.logs': [...(game.logs || []), logEntry],
                updatedAt: Date.now(),
              });
            } else if (totalSuccesses >= 3) {
              await updateDoc(roomRef, {
                status: 'ASSASSINATION',
                'game.questResults': updatedResults,
                'game.lastQuestReveal': revealData,
                'game.logs': [
                  ...(game.logs || []),
                  logEntry,
                  {
                    id: `assassin_phase_${Date.now()}`,
                    quest: qNum,
                    type: 'assassin',
                    text: '3 Misi berhasil! Assassin kini bersiap membidik siapa Merlin!',
                  },
                ],
                updatedAt: Date.now(),
              });
            } else {
              const nextLeaderIndex =
                ((game.leaderIndex || 0) + 1) % players.length;
              const nextLeader = players[nextLeaderIndex];
              await updateDoc(roomRef, {
                status: 'TEAM_PROPOSAL',
                'game.questResults': updatedResults,
                'game.lastQuestReveal': revealData,
                'game.currentQuest': qNum + 1,
                'game.voteTrack': 1,
                'game.leaderIndex': nextLeaderIndex,
                'game.proposedTeam': [],
                'game.teamVotes': {},
                'game.questActions': {},
                'game.logs': [
                  ...(game.logs || []),
                  logEntry,
                  {
                    id: `next_q_${qNum + 1}_${Date.now()}`,
                    quest: qNum + 1,
                    type: 'info',
                    text: `Memasuki Misi ${qNum + 1}. Ketua Misi berikutnya: ${
                      nextLeader.name
                    }.`,
                  },
                ],
                updatedAt: Date.now(),
              });
            }
          } finally {
            resolverLockRef.current = false;
          }
        }
        return;
      }

      // E. FASE ASSASSINATION -> Jika Assassin adalah Bot, eksekusi setelah jeda dramatis
      if (roomData.status === 'ASSASSINATION') {
        const assassin = players.find((p) => p.role === 'ASSASSIN');
        if (assassin && assassin.isBot && !game.assassinTargetId) {
          resolverLockRef.current = true;
          try {
            const goodCandidates = players.filter(
              (p) => p.alignment === 'GOOD'
            );
            const percivalOrMerlin = goodCandidates.filter(
              (p) => p.role === 'MERLIN' || p.role === 'PERCIVAL'
            );
            const pool =
              percivalOrMerlin.length > 0 ? percivalOrMerlin : goodCandidates;
            const target = pool[Math.floor(Math.random() * pool.length)];

            const hitMerlin = target.role === 'MERLIN';
            await updateDoc(roomRef, {
              status: 'GAME_OVER',
              'game.assassinTargetId': target.id,
              'game.winner': hitMerlin ? 'EVIL' : 'GOOD',
              'game.winReason': hitMerlin
                ? `Meskipun 3 misi berhasil, Assassin (${assassin.name}) berhasil menebak dan membunuh Merlin (${target.name})! Kemenangan direbut Kubu Mordred!`
                : `3 Misi berhasil dan Assassin (${assassin.name}) salah membunuh ${target.name}! Merlin selamat, kemenangan mutlak untuk Kubu Setia Arthur!`,
              'game.logs': [
                ...(game.logs || []),
                {
                  id: `assassinate_${Date.now()}`,
                  quest: game.currentQuest,
                  type: 'assassin',
                  text: `Assassin (${assassin.name}) mengeksekusi ${
                    target.name
                  } (${ROLE_DEFINITIONS[target.role]?.name})!`,
                },
              ],
              updatedAt: Date.now(),
            });
          } finally {
            resolverLockRef.current = false;
          }
        }
      }
    };

    botTimerRef.current = setTimeout(resolveAndAutomate, 950);
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [roomData, isHost, user]);

  // ============================================================================
  // AKSI PENGGUNA: BUAT RUANGAN, GABUNG, LOBBY, & PERMAINAN
  // ============================================================================
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!user) return;
    const cleanName = playerName.trim();
    if (!cleanName) {
      showToast('Masukkan nama pemain terlebih dahulu!', 'error');
      return;
    }

    setLoadingAction(true);
    try {
      let code = generateRoomCode();
      let roomRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'avalon_rooms',
        code
      );
      let existing = await getDoc(roomRef);
      while (existing.exists()) {
        code = generateRoomCode();
        roomRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'avalon_rooms',
          code
        );
        existing = await getDoc(roomRef);
      }

      const initialRoom = {
        roomCode: code,
        hostId: user.uid,
        status: 'LOBBY',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          percivalMorgana: true,
          mordred: false,
          oberon: false,
        },
        players: [
          {
            id: user.uid,
            name: cleanName,
            isBot: false,
            seatIndex: 0,
            role: null,
            alignment: null,
            readyRole: false,
          },
        ],
        game: null,
      };

      await setDoc(roomRef, initialRoom);
      await saveUserSession(user.uid, code, cleanName);
      setActiveRoomCode(code);
      showToast(`Ruangan ${code} berhasil dibuat!`, 'success');
    } catch (err) {
      console.error('Create room error:', err);
      showToast('Gagal membuat ruangan. Coba lagi.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!user) return;
    const cleanName = playerName.trim();
    const cleanCode = joinCodeInput.trim().toUpperCase();

    if (!cleanName) {
      showToast('Masukkan nama pemain terlebih dahulu!', 'error');
      return;
    }
    if (cleanCode.length !== 4) {
      showToast('Kode ruangan harus terdiri dari 4 karakter!', 'error');
      return;
    }

    setLoadingAction(true);
    try {
      const roomRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'avalon_rooms',
        cleanCode
      );
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        showToast(`Ruangan "${cleanCode}" tidak ditemukan!`, 'error');
        setLoadingAction(false);
        return;
      }

      const data = snap.data();
      const existingPlayer = (data.players || []).find(
        (p) => p.id === user.uid
      );

      if (existingPlayer) {
        // Rejoin kursi yang sama
        const updatedPlayers = data.players.map((p) =>
          p.id === user.uid ? { ...p, name: cleanName } : p
        );
        await updateDoc(roomRef, {
          players: updatedPlayers,
          updatedAt: Date.now(),
        });
        await saveUserSession(user.uid, cleanCode, cleanName);
        setActiveRoomCode(cleanCode);
        showToast(`Berhasil masuk kembali ke ruangan ${cleanCode}!`, 'success');
        return;
      }

      if (data.status !== 'LOBBY') {
        showToast('Permainan di ruangan ini sudah dimulai!', 'error');
        setLoadingAction(false);
        return;
      }

      if ((data.players || []).length >= 10) {
        showToast('Ruangan sudah penuh (maksimal 10 pemain)!', 'error');
        setLoadingAction(false);
        return;
      }

      const newPlayer = {
        id: user.uid,
        name: cleanName,
        isBot: false,
        seatIndex: data.players.length,
        role: null,
        alignment: null,
        readyRole: false,
      };

      await updateDoc(roomRef, {
        players: [...data.players, newPlayer],
        updatedAt: Date.now(),
      });
      await saveUserSession(user.uid, cleanCode, cleanName);
      setActiveRoomCode(cleanCode);
      showToast(`Bergabung ke ruangan ${cleanCode}!`, 'success');
    } catch (err) {
      console.error('Join room error:', err);
      showToast('Gagal bergabung ke ruangan.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!user || !roomData) return;
    try {
      const roomRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'avalon_rooms',
        roomData.roomCode
      );
      const remaining = (roomData.players || []).filter(
        (p) => p.id !== user.uid
      );
      const humanRemaining = remaining.filter((p) => !p.isBot);

      if (humanRemaining.length === 0) {
        await deleteDoc(roomRef);
      } else {
        const nextHostId =
          roomData.hostId === user.uid ? humanRemaining[0].id : roomData.hostId;
        await updateDoc(roomRef, {
          hostId: nextHostId,
          players: remaining,
          updatedAt: Date.now(),
        });
      }
      await saveUserSession(user.uid, null, playerName);
      setActiveRoomCode(null);
      setRoomData(null);
      showToast('Kamu keluar dari ruangan.', 'info');
    } catch (err) {
      console.error('Leave room error:', err);
      setActiveRoomCode(null);
      setRoomData(null);
    }
  };

  const handleCopyCode = () => {
    if (!roomData?.roomCode) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(roomData.roomCode).catch(() => {});
    }
    setCopiedCode(true);
    showToast(`Kode ruangan ${roomData.roomCode} disalin!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleSetting = async (key) => {
    if (!isHost || !roomData) return;
    const currentVal = Boolean(roomData.settings?.[key]);
    const nextSettings = {
      ...roomData.settings,
      [key]: !currentVal,
    };

    // Validasi jumlah slot Evil jika pemain saat ini 5-6 orang (2 slot Evil: Assassin + maks 1 spesial)
    const count = Math.max(5, roomData.players.length);
    const evilSlots = PLAYER_MATRIX[count]?.evil || 2;
    const requestedEvilSpecials =
      1 +
      (nextSettings.percivalMorgana ? 1 : 0) +
      (nextSettings.mordred ? 1 : 0) +
      (nextSettings.oberon ? 1 : 0);

    if (!currentVal && requestedEvilSpecials > evilSlots) {
      showToast(
        `Slot Kubu Mordred hanya ${evilSlots} untuk ${count} pemain. Tambah pemain atau matikan peran jahat lain.`,
        'error'
      );
      return;
    }

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      settings: nextSettings,
      updatedAt: Date.now(),
    });
  };

  const handleAddBot = async () => {
    if (!isHost || !roomData) return;
    if (roomData.players.length >= 10) {
      showToast('Kapasitas maksimal 10 pemain tercapai!', 'error');
      return;
    }
    const usedNames = new Set(roomData.players.map((p) => p.name));
    const availableName =
      BOT_NAMES.find((n) => !usedNames.has(n)) ||
      `Ksatria Bot #${roomData.players.length + 1}`;

    const botPlayer = {
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name: availableName,
      isBot: true,
      seatIndex: roomData.players.length,
      role: null,
      alignment: null,
      readyRole: false,
    };

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      players: [...roomData.players, botPlayer],
      updatedAt: Date.now(),
    });
  };

  const handleRemovePlayer = async (targetId) => {
    if (!isHost || !roomData || targetId === user?.uid) return;
    const updated = roomData.players.filter((p) => p.id !== targetId);
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      players: updated,
      updatedAt: Date.now(),
    });
  };

  const handleStartGame = async () => {
    if (!isHost || !roomData) return;
    const count = roomData.players.length;
    if (count < 5 || count > 10) {
      showToast('Avalon membutuhkan 5 hingga 10 pemain!', 'error');
      return;
    }

    // Cek slot peran jahat agar pas dengan jumlah pemain
    const matrix = PLAYER_MATRIX[count];
    const cleanSettings = { ...roomData.settings };
    let evilNeeded = 1; // Assassin
    if (cleanSettings.percivalMorgana) {
      if (evilNeeded + 1 <= matrix.evil) evilNeeded++;
      else cleanSettings.percivalMorgana = false;
    }
    if (cleanSettings.mordred) {
      if (evilNeeded + 1 <= matrix.evil) evilNeeded++;
      else cleanSettings.mordred = false;
    }
    if (cleanSettings.oberon) {
      if (evilNeeded + 1 <= matrix.evil) evilNeeded++;
      else cleanSettings.oberon = false;
    }

    const randomizedSeats = shuffleArray(roomData.players).map((p, idx) => ({
      ...p,
      seatIndex: idx,
    }));
    const assignedPlayers = assignRolesToPlayers(
      randomizedSeats,
      cleanSettings
    );

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      status: 'ROLE_REVEAL',
      settings: cleanSettings,
      players: assignedPlayers,
      game: {
        currentQuest: 1,
        voteTrack: 1,
        leaderIndex: 0,
        questResults: [null, null, null, null, null],
        proposedTeam: [],
        teamVotes: {},
        lastVoteResult: null,
        questActions: {},
        lastQuestReveal: null,
        assassinTargetId: null,
        winner: null,
        winReason: '',
        logs: [],
      },
      updatedAt: Date.now(),
    });
  };

  const handleConfirmRoleReady = async () => {
    if (!user || !roomData || !me) return;
    const updatedPlayers = roomData.players.map((p) =>
      p.id === user.uid ? { ...p, readyRole: true } : p
    );
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      players: updatedPlayers,
      updatedAt: Date.now(),
    });
  };

  const handleToggleTeamMember = async (targetPlayerId) => {
    if (!user || !roomData || roomData.status !== 'TEAM_PROPOSAL') return;
    const leader = roomData.players[roomData.game?.leaderIndex || 0];
    if (leader?.id !== user.uid) return;

    const matrix = PLAYER_MATRIX[roomData.players.length];
    const maxTeam = matrix.quests[(roomData.game?.currentQuest || 1) - 1];
    const currentTeam = roomData.game?.proposedTeam || [];

    let nextTeam;
    if (currentTeam.includes(targetPlayerId)) {
      nextTeam = currentTeam.filter((id) => id !== targetPlayerId);
    } else {
      if (currentTeam.length >= maxTeam) {
        showToast(`Maksimal ${maxTeam} pemain untuk misi ini!`, 'error');
        return;
      }
      nextTeam = [...currentTeam, targetPlayerId];
    }

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      'game.proposedTeam': nextTeam,
      updatedAt: Date.now(),
    });
  };

  const handleSubmitTeamProposal = async () => {
    if (!user || !roomData || roomData.status !== 'TEAM_PROPOSAL') return;
    const leader = roomData.players[roomData.game?.leaderIndex || 0];
    if (leader?.id !== user.uid) return;

    const matrix = PLAYER_MATRIX[roomData.players.length];
    const reqSize = matrix.quests[(roomData.game?.currentQuest || 1) - 1];
    const proposed = roomData.game?.proposedTeam || [];

    if (proposed.length !== reqSize) {
      showToast(`Pilih tepat ${reqSize} anggota tim misi!`, 'error');
      return;
    }

    const chosenNames = proposed
      .map((id) => roomData.players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      status: 'TEAM_VOTE',
      'game.teamVotes': {},
      'game.logs': [
        ...(roomData.game?.logs || []),
        {
          id: `prop_${Date.now()}`,
          quest: roomData.game.currentQuest,
          type: 'info',
          text: `Misi ${roomData.game.currentQuest} (Usulan #${roomData.game.voteTrack}): ${leader.name} mengajukan tim [${chosenNames}].`,
        },
      ],
      updatedAt: Date.now(),
    });
  };

  const handleCastTeamVote = async (choice) => {
    if (!user || !roomData || roomData.status !== 'TEAM_VOTE') return;
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      [`game.teamVotes.${user.uid}`]: choice,
      updatedAt: Date.now(),
    });
  };

  const handleSubmitQuestCard = async (actionChoice) => {
    if (!user || !roomData || !me || roomData.status !== 'QUEST_EXECUTION')
      return;
    if (!(roomData.game?.proposedTeam || []).includes(user.uid)) return;
    // Keamanan aturan: Kubu Arthur tidak bisa mengirim kartu GAGAL
    const safeChoice = me.alignment === 'GOOD' ? 'SUCCESS' : actionChoice;

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      [`game.questActions.${user.uid}`]: safeChoice,
      updatedAt: Date.now(),
    });
  };

  const handleExecuteAssassination = async () => {
    if (!user || !roomData || !me || roomData.status !== 'ASSASSINATION')
      return;
    if (me.role !== 'ASSASSIN' || !selectedAssassinTarget) return;

    const target = roomData.players.find(
      (p) => p.id === selectedAssassinTarget
    );
    if (!target) return;

    const hitMerlin = target.role === 'MERLIN';
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      status: 'GAME_OVER',
      'game.assassinTargetId': target.id,
      'game.winner': hitMerlin ? 'EVIL' : 'GOOD',
      'game.winReason': hitMerlin
        ? `Meskipun 3 misi berhasil, Assassin (${me.name}) berhasil menebak dan membunuh Merlin (${target.name})! Kemenangan direbut Kubu Mordred!`
        : `3 Misi berhasil dan Assassin (${me.name}) salah membunuh ${target.name}! Merlin selamat, kemenangan mutlak untuk Kubu Setia Arthur!`,
      'game.logs': [
        ...(roomData.game?.logs || []),
        {
          id: `assassinate_${Date.now()}`,
          quest: roomData.game?.currentQuest || 5,
          type: 'assassin',
          text: `Assassin (${me.name}) mengeksekusi ${target.name} (${
            ROLE_DEFINITIONS[target.role]?.name
          })!`,
        },
      ],
      updatedAt: Date.now(),
    });
  };

  const handleRematch = async () => {
    if (!isHost || !roomData) return;
    const resetPlayers = roomData.players.map((p) => ({
      ...p,
      role: null,
      alignment: null,
      readyRole: false,
    }));
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'avalon_rooms',
      roomData.roomCode
    );
    await updateDoc(roomRef, {
      status: 'LOBBY',
      players: resetPlayers,
      game: null,
      updatedAt: Date.now(),
    });
  };

  // ============================================================================
  // RENDER: LOADING AUTENTIKASI
  // ============================================================================
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col items-center justify-center p-6">
        <Shield className="w-14 h-14 text-amber-500 animate-pulse mb-4" />
        <p className="text-lg font-semibold text-amber-400">
          Menyiapkan Meja Bundar Camelot...
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: HALAMAN MASUK LOBI (BUAT / GABUNG RUANGAN)
  // ============================================================================
  if (!activeRoomCode || !roomData) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col justify-between overflow-x-hidden">
        {/* Notifikasi Toast */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
            <div
              className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium ${
                toastMessage.type === 'error'
                  ? 'bg-red-950/95 border-red-500 text-red-100'
                  : toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                  : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
              }`}
            >
              <Info className="w-5 h-5 shrink-0" />
              <span>{toastMessage.msg}</span>
            </div>
          </div>
        )}

        <main className="w-full max-w-md mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
          {/* Header Lambang Avalon */}
          <div className="text-center mb-6">
            <CamelotHeroIllustration />
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400/90 font-bold mt-4 mb-1">
              The Resistance
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              AVALON
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Permainan Deduksi Sosial • Voting Rahasia via Ponsel
            </p>
          </div>

          {/* Kartu Form Masuk */}
          <div className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-5 shadow-2xl space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                Nama Panggilanmu
              </label>
              <input
                type="text"
                maxLength={16}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Contoh: Arthur, Lancelot..."
                className="w-full px-4 py-3.5 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-base font-medium placeholder:text-slate-500"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loadingAction}
              className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-extrabold text-base shadow-lg shadow-amber-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Crown className="w-5 h-5" />
              <span>Buat Ruangan Baru</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-700" />
              <span className="shrink mx-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Atau Gabung Ruangan
              </span>
              <div className="flex-grow border-t border-slate-700" />
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="KODE"
                  className="w-32 text-center tracking-[0.25em] uppercase px-3 py-3.5 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-blue-500 focus:outline-none text-white text-lg font-extrabold placeholder:text-slate-600 placeholder:tracking-normal"
                />
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-blue-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Users className="w-5 h-5" />
                  <span>Gabung</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tombol Kitab Karakter & Panduan Singkat */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowGrimoireModal(true)}
              className="py-3 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-extrabold flex items-center justify-center gap-2 transition"
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Kitab Karakter</span>
            </button>

            <button
              onClick={() => setShowRulesModal(true)}
              className="py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Cara Bermain</span>
            </button>
          </div>
        </main>

        {/* Modal Panduan Singkat & Kitab Karakter */}
        {showRulesModal && (
          <RulesGuideModal onClose={() => setShowRulesModal(false)} />
        )}
        {showGrimoireModal && (
          <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: RUANG TUNGGU (WAITING LOBBY)
  // ============================================================================
  if (roomData.status === 'LOBBY') {
    const players = roomData.players || [];
    const pCount = players.length;
    const matrix = PLAYER_MATRIX[Math.min(10, Math.max(5, pCount))];

    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col overflow-x-hidden pb-28">
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
            <div
              className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium ${
                toastMessage.type === 'error'
                  ? 'bg-red-950/95 border-red-500 text-red-100'
                  : toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                  : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
              }`}
            >
              <Info className="w-5 h-5 shrink-0" />
              <span>{toastMessage.msg}</span>
            </div>
          </div>
        )}

        {/* Sticky Top Bar Lobby */}
        <header className="sticky top-0 z-30 bg-[#0B1120]/95 backdrop-blur border-b border-slate-800 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-white tracking-wide">
                Ruang Tunggu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrimoireModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kitab Karakter</span>
              </button>
              <button
                onClick={handleLeaveRoom}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/70 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full max-w-lg mx-auto px-4 pt-4 space-y-5">
          {/* Kartu Kode Ruangan */}
          <div className="bg-gradient-to-br from-[#1E293B] to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 text-center shadow-xl">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              Bagikan Kode Ruangan ke Teman
            </p>
            <div className="flex items-center justify-center gap-3 my-2">
              <span className="text-4xl sm:text-5xl font-black tracking-[0.22em] text-white font-mono">
                {roomData.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 transition"
                title="Salin Kode"
              >
                {copiedCode ? (
                  <Check className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Setiap pemain masuk lewat browser HP masing-masing menggunakan
              kode ini.
            </p>
          </div>

          {/* Daftar Pemain Terhubung */}
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Pemain Terhubung ({pCount}/10)</span>
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                <span className="text-blue-400 font-bold">
                  {matrix.good} Baik
                </span>{' '}
                vs{' '}
                <span className="text-red-400 font-bold">
                  {matrix.evil} Jahat
                </span>
              </span>
            </div>

            <div className="space-y-2">
              {players.map((p, index) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${
                    p.id === user?.uid
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#0B1120]/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-white truncate">
                      {p.name}
                    </span>
                    {p.id === roomData.hostId && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase shrink-0">
                        Host
                      </span>
                    )}
                    {p.id === user?.uid && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold uppercase shrink-0">
                        Kamu
                      </span>
                    )}
                    {p.isBot && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
                        <Bot className="w-3 h-3" /> Bot
                      </span>
                    )}
                  </div>

                  {isHost && p.id !== user?.uid && (
                    <button
                      onClick={() => handleRemovePlayer(p.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition"
                      title="Hapus dari ruangan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isHost && pCount < 10 && (
              <button
                onClick={handleAddBot}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-dashed border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Bot className="w-4 h-4" />
                <span>+ Tambah Bot (Tes Solo)</span>
              </button>
            )}
          </div>

          {/* Pengaturan Peran Spesial */}
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Komposisi Peran Spesial</span>
              </h2>
              {!isHost && (
                <span className="text-[11px] text-slate-400">
                  Diatur oleh Host
                </span>
              )}
            </div>

            {/* Peran Wajib */}
            <div className="p-3 rounded-xl bg-[#0B1120]/70 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  <CharacterPortrait roleId="MERLIN" size="xs" />
                  <CharacterPortrait roleId="ASSASSIN" size="xs" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    Merlin & Assassin
                  </p>
                  <p className="text-xs text-slate-400 leading-snug">
                    Inti permainan Avalon (1 Kubu Arthur, 1 Kubu Mordred)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shrink-0">
                Wajib Aktif
              </span>
            </div>

            {/* Toggle Percival & Morgana */}
            <RoleToggleRow
              title="Percival & Morgana"
              subtitle="Percival melihat Merlin, tapi Morgana ikut menyamar sebagai Merlin."
              badge="1 Baik • 1 Jahat"
              portraits={['PERCIVAL', 'MORGANA']}
              enabled={Boolean(roomData.settings?.percivalMorgana)}
              disabled={!isHost}
              onToggle={() => handleToggleSetting('percivalMorgana')}
            />

            {/* Toggle Mordred */}
            <RoleToggleRow
              title="Mordred"
              subtitle="Pemimpin kegelapan yang tersembunyi dari penglihatan batin Merlin."
              badge="1 Jahat"
              portraits={['MORDRED']}
              enabled={Boolean(roomData.settings?.mordred)}
              disabled={!isHost}
              onToggle={() => handleToggleSetting('mordred')}
            />

            {/* Toggle Oberon */}
            <RoleToggleRow
              title="Oberon"
              subtitle="Pengkhianat misterius; tidak saling kenal dengan rekan Kubu Mordred lainnya."
              badge="1 Jahat"
              portraits={['OBERON']}
              enabled={Boolean(roomData.settings?.oberon)}
              disabled={!isHost}
              onToggle={() => handleToggleSetting('oberon')}
            />
          </div>
        </main>

        {/* Bottom Sticky Start Button */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0B1120]/95 backdrop-blur border-t border-slate-800 p-4">
          <div className="max-w-lg mx-auto">
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={pCount < 5 || pCount > 10}
                className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold text-base shadow-lg transition flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {pCount < 5
                    ? `Butuh Minimal 5 Pemain (${pCount}/5)`
                    : `Mulai Permainan (${pCount} Pemain)`}
                </span>
              </button>
            ) : (
              <div className="w-full py-3.5 px-4 rounded-xl bg-[#1E293B] border border-amber-500/30 text-center text-sm font-semibold text-amber-300">
                Menunggu Host memulai permainan...
              </div>
            )}
          </div>
        </div>

        {showGrimoireModal && (
          <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: PERMAINAN AKTIF (ROLE_REVEAL, PROPOSAL, VOTE, QUEST, ASSASSIN, END)
  // ============================================================================
  const players = roomData.players || [];
  const game = roomData.game || {};
  const matrix = PLAYER_MATRIX[players.length] || PLAYER_MATRIX[5];
  const currentQuest = game.currentQuest || 1;
  const requiredTeamSize = matrix.quests[currentQuest - 1] || 2;
  const leader = players[game.leaderIndex || 0] || players[0];
  const isLeader = leader?.id === user?.uid;
  const myRoleDef = me?.role ? ROLE_DEFINITIONS[me.role] : null;
  const myVision = getSecretVision(me, players, roomData.settings);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col overflow-x-hidden pb-16">
      {/* Notifikasi Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium ${
              toastMessage.type === 'error'
                ? 'bg-red-950/95 border-red-500 text-red-100'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
            }`}
          >
            <Info className="w-5 h-5 shrink-0" />
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* STICKY HEADER: KODE RUANGAN, NAMA PEMAIN & TOMBOL INTIP PERAN */}
      <header className="sticky top-0 z-30 bg-[#0B1120]/95 backdrop-blur border-b border-amber-600/30 px-3 py-2.5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-extrabold text-xs shrink-0">
              {roomData.roomCode}
            </span>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">
                {me?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Ketua:{' '}
                <span className="text-amber-300 font-semibold">
                  {leader?.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowGrimoireModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 transition"
              title="Kitab Karakter"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLogsDrawer(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Riwayat Pertandingan"
            >
              <ScrollText className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setPeekRevealed(false);
                setShowPeekModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Eye className="w-4 h-4" />
              <span>Intip Peran</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg mx-auto px-3.5 pt-3.5 space-y-4">
        {/* PAPAN 5 PERISAI MISI & TRACKER PENOLAKAN VOTING (SELALU TERLIHAT) */}
        {roomData.status !== 'ROLE_REVEAL' && (
          <section className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-3.5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                Papan Misi Camelot ({players.length} Pemain)
              </span>
              <span className="text-[11px] text-slate-400">
                <span className="text-blue-400 font-bold">
                  {matrix.good} Baik
                </span>{' '}
                •{' '}
                <span className="text-red-400 font-bold">
                  {matrix.evil} Jahat
                </span>
              </span>
            </div>

            {/* 5 Perisai Misi */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((qNum) => {
                const res = (game.questResults || [])[qNum - 1];
                const isCurrent =
                  qNum === currentQuest &&
                  roomData.status !== 'ASSASSINATION' &&
                  roomData.status !== 'GAME_OVER';
                const qSize = matrix.quests[qNum - 1];
                const needsTwoFails = matrix.twoFailsQuest4 && qNum === 4;

                let shieldStyle =
                  'bg-[#0B1120] border-slate-700 text-slate-300';
                if (res?.status === 'SUCCESS') {
                  shieldStyle =
                    'bg-blue-600/25 border-blue-500 text-blue-200 shadow-inner shadow-blue-500/20';
                } else if (res?.status === 'FAIL') {
                  shieldStyle =
                    'bg-red-600/25 border-red-500 text-red-200 shadow-inner shadow-red-500/20';
                } else if (isCurrent) {
                  shieldStyle =
                    'bg-amber-500/15 border-amber-400 text-amber-200 ring-2 ring-amber-400/50';
                }

                return (
                  <div
                    key={qNum}
                    className={`rounded-xl border p-2 flex flex-col items-center justify-center text-center relative transition ${shieldStyle}`}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      Misi {qNum}
                    </span>
                    {res?.status === 'SUCCESS' ? (
                      <ShieldCheck className="w-6 h-6 text-blue-400 my-0.5" />
                    ) : res?.status === 'FAIL' ? (
                      <ShieldAlert className="w-6 h-6 text-red-400 my-0.5" />
                    ) : (
                      <span className="text-lg font-black leading-tight my-0.5">
                        {qSize}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold">
                      {res
                        ? `S:${res.successCount} G:${res.failCount}`
                        : `${qSize} Org`}
                    </span>
                    {needsTwoFails && !res && (
                      <span className="mt-0.5 px-1 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[8px] font-extrabold leading-tight">
                        2 Gagal
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tracker Penolakan Tim (1 - 5) */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Penolakan Tim Beruntun:
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((step) => {
                  const active = step === (game.voteTrack || 1);
                  const passed = step < (game.voteTrack || 1);
                  const isFifth = step === 5;
                  return (
                    <div
                      key={step}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border transition ${
                        active
                          ? isFifth
                            ? 'bg-red-600 border-red-400 text-white animate-pulse'
                            : 'bg-amber-500 border-amber-300 text-slate-950'
                          : passed
                          ? 'bg-red-950/80 border-red-700 text-red-400'
                          : 'bg-[#0B1120] border-slate-700 text-slate-500'
                      }`}
                    >
                      {isFifth ? <Skull className="w-3.5 h-3.5" /> : step}
                    </div>
                  );
                })}
              </div>
            </div>
            {(game.voteTrack || 1) === 5 &&
              roomData.status === 'TEAM_PROPOSAL' && (
                <div className="px-3 py-2 rounded-lg bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    Usulan ke-5! Jika tim ini ditolak lagi, Kubu Mordred
                    langsung menang!
                  </span>
                </div>
              )}
          </section>
        )}

        {/* ====================================================================
            FASE A: PEMBAGIAN PERAN RAHASIA (ROLE_REVEAL)
            ==================================================================== */}
        {roomData.status === 'ROLE_REVEAL' && myRoleDef && (
          <section className="space-y-4">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                Fase Pembagian Peran
              </span>
              <h2 className="text-xl font-extrabold text-white mt-2">
                Identitas Rahasiamu Telah Tiba
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pastikan layar ponselmu tidak diintip pemain di sebelahmu.
              </p>
            </div>

            {!mainRoleRevealed ? (
              <button
                onClick={() => setMainRoleRevealed(true)}
                className="w-full py-14 px-6 rounded-2xl bg-gradient-to-b from-[#1E293B] to-slate-900 border-2 border-dashed border-amber-500/60 hover:border-amber-400 flex flex-col items-center justify-center text-center shadow-2xl transition active:scale-[0.99]"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-lg font-extrabold text-white">
                  Ketuk untuk Membuka Kartu Peran
                </p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
                  Lihat kubu, kemampuan khusus, dan siapa saja yang terdeteksi
                  oleh penglihatanmu.
                </p>
              </button>
            ) : (
              <div
                className={`rounded-2xl border-2 p-5 shadow-2xl space-y-4 ${
                  myRoleDef.alignment === 'GOOD'
                    ? 'bg-gradient-to-b from-blue-950/60 to-[#1E293B] border-blue-500'
                    : 'bg-gradient-to-b from-red-950/60 to-[#1E293B] border-red-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <CharacterPortrait roleId={me.role} size="lg" />
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider mb-1 ${
                          myRoleDef.alignment === 'GOOD'
                            ? 'bg-blue-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {myRoleDef.teamLabel}
                      </span>
                      <h3 className="text-2xl font-black text-white leading-tight">
                        {myRoleDef.name}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {myRoleDef.shortDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMainRoleRevealed(false)}
                    className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white shrink-0"
                    title="Sembunyikan Kartu"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed bg-[#0B1120]/60 p-3.5 rounded-xl border border-slate-700/70">
                  {myRoleDef.ability}
                </p>

                {/* Penglihatan Rahasia */}
                <div className="bg-[#0B1120]/80 rounded-xl p-3.5 border border-amber-500/30 space-y-2.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>Penglihatan Batin Rahasia</span>
                  </p>

                  {myVision.targets.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-300">
                        {myVision.label}:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {myVision.targets.map((t) => {
                          const targetRoleDef = t.role
                            ? ROLE_DEFINITIONS[t.role]
                            : null;
                          return (
                            <div
                              key={t.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                                myRoleDef.alignment === 'EVIL'
                                  ? 'bg-red-950/90 border-red-500 text-red-100'
                                  : me.role === 'MERLIN'
                                  ? 'bg-red-950/90 border-red-500 text-red-100'
                                  : 'bg-amber-950/90 border-amber-500 text-amber-100'
                              }`}
                            >
                              <CharacterPortrait
                                roleId={
                                  me.role === 'PERCIVAL'
                                    ? 'MERLIN'
                                    : me.role === 'MERLIN'
                                    ? 'MINION'
                                    : t.role
                                }
                                size="xs"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-extrabold truncate">
                                  {t.name}
                                </p>
                                <p className="text-[10px] opacity-85 truncate">
                                  {me.role === 'PERCIVAL'
                                    ? 'Kandidat Merlin / Morgana'
                                    : me.role === 'MERLIN'
                                    ? 'Kubu Jahat Mordred'
                                    : targetRoleDef?.name || 'Sekutu Mordred'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {myVision.note}
                  </p>
                </div>
              </div>
            )}

            {/* Tombol Konfirmasi Siap */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 space-y-3">
              {!me?.readyRole ? (
                <button
                  onClick={handleConfirmRoleReady}
                  className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-base shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Saya Siap Bermain</span>
                </button>
              ) : (
                <div className="py-3 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-sm font-bold text-center">
                  Kamu sudah siap! Menunggu pemain lain (
                  {players.filter((p) => p.readyRole).length}/{players.length}
                  )...
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 justify-center">
                {players.map((p) => (
                  <span
                    key={p.id}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      p.readyRole
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {p.readyRole ? '✓ ' : '⏳ '}
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* KARTU EPILOG CERITA MISI TERAKHIR & PEMBUKAAN KARTU MISI */}
        {game.lastQuestReveal &&
          (roomData.status === 'TEAM_PROPOSAL' ||
            roomData.status === 'ASSASSINATION' ||
            roomData.status === 'GAME_OVER') && (
            <QuestEpilogueCard reveal={game.lastQuestReveal} />
          )}

        {/* BANNER HASIL VOTING TIM TERAKHIR (PUBLIK UNTUK SEMUA PEMAIN) */}
        {game.lastVoteResult &&
          (roomData.status === 'TEAM_PROPOSAL' ||
            roomData.status === 'QUEST_EXECUTION') && (
            <LastVoteSummaryCard
              result={game.lastVoteResult}
              players={players}
            />
          )}

        {/* KARTU ILUSTRASI & PROLOG CERITA BAB MISI SAAT INI */}
        {(roomData.status === 'TEAM_PROPOSAL' ||
          roomData.status === 'TEAM_VOTE' ||
          roomData.status === 'QUEST_EXECUTION') && (
          <QuestChapterCard
            questNumber={currentQuest}
            needsTwoFails={matrix.twoFailsQuest4 && currentQuest === 4}
          />
        )}

        {/* ====================================================================
            FASE B: PENUNJUKAN TIM MISI (TEAM_PROPOSAL)
            ==================================================================== */}
        {roomData.status === 'TEAM_PROPOSAL' && (
          <section className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="border-b border-slate-700/80 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Misi {currentQuest} • Penunjukan Tim
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  Butuh {requiredTeamSize} Pemain
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white mt-1">
                {isLeader
                  ? `Giliranmu! Pilih ${requiredTeamSize} Anggota Tim Misi`
                  : `${leader?.name} sedang memilih ${requiredTeamSize} anggota tim...`}
              </h2>
            </div>

            <div className="space-y-2">
              {players.map((p) => {
                const isSelected = (game.proposedTeam || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isLeader}
                    onClick={() => handleToggleTeamMember(p.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-950/30'
                        : 'bg-[#0B1120]/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    } ${!isLeader ? 'cursor-default' : 'active:scale-[0.99]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-amber-500 border-amber-300 text-slate-950'
                            : 'bg-slate-900 border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.id === leader?.id && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
                          )}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase">
                        Terpilih
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isLeader ? (
              <button
                onClick={handleSubmitTeamProposal}
                disabled={(game.proposedTeam || []).length !== requiredTeamSize}
                className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold text-base shadow-lg transition flex items-center justify-center gap-2"
              >
                <Swords className="w-5 h-5" />
                <span>
                  Ajukan Tim Misi ({(game.proposedTeam || []).length}/
                  {requiredTeamSize})
                </span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-[#0B1120]/80 border border-slate-800 text-center text-xs text-slate-400">
                Diskusikan di meja bundar! Pilihan Ketua Misi tampil secara
                langsung di atas.
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            FASE C: VOTING TIM SERENTAK DI PONSEL MASING-MASING (TEAM_VOTE)
            ==================================================================== */}
        {roomData.status === 'TEAM_VOTE' && (
          <section className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Voting Tim Misi {currentQuest} (Usulan #{game.voteTrack || 1})
              </span>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                Apakah Kamu Menyetujui Tim Ini?
              </h2>
            </div>

            {/* Daftar Anggota Tim yang Diajukan */}
            <div className="bg-[#0B1120] border border-amber-500/30 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 mb-2">
                Tim yang diajukan oleh{' '}
                <strong className="text-amber-300">{leader?.name}</strong>:
              </p>
              <div className="flex flex-wrap gap-2">
                {(game.proposedTeam || []).map((id) => {
                  const member = players.find((p) => p.id === id);
                  return (
                    <span
                      key={id}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm font-extrabold flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      {member?.name}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tombol Voting Rahasia */}
            {(() => {
              const myVote = (game.teamVotes || {})[user?.uid];
              return (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCastTeamVote('APPROVE')}
                      className={`py-4 px-3 rounded-xl border-2 font-extrabold text-base flex flex-col items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                        myVote === 'APPROVE'
                          ? 'bg-blue-600 border-blue-300 text-white shadow-lg shadow-blue-900/50'
                          : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/50 text-blue-200'
                      }`}
                    >
                      <ThumbsUp className="w-6 h-6" />
                      <span>SETUJU</span>
                    </button>

                    <button
                      onClick={() => handleCastTeamVote('REJECT')}
                      className={`py-4 px-3 rounded-xl border-2 font-extrabold text-base flex flex-col items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                        myVote === 'REJECT'
                          ? 'bg-red-600 border-red-300 text-white shadow-lg shadow-red-900/50'
                          : 'bg-red-950/40 hover:bg-red-900/50 border-red-500/50 text-red-200'
                      }`}
                    >
                      <ThumbsDown className="w-6 h-6" />
                      <span>TOLAK</span>
                    </button>
                  </div>

                  {myVote && (
                    <p className="text-center text-xs font-semibold text-emerald-400">
                      Suara rahasiamu terkunci:{' '}
                      <strong>
                        {myVote === 'APPROVE' ? 'SETUJU' : 'TOLAK'}
                      </strong>{' '}
                      (bisa diubah sebelum semua selesai)
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Status Siapa yang Sudah Memilih */}
            <div className="pt-2 border-t border-slate-700/80">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Status Voting ({Object.keys(game.teamVotes || {}).length}/
                {players.length} Pemain)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {players.map((p) => {
                  const hasVoted = Boolean((game.teamVotes || {})[p.id]);
                  return (
                    <div
                      key={p.id}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                        hasVoted
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-[#0B1120]/70 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="font-bold shrink-0 ml-1">
                        {hasVoted ? '✓ Siap' : '...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ====================================================================
            FASE D: EKSEKUSI MISI (QUEST_EXECUTION)
            ==================================================================== */}
        {roomData.status === 'QUEST_EXECUTION' && (
          <section className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Eksekusi Misi {currentQuest}
              </span>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                {(game.proposedTeam || []).includes(user?.uid)
                  ? 'Kamu Anggota Tim Misi! Pilih Aksi Rahasiamu'
                  : 'Tim Misi Sedang Menjalankan Tugas...'}
              </h2>
            </div>

            {(game.proposedTeam || []).includes(user?.uid) ? (
              (() => {
                const myAction = (game.questActions || {})[user?.uid];
                return myAction ? (
                  <div className="p-5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-center space-y-1">
                    <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-extrabold text-white">
                      Kartu Misi Terkirim!
                    </p>
                    <p className="text-xs text-slate-300">
                      Menunggu anggota tim misi lainnya menyelesaikan pilihan
                      mereka...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pilihanmu akan diacak secara anonim sebelum hasil misi
                      diungkapkan ke meja bundar.
                    </p>

                    <div
                      className={`grid gap-3 ${
                        me?.alignment === 'EVIL' ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      <button
                        onClick={() => handleSubmitQuestCard('SUCCESS')}
                        className="py-5 px-4 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 text-white font-extrabold text-base shadow-lg shadow-blue-950/60 flex flex-col items-center justify-center gap-2 transition active:scale-[0.98]"
                      >
                        <ShieldCheck className="w-8 h-8" />
                        <span>SUKSESKAN MISI</span>
                      </button>

                      {me?.alignment === 'EVIL' && (
                        <button
                          onClick={() => handleSubmitQuestCard('FAIL')}
                          className="py-5 px-4 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-2 border-red-400 text-white font-extrabold text-base shadow-lg shadow-red-950/60 flex flex-col items-center justify-center gap-2 transition active:scale-[0.98]"
                        >
                          <ShieldAlert className="w-8 h-8" />
                          <span>SABOTASE / GAGAL</span>
                        </button>
                      )}
                    </div>

                    {me?.alignment === 'GOOD' && (
                      <p className="text-[11px] text-blue-300/80 text-center">
                        Sebagai Kubu Setia Arthur, kamu hanya dapat mengirim
                        kartu Sukses.
                      </p>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-5 rounded-xl bg-[#0B1120] border border-slate-800 text-center space-y-2">
                <Swords className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                <p className="text-sm font-bold text-slate-200">
                  Menahan napas menunggu hasil dari tim misi...
                </p>
                <p className="text-xs text-slate-400">
                  Anggota tim sedang memilih kartu Sukses atau Sabotase di
                  ponsel mereka.
                </p>
              </div>
            )}

            {/* Status Anggota Tim Misi */}
            <div className="pt-2 border-t border-slate-700/80 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Progres Tim Misi ({Object.keys(game.questActions || {}).length}/
                {(game.proposedTeam || []).length})
              </p>
              {(game.proposedTeam || []).map((id) => {
                const member = players.find((p) => p.id === id);
                const done = Boolean((game.questActions || {})[id]);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B1120]/70 border border-slate-800 text-xs"
                  >
                    <span className="font-bold text-white">{member?.name}</span>
                    <span
                      className={
                        done ? 'text-emerald-400 font-bold' : 'text-amber-400'
                      }
                    >
                      {done ? '✓ Kartu Terkirim' : 'Sedang Memilih...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ====================================================================
            FASE E: MISI PEMBUNUHAN ASSASSIN (ASSASSINATION)
            ==================================================================== */}
        {roomData.status === 'ASSASSINATION' && (
          <section className="bg-gradient-to-b from-red-950/60 to-[#1E293B] border-2 border-red-500 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <CharacterPortrait roleId="ASSASSIN" size="md" />
              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider">
                Serangan Terakhir Kubu Mordred
              </span>
              <h2 className="text-xl font-black text-white">
                3 Misi Berhasil! Saatnya Assassin Beraksi
              </h2>
              <p className="text-xs text-slate-300">
                Jika Assassin berhasil menebak siapa <strong>Merlin</strong>,
                kemenangan Kubu Arthur langsung direbut oleh Kubu Mordred!
              </p>
            </div>

            {me?.role === 'ASSASSIN' ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Pilih 1 Pemain Kubu Arthur untuk Dieksekusi:
                </p>
                <div className="space-y-2">
                  {players
                    .filter((p) => p.alignment === 'GOOD')
                    .map((p) => {
                      const isTarget = selectedAssassinTarget === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedAssassinTarget(p.id);
                            setConfirmAssassinate(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition ${
                            isTarget
                              ? 'bg-red-600/30 border-red-400 text-white shadow-lg'
                              : 'bg-[#0B1120]/80 border-slate-800 text-slate-200 hover:border-red-500/50'
                          }`}
                        >
                          <span className="font-bold text-sm">{p.name}</span>
                          {isTarget && (
                            <span className="px-2.5 py-0.5 rounded bg-red-600 text-white text-xs font-extrabold flex items-center gap-1">
                              <Skull className="w-3.5 h-3.5" /> Target
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {selectedAssassinTarget && !confirmAssassinate && (
                  <button
                    onClick={() => setConfirmAssassinate(true)}
                    className="w-full py-4 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base shadow-lg flex items-center justify-center gap-2"
                  >
                    <Skull className="w-5 h-5" />
                    <span>
                      Eksekusi{' '}
                      {
                        players.find((p) => p.id === selectedAssassinTarget)
                          ?.name
                      }
                    </span>
                  </button>
                )}

                {selectedAssassinTarget && confirmAssassinate && (
                  <div className="p-3.5 rounded-xl bg-red-950 border border-red-400 space-y-2.5">
                    <p className="text-xs font-bold text-red-100 text-center">
                      Yakin mengeksekusi{' '}
                      <strong>
                        {
                          players.find((p) => p.id === selectedAssassinTarget)
                            ?.name
                        }
                      </strong>{' '}
                      sebagai Merlin? Keputusan ini tidak bisa dibatalkan!
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setConfirmAssassinate(false)}
                        className="py-2.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleExecuteAssassination}
                        className="py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold"
                      >
                        Ya, Eksekusi Sekarang!
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0B1120]/80 border border-red-500/40 text-center space-y-2">
                <Skull className="w-8 h-8 text-red-400 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-white">
                  Assassin ({players.find((p) => p.role === 'ASSASSIN')?.name})
                  sedang berdiskusi dengan sekutunya...
                </p>
                <p className="text-xs text-slate-400">
                  Jaga ekspresi wajahmu! Jangan beri petunjuk siapa Merlin
                  sebenarnya.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            FASE F: LAYAR AKHIR & PENGUNGKAPAN PERAN (GAME_OVER)
            ==================================================================== */}
        {roomData.status === 'GAME_OVER' && (
          <section className="space-y-4">
            <div
              className={`rounded-2xl border-2 p-5 text-center shadow-2xl space-y-2 ${
                game.winner === 'GOOD'
                  ? 'bg-gradient-to-b from-blue-900/70 to-[#1E293B] border-blue-400'
                  : 'bg-gradient-to-b from-red-900/70 to-[#1E293B] border-red-400'
              }`}
            >
              <Crown
                className={`w-12 h-12 mx-auto ${
                  game.winner === 'GOOD' ? 'text-blue-300' : 'text-red-300'
                }`}
              />
              <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">
                Permainan Berakhir
              </p>
              <h2 className="text-2xl font-black text-white">
                {game.winner === 'GOOD'
                  ? 'KEMENANGAN KUBU SETIA ARTHUR!'
                  : 'KEMENANGAN KUBU JAHAT MORDRED!'}
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed pt-1">
                {game.winReason}
              </p>
            </div>

            {/* Pengungkapan Semua Identitas */}
            <div className="bg-[#1E293B] border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
                Pengungkapan Seluruh Identitas
              </h3>
              <div className="space-y-2">
                {players.map((p) => {
                  const rDef = p.role ? ROLE_DEFINITIONS[p.role] : null;
                  const wasAssassinated = game.assassinTargetId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${
                        rDef?.alignment === 'GOOD'
                          ? 'bg-blue-950/30 border-blue-500/40'
                          : 'bg-red-950/30 border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.role && (
                          <CharacterPortrait roleId={p.role} size="xs" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">
                            {p.name}
                          </p>
                          {wasAssassinated && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold">
                              Target Assassin
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                          rDef?.alignment === 'GOOD'
                            ? 'bg-blue-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {rDef?.name || 'Tidak Diketahui'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tombol Rematch / Keluar */}
            <div className="space-y-2.5 pt-1">
              {isHost ? (
                <button
                  onClick={handleRematch}
                  className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-base shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Main Lagi di Ruangan Ini</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#1E293B] border border-amber-500/30 text-center text-xs font-semibold text-amber-300">
                  Menunggu Host memulai ronde baru di ruangan ini...
                </div>
              )}

              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Ruangan</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ======================================================================
          MODAL "INTIP PERAN SAYA" (BISA DIAKSES KAPAN SAJA SAAT PERTANDINGAN)
          ====================================================================== */}
      {showPeekModal && myRoleDef && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1E293B] border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white">
                  Kartu Identitas Rahasia
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPeekModal(false);
                  setPeekRevealed(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!peekRevealed ? (
              <button
                onClick={() => setPeekRevealed(true)}
                className="w-full py-12 px-4 rounded-xl bg-[#0B1120] border-2 border-dashed border-amber-500/50 text-center space-y-2"
              >
                <Eye className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="font-extrabold text-white text-base">
                  Ketuk untuk Mengintip Peranmu
                </p>
                <p className="text-xs text-slate-400">
                  Pastikan tidak ada pemain lain yang melihat layarmu.
                </p>
              </button>
            ) : (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                    myRoleDef.alignment === 'GOOD'
                      ? 'bg-blue-950/60 border-blue-500'
                      : 'bg-red-950/60 border-red-500'
                  }`}
                >
                  <CharacterPortrait roleId={me.role} size="md" />
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold uppercase mb-1 ${
                        myRoleDef.alignment === 'GOOD'
                          ? 'bg-blue-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {myRoleDef.teamLabel}
                    </span>
                    <h4 className="text-xl font-black text-white">
                      {myRoleDef.name}
                    </h4>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                      {myRoleDef.ability}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B1120] border border-amber-500/30 space-y-2">
                  <p className="text-xs font-extrabold uppercase text-amber-400">
                    Penglihatan Batin:
                  </p>
                  {myVision.targets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {myVision.targets.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-extrabold"
                        >
                          <CharacterPortrait
                            roleId={
                              me.role === 'PERCIVAL'
                                ? 'MERLIN'
                                : me.role === 'MERLIN'
                                ? 'MINION'
                                : t.role
                            }
                            size="xs"
                          />
                          <span>{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{myVision.note}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowPeekModal(false);
                setPeekRevealed(false);
              }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
            >
              Tutup & Sembunyikan
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL RIWAYAT PERTANDINGAN (MATCH LOGS)
          ====================================================================== */}
      {showLogsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1E293B] border border-amber-500/40 rounded-2xl p-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white">
                  Catatan Kronik Meja Bundar
                </h3>
              </div>
              <button
                onClick={() => setShowLogsDrawer(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(game.logs || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Belum ada catatan peristiwa di pertandingan ini.
                </p>
              ) : (
                [...(game.logs || [])].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                      entry.type === 'success' || entry.type === 'approve'
                        ? 'bg-blue-950/40 border-blue-500/30 text-blue-100'
                        : entry.type === 'fail' ||
                          entry.type === 'reject' ||
                          entry.type === 'assassin'
                        ? 'bg-red-950/40 border-red-500/30 text-red-100'
                        : 'bg-[#0B1120] border-slate-800 text-slate-300'
                    }`}
                  >
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL KITAB KARAKTER (DAFTAR SEMUA 8 POTRET & KEMAMPUAN PERAN)
          ====================================================================== */}
      {showGrimoireModal && (
        <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
      )}
    </div>
  );
}

// ============================================================================
// KOMPONEN ILUSTRASI CUSTOM SVG: KASTIL CAMELOT (BERANDA)
// ============================================================================
function CamelotHeroIllustration() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl shadow-amber-950/40 bg-[#0B1120]">
      <svg
        viewBox="0 0 400 175"
        className="w-full h-auto block"
        role="img"
        aria-label="Ilustrasi Kastil Camelot dan Meja Bundar"
      >
        <defs>
          <linearGradient id="camelotSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#070B19" />
            <stop offset="55%" stopColor="#172554" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <radialGradient id="camelotMoonGlow" cx="50%" cy="38%" r="45%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0B1120" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="castleStone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="goldSpire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* Langit Malam & Cahaya Bulan Emas */}
        <rect width="400" height="175" fill="url(#camelotSky)" />
        <circle cx="200" cy="65" r="95" fill="url(#camelotMoonGlow)" />
        <circle cx="200" cy="54" r="24" fill="#FEF3C7" opacity="0.92" />

        {/* Bintang-bintang */}
        <circle cx="48" cy="28" r="1.4" fill="#FDE68A" />
        <circle cx="88" cy="46" r="1.1" fill="#E2E8F0" />
        <circle cx="128" cy="22" r="1.6" fill="#FDE68A" />
        <circle cx="275" cy="25" r="1.5" fill="#FDE68A" />
        <circle cx="322" cy="42" r="1.2" fill="#E2E8F0" />
        <circle cx="358" cy="26" r="1.6" fill="#FDE68A" />

        {/* Pegunungan Latar */}
        <polygon points="0,145 75,85 155,145" fill="#0F172A" opacity="0.85" />
        <polygon
          points="245,145 325,82 400,145"
          fill="#0F172A"
          opacity="0.85"
        />

        {/* Siluet Kastil Agung Camelot */}
        <g fill="url(#castleStone)" stroke="#475569" strokeWidth="0.7">
          {/* Menara Kiri */}
          <rect x="112" y="78" width="22" height="65" />
          <polygon points="109,78 123,54 137,78" fill="url(#goldSpire)" />
          {/* Menara Kanan */}
          <rect x="266" y="78" width="22" height="65" />
          <polygon points="263,78 277,54 291,78" fill="url(#goldSpire)" />
          {/* Menara Tengah Utama */}
          <rect x="178" y="54" width="44" height="88" />
          <polygon points="174,54 200,22 226,54" fill="url(#goldSpire)" />
          {/* Sayap Benteng */}
          <rect x="134" y="92" width="44" height="52" />
          <rect x="222" y="92" width="44" height="52" />
        </g>

        {/* Jendela Kastil Bercahaya Emas */}
        <g fill="#FBBF24">
          <rect x="196" y="64" width="8" height="14" rx="4" />
          <rect x="186" y="84" width="6" height="11" rx="3" />
          <rect x="208" y="84" width="6" height="11" rx="3" />
          <rect x="120" y="90" width="5" height="9" rx="2.5" />
          <rect x="275" y="90" width="5" height="9" rx="2.5" />
          <rect x="148" y="104" width="5" height="9" rx="2.5" />
          <rect x="247" y="104" width="5" height="9" rx="2.5" />
        </g>

        {/* Bukit Hijau-Gelap & Danau */}
        <path d="M0,140 Q200,118 400,140 L400,175 L0,175 Z" fill="#090E1A" />
        <path
          d="M0,140 Q200,118 400,140"
          fill="none"
          stroke="#D97706"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Lambang Meja Bundar & Pedang Excalibur di Tengah Bawah */}
        <g transform="translate(200, 146)">
          <ellipse
            cx="0"
            cy="4"
            rx="46"
            ry="14"
            fill="#1E293B"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <ellipse
            cx="0"
            cy="4"
            rx="34"
            ry="9"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          {/* Pedang Excalibur Tegak */}
          <polygon points="0,-24 3,-4 0,4 -3,-4" fill="#E0F2FE" />
          <rect x="-8" y="-6" width="16" height="2.5" rx="1" fill="#FBBF24" />
          <rect x="-1.5" y="-12" width="3" height="6" fill="#B45309" />
          <circle cx="0" cy="-13" r="2.2" fill="#FDE047" />
        </g>
      </svg>
    </div>
  );
}

// ============================================================================
// KOMPONEN ILUSTRASI CUSTOM SVG: POTRET 8 KARAKTER AVALON
// ============================================================================
function CharacterPortrait({ roleId, size = 'md', className = '' }) {
  const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.LOYAL_SERVANT;
  const isGood = roleDef.alignment === 'GOOD';

  const sizeClasses = {
    xs: 'w-10 h-10 rounded-xl border',
    sm: 'w-12 h-12 rounded-xl border-2',
    md: 'w-16 h-16 rounded-2xl border-2',
    lg: 'w-20 h-20 rounded-2xl border-2',
  };

  const frameStyle = isGood
    ? 'border-amber-400/80 shadow-md shadow-blue-950/60 bg-slate-900'
    : 'border-red-500/80 shadow-md shadow-red-950/60 bg-slate-950';

  const uid = `${roleId}_${size}`;

  return (
    <div
      className={`overflow-hidden shrink-0 relative select-none ${sizeClasses[size]} ${frameStyle} ${className}`}
      title={roleDef.name}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full block">
        <defs>
          <radialGradient id={`bg_good_${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="60%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#090D16" />
          </radialGradient>
          <radialGradient id={`bg_evil_${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="60%" stopColor="#450A0A" />
            <stop offset="100%" stopColor="#09090B" />
          </radialGradient>
          <radialGradient id={`bg_morgana_${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#7E22CE" />
            <stop offset="60%" stopColor="#3B0764" />
            <stop offset="100%" stopColor="#09090B" />
          </radialGradient>
          <radialGradient id={`bg_oberon_${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#065F46" />
            <stop offset="60%" stopColor="#022C22" />
            <stop offset="100%" stopColor="#050A08" />
          </radialGradient>
          <linearGradient id={`goldGrad_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id={`steelGrad_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* Latar Belakang Sesuai Karakter */}
        <rect
          width="100"
          height="100"
          fill={
            roleId === 'MORGANA'
              ? `url(#bg_morgana_${uid})`
              : roleId === 'OBERON'
              ? `url(#bg_oberon_${uid})`
              : isGood
              ? `url(#bg_good_${uid})`
              : `url(#bg_evil_${uid})`
          }
        />

        {/* 1. MERLIN: Penyihir Agung Berjubah Biru Safir, Janggut Putih, Tongkat Kristal */}
        {roleId === 'MERLIN' && (
          <g>
            {/* Lingkaran Sihir Batin */}
            <circle
              cx="50"
              cy="40"
              r="30"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.7"
            />
            {/* Jubah Penyihir Biru Safir */}
            <path d="M16,100 Q24,62 50,60 Q76,62 84,100 Z" fill="#1D4ED8" />
            <path
              d="M32,63 L50,96 L68,63"
              fill="none"
              stroke={`url(#goldGrad_${uid})`}
              strokeWidth="2.5"
            />
            {/* Bintang pada Jubah */}
            <circle cx="28" cy="82" r="1.5" fill="#FDE047" />
            <circle cx="72" cy="84" r="1.5" fill="#FDE047" />
            {/* Tudung Penyihir */}
            <path d="M27,54 Q30,20 50,15 Q70,20 73,54 Z" fill="#1E40AF" />
            {/* Wajah & Mata Bercahaya Biru */}
            <ellipse cx="50" cy="43" rx="13" ry="15" fill="#FDE68A" />
            <circle cx="45" cy="40" r="2" fill="#38BDF8" />
            <circle cx="55" cy="40" r="2" fill="#38BDF8" />
            {/* Janggut Putih Panjang */}
            <path
              d="M37,47 Q36,75 50,86 Q64,75 63,47 Q50,53 37,47 Z"
              fill="#F8FAFC"
            />
            {/* Tongkat Kristal Bercahaya di Kanan */}
            <line
              x1="82"
              y1="26"
              x2="78"
              y2="98"
              stroke="#92400E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="82" cy="24" r="9" fill="#38BDF8" opacity="0.35" />
            <polygon
              points="82,16 88,24 82,32 76,24"
              fill="#7DD3FC"
              stroke="#E0F2FE"
              strokeWidth="1"
            />
          </g>
        )}

        {/* 2. PERCIVAL: Ksatria Pelindung Zirah Perak-Emas, Perisai Naga & Pedang */}
        {roleId === 'PERCIVAL' && (
          <g>
            {/* Jubah Merah-Biru Bangsawan */}
            <path d="M18,100 L28,62 L72,62 L82,100 Z" fill="#1E3A8A" />
            {/* Zirah Baja Perak & Bahu Emas */}
            <path
              d="M25,100 Q30,64 50,62 Q70,64 75,100 Z"
              fill={`url(#steelGrad_${uid})`}
            />
            <path
              d="M22,68 Q32,58 40,66 L32,78 Z"
              fill={`url(#goldGrad_${uid})`}
            />
            <path
              d="M78,68 Q68,58 60,66 L68,78 Z"
              fill={`url(#goldGrad_${uid})`}
            />
            {/* Kepala Ksatria & Mahkota Pelindung */}
            <ellipse cx="50" cy="41" rx="13" ry="15" fill="#FCD34D" />
            <path
              d="M36,34 Q50,24 64,34 L62,27 Q50,20 38,27 Z"
              fill={`url(#goldGrad_${uid})`}
            />
            <path d="M36,35 Q38,22 50,21 Q62,22 64,35" fill="#78350F" />
            <circle cx="45" cy="41" r="1.8" fill="#1E293B" />
            <circle cx="55" cy="41" r="1.8" fill="#1E293B" />
            {/* Pedang Tegak di Kiri */}
            <polygon points="18,18 21,64 15,64" fill="#F8FAFC" />
            <rect
              x="12"
              y="64"
              width="12"
              height="3"
              rx="1"
              fill={`url(#goldGrad_${uid})`}
            />
            {/* Perisai Lambang Naga di Kanan */}
            <path
              d="M66,62 L88,62 L86,82 Q77,94 77,94 Q68,82 66,62 Z"
              fill="#1D4ED8"
              stroke={`url(#goldGrad_${uid})`}
              strokeWidth="2.5"
            />
            <path
              d="M73,72 Q79,68 81,76 Q76,80 74,84"
              fill="none"
              stroke="#FDE047"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 3. PELAYAN SETIA ARTHUR: Ksatria Kerajaan dengan Panji Singa Emas */}
        {roleId === 'LOYAL_SERVANT' && (
          <g>
            {/* Panji Singa Emas di Belakang */}
            <rect
              x="14"
              y="16"
              width="22"
              height="58"
              fill="#1D4ED8"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
            <circle cx="25" cy="36" r="6" fill="#FBBF24" />
            {/* Bahu & Jubah Royal Blue */}
            <path d="M20,100 Q28,62 50,60 Q72,62 80,100 Z" fill="#2563EB" />
            <path d="M34,62 L50,86 L66,62" fill="#E2E8F0" />
            <circle cx="50" cy="70" r="4" fill={`url(#goldGrad_${uid})`} />
            {/* Kepala Ksatria Muda */}
            <ellipse cx="50" cy="41" rx="13" ry="15" fill="#FDE68A" />
            <path
              d="M36,36 Q39,22 50,22 Q61,22 64,36 Q55,30 36,36 Z"
              fill="#92400E"
            />
            <circle cx="45" cy="42" r="1.8" fill="#0F172A" />
            <circle cx="55" cy="42" r="1.8" fill="#0F172A" />
            <path
              d="M46,49 Q50,52 54,49"
              fill="none"
              stroke="#92400E"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 4. ASSASSIN: Tudung Hitam-Crimson, Tatapan Tajam, Belati Beracun */}
        {roleId === 'ASSASSIN' && (
          <g>
            {/* Jubah & Tudung Gelap */}
            <path
              d="M16,100 Q24,58 50,56 Q76,58 84,100 Z"
              fill="#18181B"
              stroke="#991B1B"
              strokeWidth="1.5"
            />
            <path
              d="M25,58 Q28,18 50,15 Q72,18 75,58 Q50,48 25,58 Z"
              fill="#09090B"
              stroke="#DC2626"
              strokeWidth="1.5"
            />
            {/* Wajah Tertutup Bayangan & Masker */}
            <ellipse cx="50" cy="42" rx="12" ry="13" fill="#27272A" />
            <path d="M38,44 L62,44 L59,54 Q50,58 41,54 Z" fill="#7F1D1D" />
            {/* Mata Merah Tajam Menyala */}
            <polygon points="41,39 47,41 42,42" fill="#EF4444" />
            <polygon points="59,39 53,41 58,42" fill="#EF4444" />
            {/* Belati Beracun Berkilau di Kanan */}
            <polygon points="82,24 86,58 78,58" fill="#E2E8F0" />
            <polygon points="82,24 85,42 82,45" fill="#22C55E" />
            <rect x="74" y="58" width="16" height="3" rx="1" fill="#DC2626" />
            <rect x="80" y="61" width="4" height="10" fill="#18181B" />
          </g>
        )}

        {/* 5. MORGANA: Penyihir Ungu Gelap, Mahkota Bulan Sabit & Kabut Sihir */}
        {roleId === 'MORGANA' && (
          <g>
            {/* Kabut Sihir Ungu */}
            <circle cx="24" cy="70" r="12" fill="#A855F7" opacity="0.35" />
            <circle cx="76" cy="68" r="13" fill="#C084FC" opacity="0.35" />
            {/* Gaun Penyihir Ungu Gelap */}
            <path
              d="M18,100 Q28,60 50,58 Q72,60 82,100 Z"
              fill="#3B0764"
              stroke="#A855F7"
              strokeWidth="1.2"
            />
            <path d="M38,60 L50,84 L62,60" fill="#581C87" />
            {/* Rambut Gelap & Wajah Pucat */}
            <path
              d="M31,36 Q30,74 36,84 L64,84 Q70,74 69,36 Z"
              fill="#09090B"
            />
            <ellipse cx="50" cy="43" rx="12" ry="14" fill="#F3E8FF" />
            {/* Mahkota Bulan Sabit */}
            <path
              d="M36,27 Q50,36 64,27 Q58,18 50,24 Q42,18 36,27 Z"
              fill="#E9D5FF"
              stroke="#A855F7"
              strokeWidth="1"
            />
            <circle cx="50" cy="21" r="2.5" fill="#C084FC" />
            {/* Mata Ungu Misterius */}
            <circle cx="45" cy="42" r="2" fill="#9333EA" />
            <circle cx="55" cy="42" r="2" fill="#9333EA" />
            <path
              d="M46,50 Q50,48 54,50"
              fill="none"
              stroke="#7E22CE"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* 6. MORDRED: Zirah Besi Hitam Berduri & Mahkota Bayangan Gelap */}
        {roleId === 'MORDRED' && (
          <g>
            {/* Bahu Zirah Hitam Berduri */}
            <path
              d="M16,100 Q26,58 50,56 Q74,58 84,100 Z"
              fill="#18181B"
              stroke="#DC2626"
              strokeWidth="1.5"
            />
            <polygon
              points="16,66 26,52 34,66"
              fill="#27272A"
              stroke="#EF4444"
              strokeWidth="1"
            />
            <polygon
              points="84,66 74,52 66,66"
              fill="#27272A"
              stroke="#EF4444"
              strokeWidth="1"
            />
            {/* Helm/Wajah Gelap & Mahkota Hitam Berduri */}
            <ellipse
              cx="50"
              cy="42"
              rx="13"
              ry="15"
              fill="#27272A"
              stroke="#52525B"
              strokeWidth="1"
            />
            <polygon
              points="35,30 39,16 45,26 50,13 55,26 61,16 65,30"
              fill="#09090B"
              stroke="#EF4444"
              strokeWidth="1.3"
            />
            {/* Visor & Mata Bara Merah */}
            <path d="M39,39 L61,39 L57,46 L43,46 Z" fill="#09090B" />
            <circle cx="45" cy="42" r="2.2" fill="#EF4444" />
            <circle cx="55" cy="42" r="2.2" fill="#EF4444" />
          </g>
        )}

        {/* 7. OBERON: Topeng Hutan Misterius, Tanduk Ranting & Mata Menyala */}
        {roleId === 'OBERON' && (
          <g>
            {/* Kabut Hutan */}
            <path d="M14,100 Q22,60 50,58 Q78,60 86,100 Z" fill="#064E3B" />
            {/* Tanduk Hutan Misterius */}
            <path
              d="M38,28 Q28,16 24,10 M33,21 L26,22"
              stroke="#6EE7B7"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M62,28 Q72,16 76,10 M67,21 L74,22"
              stroke="#6EE7B7"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Topeng Kayu/Kabut */}
            <path
              d="M36,30 Q50,24 64,30 L61,54 Q50,62 39,54 Z"
              fill="#022C22"
              stroke="#34D399"
              strokeWidth="1.5"
            />
            {/* Mata Spectral Menyala */}
            <ellipse cx="44" cy="41" rx="3" ry="2" fill="#A7F3D0" />
            <ellipse cx="56" cy="41" rx="3" ry="2" fill="#A7F3D0" />
            <path
              d="M45,50 L50,47 L55,50"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.4"
            />
          </g>
        )}

        {/* 8. KAKI TANGAN MORDRED: Konspirator Berjubah Gelap & Segel Gagak Merah */}
        {roleId === 'MINION' && (
          <g>
            <path d="M18,100 Q26,60 50,58 Q74,60 82,100 Z" fill="#1F2937" />
            <path
              d="M28,56 Q32,20 50,18 Q68,20 72,56 Z"
              fill="#111827"
              stroke="#B91C1C"
              strokeWidth="1.2"
            />
            <ellipse cx="50" cy="42" rx="11" ry="13" fill="#374151" />
            <circle cx="45" cy="41" r="1.8" fill="#F87171" />
            <circle cx="55" cy="41" r="1.8" fill="#F87171" />
            {/* Segel Gagak Merah di Dada */}
            <circle
              cx="50"
              cy="76"
              r="10"
              fill="#7F1D1D"
              stroke="#EF4444"
              strokeWidth="1.5"
            />
            <polygon points="44,76 50,71 56,76 50,81" fill="#FCA5A5" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// KOMPONEN ILUSTRASI CUSTOM SVG: PEMANDANGAN PANORAMIK 5 MISI (BAB I - BAB V)
// ============================================================================
function QuestIllustration({ questNumber, outcome = null }) {
  const q = Math.min(5, Math.max(1, questNumber || 1));
  const isSuccess = outcome === 'SUCCESS';
  const isFail = outcome === 'FAIL';
  const uid = `quest_${q}_${outcome || 'pro'}`;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-700/80 bg-[#0B1120] relative">
      <svg
        viewBox="0 0 400 135"
        className="w-full h-auto block"
        role="img"
        aria-label={`Ilustrasi Misi ${q}`}
      >
        <defs>
          <linearGradient id={`sky_${uid}`} x1="0" y1="0" x2="0" y2="1">
            {isSuccess ? (
              <>
                <stop offset="0%" stopColor="#0C4A6E" />
                <stop offset="55%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#F59E0B" />
              </>
            ) : isFail ? (
              <>
                <stop offset="0%" stopColor="#18181B" />
                <stop offset="55%" stopColor="#7F1D1D" />
                <stop offset="100%" stopColor="#DC2626" />
              </>
            ) : q === 1 ? (
              <>
                <stop offset="0%" stopColor="#064E3B" />
                <stop offset="60%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
              </>
            ) : q === 2 ? (
              <>
                <stop offset="0%" stopColor="#090D16" />
                <stop offset="60%" stopColor="#1E1B4B" />
                <stop offset="100%" stopColor="#312E81" />
              </>
            ) : q === 3 ? (
              <>
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="55%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#3B0764" />
              </>
            ) : q === 4 ? (
              <>
                <stop offset="0%" stopColor="#09090B" />
                <stop offset="55%" stopColor="#311042" />
                <stop offset="100%" stopColor="#1E293B" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#450A0A" />
                <stop offset="55%" stopColor="#991B1B" />
                <stop offset="100%" stopColor="#D97706" />
              </>
            )}
          </linearGradient>
        </defs>

        <rect width="400" height="135" fill={`url(#sky_${uid})`} />

        {/* BAB I: GERBANG HUTAN BROCÉLIANDE */}
        {q === 1 && (
          <g>
            {/* Siluet Pohon Tua Kiri & Kanan */}
            <path d="M0,135 L0,10 Q45,35 72,135 Z" fill="#022C22" />
            <path d="M400,135 L400,10 Q355,35 328,135 Z" fill="#022C22" />
            {/* Gerbang Batu Megalitikum */}
            <rect
              x="148"
              y="34"
              width="22"
              height="90"
              rx="3"
              fill="#334155"
              stroke="#64748B"
            />
            <rect
              x="230"
              y="34"
              width="22"
              height="90"
              rx="3"
              fill="#334155"
              stroke="#64748B"
            />
            <rect
              x="138"
              y="22"
              width="124"
              height="18"
              rx="4"
              fill="#475569"
              stroke="#94A3B8"
            />
            {/* Cahaya Suar di Tengah Gerbang */}
            <circle
              cx="200"
              cy="86"
              r="26"
              fill={isFail ? '#EF4444' : '#38BDF8'}
              opacity={isFail ? '0.25' : '0.45'}
            />
            <polygon
              points="194,116 200,72 206,116"
              fill={isFail ? '#7F1D1D' : '#FDE047'}
            />
            {/* Kabut Hutan */}
            <ellipse
              cx="200"
              cy="126"
              rx="195"
              ry="16"
              fill="#94A3B8"
              opacity="0.22"
            />
          </g>
        )}

        {/* BAB II: BIARA RELIK GLASTONBURY */}
        {q === 2 && (
          <g>
            {/* Bulan Purnama & Jendela Kaca Patri */}
            <circle cx="200" cy="46" r="24" fill="#FEF3C7" opacity="0.85" />
            <circle
              cx="200"
              cy="46"
              r="24"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            {/* Pilar Katedral Batu */}
            <rect x="95" y="15" width="18" height="120" fill="#1E293B" />
            <rect x="287" y="15" width="18" height="120" fill="#1E293B" />
            <path
              d="M95,45 Q200,0 305,45"
              fill="none"
              stroke="#475569"
              strokeWidth="5"
            />
            {/* Altar & Cawan Suci */}
            <rect
              x="165"
              y="102"
              width="70"
              height="28"
              fill="#334155"
              stroke="#F59E0B"
              strokeWidth="1"
            />
            <path
              d="M192,80 L208,80 L203,92 L206,100 L194,100 L197,92 Z"
              fill={isFail ? '#EF4444' : '#FDE047'}
            />
            {/* Lilin Altar */}
            <rect x="174" y="88" width="4" height="14" fill="#F8FAFC" />
            <circle cx="176" cy="85" r="3" fill="#FBBF24" />
            <rect x="222" y="88" width="4" height="14" fill="#F8FAFC" />
            <circle cx="224" cy="85" r="3" fill="#FBBF24" />
          </g>
        )}

        {/* BAB III: JEMBATAN KABUT DANAU AVALON */}
        {q === 3 && (
          <g>
            {/* Permukaan Danau Mistis */}
            <rect x="0" y="92" width="400" height="43" fill="#0F172A" />
            {/* Jembatan Batu Melengkung */}
            <path
              d="M40,102 Q200,46 360,102 L360,114 Q200,62 40,114 Z"
              fill="#475569"
              stroke="#94A3B8"
              strokeWidth="1"
            />
            {/* Pedang Excalibur Muncul di Tengah Danau */}
            <circle
              cx="200"
              cy="62"
              r="22"
              fill={isFail ? '#A855F7' : '#38BDF8'}
              opacity="0.35"
            />
            <polygon
              points="200,32 203,64 197,64"
              fill={isFail ? '#C084FC' : '#E0F2FE'}
            />
            <rect x="192" y="64" width="16" height="3" fill="#FBBF24" />
            {/* Riak Air */}
            <ellipse
              cx="200"
              cy="112"
              rx="52"
              ry="5"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1"
              opacity="0.6"
            />
          </g>
        )}

        {/* BAB IV: PENGEPUNGAN BENTENG TINTAGEL */}
        {q === 4 && (
          <g>
            {/* Kilatan Petir di Langit Badai */}
            <polyline
              points="115,6 102,42 118,42 98,78"
              fill="none"
              stroke="#FDE047"
              strokeWidth="2.5"
            />
            <polyline
              points="290,10 278,44 292,44 275,75"
              fill="none"
              stroke="#E0F2FE"
              strokeWidth="2"
            />
            {/* Tebing Karang & Benteng Tintagel */}
            <polygon points="85,135 125,74 275,74 315,135" fill="#09090B" />
            <rect
              x="150"
              y="42"
              width="100"
              height="36"
              fill="#1E293B"
              stroke="#475569"
            />
            <rect x="144" y="32" width="18" height="46" fill="#334155" />
            <rect x="238" y="32" width="18" height="46" fill="#334155" />
            {/* Panji Kerajaan di Puncak */}
            <line
              x1="200"
              y1="16"
              x2="200"
              y2="42"
              stroke="#FBBF24"
              strokeWidth="2"
            />
            <polygon
              points="200,16 222,22 200,28"
              fill={isFail ? '#DC2626' : '#2563EB'}
            />
          </g>
        )}

        {/* BAB V: PERTEMPURAN TERAKHIR DI BUKIT CAMLANN */}
        {q === 5 && (
          <g>
            {/* Matahari Senja Merah / Cahaya Fajar */}
            <circle
              cx="200"
              cy="88"
              r="38"
              fill={isSuccess ? '#FDE047' : '#EF4444'}
              opacity="0.75"
            />
            {/* Bukit Camlann */}
            <path d="M0,135 Q200,72 400,135 Z" fill="#09090B" />
            {/* Tombak & Panji Pertempuran */}
            <line
              x1="145"
              y1="54"
              x2="155"
              y2="112"
              stroke="#94A3B8"
              strokeWidth="2"
            />
            <polygon points="145,54 125,62 146,68" fill="#2563EB" />
            <line
              x1="255"
              y1="54"
              x2="245"
              y2="112"
              stroke="#94A3B8"
              strokeWidth="2"
            />
            <polygon points="255,54 275,62 254,68" fill="#DC2626" />
            {/* Pedang Tertancap di Puncak Bukit */}
            <polygon points="200,56 203,95 197,95" fill="#F8FAFC" />
            <rect x="192" y="66" width="16" height="3" fill="#FBBF24" />
          </g>
        )}

        {/* Lencana Status Hasil Jika Ini Kartu Epilog */}
        {outcome && (
          <g transform="translate(12, 10)">
            <rect
              width="124"
              height="22"
              rx="6"
              fill={isSuccess ? '#1D4ED8' : '#B91C1C'}
              stroke={isSuccess ? '#93C5FD' : '#FCA5A5'}
              strokeWidth="1"
            />
            <text
              x="62"
              y="14.5"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {isSuccess ? 'MISI BERHASIL' : 'MISI DISABOTASE'}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// KOMPONEN KARTU BAB MISI (PROLOG CERITA) & KARTU EPILOG HASIL MISI
// ============================================================================
function QuestChapterCard({ questNumber, needsTwoFails }) {
  const [collapsed, setCollapsed] = useState(false);
  const story = QUEST_STORIES[questNumber] || QUEST_STORIES[1];

  return (
    <section className="bg-[#1E293B] border border-amber-500/40 rounded-2xl p-3.5 shadow-xl space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
              {story.chapter} • Misi {questNumber}
            </span>
            {needsTwoFails && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-extrabold">
                Butuh 2 Kartu Gagal
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-white mt-1">
            {story.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <span>{collapsed ? 'Cerita' : 'Tutup'}</span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2.5">
          <QuestIllustration questNumber={questNumber} />
          <p className="text-xs text-slate-300 leading-relaxed italic bg-[#0B1120]/70 p-3 rounded-xl border border-slate-800">
            “{story.prologue}”
          </p>
        </div>
      )}
    </section>
  );
}

function QuestEpilogueCard({ reveal }) {
  const story = QUEST_STORIES[reveal.questNumber] || QUEST_STORIES[1];
  const isSuccess = reveal.status === 'SUCCESS';

  // Buat daftar kartu teracak untuk ditampilkan secara visual
  const cards = [
    ...Array(reveal.successCount || 0).fill('SUCCESS'),
    ...Array(reveal.failCount || 0).fill('FAIL'),
  ];

  return (
    <section
      className={`rounded-2xl border-2 p-4 shadow-2xl space-y-3 ${
        isSuccess
          ? 'bg-gradient-to-b from-blue-950/70 to-[#1E293B] border-blue-400'
          : 'bg-gradient-to-b from-red-950/70 to-[#1E293B] border-red-400'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isSuccess ? 'text-blue-300' : 'text-red-300'
            }`}
          >
            Epilog {story.chapter} — {story.title}
          </span>
          <h3 className="text-lg font-black text-white">
            {isSuccess
              ? `Misi ${reveal.questNumber} SUKSES!`
              : `Misi ${reveal.questNumber} GAGAL DISABOTASE!`}
          </h3>
        </div>
        <span className="text-[11px] text-slate-300 text-right">
          Tim: <strong>{reveal.teamNames.join(', ')}</strong>
        </span>
      </div>

      <QuestIllustration
        questNumber={reveal.questNumber}
        outcome={reveal.status}
      />

      {/* Pembukaan Kartu Misi Rahasia */}
      <div className="flex items-center justify-center gap-2.5 py-1 flex-wrap">
        {cards.map((cardType, idx) => (
          <div
            key={idx}
            className={`px-3.5 py-2 rounded-xl border-2 flex items-center gap-1.5 font-extrabold text-xs shadow-md ${
              cardType === 'SUCCESS'
                ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                : 'bg-red-600/30 border-red-400 text-red-100'
            }`}
          >
            {cardType === 'SUCCESS' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>SUKSES</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-300" />
                <span>GAGAL</span>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-200 leading-relaxed bg-[#0B1120]/75 p-3 rounded-xl border border-white/10">
        {isSuccess ? story.successEpilogue : story.failEpilogue}
      </p>
    </section>
  );
}

// ============================================================================
// SUB-KOMPONEN UI
// ============================================================================
function RoleToggleRow({
  title,
  subtitle,
  badge,
  portraits = [],
  enabled,
  disabled,
  onToggle,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
        enabled
          ? 'bg-amber-500/10 border-amber-500/50'
          : 'bg-[#0B1120]/60 border-slate-800 opacity-80'
      } ${disabled ? 'cursor-default' : 'active:scale-[0.99]'}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {portraits.length > 0 && (
          <div className="flex -space-x-2 shrink-0">
            {portraits.map((rId) => (
              <CharacterPortrait key={rId} roleId={rId} size="xs" />
            ))}
          </div>
        )}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{title}</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
              {badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-snug">{subtitle}</p>
        </div>
      </div>

      <div
        className={`w-12 h-7 rounded-full p-1 transition shrink-0 flex items-center ${
          enabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-white shadow" />
      </div>
    </button>
  );
}

function CharacterGrimoireModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E293B] border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-white text-base">
                Kitab Karakter Avalon
              </h3>
              <p className="text-[11px] text-slate-400">
                Kenali ilustrasi & kekuatan seluruh 8 peran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {ROLE_ORDER.map((roleId) => {
            const role = ROLE_DEFINITIONS[roleId];
            const isGood = role.alignment === 'GOOD';
            return (
              <div
                key={roleId}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isGood
                    ? 'bg-blue-950/30 border-blue-500/40'
                    : 'bg-red-950/30 border-red-500/40'
                }`}
              >
                <CharacterPortrait roleId={roleId} size="md" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm text-white">
                      {role.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isGood
                          ? 'bg-blue-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {role.teamLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {role.ability}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition"
        >
          Tutup Kitab Karakter
        </button>
      </div>
    </div>
  );
}

function LastVoteSummaryCard({ result, players }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border p-3 text-xs ${
        result.approved
          ? 'bg-blue-950/40 border-blue-500/40 text-blue-100'
          : 'bg-red-950/40 border-red-500/40 text-red-100'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between font-bold"
      >
        <span>
          Voting Misi {result.questNumber} (#{result.proposalNumber}):{' '}
          {result.approved ? 'DISETUJUI' : 'DITOLAK'} ({result.approveCount}{' '}
          Setuju, {result.rejectCount} Tolak)
        </span>
        <span className="flex items-center gap-1 underline opacity-90">
          <span>Detail</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
          {players.map((p) => {
            const v = result.votes?.[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-2 py-1 rounded bg-black/30"
              >
                <span className="truncate">{p.name}</span>
                <span
                  className={`font-extrabold ml-1 ${
                    v === 'APPROVE' ? 'text-blue-300' : 'text-red-300'
                  }`}
                >
                  {v === 'APPROVE' ? 'SETUJU' : 'TOLAK'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RulesGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E293B] border border-amber-500/40 rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
          <h3 className="font-extrabold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>Panduan Singkat Avalon</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 text-xs text-slate-300 leading-relaxed pr-1">
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">1. Tujuan Permainan</p>
            <p>
              <strong>Kubu Setia Arthur (Biru)</strong> menang jika berhasil
              menyukseskan <strong>3 dari 5 Misi</strong> dan Merlin selamat
              dari pembunuhan di akhir laga.{' '}
              <strong>Kubu Jahat Mordred (Merah)</strong> menang jika 3 Misi
              gagal, 5 voting tim ditolak berturut-turut, atau Assassin berhasil
              membunuh Merlin!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">
              2. Alur Setiap Ronde
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Penunjukan Tim:</strong> Ketua Misi memilih sejumlah
                pemain untuk berangkat menjalankan misi.
              </li>
              <li>
                <strong>Voting Tim:</strong> Seluruh pemain memilih{' '}
                <em>Setuju</em> atau <em>Tolak</em> lewat ponsel masing-masing.
              </li>
              <li>
                <strong>Eksekusi Misi:</strong> Anggota tim terpilih mengirim
                kartu <em>Sukses</em> atau <em>Sabotase</em> secara rahasia.
                Umumnya 1 kartu Gagal saja sudah menggagalkan misi!
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">3. Peran Kunci</p>
            <ul className="space-y-1.5">
              <li>
                <strong className="text-blue-400">Merlin:</strong> Tahu siapa
                semua pengkhianat, tapi harus pandai berakting agar tidak
                ketahuan Assassin.
              </li>
              <li>
                <strong className="text-red-400">Assassin:</strong> Jika kubu
                baik menang 3 misi, Assassin menembak 1 pemain yang diduga
                Merlin.
              </li>
              <li>
                <strong className="text-blue-400">Percival & Morgana:</strong>{' '}
                Percival melihat Merlin, namun Morgana ikut menyamar sebagai
                Merlin untuk mengecohnya.
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm"
        >
          Mengerti, Siap Bermain!
        </button>
      </div>
    </div>
  );
}
