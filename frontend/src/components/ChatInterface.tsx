import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Search, Mic, Send } from "lucide-react";
import { TypewriterText } from "./TypewriterText";
import { initFirebase, onDocumentChange } from "@/lib/firebase";
import { startConversation } from "@/lib/api";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface LogItem {
  id: string;
  text: string;
  actor?: string;
  level?: "info" | "warn" | "error" | "action";
  timestamp: Date;
}

type ChatInterfaceProps = {
  docId?: string;
};

export const ChatInterface = ({ docId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setA2aTick] = useState(0);
  const [, setHistoryTick] = useState(0);
  const [internalDocId, setInternalDocId] = useState<string | undefined>('OdCm18FwSOGNjZYhmG2l');
  const [logsMain, setLogsMain] = useState<LogItem[]>([]);
  const [logsHistory, setLogsHistory] = useState<LogItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    const prompt = input;
    setInput("");

    try {
      const res = await startConversation(prompt);
      setInternalDocId(res.conversation_id);
    } catch (err) {
      console.error('Failed to start conversation', err);
      setIsGenerating(false);
    }
  };

  const allLogs: LogItem[] = [...logsMain, ...logsHistory].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Backend integration: start conversation and listen for updates
  const effectiveDocId = docId ?? internalDocId;

  const isEmpty = messages.length === 0;

  // Firestore listeners: a2a/{docId} and a2a/{docId}/history/{docId}
  useEffect(() => {
    if (!effectiveDocId) return; // no-op until a docId is provided
    try {
      initFirebase();
    } catch (e) {
      // Credentials/config not provided yet; skip wiring listeners.
      return;
    }

    const unsubs: Array<() => void> = [];

    // Helper to map backend conversation_history to UI messages
    const extractText = (content: any): string => {
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        // Join known content parts with text fields
        return content
          .map((part: any) => (typeof part === 'string' ? part : String(part?.text ?? '')))
          .filter(Boolean)
          .join('\n');
      }
      if (content && typeof content === 'object') {
        if (typeof content.text === 'string') return content.text;
      }
      return '';
    };

    // Top-level doc listener
    unsubs.push(
      onDocumentChange(`a2a/${effectiveDocId}`, (snap) => {
        setA2aTick((t) => t + 1);
        // Backend root doc holds metadata; do not expect messages here.
        // Keep this listener lightweight in case status is needed later.
        setIsGenerating(false);
      })
    );

    // Subcollection doc listener — primary source for conversation items
    unsubs.push(
      onDocumentChange(`a2a/${effectiveDocId}/history/${effectiveDocId}`, (snap) => {
        setHistoryTick((t) => t + 1);
        const data = snap.data() as any;
        const items: any[] = Array.isArray(data?.conversation_history)
          ? data.conversation_history
          : [];

        // Build log entries from agent-to-agent conversation; skip the first element
        const agentItems = items.slice(1);
        const nextLogs: LogItem[] = [];
        agentItems.forEach((m: any, idx: number) => {
          const text = extractText(m?.content ?? m?.text ?? m);
          if (!text) return;
          const actor = m?.source ?? m?.agent ?? m?.role ?? 'agent';
          nextLogs.push({
            id: String(m?.id ?? `${snap.id}-h-log-${idx}`),
            text,
            actor,
            level: 'info',
            timestamp: new Date(),
          });
        });
        setLogsHistory(nextLogs);
        setIsGenerating(false);
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [effectiveDocId]);

  // handleSubmit performs the start call and listeners above respond to updates

  return (
    <div className="flex-1 flex flex-col">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-12 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text">
              AI for procurement
            </h1>
            </div>

          <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-8">
            <div className="relative group">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything"
                className="w-full h-14 pl-6 pr-32 text-lg bg-background/50 backdrop-blur-sm border-2 border-border/50 rounded-2xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 group-hover:border-border/80"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                {input.trim() && (
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>

          
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-accent text-accent-foreground mr-12'
                    } animate-in slide-in-from-bottom-2 duration-300`}
                  >
                    {message.isUser ? (
                      <p>{message.content}</p>
                    ) : (
                      <TypewriterText text={message.content} />
                    )}
                  </div>
                </div>
              ))}
              {allLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Agent Log</div>
                  {allLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{log.actor ?? 'agent'}</span>
                        <span className="opacity-70">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap font-mono">{log.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-accent text-accent-foreground rounded-2xl px-4 py-3 mr-12">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border/50">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="relative group">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  disabled={isGenerating}
                  className="w-full h-12 pl-6 pr-32 bg-background/50 backdrop-blur-sm border-2 border-border/50 rounded-2xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 group-hover:border-border/80"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                    disabled={isGenerating}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  {input.trim() && !isGenerating && (
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
};
