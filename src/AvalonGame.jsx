import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
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
  Bot,
  Trash2,
  HelpCircle,
  BookOpen,
  FastForward,
  ScrollText
} from 'lucide-react';

// ============================================================================
// KONFIGURASI FIREBASE & INISIALISASI MULTIPLAYER REAL-TIME
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyACgiMu5DF5GLHnv7Kk4-gkZtGc3d4rcNA",
  authDomain: "avalon-mabar.firebaseapp.com",
  projectId: "avalon-mabar",
  storageBucket: "avalon-mabar.firebasestorage.app",
  messagingSenderId: "890372490115",
  appId: "1:890372490115:web:ddffe979f848f022142cb6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'avalon-mabar-id';

// ============================================================================
// MATRIKS ATURAN RESMI THE RESISTANCE: AVALON (5 - 10 PEMAIN)
// ============================================================================
const PLAYER_MATRIX = {
  5: { good: 3, evil: 2, quests: [2, 3, 2, 3, 3], twoFailsQuest4: false },
  6: { good: 4, evil: 2, quests: [2, 3, 4, 3, 4], twoFailsQuest4: false },
  7: { good: 4, evil: 3, quests: [2, 3, 3, 4, 4], twoFailsQuest4: true },
  8: { good: 5, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true },
  9: { good: 6, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true },
  10: { good: 6, evil: 4, quests: [3, 4, 4, 5, 5], twoFailsQuest4: true }
};

const ROLE_ORDER = [
  'MERLIN',
  'PERCIVAL',
  'LOYAL_SERVANT',
  'ASSASSIN',
  'MORGANA',
  'MORDRED',
  'OBERON',
  'MINION'
];

const ROLE_DEFINITIONS = {
  MERLIN: {
    id: 'MERLIN',
    name: 'Merlin',
    title: 'Penyihir Agung Camelot',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Penyihir Agung yang mengetahui siapa saja pengkhianat.',
    ability:
      'Kamu mengetahui identitas seluruh anggota Kubu Mordred (kecuali Mordred jika aktif). Bimbing tim menuju 3 misi sukses tanpa ketahuan oleh Assassin di akhir permainan!',
    strategyTip: 'Jangan terlalu mencolok saat menunjuk pengkhianat agar Assassin tidak menebak identitasmu.'
  },
  PERCIVAL: {
    id: 'PERCIVAL',
    name: 'Percival',
    title: 'Pelindung Sang Penyihir',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Ksatria pelindung identitas Merlin.',
    ability:
      'Kamu melihat siapa Merlin. Namun jika Morgana ikut bermain, dia juga terlihat sebagai Merlin di matamu—amati gerak-gerik keduanya dengan cermat!',
    strategyTip: 'Bantu arahkan tim sesuai petunjuk Merlin asli dan lindungi identitasnya dari kecurigaan.'
  },
  LOYAL_SERVANT: {
    id: 'LOYAL_SERVANT',
    name: 'Pelayan Setia Arthur',
    title: 'Ksatria Meja Bundar',
    alignment: 'GOOD',
    teamLabel: 'Kubu Setia Arthur',
    badgeColor: 'blue',
    shortDesc: 'Ksatria Meja Bundar yang berjuang demi Camelot.',
    ability:
      'Kamu tidak memiliki penglihatan khusus. Gunakan intuisi, analisis pola voting, dan perdebatan di meja untuk menyukseskan misi bagi Raja Arthur.',
    strategyTip: 'Amati siapa yang sering menolak tim sukses atau ikut berada dalam misi yang disabotase.'
  },
  ASSASSIN: {
    id: 'ASSASSIN',
    name: 'Assassin',
    title: 'Bayangan Pencabut Nyawa',
    alignment: 'EVIL',
    teamLabel: 'Kubu Mordred',
    badgeColor: 'red',
    shortDesc: 'Pembunuh bayaran yang mengincar nyawa Merlin.',
    ability:
      'Kamu mengenal rekan sesama Kubu Mordred (kecuali Oberon). Jika Kubu Arthur berhasil memenangkan 3 misi, kamu mendapat 1 tembakan terakhir untuk membunuh Merlin dan membalikkan kemenangan!',
    strategyTip: 'Perhatikan pemain baik yang tampak selalu tahu komposisi tim paling akurat.'
  },
  MORGANA: {
    id: 'MORGANA',
    name: 'Morgana',
    title: 'Penyihir Ilusi Kegelapan',
    alignment: 'EVIL',
    teamLabel: 'Kubu Mordred',
    badgeColor: 'red',
    shortDesc: 'Penyihir kegelapan yang menyamar sebagai Merlin.',
    ability:
      'Di mata Percival, kamu muncul persis seperti Merlin. Manfaatkan penyamaran ini untuk menipu Percival agar mempercayai tim yang salah!',
    strategyTip: 'Berperanlah bijak dan meyakinkan seperti Merlin agar Percival membela timmu.'
  },
  MORDRED: {
    id: 'MORDRED',
    name: 'Mordred',
    title: 'Penguasa Kegelapan Tersembunyi',
    alignment: 'EVIL',
    teamLabel: 'Kubu Mordred',
    badgeColor: 'red',
    shortDesc: 'Pemimpin pengkhianat yang tak terlihat oleh Merlin.',
    ability:
      'Identitasmu tersembunyi bahkan dari penglihatan batin Merlin. Susupi tim misi dengan tenang tanpa perlu takut dicurigai langsung oleh sang Penyihir Agung.',
    strategyTip: 'Manfaatkan kepercayaan Merlin yang mengira dirimu adalah ksatria kubu baik.'
  },
  OBERON: {
    id: 'OBERON',
    name: 'Oberon',
    title: 'Roh Rimba Terasing',
    alignment: 'EVIL',
    teamLabel: 'Kubu Mordred',
    badgeColor: 'red',
    shortDesc: 'Roh kegelapan penyendiri yang tidak mengenal rekannya.',
    ability:
      'Kamu anggota Kubu Mordred, namun kamu tidak tahu siapa rekan jahatmu dan mereka pun tidak tahu siapa dirimu. Hanya Merlin yang dapat melihat aura jahatmu.',
    strategyTip: 'Berhati-hatilah saat menyabotase misi agar tidak bertabrakan dengan rekan jahatmu sendiri.'
  },
  MINION: {
    id: 'MINION',
    name: 'Kaki Tangan Mordred',
    title: 'Konspirator Bayangan',
    alignment: 'EVIL',
    teamLabel: 'Kubu Mordred',
    badgeColor: 'red',
    shortDesc: 'Konspirator rahasia yang bertekad menghancurkan Camelot.',
    ability:
      'Kamu mengenal sesama anggota Kubu Mordred (kecuali Oberon). Bekerja samalah secara diam-diam untuk menggagalkan 3 misi atau membuat voting macet 5 kali.',
    strategyTip: 'Bangun kepercayaan di misi awal atau ciptakan keraguan di antara kubu Arthur.'
  }
};

const QUEST_STORIES = {
  1: {
    chapter: 'Bab I',
    title: 'Gerbang Kabut Avalon',
    prologue:
      'Kabut tebal menyelimuti perbatasan Camelot. Pasukan pengintai harus membuka jalur suci menuju Pulau Avalon sebelum bayangan Mordred menyusup.',
    successEpilogue:
      'Obor suci berhasil dinyalakan! Jalur menuju Avalon terbuka terang bagi pasukan Raja Arthur.',
    failEpilogue:
      'Api obor dipadamkan secara misterius di tengah kabut! Ada pengkhianat di dalam barisan pengintai.'
  },
  2: {
    chapter: 'Bab II',
    title: 'Relik Cawan Suci',
    prologue:
      'Di reruntuhan biara kuno, Cawan Suci memancarkan cahaya perak. Tim ekspedisi harus mengamankannya tanpa menarik perhatian penyihir kegelapan.',
    successEpilogue:
      'Cawan Suci berhasil diamankan ke benteng Camelot! Semangat para Ksatria Meja Bundar berkobar.',
    failEpilogue:
      'Segel biara dihancurkan dari dalam! Relik suci terlepas di tengah kekacauan yang disengaja.'
  },
  3: {
    chapter: 'Bab III',
    title: 'Jembatan Danau Excalibur',
    prologue:
      'Untuk melintasi danau bercahaya, para ksatria terpilih harus menjaga keseimbangan mantra di atas jembatan batu tua.',
    successEpilogue:
      'Jembatan batu tetap kokoh hingga seluruh rombongan tiba di tepi seberang dengan selamat.',
    failEpilogue:
      'Mantra pelindung retak dan jembatan runtuh ke danau! Sabotase kembali menggagalkan langkah Arthur.'
  },
  4: {
    chapter: 'Bab IV',
    title: 'Benteng Badai Tintagel',
    prologue:
      'Petir menyambar menara Tintagel. Pertahanan musuh berlipat ganda sehingga dibutuhkan pengawasan ekstra ketat di dalam tim.',
    successEpilogue:
      'Panji biru Camelot berkibar gagah di puncak menara Tintagel di tengah badai!',
    failEpilogue:
      'Gerbang benteng terbuka dari dalam untuk pasukan kegelapan! Pengkhianatan besar terjadi di Tintagel.'
  },
  5: {
    chapter: 'Bab V',
    title: 'Takhta Terakhir Camelot',
    prologue:
      'Pertempuran penentuan nasib kerajaan! Setiap langkah dan tatapan di meja bundar akan menentukan masa depan Camelot selamanya.',
    successEpilogue:
      'Cahaya fajar menyinari Camelot! Pasukan Raja Arthur berhasil mempertahankan takhta suci.',
    failEpilogue:
      'Kegelapan menelan aula Meja Bundar! Konspirasi Mordred berhasil meruntuhkan kejayaan Camelot.'
  }
};

// ============================================================================
// FUNGSI PEMBANTU PERMAINAN (KODE RUANGAN, ACAK PERAN & PENGLIHATAN BATIN)
// ============================================================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRolePool(playerCount, settings = {}) {
  const matrix = PLAYER_MATRIX[playerCount] || PLAYER_MATRIX[5];
  const goodRoles = [];
  const evilRoles = [];

  if (settings.merlin) {
    goodRoles.push('MERLIN');
    evilRoles.push('ASSASSIN');
  }
  if (settings.percival && goodRoles.length < matrix.good) {
    goodRoles.push('PERCIVAL');
  }
  if (settings.morgana && evilRoles.length < matrix.evil) {
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

  return shuffleArray([...goodRoles, ...evilRoles]);
}

function computePlayerVision(me, allPlayers = []) {
  if (!me || !me.role) {
    return {
      title: 'Penglihatan Batin',
      notes: 'Menunggu pembagian peran rahasia...',
      targets: []
    };
  }

  const others = allPlayers.filter((p) => p.id !== me.id && p.role);
  const evilIds = ['ASSASSIN', 'MORGANA', 'MORDRED', 'OBERON', 'MINION'];

  if (me.role === 'MERLIN') {
    const visibleEvils = others.filter(
      (p) => evilIds.includes(p.role) && p.role !== 'MORDRED'
    );
    return {
      title: 'Penglihatan Penyihir Agung (Merlin)',
      notes:
        visibleEvils.length > 0
          ? 'Aura kegelapan tampak menyelimuti pemain berikut (Mordred tidak terlihat jika aktif):'
          : 'Tidak ada aura pengkhianat yang terlihat oleh penglihatanmu.',
      targets: visibleEvils.map((p) => ({
        id: p.id,
        name: p.name,
        roleId: 'MINION',
        label: 'Kubu Mordred',
        tone: 'red'
      }))
    };
  }

  if (me.role === 'PERCIVAL') {
    const merlinCandidates = others.filter(
      (p) => p.role === 'MERLIN' || p.role === 'MORGANA'
    );
    return {
      title: 'Penglihatan Pelindung (Percival)',
      notes:
        merlinCandidates.length > 1
          ? 'Dua sosok memancarkan aura Merlin! Salah satunya adalah Merlin asli dan satunya Morgana yang menyamar:'
          : merlinCandidates.length === 1
          ? 'Sosok berikut adalah Merlin yang harus kamu lindungi:'
          : 'Tidak ada Merlin yang terlihat di dalam permainan ini.',
      targets: merlinCandidates.map((p) => ({
        id: p.id,
        name: p.name,
        roleId: 'MERLIN',
        label: merlinCandidates.length > 1 ? 'Merlin / Morgana?' : 'Merlin',
        tone: 'amber'
      }))
    };
  }

  if (me.role === 'OBERON') {
    return {
      title: 'Kegelapan Sunyi (Oberon)',
      notes:
        'Sebagai Oberon, kamu tidak mengetahui siapa rekan Kubu Mordred lainnya, dan mereka pun tidak mengetahui identitasmu.',
      targets: []
    };
  }

  if (evilIds.includes(me.role)) {
    const fellowEvils = others.filter(
      (p) => evilIds.includes(p.role) && p.role !== 'OBERON'
    );
    return {
      title: 'Jaringan Konspirasi Mordred',
      notes:
        fellowEvils.length > 0
          ? 'Rekan sesama Kubu Mordred yang bekerja sama denganmu (kecuali Oberon):'
          : 'Kamu tidak melihat rekan jahat lain yang terbuka.',
      targets: fellowEvils.map((p) => ({
        id: p.id,
        name: p.name,
        roleId: p.role,
        label: ROLE_DEFINITIONS[p.role]?.name || 'Kubu Mordred',
        tone: 'red'
      }))
    };
  }

  return {
    title: 'Sumpah Ksatria Camelot',
    notes:
      'Kamu tidak memiliki penglihatan khusus. Perhatikan riwayat voting dan diskusi untuk menemukan siapa yang setia pada Raja Arthur!',
    targets: []
  };
}

// ============================================================================
// KOMPONEN ILUSTRASI CUSTOM SVG: POTRET 8 KARAKTER AVALON (DETAIL REALISTIS)
// ============================================================================
function CharacterPortrait({ roleId, size = 'md', className = '' }) {
  const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.LOYAL_SERVANT;
  const isGood = roleDef.alignment === 'GOOD';

  const sizeClasses = {
    xs: 'w-11 h-11 rounded-xl border',
    sm: 'w-14 h-14 rounded-xl border-2',
    md: 'w-20 h-20 rounded-2xl border-2',
    lg: 'w-24 h-24 rounded-2xl border-2',
    card: 'w-full aspect-[4/3] rounded-t-2xl'
  };

  const frameStyle =
    size === 'card'
      ? 'bg-slate-950'
      : isGood
      ? 'border-amber-400/90 shadow-lg shadow-blue-950/70 bg-slate-950'
      : 'border-red-500/90 shadow-lg shadow-red-950/70 bg-slate-950';

  const uid = `${roleId}_${size}`;
  const isCard = size === 'card';

  return (
    <div
      className={`overflow-hidden shrink-0 relative select-none ${sizeClasses[size]} ${frameStyle} ${className}`}
      title={roleDef.name}
    >
      <svg
        viewBox={isCard ? '-30 0 180 120' : '0 0 120 120'}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
      >
        <defs>
          {/* Gradien Latar Karakter */}
          <radialGradient id={`bg_merlin_${uid}`} cx="50%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="35%" stopColor="#1D4ED8" />
            <stop offset="75%" stopColor="#172554" />
            <stop offset="100%" stopColor="#040812" />
          </radialGradient>
          <radialGradient id={`bg_percival_${uid}`} cx="50%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
            <stop offset="38%" stopColor="#1E40AF" />
            <stop offset="78%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#040711" />
          </radialGradient>
          <radialGradient id={`bg_servant_${uid}`} cx="50%" cy="35%" r="72%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#050914" />
          </radialGradient>
          <radialGradient id={`bg_assassin_${uid}`} cx="50%" cy="35%" r="72%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="45%" stopColor="#450A0A" />
            <stop offset="100%" stopColor="#040406" />
          </radialGradient>
          <radialGradient id={`bg_morgana_${uid}`} cx="50%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#D8B4FE" />
            <stop offset="40%" stopColor="#6B21A8" />
            <stop offset="80%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#060210" />
          </radialGradient>
          <radialGradient id={`bg_mordred_${uid}`} cx="50%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="40%" stopColor="#7F1D1D" />
            <stop offset="80%" stopColor="#18181B" />
            <stop offset="100%" stopColor="#030304" />
          </radialGradient>
          <radialGradient id={`bg_oberon_${uid}`} cx="50%" cy="35%" r="72%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="45%" stopColor="#064E3B" />
            <stop offset="100%" stopColor="#02100C" />
          </radialGradient>
          <radialGradient id={`bg_minion_${uid}`} cx="50%" cy="35%" r="72%">
            <stop offset="0%" stopColor="#B91C1C" />
            <stop offset="50%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#070709" />
          </radialGradient>

          {/* Gradien Material (Emas, Baja, Kulit, Bayangan Wajah) */}
          <linearGradient id={`gold_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id={`steel_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#E2E8F0" />
            <stop offset="65%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id={`darkArmor_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#71717A" />
            <stop offset="40%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
          <radialGradient id={`skinReal_${uid}`} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="48%" stopColor="#FCD34D" />
            <stop offset="82%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </radialGradient>
          <radialGradient id={`skinPaleReal_${uid}`} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F3E8FF" />
            <stop offset="85%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7E22CE" />
          </radialGradient>
          <radialGradient id={`orbGlow_${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#7DD3FC" />
            <stop offset="75%" stopColor="#0284C7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`vignette_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.15" />
            <stop offset="65%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#050811" stopOpacity="0.78" />
          </linearGradient>
        </defs>

        {/* Latar Belakang Panoramik */}
        <rect
          x="-40"
          y="0"
          width="200"
          height="120"
          fill={
            roleId === 'MERLIN'
              ? `url(#bg_merlin_${uid})`
              : roleId === 'PERCIVAL'
              ? `url(#bg_percival_${uid})`
              : roleId === 'LOYAL_SERVANT'
              ? `url(#bg_servant_${uid})`
              : roleId === 'ASSASSIN'
              ? `url(#bg_assassin_${uid})`
              : roleId === 'MORGANA'
              ? `url(#bg_morgana_${uid})`
              : roleId === 'MORDRED'
              ? `url(#bg_mordred_${uid})`
              : roleId === 'OBERON'
              ? `url(#bg_oberon_${uid})`
              : `url(#bg_minion_${uid})`
          }
        />

        {/* 1. MERLIN */}
        {roleId === 'MERLIN' && (
          <g>
            {/* Lingkaran Sihir & Aura Kuno */}
            <circle cx="60" cy="48" r="46" fill="none" stroke="#7DD3FC" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
            <circle cx="60" cy="48" r="36" fill="none" stroke="#FDE047" strokeWidth="0.9" strokeDasharray="10 4" opacity="0.45" />
            <circle cx="14" cy="24" r="1.8" fill="#FEF08A" />
            <circle cx="24" cy="66" r="1.5" fill="#7DD3FC" />
            <circle cx="112" cy="54" r="1.7" fill="#FEF08A" />
            {/* Jubah Berlapis & Kerah Emas */}
            <path d="M12,120 Q22,72 60,68 Q98,72 108,120 Z" fill="#172554" />
            <path d="M22,120 Q32,76 60,72 Q88,76 98,120 Z" fill="#1D4ED8" />
            <path d="M34,73 L60,116 L86,73" fill="none" stroke={`url(#gold_${uid})`} strokeWidth="4" />
            <path d="M42,75 L60,105 L78,75" fill="#0F172A" opacity="0.55" />
            <polygon points="31,96 33,100 37,100 34,102 35,106 31,103 27,106 28,102 25,100 29,100" fill="#FDE047" opacity="0.85" />
            <polygon points="89,98 90.5,101 94,101 91.5,103 92.5,106 89,104 85.5,106 86.5,103 84,101 87.5,101" fill="#FDE047" opacity="0.85" />
            {/* Tudung Penyihir dengan Bayangan Dalam */}
            <path d="M29,67 Q32,20 60,12 Q88,20 91,67 Q75,54 60,54 Q45,54 29,67 Z" fill="#1E40AF" stroke={`url(#gold_${uid})`} strokeWidth="1.8" />
            <path d="M35,63 Q39,25 60,19 Q81,25 85,63" fill="#090D16" opacity="0.55" />
            {/* Struktur Wajah Realistis */}
            <ellipse cx="60" cy="49" rx="14.5" ry="17.5" fill={`url(#skinReal_${uid})`} />
            <path d="M46,42 Q60,36 74,42" fill="#78350F" opacity="0.22" />
            {/* Alis, Mata Bercahaya & Hidung */}
            <path d="M47,43 Q52,39.5 57,43" fill="none" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M63,43 Q68,39.5 73,43" fill="none" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="53" cy="47" rx="2.8" ry="2.2" fill="#0F172A" />
            <circle cx="53" cy="47" r="1.8" fill="#38BDF8" />
            <circle cx="52.4" cy="46.4" r="0.7" fill="#FFFFFF" />
            <ellipse cx="67" cy="47" rx="2.8" ry="2.2" fill="#0F172A" />
            <circle cx="67" cy="47" r="1.8" fill="#38BDF8" />
            <circle cx="66.4" cy="46.4" r="0.7" fill="#FFFFFF" />
            <path d="M60,46 L58.2,54 L61.5,55" fill="none" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
            {/* Kumis & Janggut Panjang Berlapis */}
            <path d="M46,57 Q60,52.5 74,57 Q66,62.5 60,59 Q54,62.5 46,57 Z" fill="#F1F5F9" />
            <path d="M42,56 Q39,90 60,106 Q81,90 78,56 Q60,64 42,56 Z" fill="#F8FAFC" />
            <path d="M49,61 Q50,87 60,101 Q70,87 71,61" fill="none" stroke="#94A3B8" strokeWidth="1.2" />
            <path d="M55,63 Q56,85 60,96 Q64,85 65,63" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            {/* Tongkat Sihir & Kristal */}
            <path d="M103,33 L96,118" stroke="#451A03" strokeWidth="5" strokeLinecap="round" />
            <path d="M98,35 Q103,22 108,35" fill="none" stroke={`url(#gold_${uid})`} strokeWidth="2.8" />
            <circle cx="103" cy="26" r="17" fill={`url(#orbGlow_${uid})`} />
            <polygon points="103,16 110,26 103,36 96,26" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.2" />
            <polygon points="103,19 107,26 103,33 99,26" fill="#FFFFFF" />
          </g>
        )}

        {/* 2. PERCIVAL */}
        {roleId === 'PERCIVAL' && (
          <g>
            {/* Jubah Kerajaan Merah */}
            <path d="M10,120 L24,70 L96,70 L110,120 Z" fill="#7F1D1D" />
            {/* Pedang Terhunus */}
            <polygon points="18,14 23,74 13,74" fill={`url(#steel_${uid})`} />
            <line x1="18" y1="18" x2="18" y2="72" stroke="#FFFFFF" strokeWidth="1.2" />
            <rect x="9" y="73" width="18" height="4.5" rx="1.5" fill={`url(#gold_${uid})`} />
            <rect x="16" y="77.5" width="4" height="11" fill="#451A03" />
            <circle cx="18" cy="90" r="3.2" fill={`url(#gold_${uid})`} />
            {/* Zirah Pelat Baja & Pelindung Bahu Emas */}
            <path d="M24,120 Q30,72 60,68 Q90,72 96,120 Z" fill={`url(#steel_${uid})`} />
            <path d="M43,72 L60,107 L77,72" fill="none" stroke={`url(#gold_${uid})`} strokeWidth="2.8" />
            <path d="M20,82 Q33,64 46,75 L35,95 Z" fill={`url(#gold_${uid})`} stroke="#78350F" strokeWidth="1.2" />
            <path d="M100,82 Q87,64 74,75 L85,95 Z" fill={`url(#gold_${uid})`} stroke="#78350F" strokeWidth="1.2" />
            {/* Rambut & Wajah Ksatria */}
            <path d="M40,44 Q40,21 60,20 Q80,21 80,44 L77,54 L43,54 Z" fill="#451A03" />
            <ellipse cx="60" cy="48" rx="14.5" ry="17" fill={`url(#skinReal_${uid})`} />
            <path d="M43,36 Q60,27 77,36 L75,28 Q60,20 45,28 Z" fill={`url(#gold_${uid})`} />
            <polygon points="60,22 63.5,28.5 60,33 56.5,28.5" fill="#38BDF8" />
            <path d="M48,43 L56,44.5" stroke="#451A03" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M72,43 L64,44.5" stroke="#451A03" strokeWidth="2.1" strokeLinecap="round" />
            <ellipse cx="53" cy="47.5" rx="2.4" ry="1.9" fill="#0F172A" />
            <circle cx="52.4" cy="47" r="0.7" fill="#FFFFFF" />
            <ellipse cx="67" cy="47.5" rx="2.4" ry="1.9" fill="#0F172A" />
            <circle cx="66.4" cy="47" r="0.7" fill="#FFFFFF" />
            <path d="M60,47 L58.5,52.5 L61,53.5" fill="none" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M55,56.5 Q60,58.5 65,56.5" fill="none" stroke="#78350F" strokeWidth="1.7" strokeLinecap="round" />
            {/* Perisai Lambang Naga */}
            <path
              d="M78,71 L108,71 L105,96 Q93,113 93,113 Q81,96 78,71 Z"
              fill="#1E3A8A"
              stroke={`url(#gold_${uid})`}
              strokeWidth="3"
            />
            <path d="M88,81 Q96,76 98,85 Q92,90 90,98 Q96,97 99,93" fill="none" stroke="#FDE047" strokeWidth="2.3" strokeLinecap="round" />
          </g>
        )}

        {/* 3. PELAYAN SETIA ARTHUR */}
        {roleId === 'LOYAL_SERVANT' && (
          <g>
            {/* Panji Kerajaan Camelot */}
            <rect x="12" y="13" width="27" height="74" fill="#1D4ED8" stroke={`url(#gold_${uid})`} strokeWidth="2.2" />
            <polygon points="12,87 25.5,76 39,87" fill="#1E3A8A" />
            <polygon points="18.5,44 20.5,34 25.5,40 30.5,34 32.5,44" fill="#FDE047" />
            <line x1="10" y1="13" x2="41" y2="13" stroke={`url(#gold_${uid})`} strokeWidth="3.2" strokeLinecap="round" />
            {/* Tunik Ksatria & Selempang Putih */}
            <path d="M20,120 Q28,72 60,68 Q92,72 100,120 Z" fill="#1E40AF" />
            <path d="M37,72 L60,105 L83,72 L75,70 L60,92 L45,70 Z" fill="#F8FAFC" />
            <circle cx="60" cy="83" r="5.5" fill={`url(#gold_${uid})`} />
            {/* Rambut & Wajah Ksatria Setia */}
            <path d="M41,45 Q41,21 60,20 Q79,21 79,45 Z" fill="#78350F" />
            <ellipse cx="60" cy="48" rx="14.5" ry="17" fill={`url(#skinReal_${uid})`} />
            <path d="M44,41 Q50,25 64,25 Q74,27 76,41 Q64,33 44,41 Z" fill="#92400E" />
            <path d="M49,43 Q53,40.5 56,43" fill="none" stroke="#451A03" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M64,43 Q67,40.5 71,43" fill="none" stroke="#451A03" strokeWidth="1.9" strokeLinecap="round" />
            <ellipse cx="53" cy="47.5" rx="2.3" ry="1.8" fill="#0F172A" />
            <circle cx="52.4" cy="47" r="0.7" fill="#FFFFFF" />
            <ellipse cx="67" cy="47.5" rx="2.3" ry="1.8" fill="#0F172A" />
            <circle cx="66.4" cy="47" r="0.7" fill="#FFFFFF" />
            <path d="M60,47 L58.5,52.5 L61,53.5" fill="none" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M54,56 Q60,60.5 66,56" fill="none" stroke="#78350F" strokeWidth="1.9" strokeLinecap="round" />
          </g>
        )}

        {/* 4. ASSASSIN */}
        {roleId === 'ASSASSIN' && (
          <g>
            {/* Jubah Hitam & Bros Darah */}
            <path d="M12,120 Q22,67 60,65 Q98,67 108,120 Z" fill="#09090B" stroke="#991B1B" strokeWidth="1.6" />
            <path d="M31,69 L60,113 L89,69" fill="#18181B" stroke="#DC2626" strokeWidth="1.6" />
            <circle cx="60" cy="92" r="6.5" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.4" />
            {/* Tudung Gelap */}
            <path
              d="M27,70 Q31,19 60,13 Q89,19 93,70 Q60,55 27,70 Z"
              fill="#09090B"
              stroke="#DC2626"
              strokeWidth="1.8"
            />
            <ellipse cx="60" cy="49" rx="14.5" ry="15.5" fill="#111113" />
            {/* Masker Kain Merah Tua */}
            <path d="M45,51 L75,51 L71,64 Q60,69 49,64 Z" fill="#7F1D1D" stroke="#B91C1C" strokeWidth="1.1" />
            <path d="M48,55 L72,59 M50,60 L70,55" stroke="#450A0A" strokeWidth="1.3" />
            {/* Tatapan Tajam Membara */}
            <polygon points="47.5,45 57,48 48.5,49.5" fill="#EF4444" />
            <circle cx="52" cy="47.5" r="1.3" fill="#FEF2F2" />
            <polygon points="72.5,45 63,48 71.5,49.5" fill="#EF4444" />
            <circle cx="68" cy="47.5" r="1.3" fill="#FEF2F2" />
            {/* Belati Beracun */}
            <polygon points="100,20 105,68 95,68" fill={`url(#steel_${uid})`} />
            <polygon points="100,20 104,46 100,51 97,44" fill="#22C55E" opacity="0.88" />
            <circle cx="96" cy="54" r="1.6" fill="#4ADE80" />
            <rect x="90" y="68" width="20" height="4.2" rx="1" fill="#DC2626" />
            <rect x="97.5" y="72.2" width="5" height="13" fill="#18181B" />
          </g>
        )}

        {/* 5. MORGANA */}
        {roleId === 'MORGANA' && (
          <g>
            {/* Kabut Sihir Ungu */}
            <circle cx="22" cy="76" r="18" fill="#A855F7" opacity="0.32" />
            <circle cx="98" cy="70" r="20" fill="#C084FC" opacity="0.38" />
            {/* Rambut Hitam Panjang */}
            <path d="M35,41 Q30,90 39,106 L81,106 Q90,90 85,41 Z" fill="#09090B" />
            {/* Gaun Penyihir & Permata Ungu */}
            <path d="M18,120 Q28,69 60,67 Q92,69 102,120 Z" fill="#3B0764" stroke="#A855F7" strokeWidth="1.6" />
            <path d="M33,67 L44,87 L60,76 L76,87 L87,67" fill="#581C87" stroke="#E9D5FF" strokeWidth="1.1" />
            <polygon points="60,82 64.5,90 60,98 55.5,90" fill="#C084FC" />
            {/* Wajah Pucat Anggun */}
            <ellipse cx="60" cy="49" rx="14" ry="16.5" fill={`url(#skinPaleReal_${uid})`} />
            {/* Mahkota Tanduk Perak */}
            <path
              d="M41,32 Q60,42 79,32 Q71,17 60,26 Q49,17 41,32 Z"
              fill="#F3E8FF"
              stroke="#9333EA"
              strokeWidth="1.3"
            />
            <circle cx="60" cy="22.5" r="3.6" fill="#A855F7" />
            <path d="M48,44 Q53,40.5 57,44.5" fill="none" stroke="#1E1B4B" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M72,44 Q67,40.5 63,44.5" fill="none" stroke="#1E1B4B" strokeWidth="1.9" strokeLinecap="round" />
            <ellipse cx="53" cy="47.5" rx="2.3" ry="1.8" fill="#581C87" />
            <circle cx="52.4" cy="47" r="0.7" fill="#FFFFFF" />
            <ellipse cx="67" cy="47.5" rx="2.3" ry="1.8" fill="#581C87" />
            <circle cx="66.4" cy="47" r="0.7" fill="#FFFFFF" />
            <path d="M54,57 Q60,54 66,57 Q60,60.5 54,57 Z" fill="#701A75" />
            {/* Bola Sihir di Tangan */}
            <circle cx="96" cy="74" r="12" fill="#A855F7" opacity="0.48" />
            <circle cx="96" cy="74" r="7" fill="#E9D5FF" stroke="#9333EA" strokeWidth="1.6" />
          </g>
        )}

        {/* 6. MORDRED */}
        {roleId === 'MORDRED' && (
          <g>
            {/* Jubah Merah Darah & Zirah Besi Hitam */}
            <path d="M10,120 L25,69 L95,69 L110,120 Z" fill="#7F1D1D" />
            <path d="M16,120 Q27,67 60,65 Q93,67 104,120 Z" fill={`url(#darkArmor_${uid})`} stroke="#DC2626" strokeWidth="1.6" />
            <polygon points="13,78 26,53 39,78" fill="#18181B" stroke="#EF4444" strokeWidth="1.5" />
            <polygon points="107,78 94,53 81,78" fill="#18181B" stroke="#EF4444" strokeWidth="1.5" />
            <path d="M45,78 L60,105 L75,78" fill="none" stroke="#EF4444" strokeWidth="2.4" />
            {/* Ketopong Baja & Mahkota Berduri */}
            <ellipse cx="60" cy="49" rx="15" ry="17" fill="#18181B" stroke="#52525B" strokeWidth="1.5" />
            <polygon
              points="40,35 44.5,15 52,29 60,11 68,29 75.5,15 80,35"
              fill="#09090B"
              stroke="#EF4444"
              strokeWidth="1.6"
            />
            <polygon points="44,45 76,45 71,54.5 49,54.5" fill="#040405" stroke="#7F1D1D" strokeWidth="1.1" />
            <circle cx="53" cy="49" r="2.8" fill="#EF4444" />
            <circle cx="53" cy="49" r="1.2" fill="#FEF08A" />
            <circle cx="67" cy="49" r="2.8" fill="#EF4444" />
            <circle cx="67" cy="49" r="1.2" fill="#FEF08A" />
          </g>
        )}

        {/* 7. OBERON */}
        {roleId === 'OBERON' && (
          <g>
            <path d="M14,120 Q25,69 60,67 Q95,69 106,120 Z" fill="#064E3B" stroke="#10B981" strokeWidth="1.3" />
            <path d="M35,72 Q60,87 85,72 L77,99 L60,88 L43,99 Z" fill="#022C22" />
            {/* Tanduk Rusa Bercahaya */}
            <path
              d="M46,34 Q33,19 25,11 M38,24 L27,26 M41,18 L42,9"
              stroke="#6EE7B7"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M74,34 Q87,19 95,11 M82,24 L93,26 M79,18 L78,9"
              stroke="#6EE7B7"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Topeng Kayu Mistis */}
            <path
              d="M41,36 Q60,27 79,36 L75,65 Q60,75 45,65 Z"
              fill="#022C22"
              stroke="#34D399"
              strokeWidth="1.9"
            />
            <line x1="60" y1="32" x2="60" y2="43" stroke="#10B981" strokeWidth="1.6" />
            <ellipse cx="52" cy="48" rx="4.2" ry="2.6" fill="#A7F3D0" />
            <ellipse cx="68" cy="48" rx="4.2" ry="2.6" fill="#A7F3D0" />
            <path d="M52,59 L60,55 L68,59" fill="none" stroke="#34D399" strokeWidth="1.7" strokeLinecap="round" />
          </g>
        )}

        {/* 8. KAKI TANGAN MORDRED */}
        {roleId === 'MINION' && (
          <g>
            <path d="M16,120 Q27,69 60,67 Q93,69 104,120 Z" fill="#18181B" stroke="#7F1D1D" strokeWidth="1.5" />
            <path d="M31,68 Q37,21 60,17 Q83,21 89,68 Z" fill="#09090B" stroke="#B91C1C" strokeWidth="1.6" />
            <ellipse cx="60" cy="49" rx="13.5" ry="15.5" fill="#374151" />
            <path d="M48,44 L56,46.5" stroke="#09090B" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M72,44 L64,46.5" stroke="#09090B" strokeWidth="2.1" strokeLinecap="round" />
            <circle cx="53" cy="49" r="2.1" fill="#F87171" />
            <circle cx="67" cy="49" r="2.1" fill="#F87171" />
            <path d="M54,58 Q61,55 67,59" fill="none" stroke="#111827" strokeWidth="1.9" strokeLinecap="round" />
            {/* Medali Rahasia Mordred */}
            <circle cx="60" cy="90" r="12.5" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.9" />
            <polygon points="51,90 60,83 69,90 60,97" fill="#FCA5A5" />
            <circle cx="60" cy="90" r="2.6" fill="#7F1D1D" />
          </g>
        )}

        {/* Vignette Sinematik untuk Mode Kartu */}
        {isCard && <rect x="-40" y="0" width="200" height="120" fill={`url(#vignette_${uid})`} />}
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

        {q === 1 && (
          <g>
            <path d="M0,135 L0,10 Q45,35 72,135 Z" fill="#022C22" />
            <path d="M400,135 L400,10 Q355,35 328,135 Z" fill="#022C22" />
            <rect x="148" y="34" width="22" height="90" rx="3" fill="#334155" stroke="#64748B" />
            <rect x="230" y="34" width="22" height="90" rx="3" fill="#334155" stroke="#64748B" />
            <rect x="138" y="22" width="124" height="18" rx="4" fill="#475569" stroke="#94A3B8" />
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
            <ellipse cx="200" cy="126" rx="195" ry="16" fill="#94A3B8" opacity="0.22" />
          </g>
        )}

        {q === 2 && (
          <g>
            <circle cx="200" cy="46" r="24" fill="#FEF3C7" opacity="0.85" />
            <circle cx="200" cy="46" r="24" fill="none" stroke="#F59E0B" strokeWidth="2" />
            <rect x="95" y="15" width="18" height="120" fill="#1E293B" />
            <rect x="287" y="15" width="18" height="120" fill="#1E293B" />
            <path d="M95,45 Q200,0 305,45" fill="none" stroke="#475569" strokeWidth="5" />
            <rect x="165" y="102" width="70" height="28" fill="#334155" stroke="#F59E0B" strokeWidth="1" />
            <path
              d="M192,80 L208,80 L203,92 L206,100 L194,100 L197,92 Z"
              fill={isFail ? '#EF4444' : '#FDE047'}
            />
            <rect x="174" y="88" width="4" height="14" fill="#F8FAFC" />
            <circle cx="176" cy="85" r="3" fill="#FBBF24" />
            <rect x="222" y="88" width="4" height="14" fill="#F8FAFC" />
            <circle cx="224" cy="85" r="3" fill="#FBBF24" />
          </g>
        )}

        {q === 3 && (
          <g>
            <rect x="0" y="92" width="400" height="43" fill="#0F172A" />
            <path
              d="M40,102 Q200,46 360,102 L360,114 Q200,62 40,114 Z"
              fill="#475569"
              stroke="#94A3B8"
              strokeWidth="1"
            />
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
            <ellipse cx="200" cy="112" rx="52" ry="5" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
          </g>
        )}

        {q === 4 && (
          <g>
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
            <polygon points="85,135 125,74 275,74 315,135" fill="#09090B" />
            <rect x="150" y="42" width="100" height="36" fill="#1E293B" stroke="#475569" />
            <rect x="144" y="32" width="18" height="46" fill="#334155" />
            <rect x="238" y="32" width="18" height="46" fill="#334155" />
            <line x1="200" y1="16" x2="200" y2="42" stroke="#FBBF24" strokeWidth="2" />
            <polygon
              points="200,16 222,22 200,28"
              fill={isFail ? '#DC2626' : '#2563EB'}
            />
          </g>
        )}

        {q === 5 && (
          <g>
            <circle
              cx="200"
              cy="88"
              r="38"
              fill={isSuccess ? '#FDE047' : '#EF4444'}
              opacity="0.75"
            />
            <path d="M0,135 Q200,72 400,135 Z" fill="#09090B" />
            <line x1="145" y1="54" x2="155" y2="112" stroke="#94A3B8" strokeWidth="2" />
            <polygon points="145,54 125,62 146,68" fill="#2563EB" />
            <line x1="255" y1="54" x2="245" y2="112" stroke="#94A3B8" strokeWidth="2" />
            <polygon points="255,54 275,62 254,68" fill="#DC2626" />
            <polygon points="200,56 203,95 197,95" fill="#F8FAFC" />
            <rect x="192" y="66" width="16" height="3" fill="#FBBF24" />
          </g>
        )}

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
          <h3 className="text-base font-extrabold text-white mt-1">{story.title}</h3>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <span>{collapsed ? 'Cerita' : 'Tutup'}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
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

  const cards = [
    ...Array(reveal.successCount || 0).fill('SUCCESS'),
    ...Array(reveal.failCount || 0).fill('FAIL')
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

      <QuestIllustration questNumber={reveal.questNumber} outcome={reveal.status} />

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
// KOMPONEN UTAMA APLIKASI MULTIPLAYER AVALON
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Profil lokal & ruangan aktif
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('avalon_player_name') || '';
    } catch {
      return '';
    }
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState(() => {
    try {
      return localStorage.getItem('avalon_active_room') || '';
    } catch {
      return '';
    }
  });
  const [roomData, setRoomData] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  // UI & Modal state
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [roleCardOpen, setRoleCardOpen] = useState(false);
  const [showGrimoireModal, setShowGrimoireModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedTeamDraft, setSelectedTeamDraft] = useState([]);
  const [selectedAssassinTarget, setSelectedAssassinTarget] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const botLockRef = useRef(false);
  const latestRoomRef = useRef(null);
  latestRoomRef.current = roomData;

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // 1. Autentikasi Firebase Anonim (Tahan Konflik Custom Token)
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            console.error('Auth error:', e);
          }
        } else {
          console.error('Auth error:', err);
        }
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!mounted) return;
      setUser(u);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Simpan nama pemain secara lokal
  useEffect(() => {
    try {
      localStorage.setItem('avalon_player_name', playerName);
    } catch {}
  }, [playerName]);

  // 2. Langganan Real-time Dokumen Ruangan Firestore
  useEffect(() => {
    if (!authReady || !user || !activeRoomCode) {
      setRoomData(null);
      return;
    }

    setLoadingRoom(true);
    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', activeRoomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        setLoadingRoom(false);
        if (!snap.exists()) {
          setRoomData(null);
          setActiveRoomCode('');
          try {
            localStorage.removeItem('avalon_active_room');
          } catch {}
          showToast('Ruangan telah ditutup atau tidak ditemukan.', 'error');
          return;
        }
        const data = snap.data();
        const stillInRoom = (data.players || []).some((p) => p.id === user.uid);
        if (!stillInRoom) {
          setRoomData(null);
          setActiveRoomCode('');
          try {
            localStorage.removeItem('avalon_active_room');
          } catch {}
          showToast('Kamu telah keluar atau dikeluarkan dari ruangan.', 'info');
          return;
        }
        setRoomData(data);
      },
      (err) => {
        setLoadingRoom(false);
        console.error('Firestore snapshot error:', err);
        showToast('Gagal menyinkronkan ruangan. Periksa koneksi internet.', 'error');
      }
    );

    return () => unsub();
  }, [authReady, user, activeRoomCode]);

  // Sinkronkan draft tim saat fase penunjukan berganti
  useEffect(() => {
    if (!roomData) return;
    if (roomData.phase === 'TEAM_PROPOSAL') {
      setSelectedTeamDraft(roomData.proposedTeam || []);
    } else {
      setSelectedTeamDraft([]);
    }
    if (roomData.phase !== 'ASSASSINATION') {
      setSelectedAssassinTarget('');
    }
  }, [roomData?.phase, roomData?.currentQuest, roomData?.leaderIndex]);

  // Derivasi status permainan
  const players = roomData?.players || [];
  const me = useMemo(
    () => players.find((p) => p.id === user?.uid) || null,
    [players, user?.uid]
  );
  const isHost = roomData?.hostId === user?.uid;
  const playerCount = players.length;
  const matrix = PLAYER_MATRIX[playerCount] || PLAYER_MATRIX[5];

  const currentQuestIndex = (roomData?.currentQuest || 1) - 1;
  const requiredTeamSize = matrix.quests[currentQuestIndex] || 2;
  const needsTwoFails = roomData?.currentQuest === 4 && matrix.twoFailsQuest4;
  const leader = players[roomData?.leaderIndex || 0] || players[0];
  const isLeader = leader?.id === user?.uid;

  const myVision = useMemo(() => computePlayerVision(me, players), [me, players]);

  // ============================================================================
  // LOGIKA EVALUASI VOTING & MISI
  // ============================================================================
  const evaluateTeamVotes = useCallback(async (roomRef, currentRoom, updatedVotes) => {
    const allPlayers = currentRoom.players || [];
    if (Object.keys(updatedVotes).length < allPlayers.length) {
      await updateDoc(roomRef, { votes: updatedVotes });
      return;
    }

    let approveCount = 0;
    let rejectCount = 0;
    Object.values(updatedVotes).forEach((v) => {
      if (v === 'APPROVE') approveCount++;
      else rejectCount++;
    });

    const approved = approveCount > rejectCount;
    const voteSummary = {
      questNumber: currentRoom.currentQuest,
      proposalNumber: (currentRoom.rejectedCount || 0) + 1,
      approved,
      approveCount,
      rejectCount,
      votes: updatedVotes
    };

    if (approved) {
      await updateDoc(roomRef, {
        votes: updatedVotes,
        lastVoteResult: voteSummary,
        phase: 'QUEST_EXECUTION',
        questActions: {},
        lastQuestReveal: null
      });
    } else {
      const nextRejectedCount = (currentRoom.rejectedCount || 0) + 1;
      if (nextRejectedCount >= 5) {
        await updateDoc(roomRef, {
          votes: updatedVotes,
          lastVoteResult: voteSummary,
          rejectedCount: nextRejectedCount,
          phase: 'GAME_OVER',
          winner: 'EVIL',
          winReason:
            '5 proposal tim ditolak berturut-turut! Camelot jatuh ke dalam kekacauan dan Kubu Mordred menang.'
        });
      } else {
        const nextLeaderIndex = ((currentRoom.leaderIndex || 0) + 1) % allPlayers.length;
        await updateDoc(roomRef, {
          votes: updatedVotes,
          lastVoteResult: voteSummary,
          rejectedCount: nextRejectedCount,
          leaderIndex: nextLeaderIndex,
          proposedTeam: [],
          phase: 'TEAM_PROPOSAL'
        });
      }
    }
  }, []);

  const evaluateQuestActions = useCallback(async (roomRef, currentRoom, updatedActions) => {
    const team = currentRoom.proposedTeam || [];
    if (Object.keys(updatedActions).length < team.length) {
      await updateDoc(roomRef, { questActions: updatedActions });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    Object.values(updatedActions).forEach((act) => {
      if (act === 'SUCCESS') successCount++;
      else failCount++;
    });

    const allPlayers = currentRoom.players || [];
    const roomMatrix = PLAYER_MATRIX[allPlayers.length] || PLAYER_MATRIX[5];
    const qNum = currentRoom.currentQuest || 1;
    const reqFails = qNum === 4 && roomMatrix.twoFailsQuest4 ? 2 : 1;
    const questSucceeded = failCount < reqFails;

    const updatedResults = [...(currentRoom.questResults || [])];
    updatedResults[qNum - 1] = questSucceeded ? 'SUCCESS' : 'FAIL';

    const teamNames = team.map(
      (pid) => allPlayers.find((p) => p.id === pid)?.name || 'Ksatria'
    );

    const questReveal = {
      questNumber: qNum,
      status: questSucceeded ? 'SUCCESS' : 'FAIL',
      successCount,
      failCount,
      teamNames
    };

    const totalSuccess = updatedResults.filter((r) => r === 'SUCCESS').length;
    const totalFail = updatedResults.filter((r) => r === 'FAIL').length;

    if (totalFail >= 3) {
      await updateDoc(roomRef, {
        questActions: updatedActions,
        questResults: updatedResults,
        lastQuestReveal: questReveal,
        phase: 'GAME_OVER',
        winner: 'EVIL',
        winReason:
          '3 Misi berhasil disabotase! Pasukan kegelapan Mordred menguasai Camelot.'
      });
      return;
    }

    if (totalSuccess >= 3) {
      const hasMerlinAndAssassin =
        currentRoom.settings?.merlin &&
        allPlayers.some((p) => p.role === 'ASSASSIN') &&
        allPlayers.some((p) => p.role === 'MERLIN');

      if (hasMerlinAndAssassin) {
        await updateDoc(roomRef, {
          questActions: updatedActions,
          questResults: updatedResults,
          lastQuestReveal: questReveal,
          phase: 'ASSASSINATION'
        });
      } else {
        await updateDoc(roomRef, {
          questActions: updatedActions,
          questResults: updatedResults,
          lastQuestReveal: questReveal,
          phase: 'GAME_OVER',
          winner: 'GOOD',
          winReason:
            'Kubu Setia Raja Arthur berhasil menuntaskan 3 Misi dengan gemilang!'
        });
      }
      return;
    }

    const nextLeaderIndex = ((currentRoom.leaderIndex || 0) + 1) % allPlayers.length;
    await updateDoc(roomRef, {
      questActions: updatedActions,
      questResults: updatedResults,
      lastQuestReveal: questReveal,
      currentQuest: qNum + 1,
      rejectedCount: 0,
      leaderIndex: nextLeaderIndex,
      proposedTeam: [],
      votes: {},
      phase: 'TEAM_PROPOSAL'
    });
  }, []);

  // ============================================================================
  // EKSEKUTOR AKSI BOT OTOMATIS & MANUAL FALLBACK (MENCEGAH MISI MACET)
  // ============================================================================
  const runBotTurnStep = useCallback(async () => {
    const currentRoom = latestRoomRef.current;
    if (!currentRoom || botLockRef.current) return;

    const allPlayers = currentRoom.players || [];
    const bots = allPlayers.filter((p) => p.isBot);
    if (bots.length === 0) return;

    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', currentRoom.code);
    const roomMatrix = PLAYER_MATRIX[allPlayers.length] || PLAYER_MATRIX[5];
    const reqSize = roomMatrix.quests[(currentRoom.currentQuest || 1) - 1] || 2;
    const currentLeader = allPlayers[currentRoom.leaderIndex || 0] || allPlayers[0];

    try {
      // 1. Ketua Misi adalah Bot -> pilih tim otomatis
      if (currentRoom.phase === 'TEAM_PROPOSAL' && currentLeader?.isBot) {
        botLockRef.current = true;
        const pool = shuffleArray(allPlayers);
        const picked = [currentLeader.id];
        for (const candidate of pool) {
          if (picked.length >= reqSize) break;
          if (!picked.includes(candidate.id)) picked.push(candidate.id);
        }
        await updateDoc(roomRef, {
          proposedTeam: picked,
          phase: 'TEAM_VOTE',
          votes: {}
        });
        botLockRef.current = false;
        return;
      }

      // 2. Fase Voting Tim -> bot yang belum vote otomatis memberi suara
      if (currentRoom.phase === 'TEAM_VOTE') {
        const votes = { ...(currentRoom.votes || {}) };
        const pendingBots = bots.filter((b) => !votes[b.id]);
        if (pendingBots.length > 0) {
          botLockRef.current = true;
          for (const b of pendingBots) {
            votes[b.id] = Math.random() < 0.8 ? 'APPROVE' : 'REJECT';
          }
          await evaluateTeamVotes(roomRef, currentRoom, votes);
          botLockRef.current = false;
          return;
        }
      }

      // 3. Fase Eksekusi Misi -> anggota tim yang merupakan bot mengirim kartu
      if (currentRoom.phase === 'QUEST_EXECUTION') {
        const proposedTeam = currentRoom.proposedTeam || [];
        const questActions = { ...(currentRoom.questActions || {}) };
        const pendingTeamBots = bots.filter(
          (b) => proposedTeam.includes(b.id) && !questActions[b.id]
        );
        if (pendingTeamBots.length > 0) {
          botLockRef.current = true;
          for (const b of pendingTeamBots) {
            const isEvil = ['ASSASSIN', 'MORGANA', 'MORDRED', 'OBERON', 'MINION'].includes(b.role);
            questActions[b.id] = isEvil && Math.random() < 0.75 ? 'FAIL' : 'SUCCESS';
          }
          await evaluateQuestActions(roomRef, currentRoom, questActions);
          botLockRef.current = false;
          return;
        }
      }

      // 4. Fase Pembunuhan dan Assassin adalah Bot
      if (currentRoom.phase === 'ASSASSINATION') {
        const assassin = allPlayers.find((p) => p.role === 'ASSASSIN');
        if (assassin?.isBot) {
          botLockRef.current = true;
          const goodCandidates = allPlayers.filter((p) =>
            ['MERLIN', 'PERCIVAL', 'LOYAL_SERVANT'].includes(p.role)
          );
          const target =
            goodCandidates[Math.floor(Math.random() * goodCandidates.length)] || allPlayers[0];
          const killedMerlin = target.role === 'MERLIN';
          await updateDoc(roomRef, {
            phase: 'GAME_OVER',
            winner: killedMerlin ? 'EVIL' : 'GOOD',
            winReason: killedMerlin
              ? `Assassin (${assassin.name}) berhasil menebak dan membunuh Merlin (${target.name})!`
              : `Assassin (${assassin.name}) salah menembak ${target.name}. Merlin selamat dan Kubu Arthur menang!`,
            assassinatedId: target.id
          });
          botLockRef.current = false;
        }
      }
    } catch (err) {
      console.error('Bot automation error:', err);
      botLockRef.current = false;
    }
  }, [evaluateTeamVotes, evaluateQuestActions]);

  // Pemicu otomatis setiap kali state ruangan berubah (untuk Host)
  useEffect(() => {
    if (!roomData || !isHost) return;
    const hasBots = (roomData.players || []).some((p) => p.isBot);
    if (!hasBots) return;

    const timer = setTimeout(() => {
      runBotTurnStep();
    }, 900);

    return () => clearTimeout(timer);
  }, [roomData, isHost, runBotTurnStep]);

  // Deteksi apakah saat ini sedang menunggu aksi dari Bot (agar Host bisa melihat status / mempercepat jika perlu)
  const isWaitingForBot = useMemo(() => {
    if (!roomData) return false;
    if (roomData.phase === 'TEAM_PROPOSAL') return Boolean(leader?.isBot);
    if (roomData.phase === 'TEAM_VOTE') {
      return players.some((p) => p.isBot && !roomData.votes?.[p.id]);
    }
    if (roomData.phase === 'QUEST_EXECUTION') {
      const team = roomData.proposedTeam || [];
      return players.some((p) => p.isBot && team.includes(p.id) && !roomData.questActions?.[p.id]);
    }
    if (roomData.phase === 'ASSASSINATION') {
      const assassin = players.find((p) => p.role === 'ASSASSIN');
      return Boolean(assassin?.isBot);
    }
    return false;
  }, [roomData, leader, players]);

  // ============================================================================
  // AKSI PENGGUNA (BUAT RUANGAN, GABUNG, LOBI, VOTING, MISI, ASSASSIN)
  // ============================================================================
  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      showToast('Masukkan namamu terlebih dahulu!', 'error');
      return;
    }
    if (!user) {
      showToast('Menghubungkan ke server, coba sesaat lagi...', 'info');
      return;
    }

    setBusyAction(true);
    try {
      let code = generateRoomCode();
      let roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', code);
      const existing = await getDoc(roomRef);
      if (existing.exists()) {
        code = generateRoomCode();
        roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', code);
      }

      const initialRoom = {
        code,
        hostId: user.uid,
        phase: 'LOBBY',
        createdAt: Date.now(),
        settings: {
          merlin: true,
          percival: true,
          morgana: true,
          mordred: false,
          oberon: false
        },
        players: [
          {
            id: user.uid,
            name: trimmedName,
            isBot: false,
            role: null
          }
        ],
        currentQuest: 1,
        questResults: [null, null, null, null, null],
        leaderIndex: 0,
        rejectedCount: 0,
        proposedTeam: [],
        votes: {},
        questActions: {},
        lastVoteResult: null,
        lastQuestReveal: null,
        winner: null,
        winReason: '',
        assassinatedId: null
      };

      await setDoc(roomRef, initialRoom);
      setActiveRoomCode(code);
      try {
        localStorage.setItem('avalon_active_room', code);
      } catch {}
      showToast(`Ruangan ${code} berhasil dibuat!`, 'success');
    } catch (err) {
      console.error('Create room error:', err);
      showToast('Gagal membuat ruangan. Pastikan Firestore aktif.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e?.preventDefault();
    const trimmedName = playerName.trim();
    const code = roomCodeInput.trim().toUpperCase();

    if (!trimmedName) {
      showToast('Masukkan namamu terlebih dahulu!', 'error');
      return;
    }
    if (code.length !== 4) {
      showToast('Masukkan 4 digit kode ruangan!', 'error');
      return;
    }
    if (!user) {
      showToast('Menghubungkan ke server, coba sesaat lagi...', 'info');
      return;
    }

    setBusyAction(true);
    try {
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        showToast(`Ruangan "${code}" tidak ditemukan.`, 'error');
        setBusyAction(false);
        return;
      }

      const data = snap.data();
      const existingPlayer = (data.players || []).find((p) => p.id === user.uid);

      if (existingPlayer) {
        const updatedPlayers = data.players.map((p) =>
          p.id === user.uid ? { ...p, name: trimmedName } : p
        );
        await updateDoc(roomRef, { players: updatedPlayers });
      } else {
        if (data.phase !== 'LOBBY') {
          showToast('Permainan di ruangan ini sudah dimulai!', 'error');
          setBusyAction(false);
          return;
        }
        if ((data.players || []).length >= 10) {
          showToast('Ruangan sudah penuh (maksimal 10 pemain).', 'error');
          setBusyAction(false);
          return;
        }
        const updatedPlayers = [
          ...(data.players || []),
          { id: user.uid, name: trimmedName, isBot: false, role: null }
        ];
        await updateDoc(roomRef, { players: updatedPlayers });
      }

      setActiveRoomCode(code);
      try {
        localStorage.setItem('avalon_active_room', code);
      } catch {}
      showToast(`Berhasil bergabung ke ruangan ${code}!`, 'success');
    } catch (err) {
      console.error('Join room error:', err);
      showToast('Gagal bergabung ke ruangan.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomData || !user) {
      setActiveRoomCode('');
      return;
    }

    try {
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
      const remaining = players.filter((p) => p.id !== user.uid);
      const humanRemaining = remaining.filter((p) => !p.isBot);

      if (humanRemaining.length === 0) {
        await deleteDoc(roomRef);
      } else {
        const nextHostId =
          roomData.hostId === user.uid ? humanRemaining[0].id : roomData.hostId;
        await updateDoc(roomRef, {
          players: remaining,
          hostId: nextHostId
        });
      }
    } catch (err) {
      console.error('Leave room error:', err);
    } finally {
      setActiveRoomCode('');
      setRoomData(null);
      try {
        localStorage.removeItem('avalon_active_room');
      } catch {}
    }
  };

  const handleAddBot = async () => {
    if (!isHost || !roomData || players.length >= 10) return;
    const botNames = [
      'Sir Lancelot (Bot)',
      'Lady Guinevere (Bot)',
      'Sir Gawain (Bot)',
      'Sir Tristan (Bot)',
      'Sir Galahad (Bot)',
      'Sir Bors (Bot)',
      'Sir Kay (Bot)',
      'Sir Bedivere (Bot)',
      'Sir Gareth (Bot)'
    ];
    const usedNames = new Set(players.map((p) => p.name));
    const nextName =
      botNames.find((n) => !usedNames.has(n)) || `Ksatria Bot #${players.length + 1}`;
    const newBot = {
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: nextName,
      isBot: true,
      role: null
    };

    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
    await updateDoc(roomRef, {
      players: [...players, newBot]
    });
  };

  const handleRemovePlayer = async (targetId) => {
    if (!isHost || !roomData || targetId === user?.uid) return;
    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
    await updateDoc(roomRef, {
      players: players.filter((p) => p.id !== targetId)
    });
  };

  const handleToggleSetting = async (key) => {
    if (!isHost || !roomData) return;
    const nextSettings = {
      ...roomData.settings,
      [key]: !roomData.settings[key]
    };
    if (key === 'merlin' && !nextSettings.merlin) {
      nextSettings.percival = false;
    }
    if (key === 'percival' && nextSettings.percival) {
      nextSettings.merlin = true;
    }
    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
    await updateDoc(roomRef, { settings: nextSettings });
  };

  const handleStartGame = async () => {
    if (!isHost || !roomData) return;
    if (players.length < 5 || players.length > 10) {
      showToast('Jumlah pemain harus antara 5 hingga 10 orang!', 'error');
      return;
    }

    setBusyAction(true);
    try {
      const shuffledPlayers = shuffleArray(players);
      const rolePool = buildRolePool(shuffledPlayers.length, roomData.settings || {});
      const assignedPlayers = shuffledPlayers.map((p, idx) => ({
        ...p,
        role: rolePool[idx]
      }));

      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
      await updateDoc(roomRef, {
        players: assignedPlayers,
        phase: 'TEAM_PROPOSAL',
        currentQuest: 1,
        questResults: [null, null, null, null, null],
        leaderIndex: 0,
        rejectedCount: 0,
        proposedTeam: [],
        votes: {},
        questActions: {},
        lastVoteResult: null,
        lastQuestReveal: null,
        winner: null,
        winReason: '',
        assassinatedId: null
      });
      setRoleCardOpen(true);
    } catch (err) {
      console.error('Start game error:', err);
      showToast('Gagal memulai permainan.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const toggleDraftMember = (pid) => {
    if (!isLeader || roomData?.phase !== 'TEAM_PROPOSAL') return;
    if (selectedTeamDraft.includes(pid)) {
      setSelectedTeamDraft(selectedTeamDraft.filter((id) => id !== pid));
    } else {
      if (selectedTeamDraft.length >= requiredTeamSize) {
        showToast(`Misi ini hanya membutuhkan ${requiredTeamSize} anggota tim.`, 'info');
        return;
      }
      setSelectedTeamDraft([...selectedTeamDraft, pid]);
    }
  };

  const handleConfirmProposal = async () => {
    if (!isLeader || selectedTeamDraft.length !== requiredTeamSize || !roomData) return;
    setBusyAction(true);
    try {
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
      await updateDoc(roomRef, {
        proposedTeam: selectedTeamDraft,
        phase: 'TEAM_VOTE',
        votes: {}
      });
    } catch (err) {
      console.error('Propose team error:', err);
      showToast('Gagal mengajukan tim misi.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCastVote = async (choice) => {
    if (!roomData || !user || roomData.phase !== 'TEAM_VOTE') return;
    if (roomData.votes?.[user.uid]) return;

    setBusyAction(true);
    try {
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
      const updatedVotes = {
        ...(roomData.votes || {}),
        [user.uid]: choice
      };
      await evaluateTeamVotes(roomRef, roomData, updatedVotes);
    } catch (err) {
      console.error('Vote error:', err);
      showToast('Gagal mengirim suara voting.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCastQuestAction = async (actionChoice) => {
    if (!roomData || !user || roomData.phase !== 'QUEST_EXECUTION') return;
    const isOnTeam = (roomData.proposedTeam || []).includes(user.uid);
    if (!isOnTeam || roomData.questActions?.[user.uid]) return;

    const myRoleDef = ROLE_DEFINITIONS[me?.role];
    if (myRoleDef?.alignment === 'GOOD' && actionChoice === 'FAIL') {
      showToast('Ksatria Kubu Arthur hanya dapat menyukseskan misi!', 'error');
      return;
    }

    setBusyAction(true);
    try {
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
      const updatedActions = {
        ...(roomData.questActions || {}),
        [user.uid]: actionChoice
      };
      await evaluateQuestActions(roomRef, roomData, updatedActions);
    } catch (err) {
      console.error('Quest action error:', err);
      showToast('Gagal mengirim kartu misi.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAssassinate = async () => {
    if (!roomData || me?.role !== 'ASSASSIN' || !selectedAssassinTarget) return;
    setBusyAction(true);
    try {
      const target = players.find((p) => p.id === selectedAssassinTarget);
      const killedMerlin = target?.role === 'MERLIN';
      const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);

      await updateDoc(roomRef, {
        phase: 'GAME_OVER',
        winner: killedMerlin ? 'EVIL' : 'GOOD',
        winReason: killedMerlin
          ? `Assassin (${me.name}) berhasil menebak dan membunuh Merlin (${target?.name})! Kemenangan direbut Kubu Mordred!`
          : `Assassin (${me.name}) salah menembak ${target?.name}. Merlin selamat dan Kubu Setia Arthur menang!`,
        assassinatedId: selectedAssassinTarget
      });
    } catch (err) {
      console.error('Assassination error:', err);
      showToast('Gagal melakukan eksekusi Assassin.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleReturnToLobby = async () => {
    if (!isHost || !roomData) return;
    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'avalon_rooms', roomData.code);
    await updateDoc(roomRef, {
      phase: 'LOBBY',
      players: players.map((p) => ({ ...p, role: null })),
      currentQuest: 1,
      questResults: [null, null, null, null, null],
      leaderIndex: 0,
      rejectedCount: 0,
      proposedTeam: [],
      votes: {},
      questActions: {},
      lastVoteResult: null,
      lastQuestReveal: null,
      winner: null,
      winReason: '',
      assassinatedId: null
    });
    setRoleCardOpen(false);
  };

  const copyRoomCode = () => {
    if (!roomData?.code) return;
    navigator.clipboard?.writeText(roomData.code);
    setCopiedCode(true);
    showToast(`Kode ruangan ${roomData.code} disalin!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ============================================================================
  // TAMPILAN 1: BERANDA (BUAT RUANGAN / GABUNG LEWAT KODE)
  // ============================================================================
  if (!activeRoomCode || (!roomData && !loadingRoom)) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 max-w-[92vw] ${
              toast.type === 'error'
                ? 'bg-red-950/95 border-red-500 text-red-100'
                : toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 mb-1">
              <Crown className="w-9 h-9" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
              The Resistance
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              AVALON
            </h1>
            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
              Permainan deduksi sosial penuh intrik. Mainkan langsung lewat browser ponsel masing-masing!
            </p>

            <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap">
              {['MERLIN', 'PERCIVAL', 'ASSASSIN', 'MORGANA', 'MORDRED'].map((rId) => (
                <CharacterPortrait key={rId} roleId={rId} size="xs" />
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGrimoireModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Kitab Karakter</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Cara Main</span>
              </button>
            </div>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Nama Ksatria / Pemain
              </label>
              <input
                type="text"
                maxLength={18}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Contoh: Arthur, Budi, Siti..."
                className="w-full px-4 py-3.5 rounded-xl bg-[#0B1120] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-base font-medium"
              />
            </div>

            <button
              type="button"
              disabled={busyAction || !authReady}
              onClick={handleCreateRoom}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <Crown className="w-5 h-5" />
              <span>Buat Ruangan Baru</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-700" />
              <span className="shrink mx-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                atau gabung ruangan
              </span>
              <div className="flex-grow border-t border-slate-700" />
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="KODE"
                  className="w-32 sm:w-36 px-3 py-3.5 rounded-xl bg-[#0B1120] border border-slate-700 text-center text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 text-lg font-extrabold tracking-[0.25em] uppercase"
                />
                <button
                  type="submit"
                  disabled={busyAction || !authReady}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  <Users className="w-5 h-5" />
                  <span>Gabung</span>
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500">
            5–10 Pemain • Sinkronisasi Real-Time • Tanpa Instalasi Aplikasi
          </p>
        </div>

        {showGrimoireModal && (
          <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
        )}
        {showRulesModal && <RulesGuideModal onClose={() => setShowRulesModal(false)} />}
      </div>
    );
  }

  // Layar Memuat Ruangan
  if (loadingRoom && !roomData) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          Memasuki meja perundingan Avalon ({activeRoomCode})...
        </p>
      </div>
    );
  }

  // ============================================================================
  // TAMPILAN 2: RUANG TUNGGU / LOBI (5 - 10 PEMAIN)
  // ============================================================================
  if (roomData.phase === 'LOBBY') {
    const canStart = isHost && playerCount >= 5 && playerCount <= 10;

    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 p-4 sm:p-6 pb-24">
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 max-w-[92vw] ${
              toast.type === 'error'
                ? 'bg-red-950/95 border-red-500 text-red-100'
                : toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        <div className="max-w-lg mx-auto space-y-5">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrimoireModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/40"
              >
                <BookOpen className="w-4 h-4" />
                <span>Karakter</span>
              </button>
              <button
                onClick={() => setShowRulesModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Aturan</span>
              </button>
            </div>
          </div>

          <div className="bg-[#1E293B] border border-amber-500/30 rounded-2xl p-5 text-center shadow-xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Kode Ruangan Mabar
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black tracking-[0.25em] text-amber-400 pl-2">
                {roomData.code}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 transition"
                title="Salin kode ruangan"
              >
                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Bagikan kode 4 huruf ini ke HP teman-temanmu untuk bergabung
            </p>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Pemain Terhubung ({playerCount}/10)</span>
              </h2>
              {playerCount >= 5 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  <span className="text-blue-400">{matrix.good} Baik</span> •{' '}
                  <span className="text-red-400">{matrix.evil} Jahat</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0B1120]/80 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-white truncate">
                      {p.name}
                    </span>
                    {p.id === roomData.hostId && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                        Host
                      </span>
                    )}
                    {p.id === user?.uid && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                        Kamu
                      </span>
                    )}
                    {p.isBot && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Bot
                      </span>
                    )}
                  </div>

                  {isHost && p.id !== user?.uid && (
                    <button
                      onClick={() => handleRemovePlayer(p.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                      title="Keluarkan pemain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isHost && playerCount < 10 && (
              <button
                type="button"
                onClick={handleAddBot}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-600 hover:border-amber-400/60 text-slate-300 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah Bot (Tes Solo)</span>
              </button>
            )}

            {playerCount < 5 && (
              <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                Butuh minimal <strong>{5 - playerCount} pemain lagi</strong> (total 5–10 pemain) untuk memulai permainan.
              </p>
            )}
          </div>

          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Peran Spesial</span>
              </h2>
              {!isHost && (
                <span className="text-[11px] text-slate-400">Diatur oleh Host</span>
              )}
            </div>

            <div className="space-y-2.5">
              <RoleToggleRow
                title="Merlin & Assassin"
                subtitle="Merlin tahu Kubu Jahat; Assassin menembak Merlin di akhir."
                badge="Wajib / Standar"
                portraits={['MERLIN', 'ASSASSIN']}
                enabled={!!roomData.settings?.merlin}
                disabled={!isHost}
                onToggle={() => handleToggleSetting('merlin')}
              />
              <RoleToggleRow
                title="Percival"
                subtitle="Ksatria baik yang dapat melihat siapa Merlin."
                badge="Kubu Arthur"
                portraits={['PERCIVAL']}
                enabled={!!roomData.settings?.percival}
                disabled={!isHost}
                onToggle={() => handleToggleSetting('percival')}
              />
              <RoleToggleRow
                title="Morgana"
                subtitle="Penyihir jahat yang menyamar sebagai Merlin di mata Percival."
                badge="Kubu Mordred"
                portraits={['MORGANA']}
                enabled={!!roomData.settings?.morgana}
                disabled={!isHost}
                onToggle={() => handleToggleSetting('morgana')}
              />
              <RoleToggleRow
                title="Mordred"
                subtitle="Pemimpin jahat yang tidak terlihat oleh penglihatan Merlin."
                badge="Kubu Mordred"
                portraits={['MORDRED']}
                enabled={!!roomData.settings?.mordred}
                disabled={!isHost}
                onToggle={() => handleToggleSetting('mordred')}
              />
              <RoleToggleRow
                title="Oberon"
                subtitle="Anggota jahat yang tidak saling mengenal dengan Kubu Mordred."
                badge="Kubu Mordred"
                portraits={['OBERON']}
                enabled={!!roomData.settings?.oberon}
                disabled={!isHost}
                onToggle={() => handleToggleSetting('oberon')}
              />
            </div>
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart || busyAction}
              onClick={handleStartGame}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-extrabold text-base shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {canStart
                  ? `Mulai Permainan (${playerCount} Pemain)`
                  : `Menunggu Pemain (${playerCount}/5)`}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 text-center text-sm text-slate-300 font-medium">
              Menunggu <strong>Host</strong> memulai permainan...
            </div>
          )}
        </div>

        {showGrimoireModal && (
          <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
        )}
        {showRulesModal && <RulesGuideModal onClose={() => setShowRulesModal(false)} />}
      </div>
    );
  }

  // ============================================================================
  // TAMPILAN 3: LAYAR PERMAINAN AKTIF & AKHIR PERMAINAN
  // ============================================================================
  const myRoleDef = ROLE_DEFINITIONS[me?.role] || ROLE_DEFINITIONS.LOYAL_SERVANT;
  const isMyAlignmentGood = myRoleDef.alignment === 'GOOD';
  const hasVotedTeam = Boolean(roomData.votes?.[user?.uid]);
  const isOnProposedTeam = (roomData.proposedTeam || []).includes(user?.uid);
  const hasSubmittedQuestAction = Boolean(roomData.questActions?.[user?.uid]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 pb-24">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 max-w-[92vw] ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-500 text-red-100'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
              : 'bg-slate-900/95 border-amber-500/60 text-amber-100'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bilah Atas */}
      <header className="sticky top-0 z-30 bg-[#0B1120]/95 backdrop-blur border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm tracking-wider text-white truncate">
              AVALON • {roomData.code}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGrimoireModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Karakter</span>
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Panduan"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700"
              title="Keluar ruangan"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* ====================================================================
            1. KARTU IDENTITAS RAHASIA & PENGLIHATAN BATIN (DESAIN KARTU KARAKTER)
            ==================================================================== */}
        <section
          className={`rounded-2xl border transition overflow-hidden ${
            roleCardOpen
              ? isMyAlignmentGood
                ? 'bg-gradient-to-b from-blue-950/95 via-[#162238] to-[#0F172A] border-amber-400/80 shadow-2xl shadow-blue-950/70'
                : 'bg-gradient-to-b from-red-950/95 via-[#24131D] to-[#0F172A] border-red-500/80 shadow-2xl shadow-red-950/70'
              : 'bg-[#1E293B] border-slate-700/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setRoleCardOpen(!roleCardOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              {roleCardOpen ? (
                <EyeOff className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <Eye className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  {roleCardOpen
                    ? 'Tutup Kartu Identitas Rahasia'
                    : 'Buka Kartu Identitas & Kekuatanmu'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {roleCardOpen
                    ? 'Pastikan layar ponsel tidak diintip pemain lain!'
                    : `Pemain: ${me?.name || playerName}`}
                </p>
              </div>
            </div>
            {roleCardOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-300" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-300" />
            )}
          </button>

          {roleCardOpen && me?.role && (
            <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-4">
              {/* Bingkai Kartu Karakter Bergaya Koleksi */}
              <div
                className={`rounded-2xl border-2 overflow-hidden shadow-2xl relative ${
                  isMyAlignmentGood
                    ? 'border-amber-400 bg-gradient-to-b from-blue-950 to-[#0B1120]'
                    : 'border-red-500 bg-gradient-to-b from-red-950 to-[#0B1120]'
                }`}
              >
                {/* Header Kartu: Nama & Lencana Kubu */}
                <div
                  className={`px-3.5 py-2 flex items-center justify-between border-b ${
                    isMyAlignmentGood
                      ? 'bg-blue-900/70 border-amber-400/40'
                      : 'bg-red-900/70 border-red-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isMyAlignmentGood ? (
                      <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                    ) : (
                      <Skull className="w-4 h-4 text-red-300 shrink-0" />
                    )}
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      {myRoleDef.teamLabel}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      isMyAlignmentGood
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {isMyAlignmentGood ? 'Kubu Baik' : 'Kubu Jahat'}
                  </span>
                </div>

                {/* Ilustrasi Potret Karakter Besar di Dalam Kartu */}
                <div className="relative">
                  <CharacterPortrait roleId={me.role} size="card" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/85 to-transparent">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                      {myRoleDef.title}
                    </p>
                    <h3 className="text-2xl font-black text-white tracking-tight drop-shadow">
                      {myRoleDef.name}
                    </h3>
                  </div>
                </div>

                {/* Keterangan Kekuatan & Tips Bermain di Bagian Bawah Kartu */}
                <div className="p-3.5 space-y-2.5 bg-[#0B1120]/95 border-t border-white/10">
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <ScrollText className="w-3.5 h-3.5" />
                      <span>Kekuatan Karakter</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                      {myRoleDef.ability}
                    </p>
                  </div>

                  {myRoleDef.strategyTip && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                        isMyAlignmentGood
                          ? 'bg-blue-950/50 border-blue-500/30 text-blue-200'
                          : 'bg-red-950/50 border-red-500/30 text-red-200'
                      }`}
                    >
                      <strong className="font-extrabold">Strategi: </strong>
                      {myRoleDef.strategyTip}
                    </div>
                  )}
                </div>
              </div>

              {/* Kotak Penglihatan Batin */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-amber-500/30 space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>{myVision.title}</span>
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{myVision.notes}</p>
                {myVision.targets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {myVision.targets.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold ${
                          t.tone === 'red'
                            ? 'bg-red-950/70 border-red-500/40 text-red-200'
                            : 'bg-amber-950/70 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CharacterPortrait roleId={t.roleId} size="xs" />
                          <span>{t.name}</span>
                        </div>
                        <span className="text-[10px] uppercase opacity-90">{t.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 2. PAPAN SKOR 5 MISI & TRACKER PENOLAKAN VOTING (1 - 5) */}
        <section className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Papan Misi Camelot ({playerCount} Pemain)
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Ketua: <strong className="text-amber-300">{leader?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {matrix.quests.map((qSize, idx) => {
              const qNum = idx + 1;
              const res = roomData.questResults?.[idx];
              const isCurrent =
                roomData.phase !== 'GAME_OVER' &&
                roomData.phase !== 'ASSASSINATION' &&
                roomData.currentQuest === qNum;
              const isQ4Double = qNum === 4 && matrix.twoFailsQuest4;

              return (
                <div
                  key={qNum}
                  className={`rounded-xl p-2 border flex flex-col items-center justify-center text-center relative ${
                    res === 'SUCCESS'
                      ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                      : res === 'FAIL'
                      ? 'bg-red-600/30 border-red-400 text-red-100'
                      : isCurrent
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/30'
                      : 'bg-[#0B1120]/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase opacity-80">
                    Misi {qNum}
                  </span>
                  <div className="my-1">
                    {res === 'SUCCESS' ? (
                      <ShieldCheck className="w-6 h-6 text-blue-400" />
                    ) : res === 'FAIL' ? (
                      <ShieldAlert className="w-6 h-6 text-red-400" />
                    ) : (
                      <span className="text-lg font-black">{qSize}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold leading-tight">
                    {res === 'SUCCESS'
                      ? 'Sukses'
                      : res === 'FAIL'
                      ? 'Gagal'
                      : isQ4Double
                      ? '2 Gagal*'
                      : `${qSize} Orang`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/70">
            <span className="text-[11px] font-semibold text-slate-400">
              Voting Ditolak Berturut-turut:
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((step) => {
                const filled = (roomData.rejectedCount || 0) >= step;
                return (
                  <span
                    key={step}
                    className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center border ${
                      filled
                        ? step === 5
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-amber-500 border-amber-300 text-slate-950'
                        : 'bg-[#0B1120] border-slate-700 text-slate-500'
                    }`}
                  >
                    {step}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* Epilog Hasil Misi Terakhir */}
        {roomData.lastQuestReveal && (
          <QuestEpilogueCard reveal={roomData.lastQuestReveal} />
        )}

        {/* Ringkasan Hasil Voting Tim Terakhir */}
        {roomData.lastVoteResult && (
          <LastVoteSummaryCard result={roomData.lastVoteResult} players={players} />
        )}

        {/* 3. CERITA BAB MISI SAAT INI (PROLOG VISUAL) */}
        {roomData.phase !== 'GAME_OVER' && roomData.phase !== 'ASSASSINATION' && (
          <QuestChapterCard
            questNumber={roomData.currentQuest}
            needsTwoFails={needsTwoFails}
          />
        )}

        {/* Banner Bantuan Jika Sedang Menunggu Bot */}
        {isHost && isWaitingForBot && (
          <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <Bot className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
              <span>Bot sedang memproses gilirannya...</span>
            </div>
            <button
              type="button"
              onClick={() => {
                botLockRef.current = false;
                runBotTurnStep();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Jalankan Bot</span>
            </button>
          </div>
        )}

        {/* ====================================================================
            4. PANEL AKSI SESUAI FASE PERMAINAN
            ==================================================================== */}

        {/* FASE A: PENUNJUKAN TIM MISI */}
        {roomData.phase === 'TEAM_PROPOSAL' && (
          <section className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  Tahap 1 • Penunjukan Tim Misi {roomData.currentQuest}
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  {isLeader
                    ? `Pilih ${requiredTeamSize} Ksatria untuk Berangkat`
                    : `Menunggu ${leader?.name} Memilih ${requiredTeamSize} Ksatria`}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-extrabold shrink-0">
                {isLeader ? selectedTeamDraft.length : 0}/{requiredTeamSize}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {players.map((p, idx) => {
                const isSelected = selectedTeamDraft.includes(p.id);
                const isCurrentLeader = idx === (roomData.leaderIndex || 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isLeader}
                    onClick={() => toggleDraftMember(p.id)}
                    className={`w-full px-3.5 py-3 rounded-xl border flex items-center justify-between transition text-left ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-[#0B1120]/70 border-slate-800 text-slate-300'
                    } ${isLeader ? 'active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isCurrentLeader ? (
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="font-bold text-sm truncate">{p.name}</span>
                      {p.id === user?.uid && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          Kamu
                        </span>
                      )}
                    </div>

                    {isLeader && (
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-400 border-amber-300 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {isLeader ? (
              <button
                type="button"
                disabled={selectedTeamDraft.length !== requiredTeamSize || busyAction}
                onClick={handleConfirmProposal}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Swords className="w-4 h-4" />
                <span>
                  Ajukan Tim ke Meja Voting ({selectedTeamDraft.length}/{requiredTeamSize})
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center bg-[#0B1120]/60 p-3 rounded-xl">
                Berdiskusilah sekarang! Siapa saja yang pantas dipercaya untuk menjalankan Misi {roomData.currentQuest}?
              </p>
            )}
          </section>
        )}

        {/* FASE B: VOTING TIM SERENTAK DI PONSEL MASING-MASING */}
        {roomData.phase === 'TEAM_VOTE' && (
          <section className="bg-[#1E293B] border-2 border-amber-500/60 rounded-2xl p-4 space-y-4 shadow-xl">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                Tahap 2 • Voting Persetujuan Tim
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Tim yang Diajukan {leader?.name}:
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {(roomData.proposedTeam || []).map((pid) => {
                const member = players.find((p) => p.id === pid);
                return (
                  <span
                    key={pid}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>{member?.name || 'Ksatria'}</span>
                  </span>
                );
              })}
            </div>

            {!hasVotedTeam ? (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs text-slate-300">
                  Berikan suaramu secara rahasia lewat ponselmu sekarang:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => handleCastVote('APPROVE')}
                    className="py-4 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <ThumbsUp className="w-6 h-6" />
                    <span>SETUJU</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => handleCastVote('REJECT')}
                    className="py-4 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <ThumbsDown className="w-6 h-6" />
                    <span>TOLAK</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-1">
                <p className="text-sm font-extrabold text-emerald-300">
                  Suaramu ({roomData.votes?.[user?.uid] === 'APPROVE' ? 'SETUJU' : 'TOLAK'}) Tercatat!
                </p>
                <p className="text-xs text-slate-300">
                  Menunggu pemain lain selesai memilih ({Object.keys(roomData.votes || {}).length}/{playerCount})...
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/70">
              <p className="text-[11px] font-bold text-slate-400 mb-2">
                Status Suara Pemain ({Object.keys(roomData.votes || {}).length}/{playerCount}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {players.map((p) => {
                  const voted = Boolean(roomData.votes?.[p.id]);
                  return (
                    <span
                      key={p.id}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        voted
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {p.name} {voted ? '✓' : '...'}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* FASE C: EKSEKUSI MISI RAHASIA */}
        {roomData.phase === 'QUEST_EXECUTION' && (
          <section className="bg-[#1E293B] border-2 border-blue-500/60 rounded-2xl p-4 space-y-4 shadow-xl">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                Tahap 3 • Eksekusi Misi {roomData.currentQuest}
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                {isOnProposedTeam
                  ? 'Kamu Terpilih Menjalankan Misi!'
                  : 'Tim Ekspedisi Sedang Bertugas...'}
              </h3>
            </div>

            {isOnProposedTeam ? (
              !hasSubmittedQuestAction ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pilih kartu misi rahasiamu. Tidak ada yang akan tahu siapa mengirim kartu apa—hanya total kartu Sukses dan Gagal yang diacak di akhir misi.
                  </p>
                  <div className={`grid ${isMyAlignmentGood ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleCastQuestAction('SUCCESS')}
                      className="py-4 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <ShieldCheck className="w-7 h-7" />
                      <span>SUKSESKAN MISI</span>
                    </button>

                    {!isMyAlignmentGood && (
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleCastQuestAction('FAIL')}
                        className="py-4 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <ShieldAlert className="w-7 h-7" />
                        <span>SABOTASE (GAGAL)</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-950/50 border border-blue-500/40 text-center space-y-1">
                  <p className="text-sm font-extrabold text-blue-200">
                    Kartu Misimu Telah Dikirim!
                  </p>
                  <p className="text-xs text-slate-300">
                    Menunggu anggota tim misi lainnya ({Object.keys(roomData.questActions || {}).length}/{(roomData.proposedTeam || []).length})...
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl bg-[#0B1120]/80 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Menunggu anggota tim terpilih menyelesaikan misi secara rahasia:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(roomData.proposedTeam || []).map((pid) => {
                    const m = players.find((p) => p.id === pid);
                    const done = Boolean(roomData.questActions?.[pid]);
                    return (
                      <span
                        key={pid}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          done
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {m?.name} {done ? '✓' : '⏳'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* FASE D: PERBURUAN TERAKHIR ASSASSIN */}
        {roomData.phase === 'ASSASSINATION' && (
          <section className="bg-gradient-to-b from-red-950/80 to-[#1E293B] border-2 border-red-500 rounded-2xl p-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <CharacterPortrait roleId="ASSASSIN" size="md" />
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-300">
                  Kesempatan Terakhir Kubu Mordred!
                </span>
                <h3 className="text-lg font-black text-white">
                  Assassin Mengincar Merlin!
                </h3>
                <p className="text-xs text-slate-200 mt-0.5">
                  Kubu Arthur menang 3 misi, namun jika Assassin menebak siapa Merlin dengan tepat, Kubu Jahat berbalik menang!
                </p>
              </div>
            </div>

            {me?.role === 'ASSASSIN' ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-amber-300">
                  Pilih 1 pemain yang kamu yakini adalah Merlin:
                </p>
                <div className="space-y-2">
                  {players
                    .filter((p) => p.id !== user?.uid)
                    .map((p) => {
                      const picked = selectedAssassinTarget === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedAssassinTarget(p.id)}
                          className={`w-full px-3.5 py-3 rounded-xl border flex items-center justify-between text-left transition ${
                            picked
                              ? 'bg-red-600/30 border-red-400 text-white'
                              : 'bg-[#0B1120]/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-sm">{p.name}</span>
                          <Skull
                            className={`w-5 h-5 ${
                              picked ? 'text-red-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={!selectedAssassinTarget || busyAction}
                  onClick={handleAssassinate}
                  className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <Skull className="w-5 h-5" />
                  <span>Eksekusi Target Sekarang!</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/40 border border-red-500/30 text-center space-y-1">
                <p className="text-sm font-bold text-red-200">
                  Kubu Mordred sedang berdiskusi menentukan target...
                </p>
                <p className="text-xs text-slate-300">
                  Merlin, tetaplah tenang dan jangan tunjukkan reaksi mencurigakan!
                </p>
              </div>
            )}
          </section>
        )}

        {/* FASE E: PERMAINAN SELESAI & PENGUNGKAPAN IDENTITAS */}
        {roomData.phase === 'GAME_OVER' && (
          <section
            className={`rounded-2xl border-2 p-5 space-y-4 shadow-2xl ${
              roomData.winner === 'GOOD'
                ? 'bg-gradient-to-b from-blue-950/90 to-[#1E293B] border-blue-400'
                : 'bg-gradient-to-b from-red-950/90 to-[#1E293B] border-red-400'
            }`}
          >
            <div className="text-center space-y-2">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto ${
                  roomData.winner === 'GOOD'
                    ? 'bg-blue-500 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {roomData.winner === 'GOOD' ? (
                  <Crown className="w-8 h-8" />
                ) : (
                  <Skull className="w-8 h-8" />
                )}
              </div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                Pertempuran Berakhir
              </p>
              <h2 className="text-2xl font-black text-white">
                {roomData.winner === 'GOOD'
                  ? 'KUBU SETIA ARTHUR MENANG!'
                  : 'KUBU MORDRED MENANG!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {roomData.winReason}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Pengungkapan Identitas Seluruh Pemain:
              </p>
              {players.map((p) => {
                const rDef =
                  ROLE_DEFINITIONS[p.role] || ROLE_DEFINITIONS.LOYAL_SERVANT;
                const isGood = rDef.alignment === 'GOOD';
                const wasShot = roomData.assassinatedId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${
                      isGood
                        ? 'bg-blue-950/40 border-blue-500/40'
                        : 'bg-red-950/40 border-red-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CharacterPortrait roleId={p.role} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {wasShot && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-extrabold text-white">
                              Ditembak
                            </span>
                          )}
                        </p>
                        <p
                          className={`text-xs font-extrabold ${
                            isGood ? 'text-blue-300' : 'text-red-300'
                          }`}
                        >
                          {rDef.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                        isGood ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isGood ? 'BAIK' : 'JAHAT'}
                    </span>
                  </div>
                );
              })}
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={handleReturnToLobby}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Main Lagi (Kembali ke Lobi)</span>
              </button>
            ) : (
              <p className="text-xs text-center text-slate-300">
                Menunggu Host membuka ronde berikutnya...
              </p>
            )}
          </section>
        )}
      </main>

      {showGrimoireModal && (
        <CharacterGrimoireModal onClose={() => setShowGrimoireModal(false)} />
      )}
      {showRulesModal && <RulesGuideModal onClose={() => setShowRulesModal(false)} />}
    </div>
  );
}

// ============================================================================
// SUB-KOMPONEN UI
// ============================================================================
function RoleToggleRow({ title, subtitle, badge, portraits = [], enabled, disabled, onToggle }) {
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
              <h3 className="font-extrabold text-white text-base">Kitab Karakter Avalon</h3>
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
                    <h4 className="font-extrabold text-sm text-white">{role.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isGood ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {role.teamLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{role.ability}</p>
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
          {result.approved ? 'DISETUJUI' : 'DITOLAK'} ({result.approveCount} Setuju,{' '}
          {result.rejectCount} Tolak)
        </span>
        <span className="flex items-center gap-1 underline opacity-90">
          <span>Detail</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 text-xs text-slate-300 leading-relaxed pr-1">
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">1. Tujuan Permainan</p>
            <p>
              <strong>Kubu Setia Arthur (Biru)</strong> menang jika berhasil menyukseskan{' '}
              <strong>3 dari 5 Misi</strong> dan Merlin selamat dari pembunuhan di akhir laga.{' '}
              <strong>Kubu Jahat Mordred (Merah)</strong> menang jika 3 Misi gagal, 5 voting tim
              ditolak berturut-turut, atau Assassin berhasil membunuh Merlin!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">2. Alur Setiap Ronde</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Penunjukan Tim:</strong> Ketua Misi memilih sejumlah pemain untuk berangkat
                menjalankan misi.
              </li>
              <li>
                <strong>Voting Tim:</strong> Seluruh pemain memilih <em>Setuju</em> atau{' '}
                <em>Tolak</em> lewat ponsel masing-masing.
              </li>
              <li>
                <strong>Eksekusi Misi:</strong> Anggota tim terpilih mengirim kartu <em>Sukses</em>{' '}
                atau <em>Sabotase</em> secara rahasia. Umumnya 1 kartu Gagal saja sudah menggagalkan
                misi!
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
            <p className="font-bold text-amber-400 mb-1">3. Peran Kunci</p>
            <ul className="space-y-1.5">
              <li>
                <strong className="text-blue-400">Merlin:</strong> Tahu siapa semua pengkhianat,
                tapi harus pandai berakting agar tidak ketahuan Assassin.
              </li>
              <li>
                <strong className="text-red-400">Assassin:</strong> Jika kubu baik menang 3 misi,
                Assassin menembak 1 pemain yang diduga Merlin.
              </li>
              <li>
                <strong className="text-blue-400">Percival & Morgana:</strong> Percival melihat
                Merlin, namun Morgana ikut menyamar sebagai Merlin untuk mengecohnya.
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