import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bot, Send, User, RotateCcw, Calculator, ChevronRight, HelpCircle } from 'lucide-react';
import GeometryCanvas from './components/GeometryCanvas';
import FormulaDisplay from './components/FormulaDisplay';
import { initializeChat, sendMessageToTutor } from './services/geminiService';
import { TriangleState, ComputedGeometry, ChatMessage, GeometryMode, Point } from './types';

// Initial state helpers
const INITIAL_TRIANGLE: TriangleState = {
  A: { x: 100, y: 300 },
  B: { x: 500, y: 300 },
  C: { x: 300, y: 100 }, // Isosceles-ish
};

const distance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const calculateGeometry = (t: TriangleState): ComputedGeometry => {
  // Scale factor: pixels to "units" (e.g., 50px = 1 unit)
  const SCALE = 50; 
  
  const a = distance(t.B, t.C) / SCALE;
  const b = distance(t.A, t.C) / SCALE;
  const c = distance(t.A, t.B) / SCALE;

  // Law of Cosines to find angles (radians)
  const angleA_rad = Math.acos((b*b + c*c - a*a) / (2*b*c));
  const angleB_rad = Math.acos((a*a + c*c - b*b) / (2*a*c));
  const angleC_rad = Math.acos((a*a + b*b - c*c) / (2*a*b));

  const toDeg = (rad: number) => rad * (180 / Math.PI);

  return {
    sideA: a,
    sideB: b,
    sideC: c,
    angleA: isNaN(angleA_rad) ? 0 : toDeg(angleA_rad),
    angleB: isNaN(angleB_rad) ? 0 : toDeg(angleB_rad),
    angleC: isNaN(angleC_rad) ? 0 : toDeg(angleC_rad),
  };
};

export default function App() {
  const [triangle, setTriangle] = useState<TriangleState>(INITIAL_TRIANGLE);
  const [mode, setMode] = useState<GeometryMode>(GeometryMode.FREE);
  const [computed, setComputed] = useState<ComputedGeometry>(calculateGeometry(INITIAL_TRIANGLE));
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: "Hi! I'm GeoGenius. Try dragging the points on the triangle. Notice how the Law of Cosines equation changes below. Ask me anything!" 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update computed geometry when triangle changes
  useEffect(() => {
    setComputed(calculateGeometry(triangle));
  }, [triangle]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Preset Modes
  const setPreset = (m: GeometryMode) => {
    setMode(m);
    if (m === GeometryMode.RIGHT_ANGLE) {
      setTriangle({
        A: { x: 100, y: 350 },
        B: { x: 500, y: 350 },
        C: { x: 500, y: 150 }, // Right angle at B? No, let's make it standard C=90 roughly
      });
      // Actually, let's make C the top point, so let's make C 90 deg
      // A(100, 350), B(500, 350). Mid x=300. 
      // C needs to be satisfying pythagoras projected? 
      // Simple Right Triangle:
      setTriangle({
        A: { x: 150, y: 350 },
        B: { x: 450, y: 350 },
        C: { x: 150, y: 100 }, // Vertical line AC, Horizontal AB? No A is corner.
      });
    } else if (m === GeometryMode.EQUILATERAL) {
      setTriangle({
        A: { x: 150, y: 350 },
        B: { x: 450, y: 350 },
        C: { x: 300, y: 350 - (300 * Math.sin(Math.PI/3)) },
      });
    } else {
      setTriangle(INITIAL_TRIANGLE);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await sendMessageToTutor(userMsg.text, computed);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  // Render text with latex support (simple parser for this demo)
  const renderMessageText = (text: string) => {
    // Split by $ to find latex segments
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            return <FormulaDisplay key={i} latex={part.slice(1, -1)} className="text-indigo-600 font-medium" />;
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-slate-50">
      
      {/* LEFT PANEL: Interactive Geometry */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-full p-4 gap-4 overflow-y-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Calculator className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Law of Cosines Explorer</h1>
              <p className="text-xs text-slate-500 font-medium">Interactive Proof Visualization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPreset(GeometryMode.FREE)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === GeometryMode.FREE ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Free
            </button>
            <button 
               onClick={() => setPreset(GeometryMode.RIGHT_ANGLE)}
               className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === GeometryMode.RIGHT_ANGLE ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Right Triangle
            </button>
             <button 
               onClick={() => setPreset(GeometryMode.EQUILATERAL)}
               className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === GeometryMode.EQUILATERAL ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Equilateral
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 min-h-[300px] relative">
          <GeometryCanvas 
            width={800} // Viewbox width, not css
            height={500}
            triangle={triangle}
            onTriangleChange={setTriangle}
            computed={computed}
            mode={mode}
          />
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-500">
            Drag vertices A, B, or C to explore
          </div>
        </div>

        {/* Formula Dashboard */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-800">Live Calculation</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* The Main Formula */}
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-indigo-600 mb-2 font-semibold tracking-wide uppercase">Law of Cosines (Side c)</p>
              <FormulaDisplay 
                latex={`c^2 = a^2 + b^2 - 2ab \\cos(C)`} 
                block 
                className="text-2xl text-indigo-900"
              />
            </div>

            {/* Substitution Step */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                <span>Substitute Values:</span>
              </div>
              
              <div className="font-mono text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400">Left Side:</span>
                  <span className="font-bold text-emerald-600">{computed.sideC.toFixed(2)}²</span>
                  <span>=</span>
                  <span className="font-bold text-emerald-600">{(Math.pow(computed.sideC, 2)).toFixed(2)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400">Right Side:</span>
                  <span>{computed.sideA.toFixed(2)}² + {computed.sideB.toFixed(2)}² - 2({computed.sideA.toFixed(2)})({computed.sideB.toFixed(2)})cos({computed.angleC.toFixed(0)}°)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                   <span className="text-slate-400">Result:</span>
                   <span>{(Math.pow(computed.sideA, 2) + Math.pow(computed.sideB, 2)).toFixed(2)} - {(2 * computed.sideA * computed.sideB * Math.cos(computed.angleC * Math.PI / 180)).toFixed(2)}</span>
                   <span>=</span>
                   <span className="font-bold text-indigo-600">
                     {(Math.pow(computed.sideA, 2) + Math.pow(computed.sideB, 2) - 2 * computed.sideA * computed.sideB * Math.cos(computed.angleC * Math.PI / 180)).toFixed(2)}
                   </span>
                </div>
              </div>

               {Math.abs(computed.angleC - 90) < 1 && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Notice: Since C ≈ 90°, cos(C) is 0. This becomes the Pythagorean Theorem!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AI Assistant */}
      <div className="md:w-96 w-full h-[50vh] md:h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-20">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-1.5 rounded-lg">
              <Bot className="text-white w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">GeoGenius AI</h3>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-slate-500">Online</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setMessages([]);
              initializeChat();
            }}
            title="Reset Chat"
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                }`}
              >
                {renderMessageText(msg.text)}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100">
           {/* Quick Prompts */}
           <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {['Why is the term negative?', 'Show me Pythagorean case', 'What is angle A?'].map(txt => (
                <button 
                  key={txt}
                  onClick={() => {
                    setChatInput(txt);
                  }}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors border border-slate-200"
                >
                  {txt}
                </button>
              ))}
           </div>

          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about this triangle..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}