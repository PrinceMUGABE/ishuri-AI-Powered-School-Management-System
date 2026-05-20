// NotificationCenter.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Bell, CheckCircle, XCircle, Trash2, CheckCheck, RefreshCw,
  ChevronLeft, ChevronRight, Send, Users, UserPlus,
  Clock, AlertCircle, Info, Calendar, BookOpen, DollarSign,
  UserCheck, UserX, MessageSquare, Award, FileText,
  CreditCard, Loader2, Eye, Search, X
} from "lucide-react";

// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_BASE_URL    = "http://127.0.0.1:8000/api/notifications";
const ACCOUNT_API_URL = "http://127.0.0.1:8000/api/account";

// ============================================================================
// CONSOLE LOGGER UTILITY
// ============================================================================
const consoleLogger = {
  request: (method, url, headers, body, userRole) => {
    console.group(
      `%c⬆ REQUEST  %c${method} ${url}`,
      "background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;",
      "color:#1d4ed8;font-weight:bold;"
    );
    console.log("%cUser Role:", "font-weight:bold;color:#7c3aed;", userRole ?? "unknown");
    console.log("%cHeaders:", "font-weight:bold;", headers);
    console.log("%cBody:", "font-weight:bold;", body !== null && body !== undefined ? body : "(none)");
    console.groupEnd();
  },
  response: (method, url, status, data, userRole) => {
    const isError = status >= 400;
    console.group(
      `%c${isError ? "⬇ ERROR" : "⬇ RESPONSE"}  %c${status} ${method} ${url}`,
      isError
        ? "background:#dc2626;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;"
        : "background:#16a34a;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;",
      isError ? "color:#dc2626;font-weight:bold;" : "color:#16a34a;font-weight:bold;"
    );
    console.log("%cUser Role:", "font-weight:bold;color:#7c3aed;", userRole ?? "unknown");
    console.log("%cStatus:", "font-weight:bold;", status);
    console.log("%cData:", "font-weight:bold;", data);
    console.groupEnd();
  },
};

// ============================================================================
// API CLIENT FACTORY
// ============================================================================
function createApiClient(baseURL, userRoleRef) {
  const client = axios.create({ baseURL, timeout: 30000 });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    const lang  = localStorage.getItem("user_language") || "en";
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    config.headers["X-Language"] = lang;
    const loggedHeaders = { ...config.headers };
    if (loggedHeaders["Authorization"]) {
      const raw = loggedHeaders["Authorization"];
      loggedHeaders["Authorization"] =
        raw.length > 20 ? `${raw.slice(0, 15)}...${raw.slice(-8)}` : raw;
    }
    const method = config.method?.toUpperCase() ?? "GET";
    const url    = `${baseURL}${config.url}`;
    config._logMeta = { method, url, loggedHeaders };
    consoleLogger.request(method, url, loggedHeaders,
      config.data ? JSON.parse(JSON.stringify(config.data)) : null,
      userRoleRef?.current ?? null);
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const { method, url } = response.config._logMeta ?? {};
      consoleLogger.response(method ?? "?", url ?? baseURL,
        response.status, response.data, userRoleRef?.current ?? null);
      return response;
    },
    (error) => {
      const { method, url } = error.config?._logMeta ?? {};
      const status = error.response?.status ?? 0;
      consoleLogger.response(method ?? "?", url ?? baseURL, status,
        error.response?.data ?? { error: error.message }, userRoleRef?.current ?? null);
      return Promise.reject(error);
    }
  );

  return client;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatTimeAgo = (dateString) => {
  if (!dateString) return "N/A";
  const date      = new Date(dateString);
  const now       = new Date();
  const diffMs    = now - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffMins  < 1)  return "Just now";
  if (diffMins  < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

const formatFullDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case "high":   return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "medium": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    case "low":    return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    default:       return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  }
};

const getPriorityIcon = (priority) => {
  switch (priority?.toLowerCase()) {
    case "high":   return <AlertCircle size={14} />;
    case "medium": return <Clock size={14} />;
    default:       return <Info size={14} />;
  }
};

const getNotificationIcon = (type, size = 18) => {
  const iconMap = {
    user_created:           <UserPlus      size={size} />,
    user_updated:           <UserCheck     size={size} />,
    user_deleted:           <UserX         size={size} />,
    login_success:          <CheckCircle   size={size} />,
    password_changed:       <RefreshCw     size={size} />,
    grade_uploaded:         <FileText      size={size} />,
    grade_approved:         <Award         size={size} />,
    assignment_created:     <BookOpen      size={size} />,
    attendance_marked:      <Calendar      size={size} />,
    low_attendance_warning: <AlertCircle   size={size} />,
    message_received:       <MessageSquare size={size} />,
    fee_payment_received:   <DollarSign    size={size} />,
    fee_payment_overdue:    <CreditCard    size={size} />,
    deadline_reminder:      <Clock         size={size} />,
  };
  return iconMap[type] || <Bell size={size} />;
};

const getIconBg = (priority) => {
  switch (priority?.toLowerCase()) {
    case "high":   return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    case "medium": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
    default:       return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
  }
};

// ============================================================================
// HIGHLIGHT HELPER — wraps matched keyword in a <mark> span
// ============================================================================
function HighlightText({ text, keyword }) {
  if (!keyword || !text) return <>{text}</>;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts   = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-700/60 text-yellow-900 dark:text-yellow-100 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ============================================================================
// NOTIFICATION DETAIL MODAL
// ============================================================================
function NotificationDetailModal({ notification, onClose, onMarkRead, isAdmin, onDelete, keyword, t }) {
  if (!notification) return null;

  const handleMarkRead = () => { onMarkRead(notification.id); onClose(); };
  const handleDelete   = () => { onDelete(notification.id);   onClose(); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Coloured header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 ${
          notification.priority === "high"   ? "bg-red-50 dark:bg-red-900/20"
          : notification.priority === "medium" ? "bg-yellow-50 dark:bg-yellow-900/20"
          : "bg-green-50 dark:bg-green-900/20"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${getIconBg(notification.priority)}`}>
              {getNotificationIcon(notification.notification_type, 20)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {notification.notification_type?.replace(/_/g, " ")}
              </p>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                <HighlightText text={notification.title} keyword={keyword} />
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
              {getPriorityIcon(notification.priority)}
              {t(`notifications.priority.${notification.priority}`, notification.priority)}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              notification.status === "unread"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}>
              {notification.status === "unread"
                ? <><Bell size={11} /> {t("notifications.status.unread", "Unread")}</>
                : <><CheckCircle size={11} /> {t("notifications.status.read", "Read")}</>}
            </span>
          </div>

          {/* Full message */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              <HighlightText text={notification.message} keyword={keyword} />
            </p>
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400" />
              <span>{formatTimeAgo(notification.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>{formatFullDate(notification.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 flex-wrap">
          {notification.status === "unread" && (
            <button
              onClick={handleMarkRead}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCheck size={15} />
              {t("notifications.actions.markRead", "Mark as Read")}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={15} />
              {t("notifications.actions.delete", "Delete")}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            {t("notifications.send.cancel", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEND NOTIFICATION MODAL  (Admin only)
// ============================================================================
function SendNotificationModal({ isOpen, onClose, onSend, users, roles, t }) {
  const [recipientType, setRecipientType] = useState("specific");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole,  setSelectedRole]  = useState("");
  const [title,         setTitle]         = useState("");
  const [message,       setMessage]       = useState("");
  const [priority,      setPriority]      = useState("medium");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [sending,       setSending]       = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(t("notifications.send.fillFields", "Please fill in title and message"));
      return;
    }
    const payload = { title: title.trim(), message: message.trim(), priority };
    if (recipientType === "specific") {
      if (!selectedUsers.length) {
        toast.error(t("notifications.send.selectUsers", "Please select at least one user"));
        return;
      }
      payload.user_ids       = selectedUsers;
      payload.recipient_type = "specific";
    } else if (recipientType === "role") {
      if (!selectedRole) {
        toast.error(t("notifications.send.selectRole", "Please select a role"));
        return;
      }
      payload.role           = selectedRole;
      payload.recipient_type = "role";
    } else {
      payload.recipient_type = "all";
    }
    setSending(true);
    await onSend(payload);
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Send size={20} />
            {t("notifications.send.title", "Send Notification")}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("notifications.send.recipientType", "Recipient Type")}
            </label>
            <div className="flex gap-3 flex-wrap">
              {[
                { value: "specific", label: t("notifications.send.specificUsers", "Specific Users"), icon: <Users size={16} /> },
                { value: "role",     label: t("notifications.send.byRole",        "By Role"),        icon: <UserPlus size={16} /> },
                { value: "all",      label: t("notifications.send.allUsers",      "All Users"),      icon: <Users size={16} /> },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setRecipientType(value)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    recipientType === value
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {recipientType === "specific" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("notifications.send.selectUsers", "Select Users")}
              </label>
              <input
                type="text"
                placeholder={t("notifications.send.searchUsers", "Search users...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {filteredUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) =>
                        setSelectedUsers(e.target.checked
                          ? [...selectedUsers, user.id]
                          : selectedUsers.filter((id) => id !== user.id))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">{user.username}</span>
                    <span className="text-xs text-gray-500">({user.role})</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {selectedUsers.length} {t("notifications.send.usersSelected", "users selected")}
              </p>
            </div>
          )}

          {recipientType === "role" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("notifications.send.selectRole", "Select Role")}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t("notifications.send.chooseRole", "Choose a role")}</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("notifications.send.notifTitle", "Title")} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("notifications.send.titlePlaceholder", "Enter notification title")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("notifications.send.message", "Message")} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("notifications.send.messagePlaceholder", "Enter notification message")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("notifications.send.priority", "Priority")}
            </label>
            <div className="flex gap-3">
              {["low", "medium", "high"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    priority === p
                      ? p === "high"   ? "bg-red-600 text-white"
                        : p === "medium" ? "bg-yellow-600 text-white"
                        : "bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t(`notifications.priority.${p}`, p)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {t("notifications.send.send", "Send Notification")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t("notifications.send.cancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN NOTIFICATION CENTER COMPONENT
// ============================================================================
export default function NotificationCenter() {
  const { t } = useTranslation();

  // ── Remote data (full list fetched from API once) ─────────────────────────
  const [allNotifications,      setAllNotifications]      = useState([]);
  const [unreadCount,           setUnreadCount]           = useState(0);
  const [loading,               setLoading]               = useState(true);
  const [users,                 setUsers]                 = useState([]);
  const [userRole,              setUserRole]              = useState(null);
  const [isAdmin,               setIsAdmin]               = useState(false);

  // ── Client-side filter / pagination state ─────────────────────────────────
  const [searchInput,           setSearchInput]           = useState("");
  const [searchKeyword,         setSearchKeyword]         = useState("");
  const [filterType,            setFilterType]            = useState("");
  const [filterStatus,          setFilterStatus]          = useState("");
  const [pageSize,              setPageSize]              = useState(10);
  const [currentPage,           setCurrentPage]           = useState(1);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSendModal,         setShowSendModal]         = useState(false);
  const [detailNotification,    setDetailNotification]    = useState(null);

  const userRoleRef         = useRef(null);
  const apiClientRef        = useRef(null);
  const accountApiClientRef = useRef(null);
  const searchDebounceRef   = useRef(null);

  useEffect(() => {
    apiClientRef.current        = createApiClient(API_BASE_URL,    userRoleRef);
    accountApiClientRef.current = createApiClient(ACCOUNT_API_URL, userRoleRef);
  }, []);

  const apiClient     = () => apiClientRef.current;
  const accountClient = () => accountApiClientRef.current;

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

  const roles = [
    { value: "admin",   label: t("notifications.roles.admin",   "Administrator") },
    { value: "teacher", label: t("notifications.roles.teacher", "Teacher")       },
    { value: "student", label: t("notifications.roles.student", "Student")       },
    { value: "parent",  label: t("notifications.roles.parent",  "Parent")        },
  ];

  const notificationTypes = [
    { value: "",                     label: t("notifications.filters.allTypes", "All Types") },
    { value: "user_created",         label: "User Created"       },
    { value: "grade_uploaded",       label: "Grade Uploaded"     },
    { value: "assignment_created",   label: "Assignment Created" },
    { value: "attendance_marked",    label: "Attendance Marked"  },
    { value: "message_received",     label: "Message Received"   },
    { value: "fee_payment_received", label: "Payment Received"   },
    { value: "deadline_reminder",    label: "Deadline Reminder"  },
  ];

  const statusOptions = [
    { value: "",       label: t("notifications.filters.allStatus", "All Status") },
    { value: "unread", label: t("notifications.status.unread",     "Unread")     },
    { value: "read",   label: t("notifications.status.read",       "Read")       },
  ];

  // ── Debounced search ──────────────────────────────────────────────────────
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchKeyword(value.trim());
      setCurrentPage(1);
    }, 300);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
    setCurrentPage(1);
  };

  // ── CLIENT-SIDE FILTERING (keyword + status + type) ───────────────────────
  // Applied entirely on `allNotifications` — no extra API calls needed.
  const filteredNotifications = useMemo(() => {
    let result = allNotifications;

    // 1. Status filter
    if (filterStatus) {
      result = result.filter((n) => n.status === filterStatus);
    }

    // 2. Type filter
    if (filterType) {
      result = result.filter((n) => n.notification_type === filterType);
    }

    // 3. Keyword search — checks title AND message (case-insensitive)
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(kw) ||
          n.message?.toLowerCase().includes(kw)
      );
    }

    return result;
  }, [allNotifications, filterStatus, filterType, searchKeyword]);

  // ── CLIENT-SIDE PAGINATION ────────────────────────────────────────────────
  const totalFiltered = filteredNotifications.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / pageSize));

  // Clamp currentPage whenever filters shrink the total
  const safePage = Math.min(currentPage, totalPages);

  const pagedNotifications = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, safePage, pageSize]);

  const startIndex = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex   = Math.min(safePage * pageSize, totalFiltered);

  // ── Fetch ALL notifications from API (no server-side filtering) ───────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a large page so we hold everything client-side.
      // Adjust page_size ceiling to match your backend's maximum allowed value.
      const response = await apiClient().get("/?page=1&page_size=1000");
      if (response.data?.success) {
        setAllNotifications(response.data.results || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error(t("notifications.messages.fetchError", "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ── Fetch unread count ────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient().get("/unread-count/");
      if (response.data?.success) {
        setUnreadCount(response.data.data.unread_count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // ── Fetch current user ────────────────────────────────────────────────────
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const response = await accountClient().get("/me/");
      if (response.data?.success && response.data?.data) {
        const role = response.data.data.user.role;
        userRoleRef.current = role;
        setUserRole(role);
        setIsAdmin(role === "admin");
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  }, []);

  // ── Fetch all users (admin only) ──────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await accountClient().get("/users/");
      if (response.data?.success && response.data?.data?.results) {
        setUsers(response.data.data.results);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [isAdmin]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const markAsRead = async (notificationId) => {
    try {
      await apiClient().patch(`/${notificationId}/`);
      // Update local state immediately — no need to re-fetch everything
      setAllNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, status: "read" } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success(t("notifications.messages.markedRead", "Notification marked as read"));
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error(t("notifications.messages.markReadError", "Failed to mark as read"));
    }
  };

  // ── Mark selected as read ─────────────────────────────────────────────────
  const markSelectedAsRead = async () => {
    if (!selectedNotifications.length) {
      toast.error(t("notifications.messages.selectNotifications", "Please select notifications"));
      return;
    }
    try {
      await apiClient().post("/mark-read/", { notification_ids: selectedNotifications });
      const unreadMarked = allNotifications.filter(
        (n) => selectedNotifications.includes(n.id) && n.status === "unread"
      ).length;
      setAllNotifications((prev) =>
        prev.map((n) =>
          selectedNotifications.includes(n.id) ? { ...n, status: "read" } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - unreadMarked));
      setSelectedNotifications([]);
      toast.success(t("notifications.messages.markedReadSelected", "Selected notifications marked as read"));
    } catch (error) {
      console.error("Error marking selected as read:", error);
      toast.error(t("notifications.messages.markReadError", "Failed to mark as read"));
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      await apiClient().post("/mark-read/", { mark_all: true });
      setAllNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      setUnreadCount(0);
      setSelectedNotifications([]);
      toast.success(t("notifications.messages.markedAllRead", "All notifications marked as read"));
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error(t("notifications.messages.markReadError", "Failed to mark as read"));
    }
  };

  // ── Delete single ─────────────────────────────────────────────────────────
  const deleteNotification = async (notificationId) => {
    if (!isAdmin) return;
    try {
      await apiClient().delete(`/${notificationId}/`);
      const wasUnread = allNotifications.find((n) => n.id === notificationId)?.status === "unread";
      setAllNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      toast.success(t("notifications.messages.deleted", "Notification deleted"));
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error(t("notifications.messages.deleteError", "Failed to delete notification"));
    }
  };

  // ── Delete selected ───────────────────────────────────────────────────────
  const deleteSelected = async () => {
    if (!isAdmin || !selectedNotifications.length) {
      toast.error(t("notifications.messages.selectNotifications", "Please select notifications"));
      return;
    }
    try {
      await Promise.all(selectedNotifications.map((id) => apiClient().delete(`/${id}/`)));
      const unreadDeleted = allNotifications.filter(
        (n) => selectedNotifications.includes(n.id) && n.status === "unread"
      ).length;
      setAllNotifications((prev) => prev.filter((n) => !selectedNotifications.includes(n.id)));
      setUnreadCount((c) => Math.max(0, c - unreadDeleted));
      setSelectedNotifications([]);
      toast.success(t("notifications.messages.deletedSelected", "Selected notifications deleted"));
    } catch (error) {
      console.error("Error deleting selected notifications:", error);
      toast.error(t("notifications.messages.deleteError", "Failed to delete notifications"));
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendNotification = async (payload) => {
    try {
      await apiClient().post("/send/", payload);
      toast.success(t("notifications.messages.notificationSent", "Notification sent successfully"));
      setShowSendModal(false);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(
        error.response?.data?.message ||
        t("notifications.messages.sendError", "Failed to send notification")
      );
    }
  };

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect   = (id) =>
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  // Select all on the current filtered+paged view
  const selectAll      = () => setSelectedNotifications(pagedNotifications.map((n) => n.id));
  const clearSelection = () => setSelectedNotifications([]);

  // ── Page size change ──────────────────────────────────────────────────────
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterType, searchKeyword]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  useEffect(() => {
    if (userRole) {
      fetchNotifications();
      fetchUnreadCount();
      if (isAdmin) fetchUsers();
    }
  }, [userRole, isAdmin, fetchNotifications, fetchUnreadCount, fetchUsers]);

  const handleRefresh = async () => {
    await fetchNotifications();
    await fetchUnreadCount();
    toast.success(t("notifications.messages.refreshed", "Notifications refreshed"));
  };

  // Derived stats from the FULL unfiltered list
  const totalAll  = allNotifications.length;
  const readCount = allNotifications.filter((n) => n.status === "read").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-green-600" />
                {t("notifications.title", "Notification Center")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("notifications.subtitle", "Manage and track your notifications")}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Send size={18} />
                  {t("notifications.actions.send", "Send Notification")}
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title={t("notifications.messages.refreshed", "Refresh")}
              >
                <RefreshCw size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Stats (always reflect the full unfiltered list) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t("notifications.stats.total",  "Total Notifications"), value: totalAll,                    color: "blue",   icon: <Bell       className="w-5 h-5 text-blue-600   dark:text-blue-400"   /> },
            { label: t("notifications.stats.unread", "Unread"),              value: unreadCount,                 color: "yellow", icon: <Clock      className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /> },
            { label: t("notifications.stats.read",   "Read"),                value: readCount,                   color: "green",  icon: <CheckCircle className="w-5 h-5 text-green-600  dark:text-green-400"  /> },
            { label: t("notifications.stats.filtered","Matching Filters"),   value: totalFiltered,               color: "purple", icon: <Search     className="w-5 h-5 text-purple-600 dark:text-purple-400" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</p>
                </div>
                <div className={`w-10 h-10 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg flex items-center justify-center`}>
                  {icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bulk action bar ── */}
        <div className="flex flex-wrap gap-3">
          {selectedNotifications.length > 0 && (
            <>
              <button
                onClick={markSelectedAsRead}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCheck size={16} />
                {t("notifications.actions.markRead", "Mark Read")} ({selectedNotifications.length})
              </button>
              {isAdmin && (
                <button
                  onClick={deleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {t("notifications.actions.delete", "Delete")} ({selectedNotifications.length})
                </button>
              )}
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t("notifications.actions.clear", "Clear Selection")}
              </button>
            </>
          )}
          {!isAdmin && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCheck size={16} />
              {t("notifications.actions.markAllRead", "Mark All as Read")}
            </button>
          )}
          {isAdmin && pagedNotifications.length > 0 && (
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t("notifications.actions.selectAll", "Select All on Page")}
            </button>
          )}
        </div>

        {/* ── Search + Filters ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">

          {/* Keyword search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder={t("notifications.filters.search", "Search by title or message...")}
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Dropdowns row */}
          <div className="flex flex-wrap gap-4">
            {/* Type filter */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                {t("notifications.filters.type", "Type")}
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              >
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                {t("notifications.filters.status", "Status")}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Page size */}
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                {t("notifications.filters.rowsPerPage", "Rows / page")}
              </label>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterStatus("");
                  clearSearch();
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
              >
                {t("notifications.filters.clear", "Clear All")}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {(searchKeyword || filterType || filterStatus) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {searchKeyword && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <Search size={11} />
                  &ldquo;{searchKeyword}&rdquo;
                  <button onClick={clearSearch} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
              {filterType && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                  {filterType.replace(/_/g, " ")}
                  <button onClick={() => setFilterType("")} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                  {filterStatus}
                  <button onClick={() => setFilterStatus("")} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Notifications list ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pagedNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {t("notifications.messages.noNotifications", "No notifications found")}
              </p>
              {(searchKeyword || filterType || filterStatus) && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t("notifications.messages.tryDifferentFilters", "Try adjusting your search or filters")}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pagedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    notification.status === "unread" ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="mt-1 rounded border-gray-300 dark:border-gray-600 accent-green-600"
                      />
                    )}

                    <div className={`p-2 rounded-lg flex-shrink-0 ${getIconBg(notification.priority)}`}>
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${
                            notification.status === "unread"
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-600 dark:text-gray-400"
                          }`}>
                            <HighlightText text={notification.title} keyword={searchKeyword} />
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            <HighlightText text={notification.message} keyword={searchKeyword} />
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                            {getPriorityIcon(notification.priority)}
                            {t(`notifications.priority.${notification.priority}`, notification.priority)}
                          </span>
                          {notification.status === "unread" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              <Bell size={12} />
                              {t("notifications.status.unread", "Unread")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <span className="capitalize">
                          {notification.notification_type?.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Row actions */}
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => setDetailNotification(notification)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1 transition-colors"
                          title={t("notifications.actions.viewDetails", "View details")}
                        >
                          <Eye size={13} />
                          {t("notifications.actions.viewDetails", "View")}
                        </button>

                        {notification.status === "unread" && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 transition-colors"
                          >
                            <CheckCheck size={13} />
                            {t("notifications.actions.markRead", "Mark as read")}
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={13} />
                            {t("notifications.actions.delete", "Delete")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination footer ── */}
          {!loading && totalFiltered > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("notifications.pagination.showing", "Showing")}{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">{startIndex}</span>
                {" – "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">{endIndex}</span>
                {" "}{t("notifications.pagination.of", "of")}{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">{totalFiltered}</span>
                {totalFiltered !== totalAll && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {" "}({t("notifications.pagination.filteredFrom", "filtered from")} {totalAll})
                  </span>
                )}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-600 dark:text-gray-300"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
                  </button>

                  {/* Sliding window of page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if      (totalPages <= 5)          page = i + 1;
                    else if (safePage  <= 3)            page = i + 1;
                    else if (safePage  >= totalPages - 2) page = totalPages - 4 + i;
                    else                                page = safePage - 2 + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          page === safePage
                            ? "bg-green-600 text-white"
                            : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-600 dark:text-gray-300"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <SendNotificationModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={sendNotification}
        users={users}
        roles={roles}
        t={t}
      />

      <NotificationDetailModal
        notification={detailNotification}
        onClose={() => setDetailNotification(null)}
        onMarkRead={markAsRead}
        onDelete={deleteNotification}
        isAdmin={isAdmin}
        keyword={searchKeyword}
        t={t}
      />
    </div>
  );
}