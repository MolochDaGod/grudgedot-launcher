import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles, User, Code, FileCode, Brain, BookOpen, Scale, Wand2, Sword, Zap, Shield, Scroll } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { grudgeGameApi } from "@/lib/grudgeBackendApi";
import { useToast } from "@/hooks/use-toast";
import { useCharacter, CLASS_COLOR } from "@/contexts/CharacterContext";
import { PayGate } from "@/components/PayGate";
import type { ChatMessage, ChatConversation } from "@shared/schema";

type AITool = 'chat' | 'code-review' | 'code-generate' | 'lore' | 'balance';

// Context-aware suggestions per class
const CLASS_SUGGESTIONS: Record<string, Array<{ icon: any; title: string; prompt: string }>> = {
  warrior: [
    { icon: Shield, title: 'Warrior combo system', prompt: 'Help me design a combo attack system for a warrior class with shield parry mechanics' },
    { icon: Sword, title: 'Stamina mechanic', prompt: 'How should I implement a stamina bar that fills from parries and blocks?' },
    { icon: Zap, title: 'AoE charge attack', prompt: 'Design an AoE charge attack that provides group invincibility briefly' },
  ],
  mage: [
    { icon: Sparkles, title: 'Spell combo system', prompt: 'Design a spell combo system with elemental synergies for a mage character' },
    { icon: Zap, title: 'Teleport blocks', prompt: 'How do I implement placeable teleport blocks limited to 10 per player?' },
    { icon: Wand2, title: 'Mana regeneration', prompt: 'Create a mana regen system tied to ability usage and cooldowns' },
  ],
  ranger: [
    { icon: Crosshair, title: 'Parry counter system', prompt: 'Implement a RMB+LMB parry that allows a 0.5s counter window with dash attack' },
    { icon: Zap, title: 'Archery arc prediction', prompt: 'Help design arrow arc prediction with wind and gravity effects' },
    { icon: Sword, title: 'Dual wield daggers', prompt: 'Create fluid dual-dagger animations with attack combo chaining' },
  ],
  worge: [
    { icon: Shield, title: 'Form switching', prompt: 'Design a form-switching mechanic: Bear (tank), Raptor (stealth), Bird (flight)' },
    { icon: Sparkles, title: 'Raptor stealth', prompt: 'Implement rogue-like stealth mode for the Raptor form with detection range' },
    { icon: Zap, title: 'Bird mount system', prompt: 'Create a large bird form that AI companions can mount as passengers' },
  ],
};

const DEFAULT_SUGGESTIONS = [
  { icon: Code, title: 'Create a platformer', prompt: 'Help me create a 2D platformer with Grudge Warlords character mechanics' },
  { icon: FileCode, title: 'Enemy AI behavior', prompt: 'How do I create faction-based enemy AI that reacts to player class?' },
  { icon: Scroll, title: 'Game lore', prompt: 'Write lore for my Grudge Warlords character and their faction backstory' },
];

function Crosshair({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [aiTool, setAiTool] = useState<AITool>('chat');
  const [aiResults, setAiResults] = useState<Array<{ tool: string; result: any; ts: number }>>([]);
  const { toast } = useToast();
  const { activeCharacter } = useCharacter();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build character context for AI system prompt
  const charContext = activeCharacter
    ? `Active character: ${activeCharacter.name} — ${activeCharacter.race} ${activeCharacter.class}, Level ${activeCharacter.level}, Faction: ${activeCharacter.faction || 'none'}. Gold: ${activeCharacter.gold}.`
    : null;

  const suggestions = activeCharacter
    ? (CLASS_SUGGESTIONS[activeCharacter.class?.toLowerCase()] || DEFAULT_SUGGESTIONS)
    : DEFAULT_SUGGESTIONS;

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

  // Scroll to bottom when messages or AI results update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiResults]);

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
        content: charContext ? `[Context: ${charContext}]\n\n${content}` : content,
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
      <div className="border-b px-4 py-3 bg-[#171312] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ fontFamily: 'Cinzel, serif' }}>
              Battle Station
            </h1>
            <p className="text-[11px] text-muted-foreground">
              AI-powered game dev assistant
            </p>
          </div>
          {/* Active character context pill */}
          {activeCharacter && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border"
              style={{
                borderColor: (CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706') + '44',
                background: (CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706') + '11',
                color: CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706',
              }}>
              <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center font-bold text-white text-[8px]"
                style={{ background: CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706' }}>
                {activeCharacter.name[0]}
              </div>
              <span className="font-semibold">{activeCharacter.name}</span>
              <span className="opacity-60">Lv{activeCharacter.level} {activeCharacter.class}</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat} data-testid="button-new-chat" className="flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {!currentConversationId && !isLoadingMessages && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              {/* Logo mark */}
              <div className="mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-700/10 border border-amber-700/30 flex items-center justify-center">
                <Brain className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="mb-1 text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                {activeCharacter ? `Welcome back, ${activeCharacter.name}` : 'Grudge Studio AI'}
              </h2>
              <p className="mb-6 max-w-md text-xs text-muted-foreground">
                {activeCharacter
                  ? `Your ${activeCharacter.race} ${activeCharacter.class} is ready. Ask me anything about ${activeCharacter.class} skills, faction lore, crafting, or game mechanics.`
                  : 'AI-powered game development for Grudge Warlords. Ask me about mechanics, lore, code, or builds.'}
              </p>
              {/* Character-aware suggestion chips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
                {suggestions.map((s, i) => (
                  <Card
                    key={i}
                    className="p-4 cursor-pointer hover:border-amber-700/40 transition-all hover:bg-amber-950/10"
                    data-testid={`card-suggestion-${i + 1}`}
                    onClick={() => setMessage(s.prompt)}
                  >
                    <div
                      className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"
                      style={{ background: activeCharacter ? (CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706') + '20' : undefined }}>
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</p>
                  </Card>
                ))}
              </div>

              {/* Advanced tools teaser */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[{ icon: Code, label: 'Code Review', tier: 'member' }, { icon: Scroll, label: 'Lore Writer', tier: 'member' }, { icon: Scale, label: 'Balance Analyzer', tier: 'member' }].map(t => (
                  <button key={t.label} onClick={() => setAiTool(t.tier === 'member' ? t.label.toLowerCase().replace(' ', '-') as AITool : 'chat')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-muted/20 text-xs text-muted-foreground hover:border-amber-700/40 hover:text-amber-400 transition-colors">
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
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

          {/* Scroll anchor */}
          <div ref={scrollRef} />

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
          {/* AI tool selector — advanced tools are pay-gated */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Select value={aiTool} onValueChange={(v: AITool) => setAiTool(v)}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat"><span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Chat</span></SelectItem>
                <SelectItem value="code-review"><span className="flex items-center gap-1"><Code className="h-3 w-3" /> Code Review • Member</span></SelectItem>
                <SelectItem value="code-generate"><span className="flex items-center gap-1"><Wand2 className="h-3 w-3" /> Code Generate • Member</span></SelectItem>
                <SelectItem value="lore"><span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Lore Writer • Member</span></SelectItem>
                <SelectItem value="balance"><span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Balance Analyzer • Member</span></SelectItem>
              </SelectContent>
            </Select>
            {aiTool !== 'chat' && (
              <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-600/30">Member</Badge>
            )}
            {charContext && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground hidden sm:flex">
                Context: {activeCharacter?.name}
              </Badge>
            )}
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
