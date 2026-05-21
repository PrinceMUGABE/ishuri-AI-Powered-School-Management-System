import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  MessageSquare, Users, Settings, Trash2, Edit, X, Send, Mic, MicOff,
  Play, Square, Download, Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, Eye, Reply, Volume2, File, Image, Video,
  Music, FileText, FileSpreadsheet, FileBadge, FileCode, UserPlus, UserMinus,
  Lock, Unlock, Info, Paperclip, CheckCheck, MessageCircle, Hash,
  ArrowDown, X as XIcon
} from "lucide-react";
import { useTranslation } from "react-i18next";

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

// ─── Toast ────────────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
    {toasts.map(toast => (
      <div key={toast.id} style={{
        padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
        background: toast.type === "success" ? "#166534" : toast.type === "error" ? "#991b1b" : "#1e3a5f",
        color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", maxWidth: 320,
        display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between"
      }}>
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
    ))}
  </div>
);

// ─── Voice Recorder ───────────────────────────────────────────────────────────
const VoiceRecorder = ({ onSend, onCancel, c }) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use audio/ogg or audio/webm with opus codec for voice notes
      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        setDuration(recordingTimeRef.current);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  // Keep a ref for duration on stop
  const recordingTimeRef = useRef(0);
  useEffect(() => { recordingTimeRef.current = recordingTime; }, [recordingTime]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) setPlaybackTime(audioRef.current.currentTime);
      }, 100);
    }
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const progress = duration > 0 ? (playbackTime / duration) * 100 : 0;

  return (
    <div style={{ padding: "12px 16px", background: c.surface2, borderRadius: 12, marginBottom: 8, border: `1px solid ${c.border}` }}>
      {!audioURL ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              padding: 10, borderRadius: "50%",
              background: isRecording ? "#dc2626" : c.accent,
              border: "none", color: "#fff", cursor: "pointer",
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
          {isRecording ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "recPulse 1s infinite" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{formatTime(recordingTime)}</span>
              <span style={{ fontSize: 12, color: c.text2 }}>Recording…</span>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: c.text2 }}>Tap mic to start</span>
          )}
          <button onClick={onCancel} style={{ padding: "6px 12px", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer", color: c.text, fontSize: 13 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <audio ref={audioRef} src={audioURL} onEnded={onAudioEnded} style={{ display: "none" }} />
          <button onClick={togglePlay} style={{
            width: 40, height: 40, borderRadius: "50%", background: c.accent, border: "none",
            color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
          </button>
          <div style={{ flex: 1 }}>
            {/* Waveform-style progress bar */}
            <div style={{ display: "flex", gap: 1, alignItems: "center", height: 28 }}>
              {Array.from({ length: 40 }).map((_, i) => {
                const filled = (i / 40) * 100 <= progress;
                const h = 6 + Math.abs(Math.sin(i * 0.7)) * 14;
                return (
                  <div key={i} style={{
                    width: 3, height: h, borderRadius: 2, flexShrink: 0,
                    background: filled ? c.accent : c.border,
                    transition: "background 0.1s"
                  }} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.text2, marginTop: 2 }}>
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <button onClick={() => onSend(audioBlob, "voice", duration)} style={{
            padding: "8px 14px", background: c.accent, color: "#fff", border: "none",
            borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13
          }}>
            Send
          </button>
          <button onClick={() => { setAudioURL(null); setAudioBlob(null); }} style={{
            padding: "6px 10px", background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: 8, cursor: "pointer", fontSize: 13
          }}>
            Redo
          </button>
          <button onClick={onCancel} style={{ padding: "6px 10px", background: "none", border: "none", cursor: "pointer", color: c.text2 }}>
            <X size={16} />
          </button>
        </div>
      )}
      <style>{`
        @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
};

// ─── Audio Player (for playing received voice notes) ─────────────────────────
// knownDuration: seconds stored at send-time (avoids Infinity for webm/ogg blobs)
const VoiceNotePlayer = ({ url, knownDuration = 0, c }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Start with knownDuration so display is correct before/without metadata
  const [duration, setDuration] = useState(knownDuration > 0 ? knownDuration : 0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // If knownDuration changes (e.g. prop update) sync it
  useEffect(() => {
    if (knownDuration > 0) setDuration(knownDuration);
  }, [knownDuration]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatTime = (s) => {
    const safe = (!s || isNaN(s) || !isFinite(s)) ? 0 : s;
    const m = Math.floor(safe / 60);
    const sec = Math.floor(safe % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      clearInterval(intervalRef.current);
    } else {
      audioRef.current.play().catch(() => { });
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      }, 100);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    clearInterval(intervalRef.current);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    // webm/ogg blobs often report Infinity — keep knownDuration in that case
    if (d && isFinite(d) && d > 0) setDuration(d);
  };

  // Also try to read duration on canplaythrough (fires after enough data buffered)
  const onCanPlayThrough = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (d && isFinite(d) && d > 0) setDuration(d);
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
      <audio
        ref={audioRef}
        src={url}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlayThrough={onCanPlayThrough}
        preload="metadata"
        style={{ display: "none" }}
      />
      <button onClick={toggle} style={{
        width: 34, height: 34, borderRadius: "50%", background: c.accent,
        border: "none", color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        {isPlaying ? <Square size={14} /> : <Play size={14} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 1, alignItems: "center", height: 22 }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const filled = (i / 30) * 100 <= progress;
            const h = 4 + Math.abs(Math.sin(i * 0.8)) * 10;
            return <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: filled ? c.accent : c.border }} />;
          })}
        </div>
        <span style={{ fontSize: 10, color: c.text2 }}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminChatManagement() {
  const { t, i18n } = useTranslation();

  // Derive dark from body class (set by app-level theme toggle, same as TeacherManagement)
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
  const [rightPanel, setRightPanel] = useState("messages");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({}); // ref map: messageId -> DOM node

  // Search in chatroom
  const [messageSearch, setMessageSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(0);
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Modals
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showDeleteRoom, setShowDeleteRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteMsg, setShowDeleteMsg] = useState(false);
  const [showMsgInfo, setShowMsgInfo] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [msgInfoData, setMsgInfoData] = useState(null);

  // Forms
  const [newRoom, setNewRoom] = useState({ name: "", room_type: "", student_id: "", user_id: "" });
  const [roomSettings, setRoomSettings] = useState({ name: "", is_active: true });
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("image");

  // Dropdown data
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState([]);

  const toastId = useRef(0);

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Colors ───────────────────────────────────────────────────────────────
  const c = dark ? {
    bg: "#0f1117", surface: "#1a1d27", surface2: "#22263a", border: "#2d3150",
    text: "#e8eaf6", text2: "#9ba3c2", accent: "#4caf50", accentDark: "#388e3c",
    sent: "#1b5e20", received: "#1a1d27", danger: "#c62828"
  } : {
    bg: "#f0f2f5", surface: "#ffffff", surface2: "#f7f8fa", border: "#e0e3ea",
    text: "#111827", text2: "#6b7280", accent: "#166534", accentDark: "#14532d",
    sent: "#dcfce7", received: "#ffffff", danger: "#dc2626"
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get("/chat/chatrooms/all/");
      setChatrooms(res.data.chatrooms || []);
    } catch (err) {
      addToast(t("chat.messages.fetchError"), "error");
    } finally {
      setLoadingRooms(false);
    }
  }, [addToast, t]);

  const fetchUsers = async () => {
    try {
      const [studentsRes, teachersRes, usersRes] = await Promise.all([
        apiClient.get("/students/students/"),
        apiClient.get("/teachers/teachers/"),
        apiClient.get("/account/users/")
      ]);
      setStudents(Array.isArray(studentsRes.data.data) ? studentsRes.data.data : []);
      setTeachers(Array.isArray(teachersRes.data.data) ? teachersRes.data.data : []);
      // Ensure users is always an array
      const rawUsers = usersRes.data.data;
      setUsers(Array.isArray(rawUsers) ? rawUsers : rawUsers?.results || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      // Set safe defaults
      setStudents([]);
      setTeachers([]);
      setUsers([]);
    }
  };

  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const res = await apiClient.get(`/chat/chatrooms/${roomId}/messages/`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      addToast(t("chat.messages.fetchError"), "error");
    } finally {
      setLoadingMessages(false);
    }
  }, [addToast, t]);

  useEffect(() => { fetchRooms(); fetchUsers(); }, [fetchRooms]);
  useEffect(() => {
    if (selectedRoom) { fetchMessages(selectedRoom.id); setRightPanel("messages"); setReplyTo(null); setShowMessageSearch(false); setMessageSearch(""); }
  }, [selectedRoom, fetchMessages]);

  // ── Message search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!messageSearch.trim()) { setSearchResults([]); return; }
    const q = messageSearch.toLowerCase();
    const results = messages
      .filter(m => m.content && m.content.toLowerCase().includes(q))
      .map(m => m.id);
    setSearchResults(results);
    setCurrentSearchIdx(0);
    if (results.length > 0) scrollToMessage(results[0]);
  }, [messageSearch, messages]);

  useEffect(() => {
    // Check URL for room parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    if (roomId) {
      // Find the chatroom by ID
      const room = chatrooms.find(r => r.id === parseInt(roomId));
      if (room) {
        setSelectedRoom(room);
        // Clean up URL without refreshing the page
        window.history.replaceState({}, '', '/app/chats');
      } else if (chatrooms.length > 0) {
        // If room not found in existing rooms, maybe it's a new room being created
        // Wait a bit and try again
        const timer = setTimeout(() => {
          const found = chatrooms.find(r => r.id === parseInt(roomId));
          if (found) setSelectedRoom(found);
          window.history.replaceState({}, '', '/app/chats');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [chatrooms]);

  const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navigateSearch = (dir) => {
    if (!searchResults.length) return;
    const next = (currentSearchIdx + dir + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(next);
    scrollToMessage(searchResults[next]);
  };

  // ── Navigate to replied message ───────────────────────────────────────────
  const scrollToReplyOrigin = (replyToId) => {
    if (!replyToId) return;
    const el = messageRefs.current[replyToId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background 0.3s";
      el.style.background = dark ? "#2a3a2a" : "#bbf7d0";
      setTimeout(() => { if (el) el.style.background = ""; }, 1500);
    }
  };

  // ── Navigate member → chatroom ────────────────────────────────────────────
  const handleMemberClick = async (member) => {
    // Find existing DM chatroom between admin and this member
    const existing = chatrooms.find(r =>
      (r.room_type === "admin_teacher" || r.room_type === "admin_parent" || r.room_type === "parent_teacher_direct") &&
      r.members?.some(m => m.user === member.user || m.user_id === member.user_id || m.user === member.id)
    );
    if (existing) {
      setSelectedRoom(existing);
      setRightPanel("messages");
      return;
    }
    // Create new DM
    try {
      const userId = member.user || member.user_id || member.id;
      const roomType = member.role === "teacher" ? "admin_teacher" : member.role === "parent" ? "admin_parent" : "admin_teacher";
      const res = await apiClient.post("/chat/chatrooms/create/", { room_type: roomType, user_id: userId });
      if (res.data.chatroom) {
        await fetchRooms();
        setSelectedRoom(res.data.chatroom);
        setRightPanel("messages");
        addToast(t("chat.messages.created"));
      }
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    try {
      const payload = { ...newRoom };
      if (!payload.student_id) delete payload.student_id;
      if (!payload.user_id) delete payload.user_id;
      await apiClient.post("/chat/chatrooms/create/", payload);
      addToast(t("chat.messages.created"));
      setShowCreateRoom(false);
      setNewRoom({ name: "", room_type: "", student_id: "", user_id: "" });
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    try {
      await apiClient.delete(`/chat/chatrooms/${selectedRoom.id}/delete/`);
      addToast(t("chat.messages.deleted"));
      setShowDeleteRoom(false);
      setSelectedRoom(null);
      setMessages([]);
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleUpdateSettings = async () => {
    if (!selectedRoom) return;
    try {
      await apiClient.patch(`/chat/chatrooms/${selectedRoom.id}/settings/`, roomSettings);
      addToast(t("chat.messages.settingsUpdated"));
      setShowRoomSettings(false);
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleAddMember = async () => {
    if (!selectedRoom || !addMemberUserId) return;
    try {
      await apiClient.post(`/chat/chatrooms/${selectedRoom.id}/members/add/`, { user_id: parseInt(addMemberUserId) });
      addToast(t("chat.messages.memberAdded"));
      setShowAddMember(false);
      setAddMemberUserId("");
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedRoom) return;
    try {
      await apiClient.delete(`/chat/chatrooms/${selectedRoom.id}/members/${userId}/remove/`);
      addToast(t("chat.messages.memberRemoved"));
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleToggleMember = async (userId, disable) => {
    if (!selectedRoom) return;
    const url = `/chat/chatrooms/${selectedRoom.id}/members/${userId}/${disable ? "disable" : "enable"}/`;
    try {
      await apiClient.patch(url);
      addToast(disable ? t("chat.messages.memberDisabled") : t("chat.messages.memberEnabled"));
      fetchRooms();
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

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
      fetchMessages(selectedRoom.id);
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
    // Store duration (seconds) in content so VoiceNotePlayer can read it back
    // without relying on audio.duration (which is Infinity for webm/ogg blobs)
    if (durationSecs && durationSecs > 0) {
      formData.append("content", String(Math.round(durationSecs)));
    }
    if (replyTo) formData.append("reply_to_id", replyTo.id);
    try {
      await apiClient.post("/chat/messages/upload/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setShowVoiceRecorder(false);
      setReplyTo(null);
      fetchMessages(selectedRoom.id);
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
      await apiClient.post("/chat/messages/upload/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setShowUpload(false);
      setUploadFile(null);
      setReplyTo(null);
      fetchMessages(selectedRoom.id);
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      await apiClient.delete(`/chat/messages/${selectedMessage.id}/delete/admin/`);
      addToast(t("chat.messages.messageDeleted"));
      setShowDeleteMsg(false);
      setSelectedMessage(null);
      fetchMessages(selectedRoom.id);
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  const handleMessageInfo = async (msg) => {
    setSelectedMessage(msg);
    setShowMsgInfo(true);
    try {
      const res = await apiClient.get(`/chat/messages/${msg.id}/info/`);
      setMsgInfoData(res.data.data);
    } catch (err) {
      addToast(t("chat.messages.error"), "error");
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filteredRooms = chatrooms.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || r.room_type === filterType;
    const matchStatus = !filterStatus || (filterStatus === "active" ? r.is_active : !r.is_active);
    return matchSearch && matchType && matchStatus;
  });

  const roomTypeKeys = [
    "parent_teacher", "all_parents", "all_teachers", "all_students",
    "students_teachers", "students_parents", "admin_parent", "admin_teacher", "parent_teacher_direct"
  ];

  const needsStudent = ["parent_teacher"];
  const needsUser = ["admin_parent", "admin_teacher", "parent_teacher_direct"];

  const stats = {
    totalRooms: chatrooms.length,
    activeRooms: chatrooms.filter(r => r.is_active).length,
    totalMessages: messages.length,
    members: chatrooms.reduce((a, r) => a + (r.members?.length || 0), 0)
  };

  const tickIcon = (status) => {
    if (status === "read") return <CheckCheck size={14} style={{ color: "#60a5fa" }} />;
    if (status === "delivered") return <CheckCheck size={14} style={{ color: dark ? "#9ba3c2" : "#9ca3af" }} />;
    return <CheckCircle size={12} style={{ color: dark ? "#9ba3c2" : "#9ca3af" }} />;
  };

  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString() : "";

  const getFileIcon = (type) => {
    const icons = { image: <Image size={16} />, video: <Video size={16} />, audio: <Music size={16} />, voice: <Mic size={16} />, pdf: <FileText size={16} />, excel: <FileSpreadsheet size={16} />, ppt: <FileBadge size={16} />, word: <FileCode size={16} /> };
    return icons[type] || <File size={16} />;
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "#fbbf24", color: "#000", borderRadius: 2 }}>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: c.bg, color: c.text, fontFamily: "'Inter', sans-serif" }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Top Bar — no language/theme toggles (handled by app shell like TeacherManagement) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: c.surface, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{t("chat.title")}</h1>
          <p style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>{t("chat.subtitle")}</p>
        </div>
        <button onClick={fetchRooms} style={{ padding: "8px 14px", borderRadius: 8, background: c.accent, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          <RefreshCw size={15} /> {t("chat.actions.refresh")}
        </button>
      </div>

      {/* Stats Strip */}
      <div style={{ display: "flex", gap: 12, padding: "10px 20px", background: c.surface, borderBottom: `1px solid ${c.border}`, flexWrap: "wrap" }}>
        {[
          { icon: <MessageCircle size={17} />, val: stats.totalRooms, label: t("chat.stats.totalRooms"), bg: dark ? "#1a3a2a" : "#dcfce7", color: c.accent },
          { icon: <Hash size={17} />, val: stats.activeRooms, label: t("chat.stats.activeRooms"), bg: dark ? "#1e3a5f" : "#dbeafe", color: "#3b82f6" },
          { icon: <MessageSquare size={17} />, val: stats.totalMessages, label: t("chat.stats.totalMessages"), bg: dark ? "#3a2a1a" : "#fef3c7", color: "#d97706" },
          { icon: <Users size={17} />, val: stats.members, label: t("chat.stats.members"), bg: dark ? "#2d1b6a" : "#ede9fe", color: "#8b5cf6" },
        ].map(({ icon, val, label, bg, color }) => (
          <div key={label} style={{ padding: "6px 14px", borderRadius: 10, background: bg, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color }}>{icon}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color }}>{val}</span>
            <span style={{ fontSize: 12, color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 320, background: c.surface, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${c.border}` }}>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.text2 }} />
              <input placeholder={t("chat.actions.search")} value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 10px 8px 32px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ flex: 1, padding: "7px 8px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 12 }}>
                <option value="">{t("chat.filters.allTypes")}</option>
                {roomTypeKeys.map(k => <option key={k} value={k}>{t(`chat.room.types.${k}`)}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ width: 100, padding: "7px 8px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 12 }}>
                <option value="">{t("chat.filters.allStatus")}</option>
                <option value="active">{t("chat.room.active")}</option>
                <option value="inactive">{t("chat.room.inactive")}</option>
              </select>
            </div>
            <button onClick={() => setShowCreateRoom(true)}
              style={{ width: "100%", padding: "9px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600 }}>
              <Plus size={15} /> {t("chat.room.create")}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingRooms ? (
              <div style={{ textAlign: "center", padding: 40, color: c.text2 }}>{t("chat.actions.loading")}</div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <MessageCircle size={44} style={{ color: c.text2, marginBottom: 10, opacity: 0.4 }} />
                <p style={{ color: c.text2, marginBottom: 10 }}>{t("chat.room.noRooms")}</p>
              </div>
            ) : filteredRooms.map(room => {
              const isActive = selectedRoom?.id === room.id;
              const badgeColor = room.room_type === "parent_teacher" ? "#8b5cf6" : room.room_type.includes("all") ? "#3b82f6" : "#10b981";
              return (
                <div key={room.id} onClick={() => setSelectedRoom(room)}
                  style={{ padding: "12px 16px", borderLeft: `3px solid ${isActive ? c.accent : "transparent"}`, background: isActive ? c.surface2 : "transparent", cursor: "pointer", borderBottom: `1px solid ${c.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{room.name}</span>
                        {!room.is_active && <span style={{ fontSize: 10, padding: "1px 5px", background: c.danger, color: "#fff", borderRadius: 4 }}>OFF</span>}
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: badgeColor + "20", color: badgeColor }}>
                        {t(`chat.room.types.${room.room_type}`)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {room.unread_count > 0 && (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.accent, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                          {room.unread_count}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: c.text2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={11} /> {room.members?.length || 0}
                      </div>
                    </div>
                  </div>
                  {room.last_message && (
                    <div style={{ fontSize: 12, color: c.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>{room.last_message.sender}:</strong> {room.last_message.content || `[${room.last_message.message_type}]`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selectedRoom ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <MessageCircle size={56} style={{ color: c.text2, opacity: 0.4 }} />
              <p style={{ color: c.text2 }}>{t("chat.message.startConversation")}</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                    {selectedRoom.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15 }}>{selectedRoom.name}</h3>
                    <p style={{ fontSize: 12, color: c.text2 }}>{t(`chat.room.types.${selectedRoom.room_type}`)} • {selectedRoom.members?.length || 0} members</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* In-chat search toggle */}
                  <button onClick={() => setShowMessageSearch(p => !p)}
                    style={{ padding: "6px 10px", borderRadius: 6, background: showMessageSearch ? c.accent : c.surface2, color: showMessageSearch ? "#fff" : c.text, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                    <Search size={15} />
                  </button>
                  <button onClick={() => { setRightPanel("messages"); setReplyTo(null); }}
                    style={{ padding: "6px 12px", borderRadius: 6, background: rightPanel === "messages" ? c.accent : c.surface2, color: rightPanel === "messages" ? "#fff" : c.text, border: `1px solid ${c.border}`, cursor: "pointer", fontSize: 13 }}>
                    <MessageSquare size={13} style={{ marginRight: 5 }} />{t("chat.tabs.messages")}
                  </button>
                  <button onClick={() => setRightPanel("members")}
                    style={{ padding: "6px 12px", borderRadius: 6, background: rightPanel === "members" ? c.accent : c.surface2, color: rightPanel === "members" ? "#fff" : c.text, border: `1px solid ${c.border}`, cursor: "pointer", fontSize: 13 }}>
                    <Users size={13} style={{ marginRight: 5 }} />{t("chat.tabs.members")}
                  </button>
                  <button onClick={() => { setRoomSettings({ name: selectedRoom.name, is_active: selectedRoom.is_active }); setShowRoomSettings(true); }}
                    style={{ padding: "6px 10px", borderRadius: 6, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                    <Settings size={15} />
                  </button>
                  <button onClick={() => setShowDeleteRoom(true)}
                    style={{ padding: "6px 10px", borderRadius: 6, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer", color: c.danger }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* In-chat message search bar */}
              {showMessageSearch && (
                <div style={{ background: c.surface2, borderBottom: `1px solid ${c.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={14} style={{ color: c.text2 }} />
                  <input
                    autoFocus
                    placeholder="Search messages…"
                    value={messageSearch}
                    onChange={e => setMessageSearch(e.target.value)}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: c.text, fontSize: 13 }}
                  />
                  {searchResults.length > 0 && (
                    <>
                      <span style={{ fontSize: 12, color: c.text2 }}>{currentSearchIdx + 1}/{searchResults.length}</span>
                      <button onClick={() => navigateSearch(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text2 }}><ChevronLeft size={16} /></button>
                      <button onClick={() => navigateSearch(1)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text2 }}><ChevronRight size={16} /></button>
                    </>
                  )}
                  {messageSearch && searchResults.length === 0 && (
                    <span style={{ fontSize: 12, color: c.danger }}>No results</span>
                  )}
                  <button onClick={() => { setShowMessageSearch(false); setMessageSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: c.text2 }}><X size={16} /></button>
                </div>
              )}

              {/* Messages Panel */}
              {rightPanel === "messages" && (
                <>
                  {replyTo && (
                    <div style={{ background: c.surface2, padding: "8px 16px", borderLeft: `3px solid ${c.accent}`, margin: "6px 14px 0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: c.accent }}>↩ {replyTo.sender_username || replyTo.sender}</span>
                        <span style={{ color: c.text2, marginLeft: 6 }}>{replyTo.content ? replyTo.content.slice(0, 60) : `[${replyTo.message_type}]`}</span>
                      </div>
                      <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text2 }}><X size={15} /></button>
                    </div>
                  )}

                  <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {loadingMessages ? (
                      <div style={{ textAlign: "center", padding: 40, color: c.text2 }}>{t("chat.actions.loading")}</div>
                    ) : messages.length === 0 ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                        <MessageSquare size={44} style={{ color: c.text2, opacity: 0.4 }} />
                        <p style={{ color: c.text2 }}>{t("chat.message.noMessages")}</p>
                      </div>
                    ) : messages.map(msg => {
                      const isMine = msg.sender_role === "admin";
                      const isHighlighted = messageSearch && searchResults[currentSearchIdx] === msg.id;
                      const isInResults = searchResults.includes(msg.id);
                      return (
                        <div
                          key={msg.id}
                          ref={el => { if (el) messageRefs.current[msg.id] = el; }}
                          style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 8, transition: "background 0.4s", borderRadius: 8, padding: "2px 4px", background: isHighlighted ? (dark ? "#2a3a2a" : "#bbf7d0") : isInResults ? (dark ? "#1f2a1f" : "#dcfce7") : "transparent" }}
                        >
                          <div style={{ maxWidth: "70%", minWidth: 80 }}>
                            {!isMine && (
                              <p style={{ fontSize: 11, color: c.accent, marginBottom: 3, fontWeight: 600 }}>{msg.sender_username}</p>
                            )}

                            {/* Reply preview — clickable, shows username + content */}
                            {msg.reply_to && (
                              <div
                                onClick={() => scrollToReplyOrigin(msg.reply_to.id)}
                                style={{ background: dark ? "#1a2a3a" : "#e0f2fe", borderRadius: "8px 8px 0 0", padding: "5px 10px", fontSize: 12, borderLeft: `3px solid ${c.accent}`, cursor: "pointer", opacity: 0.9 }}
                              >
                                <span style={{ fontWeight: 700, color: c.accent }}>
                                  {msg.reply_to.sender_username || msg.reply_to.sender || "Unknown"}
                                </span>
                                <div style={{ color: c.text2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                                  {msg.reply_to.message_type !== "text"
                                    ? `📎 ${msg.reply_to.message_type}`
                                    : msg.reply_to.content || "(empty)"}
                                </div>
                              </div>
                            )}

                            <div style={{ background: isMine ? c.sent : c.received, border: `1px solid ${c.border}`, borderRadius: msg.reply_to ? "0 0 12px 12px" : 12, padding: "8px 11px" }}>
                              {msg.message_type === "text" ? (
                                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                                  {messageSearch ? highlightText(msg.content, messageSearch) : msg.content}
                                </p>
                              ) : (msg.message_type === "voice" || msg.message_type === "audio") ? (
                                <VoiceNotePlayer
                                  url={msg.file || msg.file_url}
                                  knownDuration={
                                    // content stores duration seconds for voice notes
                                    msg.content && !isNaN(Number(msg.content)) && Number(msg.content) > 0
                                      ? Number(msg.content)
                                      : 0
                                  }
                                  c={c}
                                />
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {getFileIcon(msg.message_type)}
                                  <a href={msg.file_url || msg.file} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, textDecoration: "none", fontSize: 13 }}>
                                    {msg.file_name || t(`chat.message.types.${msg.message_type}`)}
                                  </a>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginTop: 3 }}>
                                <span style={{ fontSize: 10, color: c.text2 }}>{formatTime(msg.sent_at)}</span>
                                {isMine && tickIcon(msg.tick_status)}
                              </div>
                            </div>
                          </div>

                          {/* Message actions on hover */}
                          <div className="msg-actions" style={{ display: "flex", gap: 3, alignItems: "center" }}>
                            <button onClick={() => setReplyTo(msg)} title="Reply"
                              style={{ padding: 4, borderRadius: 4, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                              <Reply size={13} />
                            </button>
                            <button onClick={() => handleMessageInfo(msg)} title="Info"
                              style={{ padding: 4, borderRadius: 4, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                              <Info size={13} />
                            </button>
                            <button onClick={() => { setSelectedMessage(msg); setShowDeleteMsg(true); }} title="Delete"
                              style={{ padding: 4, borderRadius: 4, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer", color: c.danger }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div style={{ background: c.surface, borderTop: `1px solid ${c.border}`, padding: "10px 14px", flexShrink: 0 }}>
                    {showVoiceRecorder ? (
                      <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoiceRecorder(false)} c={c} />
                    ) : (
                      <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
                        <button onClick={() => setShowUpload(true)} style={{ padding: 9, borderRadius: 8, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                          <Paperclip size={17} />
                        </button>
                        <button onClick={() => setShowVoiceRecorder(true)} style={{ padding: 9, borderRadius: 8, background: c.surface2, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                          <Mic size={17} />
                        </button>
                        <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder={t("chat.message.placeholder")} rows={1}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 20, border: `1px solid ${c.border}`, background: c.surface2, color: c.text, fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit" }}
                        />
                        <button onClick={handleSendMessage} disabled={sendingMsg || !messageText.trim()}
                          style={{ padding: "9px 18px", borderRadius: 20, background: c.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: sendingMsg || !messageText.trim() ? 0.5 : 1 }}>
                          {sendingMsg ? "…" : <Send size={17} />}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Members Panel */}
              {rightPanel === "members" && (
                <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t("chat.tabs.members")} ({selectedRoom.members?.length || 0})</h3>
                    <button onClick={() => setShowAddMember(true)}
                      style={{ padding: "6px 12px", background: c.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <UserPlus size={13} /> {t("chat.member.add")}
                    </button>
                  </div>
                  {(selectedRoom.members || []).map(member => (
                    <div key={member.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px", background: c.surface2, borderRadius: 10, marginBottom: 7, border: `1px solid ${c.border}`, cursor: "pointer", transition: "opacity 0.2s" }}
                      onClick={() => handleMemberClick(member)}
                      title="Click to open direct chat"
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 15, flexShrink: 0 }}>
                        {member.username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{member.username}</p>
                        <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 12, background: dark ? "#1e3a5f" : "#dbeafe", color: dark ? "#93c5fd" : "#1d4ed8" }}>{member.role}</span>
                          {member.is_admin && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 12, background: dark ? "#3a2a1a" : "#fef3c7", color: dark ? "#fbbf24" : "#92400e" }}>Admin</span>}
                          {!member.can_send_message && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 12, background: dark ? "#3a1a1a" : "#fee2e2", color: dark ? "#f87171" : "#dc2626" }}>Muted</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={e => { e.stopPropagation(); handleToggleMember(member.user || member.user_id, member.can_send_message); }}
                          style={{ padding: 5, borderRadius: 6, background: c.surface, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                          {member.can_send_message ? <MicOff size={13} /> : <Mic size={13} />}
                        </button>
                        {!member.is_admin && (
                          <button onClick={e => { e.stopPropagation(); handleRemoveMember(member.user || member.user_id); }}
                            style={{ padding: 5, borderRadius: 6, background: c.surface, border: `1px solid ${c.border}`, cursor: "pointer", color: c.danger }}>
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {/* Create Room */}
      {showCreateRoom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 440, maxWidth: "90%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t("chat.room.create")}</h2>
              <button onClick={() => setShowCreateRoom(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={19} /></button>
            </div>
            {[
              { label: t("chat.room.name"), field: "name", type: "text" },
            ].map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
                <input type={type} value={newRoom[field]} onChange={e => setNewRoom({ ...newRoom, [field]: e.target.value })}
                  style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>{t("chat.room.type")}</label>
              <select value={newRoom.room_type} onChange={e => setNewRoom({ ...newRoom, room_type: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }}>
                <option value="">Select type</option>
                {roomTypeKeys.map(k => <option key={k} value={k}>{t(`chat.room.types.${k}`)}</option>)}
              </select>
            </div>
            {needsStudent.includes(newRoom.room_type) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>{t("chat.room.student")}</label>
                <select value={newRoom.student_id} onChange={e => setNewRoom({ ...newRoom, student_id: e.target.value })}
                  style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }}>
                  <option value="">Select student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
                </select>
              </div>
            )}
            {needsUser.includes(newRoom.room_type) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>{t("chat.room.targetUser")}</label>
                <select value={newRoom.user_id} onChange={e => setNewRoom({ ...newRoom, user_id: e.target.value })}
                  style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }}>
                  <option value="">Select user</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={handleCreateRoom} style={{ flex: 1, padding: "10px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{t("chat.actions.create")}</button>
              <button onClick={() => setShowCreateRoom(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room */}
      {showDeleteRoom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 380, maxWidth: "90%" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Trash2 size={44} style={{ color: c.danger, marginBottom: 10 }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t("chat.room.delete")}</h2>
              <p style={{ fontSize: 13, color: c.text2 }}>{t("chat.room.confirmDelete")}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteRoom} style={{ flex: 1, padding: "10px", background: c.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{t("chat.actions.delete")}</button>
              <button onClick={() => setShowDeleteRoom(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Settings */}
      {showRoomSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 380, maxWidth: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t("chat.room.settings")}</h2>
              <button onClick={() => setShowRoomSettings(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={19} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>{t("chat.room.name")}</label>
              <input value={roomSettings.name} onChange={e => setRoomSettings({ ...roomSettings, name: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 18 }}>
              <input type="checkbox" checked={roomSettings.is_active} onChange={e => setRoomSettings({ ...roomSettings, is_active: e.target.checked })} style={{ accentColor: c.accent }} />
              {t("chat.room.active")}
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleUpdateSettings} style={{ flex: 1, padding: "10px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{t("chat.actions.update")}</button>
              <button onClick={() => setShowRoomSettings(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member */}
      {showAddMember && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 380, maxWidth: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t("chat.member.add")}</h2>
              <button onClick={() => setShowAddMember(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={19} /></button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Select User</label>
              <select value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }}>
                <option value="">Select user</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role || "user"})</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAddMember} style={{ flex: 1, padding: "10px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{t("chat.actions.create")}</button>
              <button onClick={() => setShowAddMember(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message */}
      {showDeleteMsg && selectedMessage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 370, maxWidth: "90%" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Trash2 size={44} style={{ color: c.danger, marginBottom: 10 }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t("chat.message.delete")}</h2>
              <p style={{ fontSize: 13, color: c.text2 }}>{t("chat.messages.confirmDelete")}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteMessage} style={{ flex: 1, padding: "10px", background: c.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{t("chat.actions.delete")}</button>
              <button onClick={() => setShowDeleteMsg(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Info */}
      {showMsgInfo && selectedMessage && msgInfoData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 430, maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t("chat.message.info")}</h2>
              <button onClick={() => { setShowMsgInfo(false); setMsgInfoData(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={19} /></button>
            </div>
            <div style={{ background: c.surface2, borderRadius: 8, padding: 11, marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: c.text2 }}>{t("chat.message.tickSent")}: <strong>{selectedMessage.tick_status}</strong></p>
              <p style={{ fontSize: 13, color: c.text2, marginTop: 3 }}>{formatDate(selectedMessage.sent_at)} {formatTime(selectedMessage.sent_at)}</p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontWeight: 600, marginBottom: 7, fontSize: 13 }}>{t("chat.message.seenBy")} ({msgInfoData.seen_by?.length || 0})</p>
              {msgInfoData.seen_by?.map(u => (
                <div key={u.user_id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13 }}>
                  <span>{u.username}</span>
                  <span style={{ color: c.text2 }}>{formatTime(u.read_at)}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 7, fontSize: 13 }}>{t("chat.message.notSeenBy")} ({msgInfoData.not_seen_by?.length || 0})</p>
              {msgInfoData.not_seen_by?.map(u => (
                <div key={u.user_id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13 }}>
                  <span>{u.username}</span>
                  <span style={{ color: c.text2 }}>{u.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload File */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: c.surface, borderRadius: 16, padding: 22, width: 380, maxWidth: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t("chat.message.upload")}</h2>
              <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={19} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>File Type</label>
              <select value={uploadType} onChange={e => setUploadType(e.target.value)}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface2, color: c.text }}>
                {["image", "video", "audio", "pdf", "excel", "ppt", "word"].map(tp => (
                  <option key={tp} value={tp}>{t(`chat.message.types.${tp}`)}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>File</label>
              <input type="file" onChange={e => setUploadFile(e.target.files[0])} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleUploadFile} disabled={!uploadFile}
                style={{ flex: 1, padding: "10px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, opacity: uploadFile ? 1 : 0.5 }}>
                {t("chat.actions.send")}
              </button>
              <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "10px", background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{t("chat.actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .msg-actions { opacity: 0; transition: opacity 0.15s; }
        div:hover > .msg-actions { opacity: 1; }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
      `}</style>
    </div>
  );
}