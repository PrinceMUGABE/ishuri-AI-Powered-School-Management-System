// ParentChatManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  MessageSquare, Users, Send, Mic, Square, Play,
  Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, Reply, File, Image, Video,
  Music, FileText, FileSpreadsheet, FileBadge, FileCode,
  Paperclip, CheckCheck, MessageCircle, X, Menu, Trash2, Loader2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from '../../hooks/useWebSocket';

const API_BASE_URL = "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const language = localStorage.getItem("user_language") || "en";
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  config.headers["X-Language"] = language;
  return config;
});

// ─── Toast Container ─────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
    {toasts.map(toast => (
      <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
        } text-white`}>
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-80">×</button>
      </div>
    ))}
  </div>
);

// ─── Voice Recorder ─────────────────────────────────────────────────────────
const VoiceRecorder = ({ onSend, onCancel, dark }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const recordingTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  useEffect(() => { recordingTimeRef.current = recordingTime; }, [recordingTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url); setAudioBlob(blob); setDuration(recordingTimeRef.current);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start(100);
      setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { console.error("Microphone error:", err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause(); setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    } else {
      audioRef.current.play(); setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => { if (audioRef.current) setPlaybackTime(audioRef.current.currentTime); }, 100);
    }
  };

  const onAudioEnded = () => { setIsPlaying(false); setPlaybackTime(0); if (playbackTimerRef.current) clearInterval(playbackTimerRef.current); };
  const progress = duration > 0 ? (playbackTime / duration) * 100 : 0;
  const bgColor = dark ? "#1a1d27" : "#f7f8fa";
  const borderColor = dark ? "#2d3150" : "#e0e3ea";
  const accentColor = "#166534";

  return (
    <div className="p-3 rounded-xl mb-2" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      {!audioURL ? (
        <div className="flex items-center gap-3">
          <button onClick={isRecording ? stopRecording : startRecording} className="w-11 h-11 rounded-full flex items-center justify-center transition-colors" style={{ background: isRecording ? "#dc2626" : accentColor }}>
            {isRecording ? <Square size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
          </button>
          {isRecording ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-500">{formatTime(recordingTime)}</span>
              <span className="text-xs" style={{ color: dark ? "#9ba3c2" : "#6b7280" }}>Recording…</span>
            </div>
          ) : (
            <span className="text-sm" style={{ color: dark ? "#9ba3c2" : "#6b7280" }}>Tap mic to start</span>
          )}
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: dark ? "#2d3150" : "#fff", border: `1px solid ${borderColor}` }}>Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <audio ref={audioRef} src={audioURL} onEnded={onAudioEnded} className="hidden" />
          <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: accentColor }}>
            {isPlaying ? <Square size={14} className="text-white" /> : <Play size={14} className="text-white" />}
          </button>
          <div className="flex-1">
            <div className="flex gap-0.5 items-center h-7">
              {Array.from({ length: 30 }).map((_, i) => {
                const filled = (i / 30) * 100 <= progress;
                const h = 4 + Math.abs(Math.sin(i * 0.8)) * 10;
                return <div key={i} className="w-1 rounded-sm transition-colors" style={{ height: h, background: filled ? accentColor : borderColor }} />;
              })}
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: dark ? "#9ba3c2" : "#6b7280" }}>
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <button onClick={() => onSend(audioBlob, "voice", duration)} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: accentColor, color: "#fff" }}>Send</button>
          <button onClick={() => { setAudioURL(null); setAudioBlob(null); }} className="px-2 py-1.5 rounded-lg text-sm">Redo</button>
          <button onClick={onCancel}><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

// ─── Audio Player Component ──────────────────────────────────────────────────
const VoiceNotePlayer = ({ url, knownDuration = 0, dark }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration > 0 ? knownDuration : 0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => { if (knownDuration > 0) setDuration(knownDuration); }, [knownDuration]);
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const formatTime = (s) => {
    const safe = (!s || isNaN(s) || !isFinite(s)) ? 0 : s;
    const m = Math.floor(safe / 60);
    const sec = Math.floor(safe % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause(); setIsPlaying(false); clearInterval(intervalRef.current);
    } else {
      audioRef.current.play().catch(() => { }); setIsPlaying(true);
      intervalRef.current = setInterval(() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }, 100);
    }
  };

  const onEnded = () => { setIsPlaying(false); setCurrentTime(0); clearInterval(intervalRef.current); };
  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (d && isFinite(d) && d > 0) setDuration(d);
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const accentColor = "#166534";
  const borderColor = dark ? "#2d3150" : "#e0e3ea";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={url} onEnded={onEnded} onLoadedMetadata={onLoadedMetadata} className="hidden" />
      <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: accentColor }}>
        {isPlaying ? <Square size={12} className="text-white" /> : <Play size={12} className="text-white" />}
      </button>
      <div className="flex-1">
        <div className="flex gap-0.5 items-center h-5">
          {Array.from({ length: 25 }).map((_, i) => {
            const filled = (i / 25) * 100 <= progress;
            const h = 3 + Math.abs(Math.sin(i * 0.8)) * 8;
            return <div key={i} className="w-1 rounded-sm" style={{ height: h, background: filled ? accentColor : borderColor }} />;
          })}
        </div>
        <span className="text-xs" style={{ color: dark ? "#9ba3c2" : "#6b7280" }}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

// ─── Auto-open banner shown while creating/opening a chatroom ────────────────
const ChatOpeningBanner = ({ teacherName, colors }) => (
  <div className="mx-4 mt-3 p-3 rounded-xl flex items-center gap-3 animate-pulse" style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}>
    <Loader2 size={18} style={{ color: colors.accent }} className="animate-spin flex-shrink-0" />
    <p className="text-sm" style={{ color: colors.text2 }}>
      Opening chat with <strong style={{ color: colors.text }}>{teacherName}</strong>…
    </p>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ParentChatManagement() {
  const { t } = useTranslation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const [toasts, setToasts] = useState([]);
  const [chatrooms, setChatrooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("image");

  // ── Auto-chat state (from sessionStorage) ──
  const [chatTarget, setChatTarget] = useState(null);          // { teacherUserId, teacherName, studentId, … }
  const [autoOpenStatus, setAutoOpenStatus] = useState(null);  // null | "opening" | "done" | "error"

  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const toastId = useRef(0);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const colors = dark ? {
    bg: "#0f1117", surface: "#1a1d27", surface2: "#22263a", border: "#2d3150",
    text: "#e8eaf6", text2: "#9ba3c2", accent: "#166534", accentLight: "#1b5e20",
    sent: "#1b5e20", received: "#1a1d27"
  } : {
    bg: "#f0f2f5", surface: "#ffffff", surface2: "#f7f8fa", border: "#e0e3ea",
    text: "#111827", text2: "#6b7280", accent: "#166534", accentLight: "#dcfce7",
    sent: "#dcfce7", received: "#ffffff"
  };

  // ── Fetch parent's chatrooms ──
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get("/chat/chatrooms/parent/");
      const rooms = res.data.chatrooms || [];
      setChatrooms(rooms);
      return rooms;
    } catch (err) {
      console.error("Error fetching chatrooms:", err);
      addToast(t("chat.messages.fetchError") || "Failed to load chats", "error");
      return [];
    } finally {
      setLoadingRooms(false);
    }
  }, [addToast, t]);

   const { isConnected, sendReadReceipt, debugLog } = useWebSocket(
      selectedRoom?.id,
      useCallback((wsData) => {
        if (wsData.type === 'receipt_update') {
          setMessages(prevMessages =>
            prevMessages.map(msg => {
              if (msg.id === wsData.data.message_id) {
                const updatedReceipts = msg.receipts?.map(receipt => {
                  if (receipt.user_id === wsData.data.user_id) {
                    return { ...receipt, status: wsData.data.status, read_at: wsData.data.read_at };
                  }
                  return receipt;
                }) || [];
                return { ...msg, receipts: updatedReceipts };
              }
              return msg;
            })
          );
        } else if (wsData.type === 'message_deleted') {
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== wsData.messageId));
        } else if (wsData.type === 'message_updated') {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === wsData.data.message_id
                ? { ...msg, content: wsData.data.content }
                : msg
            )
          );
        } else if (wsData.message) {
          setMessages(prevMessages => [...prevMessages, wsData.message]);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }, [])
    );

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const res = await apiClient.get(`/chat/chatrooms/${roomId}/messages/`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Error fetching messages:", err);
      addToast(t("chat.messages.fetchError") || "Failed to load messages", "error");
    } finally {
      setLoadingMessages(false);
    }
  }, [addToast, t]);

  const autoOpenChatWithTeacher = useCallback(async (target, rooms) => {
    const { teacherUserId, teacherName, studentId } = target;
    if (!teacherUserId) return;

    setAutoOpenStatus("opening");
    try {
      // 1. Look for an existing parent_teacher or parent_teacher_direct room
      //    that includes the teacher (check members list).
      const existingRoom = rooms.find(room => {
        const isRelevantType = ["parent_teacher", "parent_teacher_direct"].includes(room.room_type);
        if (!isRelevantType) return false;
        // Check if this room has the teacher as a member
        const members = room.members || [];
        return members.some(m => m.user === teacherUserId || String(m.user) === String(teacherUserId));
      });

      if (existingRoom) {
        setSelectedRoom(existingRoom);
        if (isMobile) setSidebarOpen(false);
        setAutoOpenStatus("done");
        addToast(`Opened chat with ${teacherName}`, "success");
        return;
      }

      // 2. No existing room — create one (parent_teacher type with student context,
      //    or parent_teacher_direct if no student)
      const payload = studentId
        ? { room_type: "parent_teacher", student_id: studentId, user_id: teacherUserId }
        : { room_type: "parent_teacher_direct", user_id: teacherUserId };

      const createRes = await apiClient.post("/chat/chatrooms/create/", payload);
      const newRoom = createRes.data.chatroom;

      if (newRoom) {
        // Refresh rooms and select the new one
        const freshRooms = await fetchRooms();
        const found = freshRooms.find(r => r.id === newRoom.id) || newRoom;
        setSelectedRoom(found);
        if (isMobile) setSidebarOpen(false);
        setAutoOpenStatus("done");
        addToast(`Chat with ${teacherName} is ready!`, "success");
      } else {
        throw new Error("No chatroom returned from server");
      }
    } catch (err) {
      console.error("Failed to auto-open teacher chat:", err);
      const msg = err.response?.data?.message || "Could not open chat with this teacher.";
      addToast(msg, "error");
      setAutoOpenStatus("error");
    }
  }, [isMobile, fetchRooms, addToast]);

  // ── On mount: load rooms, then handle sessionStorage chat target ──
  useEffect(() => {
    const raw = sessionStorage.getItem("chatTarget");
    if (raw) {
      try {
        const target = JSON.parse(raw);
        sessionStorage.removeItem("chatTarget");
        setChatTarget(target);
        // Fetch rooms then auto-open
        fetchRooms().then(rooms => {
          autoOpenChatWithTeacher(target, rooms);
        });
      } catch {
        fetchRooms();
      }
    } else {
      fetchRooms();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      setReplyTo(null);
      setShowVoiceRecorder(false);
    }
  }, [selectedRoom, fetchMessages]);

  useEffect(() => {
    if (!selectedRoom || !messages.length || !sendReadReceipt) return;

    // Mark all unread messages as read immediately when room is opened
    messages.forEach(msg => {
      if (msg.sender_role !== 'admin') {  // not sent by current admin user
        const alreadyRead = msg.receipts?.some(r => r.status === 'read');
        if (!alreadyRead) {
          sendReadReceipt(msg.id);
        }
      }
    });
  }, [messages, selectedRoom, sendReadReceipt]);

 const handleSendMessage = async () => {
  if (!selectedRoom || !messageText.trim()) return;
  setSendingMsg(true);
  try {
    await apiClient.post("/chat/messages/send/", {
      chatroom_id: selectedRoom.id,
      content: messageText.trim(),
      reply_to_id: replyTo?.id || null
    });
    setMessageText("");
    setReplyTo(null);
    // ← Remove fetchMessages(selectedRoom.id) — WS broadcast handles it
  } catch (err) {
    addToast(t("chat.messages.error"), "error");
  } finally {
    setSendingMsg(false);
  }
};

const handleSendVoice = async (audioBlob, type, durationSecs) => {
  if (!selectedRoom) return;
  setSendingMsg(true);
  const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
  const formData = new FormData();
  formData.append("chatroom_id", selectedRoom.id);
  formData.append("message_type", type);
  formData.append("file", audioBlob, `voice_${Date.now()}.${ext}`);
  if (durationSecs && durationSecs > 0) {
    formData.append("content", String(Math.round(durationSecs)));
  }
  if (replyTo) formData.append("reply_to_id", replyTo.id);
  try {
    await apiClient.post("/chat/messages/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    setShowVoiceRecorder(false);
    setReplyTo(null);
    // ← Remove fetchMessages — WS handles it
  } catch (err) {
    addToast(t("chat.messages.error"), "error");
  } finally {
    setSendingMsg(false);
  }
};

const handleUploadFile = async () => {
  if (!selectedRoom || !uploadFile) return;
  const formData = new FormData();
  formData.append("chatroom_id", selectedRoom.id);
  formData.append("message_type", uploadType);
  formData.append("file", uploadFile);
  if (replyTo) formData.append("reply_to_id", replyTo.id);
  try {
    await apiClient.post("/chat/messages/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    setShowUpload(false);
    setUploadFile(null);
    setReplyTo(null);
    // ← Remove fetchMessages — WS handles it
  } catch (err) {
    addToast(t("chat.messages.error"), "error");
  }
};

  // ── Delete (hide) message for receiver ──
  const handleDeleteMessage = async () => {
  if (!selectedMessage) return;
  try {
    await apiClient.delete(`/chat/messages/${selectedMessage.id}/delete/admin/`);
    addToast(t("chat.messages.messageDeleted"));
    setShowDeleteMsg(false);
    setSelectedMessage(null);
    // ← Remove fetchMessages — WS message_deleted handles UI removal
  } catch (err) {
    addToast(t("chat.messages.error"), "error");
  }
};

  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const getFileIcon = (type) => {
    const icons = { image: <Image size={14} />, video: <Video size={14} />, audio: <Music size={14} />, voice: <Mic size={14} />, pdf: <FileText size={14} />, excel: <FileSpreadsheet size={14} />, ppt: <FileBadge size={14} />, word: <FileCode size={14} /> };
    return icons[type] || <File size={14} />;
  };

  const tickIcon = (status) => {
    if (status === "read") return <CheckCheck size={12} style={{ color: "#60a5fa" }} />;
    if (status === "delivered") return <CheckCheck size={12} style={{ color: dark ? "#9ba3c2" : "#9ca3af" }} />;
    return <CheckCircle size={10} style={{ color: dark ? "#9ba3c2" : "#9ca3af" }} />;
  };

  const scrollToReplyOrigin = (replyToId) => {
    const el = messageRefs.current[replyToId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background 0.3s";
      el.style.background = dark ? "#2a3a2a" : "#bbf7d0";
      setTimeout(() => { if (el) el.style.background = ""; }, 1500);
    }
  };

  const filteredRooms = chatrooms.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  const getRoomTypeDisplay = (roomType) => {
    const types = {
      parent_teacher: "Parent-Teacher",
      admin_parent: "Admin & Parent",
      all_parents: "All Parents",
      students_parents: "Students & Parents",
      parent_teacher_direct: "Direct Chat"
    };
    return types[roomType] || roomType?.replace(/_/g, ' ') || "Chat";
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: colors.bg, color: colors.text }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">{t("chat.parent_title") || "Parent Chat"}</h1>
            <p className="text-xs" style={{ color: colors.text2 }}>{t("chat.parent_subtitle") || "Communicate with teachers and admin"}</p>
          </div>
        </div>
        <button onClick={() => fetchRooms()} className="p-2 rounded-lg transition-colors" style={{ background: colors.accent, color: "#fff" }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Auto-opening banner (shown while creating/finding a room) */}
      {autoOpenStatus === "opening" && chatTarget && (
        <ChatOpeningBanner teacherName={chatTarget.teacherName} colors={colors} />
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar */}
        <div className={`fixed md:relative z-20 w-80 h-full transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ background: colors.surface, borderRight: `1px solid ${colors.border}` }}>

          <div className="p-4 border-b" style={{ borderColor: colors.border }}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.text2 }} />
              <input
                placeholder={t("chat.actions.search") || "Search chats…"}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="text-center py-10" style={{ color: colors.text2 }}>{t("chat.actions.loading") || "Loading…"}</div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle size={48} className="mx-auto mb-3 opacity-40" style={{ color: colors.text2 }} />
                <p style={{ color: colors.text2 }}>{t("chat.room.noRooms") || "No chats yet"}</p>
              </div>
            ) : filteredRooms.map(room => {
              const isActive = selectedRoom?.id === room.id;
              return (
                <div
                  key={room.id}
                  onClick={() => { setSelectedRoom(room); if (isMobile) setSidebarOpen(false); }}
                  className="p-3 cursor-pointer transition-colors"
                  style={{
                    background: isActive ? colors.surface2 : "transparent",
                    borderLeft: `3px solid ${isActive ? colors.accent : "transparent"}`,
                    borderBottom: `1px solid ${colors.border}`
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{room.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: colors.text2 }}>{getRoomTypeDisplay(room.room_type)}</p>
                    </div>
                    {room.unread_count > 0 && (
                      <span className="ml-2 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0" style={{ background: colors.accent }}>
                        {room.unread_count > 9 ? '9+' : room.unread_count}
                      </span>
                    )}
                  </div>
                  {room.last_message && (
                    <p className="text-xs mt-1.5 truncate" style={{ color: colors.text2 }}>
                      <strong>{room.last_message.sender}:</strong> {room.last_message.content || `[${room.last_message.message_type}]`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && isMobile && <div className="fixed inset-0 bg-black/50 z-10" onClick={() => setSidebarOpen(false)} />}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              {autoOpenStatus === "opening" ? (
                <div className="text-center">
                  <Loader2 size={48} className="mx-auto mb-3 animate-spin" style={{ color: colors.accent }} />
                  <p style={{ color: colors.text2 }}>Opening chat with {chatTarget?.teacherName}…</p>
                </div>
              ) : (
                <>
                  <MessageCircle size={64} className="opacity-40" style={{ color: colors.text2 }} />
                  <p style={{ color: colors.text2 }}>{t("chat.message.startConversation") || "Select a chat to start"}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 flex-shrink-0" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedRoom.name}</h3>
                    <p className="text-xs" style={{ color: colors.text2 }}>{getRoomTypeDisplay(selectedRoom.room_type)}</p>
                  </div>
                  <button
                    onClick={() => setShowDebug(p => !p)}
                    style={{ padding: "6px 10px", borderRadius: 6, background: isConnected ? "#166534" : "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                  >
                    {isConnected ? "● WS" : "○ WS"}
                  </button>
                </div>
                {replyTo && (
                  <div className="mt-2 p-2 rounded-lg flex justify-between items-center" style={{ background: colors.surface2, borderLeft: `3px solid ${colors.accent}` }}>
                    <div className="text-sm">
                      <span className="font-semibold" style={{ color: colors.accent }}>↩ Replying to {replyTo.sender_username}</span>
                      <span className="ml-2 text-xs" style={{ color: colors.text2 }}>{replyTo.content?.slice(0, 50) || `[${replyTo.message_type}]`}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)}><X size={14} /></button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center py-10" style={{ color: colors.text2 }}>{t("chat.actions.loading") || "Loading…"}</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare size={48} className="mx-auto mb-3 opacity-40" style={{ color: colors.text2 }} />
                    <p style={{ color: colors.text2 }}>{t("chat.message.noMessages") || "No messages yet. Say hello!"}</p>
                  </div>
                ) : messages.map(msg => {
                  const isOutgoing = msg.sender_role === "parent";
                  return (
                    <div
                      key={msg.id}
                      data-message-id={msg.id}
                      ref={el => { if (el) messageRefs.current[msg.id] = el; }}
                      className={`flex gap-2 group ${isOutgoing ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}>
                        {!isOutgoing && (
                          <p className="text-xs font-semibold mb-1" style={{ color: colors.accent }}>{msg.sender_username}</p>
                        )}
                        {msg.reply_to && (
                          <div
                            onClick={() => scrollToReplyOrigin(msg.reply_to.id)}
                            className="mb-1 p-1.5 rounded-t-lg cursor-pointer text-xs w-full"
                            style={{ background: dark ? "#1a2a3a" : "#e0f2fe", borderLeft: `2px solid ${colors.accent}` }}
                          >
                            <span className="font-semibold" style={{ color: colors.accent }}>{msg.reply_to.sender_username}</span>
                            <span className="ml-1" style={{ color: colors.text2 }}>
                              {msg.reply_to.message_type !== "text" ? `📎 ${msg.reply_to.message_type}` : msg.reply_to.content?.slice(0, 40)}
                            </span>
                          </div>
                        )}
                        <div className="rounded-lg p-2 w-full" style={{ background: isOutgoing ? colors.sent : colors.received, border: `1px solid ${colors.border}` }}>
                          {msg.message_type === "text" ? (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          ) : (msg.message_type === "voice" || msg.message_type === "audio") ? (
                            <VoiceNotePlayer url={msg.file || msg.file_url} knownDuration={parseInt(msg.content) || 0} dark={dark} />
                          ) : (
                            <a href={msg.file_url || msg.file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: colors.accent }}>
                              {getFileIcon(msg.message_type)}
                              {msg.file_name || msg.message_type}
                            </a>
                          )}
                          <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-xs" style={{ color: colors.text2 }}>{formatTime(msg.sent_at)}</span>
                            {isOutgoing && tickIcon(msg.tick_status)}
                          </div>
                        </div>
                      </div>

                      {/* Actions (reply + hide) visible on hover for incoming */}
                      {!isOutgoing && (
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-end mb-1">
                          <button onClick={() => setReplyTo(msg)} className="p-1 rounded" style={{ background: colors.surface2 }} title="Reply">
                            <Reply size={12} />
                          </button>
                          <button onClick={() => handleDeleteMessage(msg)} className="p-1 rounded" style={{ background: colors.surface2 }} title="Hide">
                            <Trash2 size={12} style={{ color: "#dc2626" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 flex-shrink-0" style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
                {showVoiceRecorder ? (
                  <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoiceRecorder(false)} dark={dark} />
                ) : (
                  <div className="flex gap-2 items-end">
                    <button onClick={() => setShowUpload(true)} className="p-2 rounded-lg" style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}>
                      <Paperclip size={16} />
                    </button>
                    <button onClick={() => setShowVoiceRecorder(true)} className="p-2 rounded-lg" style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}>
                      <Mic size={16} />
                    </button>
                    <textarea
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder={t("chat.message.placeholder") || "Type a message…"}
                      rows={1}
                      className="flex-1 px-3 py-2 rounded-xl resize-none outline-none text-sm"
                      style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMsg || !messageText.trim()}
                      className="p-2 rounded-lg disabled:opacity-50 transition-colors"
                      style={{ background: colors.accent, color: "#fff" }}
                    >
                      {sendingMsg ? "…" : <Send size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl max-w-md w-full p-5" style={{ background: colors.surface }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{t("chat.message.upload") || "Upload File"}</h3>
              <button onClick={() => setShowUpload(false)}><X size={20} /></button>
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium mb-1 block">File Type</label>
              <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="w-full p-2 rounded-lg text-sm outline-none" style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text }}>
                {["image", "video", "audio", "pdf", "excel", "ppt", "word"].map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">File</label>
              <input type="file" onChange={e => setUploadFile(e.target.files[0])} className="w-full" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUploadFile} disabled={!uploadFile} className="flex-1 py-2 rounded-lg font-semibold disabled:opacity-50" style={{ background: colors.accent, color: "#fff" }}>Send</button>
              <button onClick={() => setShowUpload(false)} className="flex-1 py-2 rounded-lg" style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .group:hover .group-hover\\:opacity-100 { opacity: 1; }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}