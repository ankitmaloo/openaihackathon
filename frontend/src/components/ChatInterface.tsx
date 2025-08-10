import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Paperclip, 
  Search, 
  Mic, 
  Send, 
  Sparkles, 
  PenTool, 
  Target, 
  Lightbulb, 
  MessageCircle,
  MoreHorizontal 
} from "lucide-react";
import { TypewriterText } from "./TypewriterText";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const suggestions = [
    { icon: MoreHorizontal, text: "More", color: "from-gray-500 to-slate-500" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateFakeResponse(),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 1000);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  const generateFakeResponse = () => {
    const responses = [
      "This is a comprehensive response to your question. I'll break this down into several key points that will help you understand the topic better. First, let's consider the fundamental aspects of what you're asking about. The complexity of this subject requires us to examine multiple perspectives and approaches. From a practical standpoint, there are several strategies you can implement immediately. Additionally, it's important to consider the long-term implications of these decisions. Research has shown that taking a methodical approach often yields the best results. Furthermore, industry experts recommend considering various factors before making final decisions. The implementation process typically involves several phases, each building upon the previous one. It's also worth noting that continuous evaluation and adjustment are crucial for success.",
      "Great question! Let me provide you with a detailed explanation that covers all the important aspects. The topic you've raised touches on several interconnected concepts that are worth exploring in depth. From my analysis, there are three main categories we should focus on. Each category has its own set of considerations and potential outcomes. The first category involves understanding the foundational principles. These principles serve as the building blocks for everything else we'll discuss. The second category deals with practical applications and real-world scenarios. Here, we can see how theory translates into actionable strategies. The third category encompasses advanced techniques and optimization methods. These are particularly useful for those looking to achieve exceptional results.",
      "I'd be happy to help you with this! This is actually a fascinating area with many different approaches and perspectives. Let me walk you through the most effective methods and best practices. Starting with the basics, it's essential to establish a solid foundation. This foundation will support all subsequent efforts and improvements. Moving forward, we can explore more advanced concepts and techniques. Many professionals in this field recommend starting with small, manageable steps. This approach allows for continuous learning and adaptation. As you progress, you'll likely discover new opportunities and possibilities. The key is to maintain flexibility while staying focused on your primary objectives. Success in this area often requires patience, persistence, and continuous improvement."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const isEmpty = messages.length === 0;

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

      <div className="p-4 text-center text-sm text-muted-foreground">
        By messaging ChatGPT, you agree to our{" "}
        <button className="underline hover:text-foreground transition-colors">Terms</button>
        {" "}and have read our{" "}
        <button className="underline hover:text-foreground transition-colors">Privacy Policy</button>.
      </div>
    </div>
  );
};