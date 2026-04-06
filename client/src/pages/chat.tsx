import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles, User, Code, FileCode, Brain, BookOpen, Scale, Wand2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { grudgeGameApi } from "@/lib/grudgeBackendApi";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, ChatConversation } from "@shared/schema";

type AITool = 'chat' | 'code-review' | 'code-generate' | 'lore' | 'balance';

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [aiTool, setAiTool] = useState<AITool>('chat');
  const [aiResults, setAiResults] = useState<Array<{ tool: string; result: any; ts: number }>>([]);
  const { toast } = useToast();

  const { data: conversation, isLoading: isLoadingConversation } = useQuery<ChatConversation>({
    queryKey: ["/api/conversations", currentConversationId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${currentConversationId}`);
      if (!response.ok) throw new Error("Failed to fetch conversation");
      return response.json();
    },
    enabled: !!currentConversationId,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!currentConversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      let conversationId = currentConversationId;
      
      if (!conversationId) {
        const res = await apiRequest("POST", "/api/conversations", {
          title: "New Chat",
          projectId: null,
        });
        const newConversation: ChatConversation = await res.json();
        conversationId = newConversation.id;
        setCurrentConversationId(conversationId);
      }
      
      return apiRequest("POST", "/api/messages", {
        conversationId,
        role: "user",
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversationId, "messages"] });
      setMessage("");
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Grudge AI tool mutations
  const aiCodeReview = useMutation({
    mutationFn: (code: string) => grudgeGameApi.aiCodeReview(code),
    onSuccess: (data) => { if (data) setAiResults(prev => [...prev, { tool: 'Code Review', result: data, ts: Date.now() }]); },
    onError: () => toast({ variant: 'destructive', title: 'AI Error', description: 'Code review failed' }),
  });

  const aiCodeGenerate = useMutation({
    mutationFn: (desc: string) => grudgeGameApi.aiCodeGenerate(desc),
    onSuccess: (data) => { if (data) setAiResults(prev => [...prev, { tool: 'Code Generate', result: data, ts: Date.now() }]); },
    onError: () => toast({ variant: 'destructive', title: 'AI Error', description: 'Code generation failed' }),
  });

  const aiLore = useMutation({
    mutationFn: (context: string) => grudgeGameApi.aiLoreGenerate('story', context),
    onSuccess: (data) => { if (data) setAiResults(prev => [...prev, { tool: 'Lore', result: data, ts: Date.now() }]); },
    onError: () => toast({ variant: 'destructive', title: 'AI Error', description: 'Lore generation failed' }),
  });

  const aiBalance = useMutation({
    mutationFn: (area: string) => grudgeGameApi.aiBalanceAnalyze(area),
    onSuccess: (data) => { if (data) setAiResults(prev => [...prev, { tool: 'Balance', result: data, ts: Date.now() }]); },
    onError: () => toast({ variant: 'destructive', title: 'AI Error', description: 'Balance analysis failed' }),
  });

  const handleAiSend = () => {
    const text = message.trim();
    if (!text) return;
    switch (aiTool) {
      case 'code-review': aiCodeReview.mutate(text); break;
      case 'code-generate': aiCodeGenerate.mutate(text); break;
      case 'lore': aiLore.mutate(text); break;
      case 'balance': aiBalance.mutate(text); break;
      default: handleSend(); return;
    }
    setMessage('');
  };

  const isAiPending = aiCodeReview.isPending || aiCodeGenerate.isPending || aiLore.isPending || aiBalance.isPending;

  const handleNewChat = async () => {
    const res = await apiRequest("POST", "/api/conversations", {
      title: "New Chat",
      projectId: null,
    });
    const newConversation: ChatConversation = await res.json();
    setCurrentConversationId(newConversation.id);
    setMessage("");
    setAiResults([]);
  };

  return (
    <div className="relative flex h-full flex-col">
      <div 
        className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-yellow-900/10 pointer-events-none"
      />
      <div className="relative z-10 flex h-full flex-col">
      <div className="border-b p-4 bg-[#171312]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              AI Game Development Assistant
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Get help creating 2D and 3D games with GrudgeDevelop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewChat} data-testid="button-new-chat">
              <Sparkles className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {!currentConversationId && !isLoadingMessages && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Welcome to GrudgeDevelop AI Assistant</h2>
              <p className="mb-6 max-w-md text-muted-foreground">
                I can help you create amazing games, suggest features, generate game logic,
                and guide you through using GrudgeDevelop's powerful tools.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-suggestion-1">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Code className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Create a platformer</h3>
                  <p className="text-xs text-muted-foreground">
                    Get started with a 2D platformer game
                  </p>
                </Card>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-suggestion-2">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileCode className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Add enemy AI</h3>
                  <p className="text-xs text-muted-foreground">
                    Learn how to create intelligent enemies
                  </p>
                </Card>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-suggestion-3">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Browse assets</h3>
                  <p className="text-xs text-muted-foreground">
                    Find free sprites and sounds
                  </p>
                </Card>
              </div>
            </div>
          )}

          {isLoadingMessages && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <Card className={`max-w-2xl p-4 ${msg.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </Card>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Grudge AI tool results */}
          {aiResults.map((r) => (
            <div key={r.ts} className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <Card className="max-w-2xl p-4">
                <Badge variant="outline" className="mb-2">{r.tool}</Badge>
                {r.result.code && <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-60">{r.result.code}</pre>}
                {r.result.explanation && <p className="text-sm mt-1">{r.result.explanation}</p>}
                {r.result.review && <p className="text-sm">{r.result.review}</p>}
                {r.result.content && <p className="text-sm">{r.result.content}</p>}
                {r.result.analysis && <p className="text-sm">{r.result.analysis}</p>}
                {r.result.suggestions && r.result.suggestions.length > 0 && (
                  <ul className="text-xs mt-1 list-disc list-inside text-muted-foreground">
                    {r.result.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{r.result.provider}/{r.result.model}</p>
              </Card>
            </div>
          ))}

          {(sendMessageMutation.isPending || isAiPending) && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground animate-pulse" />
              </div>
              <Card className="max-w-2xl p-4">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-[#171312]">
        <div className="mx-auto max-w-4xl">
          {/* AI tool selector */}
          <div className="flex items-center gap-2 mb-2">
            <Select value={aiTool} onValueChange={(v: AITool) => setAiTool(v)}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat"><span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Chat</span></SelectItem>
                <SelectItem value="code-review"><span className="flex items-center gap-1"><Code className="h-3 w-3" /> Code Review</span></SelectItem>
                <SelectItem value="code-generate"><span className="flex items-center gap-1"><Wand2 className="h-3 w-3" /> Code Generate</span></SelectItem>
                <SelectItem value="lore"><span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Lore Writer</span></SelectItem>
                <SelectItem value="balance"><span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Balance Analyzer</span></SelectItem>
              </SelectContent>
            </Select>
            {aiTool !== 'chat' && <Badge variant="secondary" className="text-xs">Grudge AI</Badge>}
          </div>
          <div className="flex items-end gap-3">
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={aiTool === 'chat' ? handleSend : handleAiSend}
              disabled={!message.trim() || sendMessageMutation.isPending || isAiPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiTool === 'chat' ? handleSend() : handleAiSend(); } }}
              placeholder={aiTool === 'chat' ? 'Ask me anything about game development...' : aiTool === 'code-review' ? 'Paste code to review...' : aiTool === 'code-generate' ? 'Describe what code to generate...' : aiTool === 'lore' ? 'Describe lore context...' : 'Describe game area to balance...'}
              className="min-h-10 max-h-32 resize-none flex-1 bg-[#1c1919]"
              data-testid="input-chat-message"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Powered by AI. Responses may not always be accurate.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
