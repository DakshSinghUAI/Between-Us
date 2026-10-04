import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Heart,
  Image,
  Loader2,
  Menu,
  Mic2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  getMemories,
  createMemory,
  askMemories,
  uploadVoiceMemory,
  uploadStandalonePhotos,
  uploadMemoryPhotos,
  deleteStandalonePhoto,
} from "./lib/api";

import "./index.css";


const demoMemories = [
  {
    id: "demo-1",
    title: "Our First Memory ❤️",
    content: "We started building Between Us together.",
    date: "2026-09-28",
    type: "Moment",
  },
  {
    id: "demo-2",
    title: "Our First Trip ❤️",
    content: "We went on our first trip together.",
    date: "2026-09-20",
    type: "Trip",
  },
  {
    id: "demo-3",
    title: "Coffee After College",
    content: "We had our first coffee together after college.",
    date: "2026-09-25",
    type: "Date",
  },
];


const suggestions = [
  "What was our first trip?",
  "What memories do we have together?",
  "Tell me about our first coffee.",
];


function getToday() {
  return new Date().toISOString().split("T")[0];
}


function formatDate(date) {
  if (!date) return "No date";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function getTypeIcon(type) {
  if (type === "Trip") return "✈️";
  if (type === "Date") return "☕";
  if (type === "Milestone") return "✨";
  if (type === "Other") return "📌";

  return "❤️";
}


function getTypeClass(type) {
  if (type === "Trip") {
    return "bg-blue-50 text-blue-700";
  }

  if (type === "Date") {
    return "bg-amber-50 text-amber-700";
  }

  if (type === "Milestone") {
    return "bg-purple-50 text-purple-700";
  }

  if (type === "Other") {
    return "bg-gray-100 text-gray-700";
  }

  return "bg-rose-50 text-rose-700";
}


export default function App() {
  const [memories, setMemories] = useState([]);

  const [active, setActive] = useState("home");
  const [search, setSearch] = useState("");

  const [dialog, setDialog] = useState(false);
  const [detail, setDetail] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const [notice, setNotice] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  const [saving, setSaving] = useState(false);

  const [voiceFile, setVoiceFile] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMemory, setVoiceMemory] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    date: getToday(),
    type: "Moment",
  });

  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState(null);

  useEffect(() => {
    loadMemories();
  }, []);


  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [notice]);


  async function loadMemories() {
    setLoading(true);

    try {
      const data = await getMemories();

      if (Array.isArray(data) && data.length > 0) {
        setMemories(data);
      } else {
        setMemories(demoMemories);
      }

      setBackendError(false);
    } catch (error) {
      console.error(error);

      setMemories(demoMemories);
      setBackendError(true);
    } finally {
      setLoading(false);
    }
  }


  const filteredMemories = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return memories;

    return memories.filter((memory) => {
      return (
        memory.title?.toLowerCase().includes(query) ||
        memory.content?.toLowerCase().includes(query) ||
        memory.type?.toLowerCase().includes(query) ||
        memory.date?.toLowerCase().includes(query)
      );
    });
  }, [memories, search]);


  async function handleSaveMemory(event) {
  event.preventDefault();

  if (!form.title.trim() || !form.content.trim()) {
    setNotice("Please add a title and memory.");
    return;
  }

  setSaving(true);

  try {
    // First save the memory
    const saved = await createMemory(form);

    // Then upload selected photos, if any
    if (selectedPhotos.length > 0) {
      const updatedMemory = await uploadMemoryPhotos(
        saved.id,
        selectedPhotos
      );

      setMemories((current) => [updatedMemory, ...current]);
    } else {
      setMemories((current) => [saved, ...current]);
    }

    // Clear form
    setForm({
      title: "",
      content: "",
      date: getToday(),
      type: "Moment",
    });

    // Clear selected photos
    selectedPhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.preview);
    });

    setSelectedPhotos([]);

    setDialog(false);
    setNotice("Memory saved ❤️");
    setBackendError(false);
  } catch (error) {
    console.error(error);

    setNotice(
      "Could not save the memory. Make sure the backend is running."
    );

    setBackendError(true);
  } finally {
    setSaving(false);
  }
}


  async function handleAsk() {
    if (!question.trim()) return;

    setAsking(true);
    setAnswer("");

    try {
      const result = await askMemories(question);

      setAnswer(result.answer || "I couldn't find an answer.");
      setBackendError(false);
    } catch (error) {
      console.error(error);

      setAnswer(
        "I couldn't connect to your memory vault. Please make sure the backend is running."
      );

      setBackendError(true);
    } finally {
      setAsking(false);
    }
  }


  async function handleVoiceUpload() {
    if (!voiceFile) {
      setNotice("Please choose a voice recording first.");
      return;
    }

    setVoiceLoading(true);
    setVoiceTranscript("");
    setVoiceMemory(null);

    try {
      const result = await uploadVoiceMemory(voiceFile);

      setVoiceTranscript(result.transcript || "");

      let extracted = result.memory;

      if (typeof extracted === "string") {
        try {
          extracted = JSON.parse(extracted);
        } catch (error) {
          console.error("Could not parse extracted memory:", error);
        }
      }

      if (extracted && typeof extracted === "object") {
        setVoiceMemory(extracted);
      }

      setBackendError(false);
      setNotice("Voice memory processed.");
    } catch (error) {
      console.error(error);

      setNotice(
        "Could not process the voice memory. Check that Whisper and the backend are running."
      );

      setBackendError(true);
    } finally {
      setVoiceLoading(false);
    }
  }


  async function handleSaveVoiceMemory() {
    if (!voiceMemory) return;

    setVoiceSaving(true);

    try {
      const memoryToSave = {
        title: voiceMemory.title || "Voice Memory",

        content:
          voiceMemory.content ||
          voiceTranscript ||
          "Voice memory without extracted content.",

        date: getToday(),

        type: voiceMemory.type || "Moment",
      };

      const saved = await createMemory(memoryToSave);

      setMemories((current) => [saved, ...current]);

      setVoiceFile(null);
      setVoiceTranscript("");
      setVoiceMemory(null);

      setNotice("Voice memory saved ❤️");
      setBackendError(false);
    } catch (error) {
      console.error(error);

      setNotice("Could not save the voice memory.");
      setBackendError(true);
    } finally {
      setVoiceSaving(false);
    }
  }


  function navigate(section) {
    setActive(section);
    setMenuOpen(false);

    const element = document.getElementById(section);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }


  function useSuggestion(text) {
    setQuestion(text);

    setTimeout(() => {
      document.getElementById("ask")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }


  return (
    <div className="min-h-screen bg-[#f8f3ed] text-[#321b1b]">

      {/* ================= NAVIGATION ================= */}

      <header className="sticky top-0 z-50 border-b border-[#6f1d2b]/10 bg-[#f8f3ed]/90 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6f1d2b] text-white shadow-lg shadow-[#6f1d2b]/20">
              <Heart size={18} fill="currentColor" />
            </div>

            <div className="text-left">
              <p className="font-serif text-xl font-semibold tracking-tight">
                Between Us
              </p>

              <p className="text-[10px] uppercase tracking-[0.28em] text-[#6f1d2b]/60">
                Our private memory space
              </p>
            </div>

          </button>


          {/* Desktop Navigation */}

          ```jsx
<nav className="hidden items-center gap-2 md:flex">

  {/* Memories */}
  <button
    onClick={() => navigate("memories")}
    className="group relative rounded-full px-4 py-2.5 text-sm font-medium text-[#321b1b]/60 transition-all duration-200 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
  >
    <span className="relative z-10">
      Memories
    </span>

    <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#6f1d2b] transition-all duration-200 group-hover:w-5" />
  </button>


  {/* Photos */}
  <button
    onClick={() => navigate("photos")}
    className="group relative rounded-full px-4 py-2.5 text-sm font-medium text-[#321b1b]/60 transition-all duration-200 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
  >
    <span className="relative z-10">
      Photos
    </span>

    <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#6f1d2b] transition-all duration-200 group-hover:w-5" />
  </button>

  <button
  onClick={() => navigate("timeline")}
  className="group relative rounded-full px-4 py-2.5 text-sm font-medium text-[#321b1b]/60 transition-all duration-200 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
>
  <span className="relative z-10">Timeline</span>

  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#6f1d2b] transition-all duration-200 group-hover:w-5" />
</button>


  {/* Ask AI */}
  <button
    onClick={() => navigate("ask")}
    className="group relative rounded-full px-4 py-2.5 text-sm font-medium text-[#321b1b]/60 transition-all duration-200 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
  >
    <span className="relative z-10">
      Ask AI
    </span>

    <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#6f1d2b] transition-all duration-200 group-hover:w-5" />
  </button>


  {/* Voice Memory */}
  <button
    onClick={() => navigate("voice")}
    className="group relative rounded-full px-4 py-2.5 text-sm font-medium text-[#321b1b]/60 transition-all duration-200 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
  >
    <span className="relative z-10">
      Voice Memory
    </span>

    <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#6f1d2b] transition-all duration-200 group-hover:w-5" />
  </button>


  {/* Divider */}
  <div className="mx-2 h-6 w-px bg-[#6f1d2b]/10" />


  {/* Add Memory */}
  <motion.button
    whileHover={{
      y: -2,
      scale: 1.02,
    }}
    whileTap={{
      scale: 0.98,
    }}
    onClick={() => setDialog(true)}
    className="flex items-center gap-2 rounded-full bg-[#6f1d2b] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/20 transition hover:bg-[#591622] hover:shadow-xl"
  >
    <Plus
      size={15}
      className="transition-transform duration-200"
    />

    Add Memory
  </motion.button>

</nav>
```


          {/* Mobile Menu Button */}

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-full p-2 transition hover:bg-white md:hidden"
          >
            {menuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>

        </div>


        {/* Mobile Navigation */}

        <AnimatePresence>

          {menuOpen && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="absolute left-0 right-0 top-full z-40 border-t border-[#6f1d2b]/10 bg-[#fffaf7] px-5 py-5 shadow-lg md:hidden"
  >
    <div className="flex flex-col gap-2">

      {/* Memories */}
      <button
        onClick={() => navigate("memories")}
        className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#321b1b]/70 transition hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
      >
        Memories
      </button>

      {/* Photos */}
      <button
        onClick={() => navigate("photos")}
        className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#321b1b]/70 transition hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
      >
        Photos
      </button>

      {/* Timeline */}
      <button
        onClick={() => navigate("timeline")}
        className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#321b1b]/70 transition hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
      >
        Timeline
      </button>

      {/* Ask AI */}
      <button
        onClick={() => navigate("ask")}
        className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#321b1b]/70 transition hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
      >
        Ask AI
      </button>

      {/* Voice Memory */}
      <button
        onClick={() => navigate("voice")}
        className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#321b1b]/70 transition hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
      >
        Voice Memory
      </button>

      {/* Divider */}
      <div className="my-2 h-px bg-[#6f1d2b]/10" />

      {/* Add Memory */}
      <button
        onClick={() => {
          setDialog(true);
          setMenuOpen(false);
        }}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#6f1d2b] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/20 transition hover:bg-[#591622]"
      >
        <Plus size={16} />
        Add Memory
      </button>

    </div>
  </motion.div>
)}

        </AnimatePresence>

      </header>



      {/* ================= BACKEND STATUS ================= */}

      <AnimatePresence>

        {backendError && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="mx-auto mt-4 max-w-7xl px-5 lg:px-8"
          >

            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Backend connection issue:</strong>{" "}
              Make sure FastAPI is running on port 8000.
            </div>

          </motion.div>
        )}

      </AnimatePresence>


      {/* ================= HERO ================= */}

      ```jsx
{/* Hero */}

<section
  id="home"
  className="relative overflow-hidden px-5 pb-20 pt-14 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24"
>

  {/* Ambient background */}

  <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#6f1d2b]/10 blur-[110px] sm:h-[600px] sm:w-[600px] sm:blur-[120px]" />

  <motion.div
    animate={{
      y: [0, -20, 0],
      rotate: [0, 8, 0],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    className="pointer-events-none absolute right-[8%] top-28 hidden h-32 w-32 rounded-full border border-[#6f1d2b]/10 lg:block"
  />

  <motion.div
    animate={{
      y: [0, 15, 0],
      x: [0, 8, 0],
    }}
    transition={{
      duration: 7,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    className="pointer-events-none absolute bottom-10 left-[-40px] hidden h-64 w-64 rounded-full bg-[#6f1d2b]/5 blur-3xl lg:block"
  />


  <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">

    {/* LEFT — HERO COPY */}

    <motion.div
      initial={{
        opacity: 0,
        x: -35,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.8,
      }}
      className="relative z-10"
    >

      {/* Eyebrow */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.1,
          duration: 0.6,
        }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6f1d2b]/10 bg-white/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b] shadow-sm backdrop-blur sm:mb-7 sm:text-[11px] sm:tracking-[0.22em]"
      >

        <span className="relative flex h-2 w-2">

          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6f1d2b]/40" />

          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6f1d2b]" />

        </span>

        A private space for your story

      </motion.div>


      {/* Heading */}

      <motion.h1
        initial={{
          opacity: 0,
          y: 25,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.2,
          duration: 0.8,
        }}
        className="max-w-3xl font-serif text-[46px] leading-[0.96] tracking-[-0.035em] sm:text-7xl lg:text-[82px]"
      >

        Some moments

        <br />

        <span className="relative inline-block text-[#6f1d2b]">

          deserve to stay.

          <motion.span
            initial={{
              width: 0,
            }}
            animate={{
              width: "100%",
            }}
            transition={{
              delay: 1,
              duration: 0.8,
            }}
            className="absolute -bottom-1 left-0 h-[2px] bg-[#6f1d2b]/25 sm:-bottom-2"
          />

        </span>

      </motion.h1>


      {/* Description */}

      <motion.p
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
          duration: 0.7,
        }}
        className="mt-7 max-w-xl text-sm leading-6 text-[#321b1b]/60 sm:mt-8 sm:text-lg sm:leading-7"
      >

        A private AI memory companion for the little things
        you never want to forget — the conversations, places,
        milestones, and moments that make your story yours.

      </motion.p>


      {/* Buttons */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.55,
          duration: 0.7,
        }}
        className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row"
      >

        <button
          onClick={() => setDialog(true)}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#6f1d2b] px-7 py-4 text-sm font-medium text-white shadow-xl shadow-[#6f1d2b]/20 transition duration-300 hover:-translate-y-1 hover:bg-[#591622] sm:w-auto sm:text-base"
        >

          <span className="relative z-10 flex items-center gap-2">

            Add a memory

            <ArrowRight
              size={17}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />

          </span>

          <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-0" />

        </button>


        <button
          onClick={() => navigate("memories")}
          className="group flex w-full items-center justify-center gap-2 rounded-full border border-[#6f1d2b]/15 bg-white/70 px-7 py-4 text-sm font-medium text-[#321b1b] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg sm:w-auto sm:text-base"
        >

          Explore memories

          <ArrowRight
            size={16}
            className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
          />

        </button>

      </motion.div>


      {/* Trust / philosophy line */}

      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.9,
          duration: 0.8,
        }}
        className="mt-9 flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#321b1b]/30 sm:mt-11 sm:gap-3 sm:text-[10px] sm:tracking-[0.24em]"
      >

        <div className="h-px w-7 bg-[#6f1d2b]/15 sm:w-10" />

        <span>remember</span>

        <span className="text-[#6f1d2b]/40">•</span>

        <span>revisit</span>

        <span className="text-[#6f1d2b]/40">•</span>

        <span>reconnect</span>

      </motion.div>

    </motion.div>


    {/* RIGHT — MEMORY EXPERIENCE */}

    <motion.div
      initial={{
        opacity: 0,
        scale: 0.9,
        y: 35,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        delay: 0.3,
        duration: 0.9,
      }}
      className="relative mx-auto w-full max-w-[470px]"
    >

      {/* Decorative ring */}

      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "linear",
        }}
        className="pointer-events-none absolute -inset-4 rounded-[35px] border border-dashed border-[#6f1d2b]/10 sm:-inset-8 sm:rounded-[45px]"
      />


      {/* Main floating card */}

      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 0.8, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >

        <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-2xl shadow-[#6f1d2b]/15 backdrop-blur-xl sm:rounded-[34px] sm:p-6">

          {/* Card glow */}

          <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-48 w-48 rounded-full bg-[#6f1d2b]/10 blur-3xl" />


          {/* Header */}

          <div className="relative flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6f1d2b]/10 text-[#6f1d2b] sm:h-12 sm:w-12">

                <Heart
                  size={20}
                  fill="currentColor"
                  className="sm:h-[21px] sm:w-[21px]"
                />

              </div>

              <div>

                <p className="text-sm font-semibold text-[#321b1b]">
                  Between Us
                </p>

                <div className="mt-1 flex items-center gap-1.5">

                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                  <p className="text-[9px] uppercase tracking-[0.1em] text-[#321b1b]/35 sm:text-[10px] sm:tracking-[0.12em]">
                    Private memory vault
                  </p>

                </div>

              </div>

            </div>


            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-[#6f1d2b]"
            >

              <Sparkles size={18} />

            </motion.div>

          </div>


          {/* Featured memory */}

          <div className="relative mt-5 overflow-hidden rounded-[23px] bg-[#f8f3ed] p-5 sm:mt-7 sm:rounded-[26px] sm:p-6">

            <div className="absolute right-[-25px] top-[-25px] h-24 w-24 rounded-full bg-[#6f1d2b]/5" />

            <div className="relative">

              <div className="flex items-center justify-between">

                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f1d2b]/60 sm:text-[10px] sm:tracking-[0.2em]">
                  A little moment
                </p>

                <Heart
                  size={14}
                  className="text-[#6f1d2b]/30 sm:h-[15px] sm:w-[15px]"
                  fill="currentColor"
                />

              </div>


              <h3 className="mt-3 font-serif text-2xl text-[#321b1b] sm:mt-4 sm:text-3xl">
                Our First Coffee
              </h3>


              <p className="mt-2 text-xs leading-5 text-[#321b1b]/55 sm:mt-3 sm:text-sm sm:leading-6">
                We had our first coffee together after college.
              </p>


              <div className="mt-5 flex items-center justify-between sm:mt-6">

                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 sm:text-[10px]">
                  Date
                </span>

                <span className="text-[10px] text-[#321b1b]/35 sm:text-[11px]">
                  25 Sep 2026
                </span>

              </div>

            </div>

          </div>


          {/* Bottom stats */}

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">

            <div className="rounded-2xl border border-[#6f1d2b]/10 bg-white p-3 transition hover:border-[#6f1d2b]/20 hover:shadow-sm sm:p-4">

              <div className="flex items-end justify-between">

                <div>

                  <p className="font-serif text-2xl text-[#6f1d2b] sm:text-3xl">
                    {memories.length}
                  </p>

                  <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#321b1b]/35 sm:text-[9px] sm:tracking-[0.17em]">
                    Memories
                  </p>

                </div>

                <Heart
                  size={16}
                  className="mb-1 text-[#6f1d2b]/25 sm:h-[17px] sm:w-[17px]"
                />

              </div>

            </div>


            <div className="rounded-2xl border border-[#6f1d2b]/10 bg-white p-3 transition hover:border-[#6f1d2b]/20 hover:shadow-sm sm:p-4">

              <div className="flex items-end justify-between">

                <div>

                  <p className="font-serif text-2xl text-[#6f1d2b] sm:text-3xl">
                    AI
                  </p>

                  <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#321b1b]/35 sm:text-[9px] sm:tracking-[0.17em]">
                    Companion
                  </p>

                </div>

                <Sparkles
                  size={16}
                  className="mb-1 text-[#6f1d2b]/25 sm:h-[17px] sm:w-[17px]"
                />

              </div>

            </div>

          </div>


          {/* AI insight strip */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 1.1,
              duration: 0.6,
            }}
            className="mt-3 flex items-center gap-2.5 rounded-2xl bg-[#6f1d2b] px-3.5 py-3 text-white sm:mt-4 sm:gap-3 sm:px-4"
          >

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 sm:h-8 sm:w-8">

              <Sparkles size={13} />

            </div>

            <div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/60 sm:text-[10px] sm:tracking-[0.15em]">
                AI memory companion
              </p>

              <p className="mt-0.5 text-[11px] text-white/90 sm:text-xs">
                Your memories, understood.
              </p>

            </div>

          </motion.div>

        </div>


        {/* Floating heart */}

        <motion.div
          animate={{
            y: [0, -9, 0],
            rotate: [-6, 6, -6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-2 -top-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6f1d2b] text-white shadow-xl shadow-[#6f1d2b]/20 sm:-right-5 sm:-top-5 sm:h-14 sm:w-14"
        >

          <Heart
            size={19}
            fill="currentColor"
            className="sm:h-[22px] sm:w-[22px]"
          />

        </motion.div>


        {/* Floating AI badge */}

        <motion.div
          animate={{
            y: [0, 8, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-5 -left-2 flex items-center gap-2 rounded-2xl border border-[#6f1d2b]/10 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur sm:-bottom-6 sm:-left-6 sm:px-4 sm:py-3"
        >

          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b] sm:h-8 sm:w-8">

            <Sparkles size={14} />

          </div>

          <div>

            <p className="text-[11px] font-semibold text-[#321b1b] sm:text-xs">
              AI powered
            </p>

            <p className="text-[9px] text-[#321b1b]/40 sm:text-[10px]">
              Your story, remembered
            </p>

          </div>

        </motion.div>

      </motion.div>

    </motion.div>

  </div>

</section>



      {/* ================= STATS ================= */}

      <section className="relative overflow-hidden border-y border-[#6f1d2b]/10 bg-white/45">

  {/* Ambient glow */}
  <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-72 -translate-x-1/2 rounded-full bg-[#6f1d2b]/5 blur-3xl" />

  <div className="relative mx-auto grid max-w-5xl grid-cols-3 divide-x divide-[#6f1d2b]/10 px-5 py-8 sm:py-9">

    {/* Memories */}
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col items-center text-center"
    >
      <div className="absolute -inset-4 -z-10 rounded-2xl bg-[#6f1d2b]/0 blur-xl transition-all duration-300 group-hover:bg-[#6f1d2b]/5" />

      <p className="font-serif text-3xl font-medium text-[#6f1d2b] transition-transform duration-300 group-hover:scale-105 sm:text-4xl">
        {memories.length}
      </p>

      <div className="mt-2 h-px w-6 bg-[#6f1d2b]/20 transition-all duration-300 group-hover:w-10 group-hover:bg-[#6f1d2b]/40" />

      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#321b1b]/45 sm:text-[10px]">
        Memories
      </p>
    </motion.div>


    {/* AI Companion */}
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col items-center text-center"
    >
      <div className="absolute -inset-4 -z-10 rounded-2xl bg-[#6f1d2b]/0 blur-xl transition-all duration-300 group-hover:bg-[#6f1d2b]/5" />

      <div className="relative">
        <p className="font-serif text-3xl font-medium text-[#6f1d2b] transition-transform duration-300 group-hover:scale-105 sm:text-4xl">
          AI
        </p>

        {/* Tiny AI indicator */}
        <motion.span
          animate={{
            opacity: [0.35, 1, 0.35],
            scale: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[#6f1d2b]"
        />
      </div>

      <div className="mt-2 h-px w-6 bg-[#6f1d2b]/20 transition-all duration-300 group-hover:w-10 group-hover:bg-[#6f1d2b]/40" />

      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#321b1b]/45 sm:text-[10px]">
        Memory Companion
      </p>
    </motion.div>


    {/* Little Moments */}
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col items-center text-center"
    >
      <div className="absolute -inset-4 -z-10 rounded-2xl bg-[#6f1d2b]/0 blur-xl transition-all duration-300 group-hover:bg-[#6f1d2b]/5" />

      <p className="font-serif text-3xl font-medium text-[#6f1d2b] transition-transform duration-300 group-hover:scale-105 sm:text-4xl">
        ∞
      </p>

      <div className="mt-2 h-px w-6 bg-[#6f1d2b]/20 transition-all duration-300 group-hover:w-10 group-hover:bg-[#6f1d2b]/40" />

      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#321b1b]/45 sm:text-[10px]">
        Little Moments
      </p>
    </motion.div>

  </div>
</section>


      {/* ================= MEMORY VAULT ================= */}

      ```jsx
<section
  id="memories"
  className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8"
>
  {/* Section header */}

  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6 }}
    className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
  >
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-7 bg-[#6f1d2b]/30 sm:w-8" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b] sm:text-[11px] sm:tracking-[0.25em]">
          Memory Vault
        </p>
      </div>

      <h2 className="font-serif text-[38px] leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
        Your moments,
        <br />
        <span className="text-[#6f1d2b]">kept safely.</span>
      </h2>

      <p className="mt-4 max-w-lg text-sm leading-6 text-[#321b1b]/50">
        A private collection of the little moments that make
        your story worth remembering.
      </p>
    </div>

    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => setDialog(true)}
      className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#6f1d2b] px-5 py-3.5 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#591622] hover:shadow-xl md:w-fit"
    >
      <Plus
        size={17}
        className="transition-transform duration-300 group-hover:rotate-90"
      />

      New memory

      <ArrowRight
        size={15}
        className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
      />
    </motion.button>
  </motion.div>


  {/* Search */}

  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.15, duration: 0.5 }}
    className="relative mt-8 sm:mt-10"
  >
    <div className="group flex items-center gap-3 rounded-2xl border border-[#6f1d2b]/10 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur transition duration-300 focus-within:border-[#6f1d2b]/25 focus-within:shadow-md sm:px-5 sm:py-4">
      
      <Search
        size={18}
        className="shrink-0 text-[#321b1b]/30 transition-colors group-focus-within:text-[#6f1d2b]"
      />

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search your memories..."
        className="min-w-0 w-full bg-transparent text-sm text-[#321b1b] outline-none placeholder:text-[#321b1b]/30"
      />

      {search && (
        <button
          onClick={() => setSearch("")}
          className="shrink-0 rounded-full p-1.5 transition hover:bg-[#6f1d2b]/5"
        >
          <X
            size={16}
            className="text-[#321b1b]/40"
          />
        </button>
      )}
    </div>
  </motion.div>


  {/* Memory Cards */}

  {loading ? (
    <div className="flex min-h-64 items-center justify-center sm:min-h-72">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6f1d2b]/10">
          <Loader2
            className="animate-spin text-[#6f1d2b]"
            size={23}
          />
        </div>

        <p className="text-[10px] uppercase tracking-[0.16em] text-[#321b1b]/30 sm:text-xs sm:tracking-[0.18em]">
          Opening your memories
        </p>
      </div>
    </div>
  ) : filteredMemories.length === 0 ? (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-[26px] border border-dashed border-[#6f1d2b]/20 bg-white/60 p-8 text-center backdrop-blur sm:mt-10 sm:rounded-[30px] sm:p-14"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6f1d2b]/10 text-[#6f1d2b]">
        <Bookmark size={25} />
      </div>

      <h3 className="mt-5 font-serif text-2xl">
        No memories found
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#321b1b]/50">
        Try another search or add a new memory to your private vault.
      </p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setDialog(true)}
        className="mt-6 rounded-full bg-[#6f1d2b] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#591622]"
      >
        Add a memory
      </motion.button>
    </motion.div>
  ) : (
    <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {filteredMemories.map((memory, index) => (
          <motion.button
            layout
            key={memory.id}
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -10,
            }}
            transition={{
              delay: Math.min(index * 0.06, 0.3),
              duration: 0.45,
            }}
            onClick={() => setDetail(memory)}
            className="group min-w-0 text-left"
          >
            <div className="relative h-full overflow-hidden rounded-[24px] border border-[#6f1d2b]/10 bg-white p-5 shadow-sm transition duration-500 group-hover:-translate-y-2 group-hover:border-[#6f1d2b]/20 group-hover:shadow-2xl group-hover:shadow-[#6f1d2b]/10 sm:rounded-[28px] sm:p-6">

              {/* Hover glow */}

              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#6f1d2b]/5 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />


              {/* Top row */}

              <div className="relative flex items-start justify-between gap-3">

                <motion.div
                  whileHover={{
                    rotate: [0, -6, 6, 0],
                    scale: 1.05,
                  }}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg shadow-sm sm:h-12 sm:w-12 ${getTypeClass(
                    memory.type
                  )}`}
                >
                  {getTypeIcon(memory.type)}
                </motion.div>

                <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-[#321b1b]/30 sm:gap-2 sm:text-[10px] sm:tracking-[0.12em]">
                  <CalendarDays
                    size={12}
                    className="shrink-0 sm:h-[13px] sm:w-[13px]"
                  />

                  <span className="truncate">
                    {formatDate(memory.date)}
                  </span>
                </div>

              </div>


              {/* Content */}

              <div className="relative min-w-0">

                <h3 className="mt-6 break-words font-serif text-[24px] leading-tight tracking-tight text-[#321b1b] transition-colors duration-300 group-hover:text-[#6f1d2b] sm:mt-7 sm:text-[26px]">
                  {memory.title}
                </h3>

                <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-[#321b1b]/55">
                  {memory.content}
                </p>

              </div>


              {/* Bottom */}

              <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-[#6f1d2b]/8 pt-4 sm:mt-7 sm:pt-5">

                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.12em] ${getTypeClass(
                    memory.type
                  )}`}
                >
                  {memory.type || "Moment"}
                </span>

                <span className="flex items-center gap-1 text-xs font-medium text-[#6f1d2b] opacity-100 transition-all duration-300 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
                  Open

                  <ArrowUpRight size={14} />
                </span>

              </div>


              {/* Bottom accent */}

              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#6f1d2b] transition-all duration-500 group-hover:w-full" />

            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )}

</section>

{/* ================= MEMORY TIMELINE ================= */}

<section
  id="timeline"
  className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8"
>
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6 }}
  >
    <div className="mb-3 flex items-center gap-3">
      <span className="h-px w-7 bg-[#6f1d2b]/30 sm:w-8" />

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b] sm:text-[11px] sm:tracking-[0.25em]">
        Our Journey
      </p>
    </div>

    <h2 className="font-serif text-[38px] leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
      Your story,
      <br />
      <span className="text-[#6f1d2b]">
        one moment at a time.
      </span>
    </h2>

    <p className="mt-4 max-w-lg text-sm leading-6 text-[#321b1b]/50">
      A timeline of the moments you've chosen to keep.
    </p>
  </motion.div>

  {memories.length === 0 ? (
    <div className="mt-10 rounded-[26px] border border-dashed border-[#6f1d2b]/20 bg-white/60 p-10 text-center">
      <p className="font-serif text-2xl text-[#321b1b]">
        Your story starts here.
      </p>

      <p className="mt-2 text-sm text-[#321b1b]/45">
        Add your first memory to begin your timeline.
      </p>
    </div>
  ) : (
    <div className="relative mt-12">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 h-full w-px bg-[#6f1d2b]/15 sm:left-1/2 sm:-translate-x-1/2" />

      <div className="space-y-10">
        {[...memories]
          .sort((a, b) =>
            String(a.date).localeCompare(String(b.date))
          )
          .map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
              }}
              className={`relative flex ${
                index % 2 === 0
                  ? "sm:justify-start"
                  : "sm:justify-end"
              }`}
            >
              {/* Timeline dot */}
              <div className="absolute left-4 top-6 z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-[#6f1d2b] ring-4 ring-[#f8f3ee] sm:left-1/2" />

              {/* Memory card */}
              <button
                type="button"
                onClick={() => setDetail(memory)}
                className="ml-10 w-[calc(100%-2.5rem)] text-left sm:ml-0 sm:w-[44%]"
              >
                <div className="rounded-[24px] border border-[#6f1d2b]/10 bg-white/75 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#6f1d2b]/20 hover:shadow-lg sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#6f1d2b]/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f1d2b]">
                      {memory.type || "Moment"}
                    </span>

                    <span className="text-xs font-medium text-[#321b1b]/40">
                      {memory.date}
                    </span>
                  </div>

                  <h3 className="mt-4 font-serif text-2xl leading-tight text-[#321b1b]">
                    {memory.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#321b1b]/55">
                    {memory.content}
                  </p>

                  {memory.photos && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#6f1d2b]/65">
                      <Image size={14} />
                      Photos attached
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
      </div>
    </div>
  )}
</section>

{/* ================= PHOTOS ================= */}

<section
  id="photos"
  className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8"
>
  {/* Section header */}

  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6 }}
    className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
  >
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-7 bg-[#6f1d2b]/30 sm:w-8" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b] sm:text-[11px] sm:tracking-[0.25em]">
          Photo Gallery
        </p>
      </div>

      <h2 className="font-serif text-[38px] leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
        Moments,
        <br />
        <span className="text-[#6f1d2b]">
          captured between us.
        </span>
      </h2>

      <p className="mt-4 max-w-lg text-sm leading-6 text-[#321b1b]/50">
        A private collection of photos, kept separately from
        your memories.
      </p>
    </div>

    {/* Add Photos */}

    <label
      className={`group flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#6f1d2b] px-5 py-3.5 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#591622] hover:shadow-xl md:w-fit ${
        photoUploading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {photoUploading ? (
        <Loader2
          size={17}
          className="animate-spin"
        />
      ) : (
        <Plus
          size={17}
          className="transition-transform duration-300 group-hover:rotate-90"
        />
      )}

      {photoUploading ? "Uploading..." : "Add Photos"}

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={photoUploading}
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files || []);

          if (files.length === 0) {
            return;
          }

          setPhotoUploading(true);

          try {
            const result = await uploadStandalonePhotos(files);

            const uploaded = result.photos || [];

            setGalleryPhotos((current) => [
              ...uploaded,
              ...current,
            ]);

            setNotice(
              `${uploaded.length} photo${
                uploaded.length === 1 ? "" : "s"
              } added ❤️`
            );
          } catch (error) {
            console.error(error);

            setNotice(
              "Could not upload the photos. Please try again."
            );
          } finally {
            setPhotoUploading(false);
            event.target.value = "";
          }
        }}
      />
    </label>
  </motion.div>


  {/* Gallery */}

  {galleryPhotos.length === 0 ? (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: 0.15,
        duration: 0.5,
      }}
      className="mt-10 rounded-[26px] border border-dashed border-[#6f1d2b]/20 bg-white/60 p-10 text-center backdrop-blur sm:p-14"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6f1d2b]/10">
        <Image
          size={25}
          className="text-[#6f1d2b]"
        />
      </div>

      <h3 className="mt-5 font-serif text-2xl text-[#321b1b]">
        Your photo gallery
      </h3>

      <p className="mt-2 text-sm text-[#321b1b]/45">
        Add photos to start building your collection.
      </p>
    </motion.div>
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {galleryPhotos.map((photo, index) => (
        <motion.div
          key={`${photo}-${index}`}
          initial={{
            opacity: 0,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: index * 0.05,
          }}
          onClick={() => setSelectedGalleryPhoto(index)}
          className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-[#6f1d2b]/10 bg-white shadow-sm"
        >
          <img
            src={`http://127.0.0.1:8000${photo}`}
            alt={`Photo ${index + 1}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#321b1b]/35 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        </motion.div>
      ))}
    </motion.div>
  )}
</section>
```


      {/* ================= ASK AI ================= */}

      ```jsx
<section
  id="ask"
  className="relative scroll-mt-24 overflow-hidden border-y border-[#6f1d2b]/10 bg-[#321b1b] px-5 py-24 text-white lg:px-8"
>
  {/* Ambient background */}

  <div className="pointer-events-none absolute left-[-180px] top-[-180px] h-[500px] w-[500px] rounded-full bg-[#6f1d2b]/30 blur-[120px]" />

  <div className="pointer-events-none absolute bottom-[-220px] right-[-100px] h-[500px] w-[500px] rounded-full bg-[#6f1d2b]/20 blur-[120px]" />

  <motion.div
    animate={{ rotate: 360 }}
    transition={{
      duration: 40,
      repeat: Infinity,
      ease: "linear",
    }}
    className="pointer-events-none absolute right-[8%] top-16 hidden h-40 w-40 rounded-full border border-white/5 lg:block"
  />

  <div className="relative mx-auto max-w-6xl">

    <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">


      {/* LEFT — AI INTRO */}

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7 }}
      >

        {/* AI icon */}

        <motion.div
          animate={{
            y: [0, -5, 0],
            rotate: [0, 3, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-black/10"
        >
          <Sparkles size={23} />
        </motion.div>


        {/* Label */}

        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-white/20" />

          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">
            Ask Our Memories
          </p>
        </div>


        {/* Heading */}

        <h2 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Talk to your
          <br />

          <span className="text-[#d89aa5]">
            memories.
          </span>
        </h2>


        {/* Description */}

        <p className="mt-6 max-w-md text-sm leading-7 text-white/55 sm:text-base">
          Ask naturally. Between Us searches your private memory
          vault and brings back the moments that matter.
        </p>


        {/* Privacy indicator */}

        <div className="mt-7 flex items-center gap-3 text-xs text-white/40">

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Heart
              size={14}
              fill="currentColor"
            />
          </div>

          <span>
            Answers are based on your saved memories.
          </span>

        </div>


        {/* Suggested questions */}

        <div className="mt-8">

          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Try asking
          </p>

          <div className="flex flex-wrap gap-2">

            {suggestions.map((suggestion) => (

              <motion.button
                key={suggestion}
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() => useSuggestion(suggestion)}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {suggestion}
              </motion.button>

            ))}

          </div>

        </div>

      </motion.div>


      {/* RIGHT — AI INTERFACE */}

      <motion.div
        initial={{ opacity: 0, x: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="relative"
      >

        {/* Outer glass shell */}

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">

          <div className="rounded-[27px] border border-white/10 bg-[#f8f3ed] p-5 sm:p-6">


            {/* AI Header */}

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6f1d2b] text-white shadow-md">
                  <Sparkles size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#321b1b]">
                    Between Us AI
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#321b1b]/35">
                      Memory companion
                    </p>
                  </div>
                </div>

              </div>


              <div className="rounded-full border border-[#6f1d2b]/10 bg-white px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6f1d2b]/60">
                  Private
                </p>
              </div>

            </div>


            {/* Input area */}

            <div className="mt-6">

              <div className="rounded-[22px] border border-[#6f1d2b]/10 bg-white p-1 shadow-sm">

                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !asking
                    ) {
                      event.preventDefault();
                      handleAsk();
                    }
                  }}
                  placeholder="What do you remember about us?"
                  rows={5}
                  className="w-full resize-none rounded-[18px] bg-[#f8f3ed] p-4 text-sm leading-6 text-[#321b1b] outline-none transition placeholder:text-[#321b1b]/30 focus:ring-2 focus:ring-[#6f1d2b]/15"
                />

              </div>

            </div>


            {/* Ask button */}

            <button
              onClick={handleAsk}
              disabled={asking || !question.trim()}
              className="group mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#6f1d2b] px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-[#6f1d2b]/15 transition duration-300 hover:bg-[#591622] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
            >

              {asking ? (

                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Searching your memories...
                </>

              ) : (

                <>
                  <Sparkles size={16} />

                  Ask my memories

                  <ArrowRight
                    size={15}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </>

              )}

            </button>


            {/* Answer */}

            <AnimatePresence>

              {answer && (

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 15,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    height: "auto",
                  }}
                  exit={{
                    opacity: 0,
                    y: -10,
                  }}
                  transition={{
                    duration: 0.4,
                  }}
                  className="mt-5 overflow-hidden"
                >

                  <div className="rounded-[22px] border border-[#6f1d2b]/10 bg-white p-5 shadow-sm">

                    <div className="flex items-center gap-2">

                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b]">
                        <Sparkles size={13} />
                      </div>

                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f1d2b]">
                        Memory answer
                      </p>

                    </div>


                    <p className="mt-4 text-sm leading-7 text-[#321b1b]/75">
                      {answer}
                    </p>


                    <div className="mt-5 flex items-center gap-2 border-t border-[#6f1d2b]/8 pt-4">

                      <Heart
                        size={12}
                        className="text-[#6f1d2b]/40"
                        fill="currentColor"
                      />

                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#321b1b]/30">
                        From your memory vault
                      </span>

                    </div>

                  </div>

                </motion.div>

              )}

            </AnimatePresence>


            {/* Footer hint */}

            {!answer && !asking && (
              <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] text-[#321b1b]/25">
                <Sparkles size={11} />
                Ask about a moment, trip, date, or milestone
              </div>
            )}

          </div>

        </div>


        {/* Floating decoration */}

        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-5 -top-5 hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#6f1d2b] text-white shadow-xl lg:flex"
        >
          <Sparkles size={18} />
        </motion.div>

      </motion.div>

    </div>

  </div>

</section>
```


      {/* ================= VOICE MEMORY ================= */}

      <section
  id="voice"
  className="relative scroll-mt-24 overflow-hidden px-5 py-20 lg:px-8 lg:py-28"
>
  {/* Ambient background */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-10%] top-[15%] h-72 w-72 rounded-full bg-[#6f1d2b]/5 blur-3xl" />
    <div className="absolute bottom-[-15%] right-[-5%] h-80 w-80 rounded-full bg-[#6f1d2b]/5 blur-3xl" />
  </div>

  <div className="relative mx-auto max-w-7xl">

    {/* Section heading */}
    <div className="mb-12 max-w-2xl">

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[#6f1d2b]/10 bg-white px-3 py-1.5 shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6f1d2b]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b]">
            Voice Memory
          </span>
        </div>

        <span className="text-xs text-[#321b1b]/30">
          Whisper + Qwen
        </span>
      </div>

      <h2 className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight text-[#321b1b] sm:text-5xl lg:text-6xl">
        Say it.
        <br />
        <span className="text-[#6f1d2b]">We'll remember it.</span>
      </h2>

      <p className="mt-6 max-w-xl text-sm leading-7 text-[#321b1b]/60 sm:text-base">
        Some memories are easier to say than type. Upload a voice note
        and let AI turn your words into a meaningful memory you can keep
        forever.
      </p>

    </div>


    {/* Main content */}
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">

      {/* Left — explanation */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-[#6f1d2b]/10 bg-[#321b1b] p-7 text-white shadow-xl shadow-[#6f1d2b]/10 sm:p-9">

        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#6f1d2b]/40 blur-3xl" />

        <div className="relative">

          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
            <Mic2 size={23} />
          </div>

          <h3 className="mt-8 max-w-sm font-serif text-3xl leading-tight">
            Your voice,
            <br />
            turned into a memory.
          </h3>

          <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
            Whisper listens to your recording and creates a transcript.
            Qwen then understands the important details and structures
            them into a memory ready for your vault.
          </p>

        </div>


        {/* Processing flow */}
        <div className="relative mt-10">

          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            How it works
          </p>

          <div className="space-y-3">

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Mic2 size={16} />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Your voice note
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  Upload an audio recording
                </p>
              </div>
            </div>


            <div className="ml-7 h-4 w-px bg-white/10" />


            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Sparkles size={16} />
              </div>

              <div>
                <p className="text-sm font-medium">
                  AI understands it
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  Whisper → Qwen
                </p>
              </div>
            </div>


            <div className="ml-7 h-4 w-px bg-white/10" />


            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Bookmark size={16} />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Memory saved
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  Ready for your vault
                </p>
              </div>
            </div>

          </div>

        </div>


        {/* Language note */}
        <div className="relative mt-8 flex items-start gap-3 border-t border-white/10 pt-6">

          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Mic2 size={14} />
          </div>

          <p className="text-xs leading-5 text-white/45">
            Hindi, English and Hinglish recordings can be processed using
            Whisper's automatic language detection.
          </p>

        </div>

      </div>


      {/* Right — upload interface */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#6f1d2b]/10 bg-white p-3 shadow-xl shadow-[#6f1d2b]/5">

        <div className="rounded-[1.6rem] bg-[#f8f3ed] p-6 sm:p-8">

          {/* Upload area */}
          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-dashed border-[#6f1d2b]/15 bg-white p-8 text-center transition hover:border-[#6f1d2b]/30 sm:p-10">

            {/* Small decorative lines */}
            <div className="pointer-events-none absolute left-5 top-5 h-8 w-8 rounded-tl-xl border-l border-t border-[#6f1d2b]/10" />
            <div className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 rounded-br-xl border-b border-r border-[#6f1d2b]/10" />

            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-[#6f1d2b] text-white shadow-xl shadow-[#6f1d2b]/20"
            >
              <Mic2 size={28} />
            </motion.div>

            <h3 className="mt-6 font-serif text-2xl text-[#321b1b] sm:text-3xl">
              Upload a voice memory
            </h3>

            <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-[#321b1b]/45">
              Turn a voice note into a structured memory with
              automatic transcription and AI extraction.
            </p>


            {/* Choose audio */}
            <label className="group mt-7 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#321b1b] px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[#321b1b]/10 transition hover:-translate-y-1 hover:bg-[#6f1d2b] hover:shadow-xl">

              <Plus
                size={16}
                className="transition group-hover:rotate-90"
              />

              Choose audio

              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  setVoiceFile(
                    event.target.files?.[0] || null
                  );

                  setVoiceTranscript("");
                  setVoiceMemory(null);
                }}
              />

            </label>


            {/* Selected file */}
            {voiceFile && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mx-auto mt-5 flex max-w-sm items-center gap-3 rounded-2xl border border-[#6f1d2b]/10 bg-[#6f1d2b]/5 px-4 py-3 text-left"
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6f1d2b]/10 text-[#6f1d2b]">
                  <Mic2 size={15} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f1d2b]/60">
                    Selected recording
                  </p>

                  <p className="mt-0.5 truncate text-xs font-medium text-[#321b1b]">
                    {voiceFile.name}
                  </p>
                </div>

              </motion.div>
            )}

          </div>


          {/* Extract button */}
          <button
            onClick={handleVoiceUpload}
            disabled={voiceLoading || !voiceFile}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6f1d2b] px-5 py-4 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/15 transition hover:-translate-y-0.5 hover:bg-[#591622] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
          >

            {voiceLoading ? (

              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Processing voice...
              </>

            ) : (

              <>
                <Sparkles
                  size={17}
                  className="transition group-hover:rotate-12"
                />
                Extract memory
              </>

            )}

          </button>


          {/* Transcript */}
          {voiceTranscript && (

            <motion.div
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mt-5 overflow-hidden rounded-2xl border border-[#6f1d2b]/10 bg-white shadow-sm"
            >

              <div className="flex items-center justify-between border-b border-[#6f1d2b]/10 px-5 py-4">

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f1d2b]">
                    Whisper transcription
                  </p>

                  <p className="mt-1 text-[11px] text-[#321b1b]/35">
                    Original voice note converted to text
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6f1d2b]/5 text-[#6f1d2b]">
                  <Mic2 size={14} />
                </div>

              </div>

              <div className="px-5 py-5">
                <p className="text-sm leading-7 text-[#321b1b]/70">
                  {voiceTranscript}
                </p>
              </div>

            </motion.div>

          )}


          {/* Extracted Memory */}
          {voiceMemory && (

            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                duration: 0.35,
              }}
              className="relative mt-5 overflow-hidden rounded-2xl border border-[#6f1d2b]/10 bg-white shadow-md"
            >

              {/* Accent */}
              <div className="absolute left-0 top-0 h-full w-1 bg-[#6f1d2b]" />

              <div className="p-5 sm:p-6">

                <div className="flex items-center justify-between gap-4">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f1d2b]">
                    Extracted memory
                  </p>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6f1d2b]/5 text-[#6f1d2b]">
                    <Sparkles size={14} />
                  </div>

                </div>


                <h3 className="mt-4 font-serif text-2xl leading-tight text-[#321b1b]">
                  {voiceMemory.title || "Voice Memory"}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#321b1b]/65">
                  {voiceMemory.content || voiceTranscript}
                </p>


                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#6f1d2b]/10 pt-5">

                  <span
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${getTypeClass(
                      voiceMemory.type || "Moment"
                    )}`}
                  >
                    {voiceMemory.type || "Moment"}
                  </span>


                  <button
                    onClick={handleSaveVoiceMemory}
                    disabled={voiceSaving}
                    className="group flex items-center gap-2 rounded-full bg-[#321b1b] px-5 py-2.5 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#6f1d2b] disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {voiceSaving ? (

                      <Loader2
                        size={14}
                        className="animate-spin"
                      />

                    ) : (

                      <Bookmark
                        size={14}
                        className="transition group-hover:scale-110"
                      />

                    )}

                    Save memory

                  </button>

                </div>

              </div>

            </motion.div>

          )}

        </div>

      </div>

    </div>

  </div>
</section>


      {/* ================= FOOTER ================= */}

      <footer className="relative overflow-hidden border-t border-[#6f1d2b]/10 px-5 py-12 lg:px-8">

  {/* Soft ambient glow */}
  <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full bg-[#6f1d2b]/5 blur-3xl" />

  <div className="relative mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">

    {/* Brand */}
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-3"
    >

      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#6f1d2b] text-white shadow-lg shadow-[#6f1d2b]/15">

        {/* Heart glow */}
        <span className="absolute inset-0 rounded-full bg-[#6f1d2b]/20 blur-md transition-opacity duration-300 group-hover:opacity-80" />

        <motion.div
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          <Heart
            size={16}
            fill="currentColor"
          />
        </motion.div>

      </div>

      <div>
        <p className="font-serif text-xl leading-none text-[#321b1b]">
          Between Us
        </p>

        <p className="mt-1.5 text-xs text-[#321b1b]/40">
          Built to remember the little things.
        </p>
      </div>

    </motion.div>


    {/* Privacy message */}
    <div className="flex flex-col items-start gap-2 md:items-end">

      <div className="flex items-center gap-2">

        <span className="h-1.5 w-1.5 rounded-full bg-[#6f1d2b]/60" />

        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#321b1b]/45">
          Private by design
        </p>

      </div>

      <p className="text-xs text-[#321b1b]/35">
        Your memories stay yours.
      </p>

    </div>

  </div>


  {/* Bottom line */}
  <div className="relative mx-auto mt-8 max-w-7xl border-t border-[#6f1d2b]/8 pt-5">

    <div className="flex flex-col gap-2 text-[10px] text-[#321b1b]/30 sm:flex-row sm:items-center sm:justify-between">

      <p>
        A private space for shared moments.
      </p>

      <p>
        AI-powered • Memory-first • Made with care
      </p>

    </div>

  </div>

</footer>


      {/* ================= ADD MEMORY MODAL ================= */}

      <AnimatePresence>
  {dialog && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#321b1b]/50 p-4 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setDialog(false);
        }
      }}
    >

      <motion.div
        initial={{
          opacity: 0,
          y: 35,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.97,
        }}
        transition={{
          duration: 0.28,
          ease: "easeOut",
        }}
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/60 bg-[#f8f3ed] shadow-2xl"
      >

        {/* Top accent */}
        <div className="absolute left-0 right-0 top-0 h-1 bg-[#6f1d2b]" />

        <div className="p-6 sm:p-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-5">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b]">
                  <Heart size={14} />
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f1d2b]">
                  New Memory
                </p>

              </div>

              <h2 className="mt-4 font-serif text-3xl leading-tight text-[#321b1b] sm:text-4xl">
                Save a little moment.
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#321b1b]/45">
                Capture something worth remembering together.
              </p>

            </div>


            <button
              type="button"
              onClick={() => setDialog(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#6f1d2b]/10 bg-white text-[#321b1b]/55 transition hover:-translate-y-0.5 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
            >
              <X size={18} />
            </button>

          </div>


          {/* Form */}
          <form
            onSubmit={handleSaveMemory}
            className="mt-8 space-y-5"
          >

            {/* Title */}
            <div>

              <label className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#321b1b]/50">
                <span>Title</span>
                <span className="font-normal tracking-normal text-[#321b1b]/25">
                  Give it a name
                </span>
              </label>

              <input
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                placeholder="Our first coffee"
                className="w-full rounded-2xl border border-[#6f1d2b]/10 bg-white px-4 py-4 text-sm text-[#321b1b] shadow-sm outline-none transition placeholder:text-[#321b1b]/25 hover:border-[#6f1d2b]/20 focus:border-[#6f1d2b]/35 focus:ring-4 focus:ring-[#6f1d2b]/5"
              />

            </div>


            {/* Memory */}
            <div>

              <label className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#321b1b]/50">
                <span>Memory</span>
                <span className="font-normal tracking-normal text-[#321b1b]/25">
                  Tell the story
                </span>
              </label>

              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm({
                    ...form,
                    content: event.target.value,
                  })
                }
                placeholder="Tell us what happened..."
                rows={5}
                className="w-full resize-none rounded-2xl border border-[#6f1d2b]/10 bg-white px-4 py-4 text-sm leading-6 text-[#321b1b] shadow-sm outline-none transition placeholder:text-[#321b1b]/25 hover:border-[#6f1d2b]/20 focus:border-[#6f1d2b]/35 focus:ring-4 focus:ring-[#6f1d2b]/5"
              />

            </div>


            {/* Date + Type */}
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Date */}
              <div>

                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#321b1b]/50">
                  Date
                </label>

                <div className="relative">

                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6f1d2b]/45"
                  />

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        date: event.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#6f1d2b]/10 bg-white py-4 pl-11 pr-4 text-sm text-[#321b1b] shadow-sm outline-none transition hover:border-[#6f1d2b]/20 focus:border-[#6f1d2b]/35 focus:ring-4 focus:ring-[#6f1d2b]/5"
                  />

                </div>

              </div>


              {/* Type */}
              <div>

                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#321b1b]/50">
                  Type
                </label>

                <div className="relative">

                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value,
                      })
                    }
                    className="w-full appearance-none rounded-2xl border border-[#6f1d2b]/10 bg-white px-4 py-4 pr-11 text-sm text-[#321b1b] shadow-sm outline-none transition hover:border-[#6f1d2b]/20 focus:border-[#6f1d2b]/35 focus:ring-4 focus:ring-[#6f1d2b]/5"
                  >
                    <option>Moment</option>
                    <option>Trip</option>
                    <option>Date</option>
                    <option>Milestone</option>
                    <option>Other</option>
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#321b1b]/35"
                  />

                </div>

              </div>

            </div>

            {/* Photos */}
<div className="space-y-3">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-[#321b1b]">
        Photos
      </p>
      <p className="text-xs text-[#321b1b]/55">
        Optional · Add up to 3 photos
      </p>
    </div>

    <span className="rounded-full bg-[#321b1b]/5 px-3 py-1 text-xs font-semibold text-[#321b1b]/65">
      {selectedPhotos.length}/3
    </span>
  </div>

  {/* Upload button */}
  <label
    className={`flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-5 transition ${
      selectedPhotos.length >= 3
        ? "cursor-not-allowed border-[#321b1b]/10 bg-[#321b1b]/5 opacity-50"
        : "border-[#6f1d2b]/25 bg-white/50 hover:border-[#6f1d2b]/50 hover:bg-white"
    }`}
  >
    <Image size={20} className="text-[#6f1d2b]" />

    <div>
      <p className="text-sm font-semibold text-[#321b1b]">
        Add photos
      </p>
      <p className="text-xs text-[#321b1b]/50">
        JPG, PNG or WEBP
      </p>
    </div>

    <input
      type="file"
      accept="image/*"
      multiple
      disabled={selectedPhotos.length >= 3}
      className="hidden"
      onChange={(event) => {
        const files = Array.from(event.target.files || []);

        const remainingSlots = 3 - selectedPhotos.length;

        const newPhotos = files
          .slice(0, remainingSlots)
          .map((file) => ({
            file,
            preview: URL.createObjectURL(file),
          }));

        setSelectedPhotos((current) => [
          ...current,
          ...newPhotos,
        ]);

        event.target.value = "";
      }}
    />
  </label>

  {/* Photo previews */}
  {selectedPhotos.length > 0 && (
    <div className="grid grid-cols-3 gap-3">
      {selectedPhotos.map((photo, index) => (
        <div
          key={photo.preview}
          className="group relative aspect-square overflow-hidden rounded-2xl border border-[#321b1b]/10 bg-white shadow-sm"
        >
          <img
            src={photo.preview}
            alt={`Selected photo ${index + 1}`}
            className="h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(photo.preview);

              setSelectedPhotos((current) =>
                current.filter((_, photoIndex) => photoIndex !== index)
              );
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#321b1b]/80 text-white opacity-100 backdrop-blur-sm transition hover:bg-[#6f1d2b]"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>


            {/* Preview hint */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#6f1d2b]/10 bg-[#6f1d2b]/5 p-4">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6f1d2b] shadow-sm">
                <Heart size={14} />
              </div>

              <div>

                <p className="text-xs font-medium text-[#321b1b]">
                  A memory worth keeping
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[#321b1b]/45">
                  Your memory will be added to your private vault and
                  become searchable through Ask Our Memories.
                </p>

              </div>

            </div>


            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6f1d2b] px-5 py-4 text-sm font-medium text-white shadow-lg shadow-[#6f1d2b]/20 transition hover:-translate-y-0.5 hover:bg-[#591622] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving ? (

                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Saving...
                </>

              ) : (

                <>
                  <Heart
                    size={16}
                    className="transition group-hover:scale-110"
                  />
                  Save memory
                </>

              )}

            </button>


            <p className="text-center text-[10px] text-[#321b1b]/30">
              Private memories. Just between you two.
            </p>

          </form>

        </div>

      </motion.div>

    </motion.div>
  )}
</AnimatePresence>


      {/* ================= MEMORY DETAILS MODAL ================= */}

      ```jsx
<AnimatePresence>
  {detail && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#321b1b]/55 p-4 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setDetail(null);
        }
      }}
    >

      <motion.div
        initial={{
          opacity: 0,
          y: 35,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.97,
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-[#f8f3ed] shadow-2xl"
      >

        {/* Top accent */}
        <div className="absolute left-0 right-0 top-0 h-1 bg-[#6f1d2b]" />


        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#6f1d2b]/10 blur-3xl" />


        <div className="relative max-h-[85vh] overflow-y-auto p-6 sm:p-9">

          {/* Header */}
          <div className="flex items-start justify-between gap-5">

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl shadow-sm ${getTypeClass(
                detail.type
              )}`}
            >
              {getTypeIcon(detail.type)}
            </motion.div>


            <button
              onClick={() => setDetail(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#6f1d2b]/10 bg-white text-[#321b1b]/50 transition hover:-translate-y-0.5 hover:bg-[#6f1d2b]/5 hover:text-[#6f1d2b]"
            >
              <X size={18} />
            </button>

          </div>


          {/* Metadata */}
          <div className="mt-7 flex flex-wrap items-center gap-2">

            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${getTypeClass(
                detail.type
              )}`}
            >
              {detail.type || "Moment"}
            </span>

            <span className="text-xs text-[#321b1b]/25">
              •
            </span>

            <span className="text-xs font-medium text-[#321b1b]/45">
              {formatDate(detail.date)}
            </span>

          </div>


          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-4 max-w-xl font-serif text-4xl leading-[1.08] tracking-tight text-[#321b1b] sm:text-5xl"
          >
            {detail.title}
          </motion.h2>


          {/* Memory content */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-7 rounded-2xl border border-[#6f1d2b]/10 bg-white p-5 shadow-sm sm:p-6"
          >

            <div className="mb-4 flex items-center gap-2">

              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b]">
                <Heart size={13} />
              </div>

              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f1d2b]">
                The memory
              </span>

            </div>

            <p className="text-sm leading-7 text-[#321b1b]/70 sm:text-base sm:leading-8">
              {detail.content}
            </p>

          </motion.div>


          {/* Attached Photos */}
          {detail.photos && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="mt-7"
            >

              {/* Photos heading */}
              <div className="mb-4 flex items-center justify-between">

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f1d2b]">
                    Photos
                  </p>

                  <p className="mt-1 text-xs text-[#321b1b]/40">
                    Moments captured between us
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b]">
                  <Image size={15} />
                </div>

              </div>


              {/* Photo grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                {JSON.parse(detail.photos).map((photo, index) => (
                  <motion.div
                    key={photo}
                    initial={{
                      opacity: 0,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      delay: 0.28 + index * 0.06,
                    }}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-[#6f1d2b]/10 bg-white shadow-sm"
                  >

                    <img
                      src={`http://127.0.0.1:8000${photo}`}
                      alt={`Memory photo ${index + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#321b1b]/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                  </motion.div>
                ))}

              </div>

            </motion.div>
          )}


          {/* Footer */}
          <div className="mt-7 flex items-center justify-between gap-4 border-t border-[#6f1d2b]/10 pt-6">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6f1d2b]/10 text-[#6f1d2b]">
                <Heart size={14} />
              </div>

              <div>
                <p className="text-xs font-medium text-[#321b1b]">
                  A memory kept between us.
                </p>

                <p className="mt-0.5 text-[10px] text-[#321b1b]/35">
                  Private to your shared vault
                </p>
              </div>

            </div>


            <button
              onClick={() => setDetail(null)}
              className="rounded-full border border-[#6f1d2b]/10 bg-white px-4 py-2 text-xs font-medium text-[#321b1b]/60 transition hover:-translate-y-0.5 hover:border-[#6f1d2b]/20 hover:text-[#6f1d2b]"
            >
              Close
            </button>

          </div>

        </div>

      </motion.div>

    </motion.div>
  )}
</AnimatePresence>

{/* ================= PHOTO VIEWER ================= */}

<AnimatePresence>
  {selectedGalleryPhoto !== null && galleryPhotos.length > 0 && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#321b1b]/90 p-4 backdrop-blur-md sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedGalleryPhoto(null);
        }
      }}
    >
      {/* Close */}

      <button
        type="button"
        onClick={() => setSelectedGalleryPhoto(null)}
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X size={20} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={async () => {
    const photo = galleryPhotos[selectedGalleryPhoto];

    try {
      await deleteStandalonePhoto(photo);

      setGalleryPhotos((current) =>
        current.filter((_, index) => index !== selectedGalleryPhoto)
      );

      setSelectedGalleryPhoto(null);

      setNotice("Photo deleted ❤️");
    } catch (error) {
      console.error(error);
      setNotice("Could not delete the photo.");
    }
  }}
  className="absolute right-4 top-20 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-red-500/80 sm:right-6 sm:top-20"
>
  <Trash2 size={18} />
</button>


      {/* Previous */}

      {galleryPhotos.length > 1 && (
        <button
          type="button"
          onClick={() =>
            setSelectedGalleryPhoto(
              (current) =>
                (current - 1 + galleryPhotos.length) %
                galleryPhotos.length
            )
          }
          className="absolute left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
        >
          <ArrowRight
            size={20}
            className="rotate-180"
          />
        </button>
      )}


      {/* Photo */}

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.94,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.94,
        }}
        transition={{
          duration: 0.25,
        }}
        className="relative flex max-h-[88vh] max-w-[92vw] items-center justify-center"
      >
        <img
          src={`http://127.0.0.1:8000${galleryPhotos[selectedGalleryPhoto]}`}
          alt={`Photo ${selectedGalleryPhoto + 1}`}
          className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
        />

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#321b1b]/70 px-4 py-2 text-xs font-medium text-white backdrop-blur">
          {selectedGalleryPhoto + 1} / {galleryPhotos.length}
        </div>
      </motion.div>


      {/* Next */}

      {galleryPhotos.length > 1 && (
        <button
          type="button"
          onClick={() =>
            setSelectedGalleryPhoto(
              (current) =>
                (current + 1) %
                galleryPhotos.length
            )
          }
          className="absolute right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
        >
          <ArrowRight size={20} />
        </button>
      )}
    </motion.div>
  )}
</AnimatePresence>
```


      {/* ================= NOTIFICATION ================= */}

      <AnimatePresence>

        {notice && (

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2"
          >

            <div className="flex items-center gap-3 rounded-full bg-[#321b1b] px-5 py-3 text-sm text-white shadow-2xl">

              <Heart
                size={15}
                fill="currentColor"
              />

              {notice}

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}