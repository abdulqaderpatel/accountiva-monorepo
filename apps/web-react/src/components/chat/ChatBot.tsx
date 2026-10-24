import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  PieChart,
  AlertTriangle,
  Users,
  Wallet,
  FileCheck,
  FileText,
  Paperclip,
  UploadCloud,
  ChevronDown,
  ArrowUpRight,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@accountiva/shared";
import { toast } from "sonner";
import api from "@/lib/api";
import aiMascotSrc from "@/assets/ai-mascot.png";

interface AttachmentFile {
  id: string;
  name: string;
  type: "image" | "pdf";
  mimeType: string;
  size: number;
  previewUrl: string;
  base64Data: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: any[];
  dataType?: string;
  attachments?: { name: string; type: "image" | "pdf"; previewUrl: string }[];
}

const suggestions = [
  { label: "Financial Summary", icon: PieChart },
  { label: "Overdue Invoices", icon: AlertTriangle },
  { label: "Top Customers", icon: Users },
  { label: "Unpaid Balance", icon: Wallet },
  { label: "Recent Estimates", icon: FileCheck },
];

export function ChatBot() {
  const { isAuthenticated, currentOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Multi-modal upload state
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const pathname = location.pathname;
  const showChatbot =
    isAuthenticated &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/public/invoices") &&
    !pathname.startsWith("/invoices/view");

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  const fetchHistory = async () => {
    const currentOrgId = currentOrganization?.id;
    if (!currentOrgId) return;

    try {
      const response = await api.get(`/chat/history/${currentOrgId}`);
      const historyMessages = (response.data || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        data: Array.isArray(msg.data) ? msg.data : msg.data ? [msg.data] : undefined,
        dataType: msg.data_type,
        timestamp: new Date(msg.created_at || Date.now()),
      }));

      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm your Accountiva Assistant. How can I help you today? You can ask me questions or upload receipts & invoices (Images or PDFs) for me to analyze.",
          timestamp: new Date(),
          dataType: "none",
        },
        ...historyMessages,
      ]);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  useEffect(() => {
    if (showChatbot && currentOrganization?.id) {
      void fetchHistory();
    }
  }, [showChatbot, currentOrganization?.id]);

  const truncateFileName = (fileName: string, maxLength = 14) => {
    if (fileName.length <= maxLength) return fileName;
    const extIndex = fileName.lastIndexOf(".");
    if (extIndex !== -1 && fileName.length - extIndex <= 5) {
      const ext = fileName.substring(extIndex);
      const base = fileName.substring(0, maxLength - ext.length - 3);
      return `${base}...${ext}`;
    }
    return `${fileName.substring(0, maxLength - 3)}...`;
  };

  const processFile = (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("Invalid file format", {
        description: "Please upload images (.png, .jpg, .jpeg) or documents (.pdf).",
      });
      return;
    }

    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      toast.error("File size limit exceeded", {
        description: `File "${file.name}" exceeds the 10MB limit.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const isPdf = file.type.toLowerCase() === "application/pdf";
      setAttachments((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          type: isPdf ? "pdf" : "image",
          mimeType: file.type,
          size: file.size,
          previewUrl: isPdf ? "" : base64Data,
          base64Data,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      Array.from(event.target.files).forEach((file) => processFile(file));
      event.target.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const rawMessage = overrideMessage ?? message;
    const hasText = rawMessage.trim().length > 0;
    const hasAttachments = attachments.length > 0;

    if ((!hasText && !hasAttachments) || isLoading) return;

    const userMessage = rawMessage.trim();
    const currentAttachments = [...attachments];

    // Push user message to UI state
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage || `[Uploaded ${currentAttachments.length} file(s)]`,
        attachments: currentAttachments.map((a) => ({
          name: a.name,
          type: a.type,
          previewUrl: a.previewUrl,
        })),
        timestamp: new Date(),
      },
    ]);

    const currentOrgId = currentOrganization?.id;
    if (!currentOrgId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please select an organization first to use the assistant.",
          timestamp: new Date(),
        },
      ]);
      setMessage("");
      setAttachments([]);
      return;
    }

    // Get chat history BEFORE the new message
    const chatHistory = messages.slice(-7).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessage("");
    setAttachments([]);
    scrollToBottom();

    setIsLoading(true);
    try {
      const payloadAttachments = currentAttachments.map((att) => ({
        name: att.name,
        mimeType: att.mimeType,
        data: att.base64Data,
      }));

      const response = await api.post("/chat", {
        message: userMessage,
        organizationId: currentOrgId,
        history: chatHistory,
        attachments: payloadAttachments,
      });

      if (response.data?.actionExecuted) {
        const dt = (response.data.dataType || "").toLowerCase();
        if (dt.includes("invoice")) {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          toast.success("Invoices Created", {
            description: "Accountiva AI created the invoices and refreshed your table.",
          });
        } else if (dt.includes("expense")) {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          toast.success("Expense Recorded", {
            description: "Accountiva AI logged the expense and refreshed your records.",
          });
        } else if (dt.includes("customer")) {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          toast.success("Customer Added", {
            description: "Accountiva AI saved the customer profile.",
          });
        } else {
          queryClient.invalidateQueries();
          toast.success("Action Executed", {
            description: "Accountiva AI performed the requested database action.",
          });
        }
      }

      const normalizedData = Array.isArray(response.data?.data)
        ? response.data.data
        : response.data?.data
        ? [response.data.data]
        : undefined;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data?.message || "Action processed successfully.",
          data: normalizedData,
          dataType: response.data?.dataType,
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error.response?.data?.error ||
            "I'm sorry, I'm having trouble connecting to my brain right now.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSuggestion = (label: string) => {
    void handleSend(label);
  };

  const toggleChat = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) scrollToBottom();
      return next;
    });
  };

  if (!showChatbot) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-6 z-[100] flex flex-col items-end gap-4 print:hidden">
      {/* Chat Window */}
      {isOpen && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative w-[420px] max-w-[calc(100vw-3rem)] h-[620px] max-h-[calc(100vh-10rem)] bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col mb-2 animate-in fade-in-0 zoom-in-95 duration-200"
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-card/95 border-2 border-dashed border-primary rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in zoom-in duration-150">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
                <UploadCloud className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Drop Document / Receipt
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload images (.png, .jpg) or PDFs up to 10MB
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-5 bg-primary/5 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-card flex items-center justify-center border border-border/80 shadow-xs relative shrink-0">
                <img
                  src={aiMascotSrc}
                  alt="Accountiva AI Mascot"
                  className="size-8 object-contain pointer-events-none select-none"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500 ring-2 ring-card" />
                </span>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  Accountiva AI
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-black border border-primary/20">
                    BETA
                  </span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-bold">
                  Your accounting & receipt assistant
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="size-8 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Chat Messages Area */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar scroll-smooth"
          >
            {/* Welcome Banner */}
            {messages.length <= 1 && (
              <div className="text-center py-4 px-3 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col items-center space-y-2 mb-2">
                <div className="size-16 rounded-2xl bg-card p-2 border border-border shadow-md flex items-center justify-center relative shrink-0">
                  <img
                    src={aiMascotSrc}
                    alt="Accountiva AI Mascot"
                    className="size-12 object-contain pointer-events-none select-none"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5">
                    <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-3.5 bg-emerald-500 ring-2 ring-card" />
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Meet Your AI Assistant
                  </h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                    Ask questions about your finances, generate invoices, or drag & drop receipts to parse automatically.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.role === "assistant"
                      ? "bg-card border-border/80 p-1 shadow-2xs"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <img
                      src={aiMascotSrc}
                      alt="Accountiva AI"
                      className="size-6 object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <User className="size-4" />
                  )}
                </div>

                <div
                  className={`space-y-2 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}
                >
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end mb-1">
                      {msg.attachments.map((att, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-center gap-2 p-1.5 rounded-xl bg-card border border-border/80 text-xs shadow-xs"
                        >
                          {att.type === "image" && att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt="Upload preview"
                              className="w-8 h-8 rounded-lg object-cover border border-border/50"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-foreground truncate max-w-[100px]">
                            {truncateFileName(att.name)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-xs whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-muted/50 border border-border text-foreground rounded-tl-none text-left"
                        : "bg-primary text-primary-foreground rounded-tr-none font-semibold text-left"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Structured Data Queries */}
                  {msg.data && msg.data.length > 0 && (
                    <div className="mt-3 space-y-2 text-left">
                      {/* Financial Summary */}
                      {msg.dataType === "financial_summary" ? (
                        <div className="grid grid-cols-1 gap-2">
                          {msg.data.map((item: any) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between"
                            >
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                {item.name}
                              </span>
                              <span
                                className={`text-xs font-black font-mono ${
                                  item.id === "profit"
                                    ? item.amount >= 0
                                      ? "text-emerald-500"
                                      : "text-rose-500"
                                    : item.id === "revenue"
                                    ? "text-emerald-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Record cards list */
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                          {msg.data.map((item: any, dIdx: number) => (
                            <div
                              key={dIdx}
                              className="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-colors text-xs space-y-1.5 shadow-2xs group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="font-bold text-foreground truncate">
                                    {item.invoiceNumber ||
                                      item.invoice_number ||
                                      item.name ||
                                      item.estimate_number ||
                                      item.description ||
                                      "Record"}
                                  </span>
                                </div>
                                {(item.amount !== undefined || item.total !== undefined) && (
                                  <span className="font-black text-primary shrink-0 font-mono">
                                    {formatCurrency(item.amount ?? item.total)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="truncate max-w-[170px] font-medium">
                                  {item.customerName ||
                                    item.customers?.name ||
                                    item.company ||
                                    item.category ||
                                    ""}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.status && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-muted font-bold text-foreground">
                                      {item.status}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      void navigate({ to: "/invoices" });
                                    }}
                                    className="p-1 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center cursor-pointer"
                                    title="Open Invoices"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="size-8 rounded-xl bg-card border border-border/80 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src={aiMascotSrc}
                    alt="Accountiva AI"
                    className="size-6 object-contain animate-pulse pointer-events-none select-none"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border rounded-tl-none flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs font-bold text-muted-foreground ml-1">
                    Analyzing...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="p-4 bg-muted/30 border-t border-border space-y-3 shrink-0">
            {/* Quick Suggestions */}
            {messages.length < 4 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => {
                  const Icon = sug.icon;
                  return (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => handleSuggestion(sug.label)}
                      className="px-2.5 py-1 rounded-lg bg-card border border-border text-[10px] font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Icon className="w-3 h-3" />
                      {sug.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-card border border-border text-xs shadow-xs"
                  >
                    {att.type === "image" && att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt="Attachment preview"
                        className="w-7 h-7 rounded-lg object-cover border border-border/50"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-foreground truncate max-w-[110px]">
                      {truncateFileName(att.name)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="w-4 h-4 rounded-full bg-muted hover:bg-destructive/20 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".png,.jpg,.jpeg,.pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="relative flex items-center gap-2"
            >
              <button
                type="button"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image or PDF receipt"
                className="size-11 rounded-2xl border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Paperclip className="size-4" />
              </button>

              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything or attach a receipt..."
                disabled={isLoading}
                className="pr-12 h-11 rounded-2xl border-border/50 bg-card focus:ring-primary/20 focus:border-primary transition-all text-xs font-medium flex-1"
              />

              <button
                type="submit"
                disabled={(!message.trim() && attachments.length === 0) || isLoading}
                className="absolute right-1 top-1 size-9 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all bg-primary text-primary-foreground shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Mascot Button */}
      <button
        type="button"
        onClick={toggleChat}
        className="size-14 rounded-2xl flex items-center justify-center p-0 hover:scale-[1.05] active:scale-[0.95] transition-all group bg-card border border-border/80 shadow-xl relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Toggle Accountiva AI Assistant"
      >
        {!isOpen ? (
          <div className="size-full flex items-center justify-center relative">
            <img
              src={aiMascotSrc}
              alt="Accountiva AI Mascot"
              className="size-10 object-contain relative z-10 drop-shadow-xs group-hover:scale-110 transition-transform duration-200 pointer-events-none select-none"
            />
            <span className="absolute top-1.5 right-1.5 flex size-3 z-20 pointer-events-none">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-emerald-500 ring-2 ring-card" />
            </span>
          </div>
        ) : (
          <ChevronDown className="size-6 relative z-10 text-foreground" />
        )}
      </button>
    </div>
  );
}

export default ChatBot;

