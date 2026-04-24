import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, LogOut, User, Search, Loader2, AlertCircle } from 'lucide-react';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, setDoc, doc, addDoc, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col h-[calc(100vh-12rem)]"
    >
      {children}
    </motion.div>
  );
}

export function ChatApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (isAuthLoading) {
    return (
      <PageTransition>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-base-text/10 rounded-3xl m-8">
          <MessageCircle className="w-20 h-20 text-primary mb-6" />
          <h2 className="text-4xl font-serif font-bold mb-4 italic text-base-text">Sign In Required</h2>
          <p className="text-base-text/60 mb-8 max-w-sm font-medium">To start a live chat with our repair specialists or other users, please sign in.</p>
          <button 
            onClick={loginWithGoogle}
            className="bg-base-text text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-base-text/90 transition-colors shadow-lg"
          >
            Sign in with Google
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col md:flex-row gap-6 border border-base-text/10 rounded-3xl bg-card-light overflow-hidden shadow-sm h-full">
         <ChatInterface currentUser={user} />
      </div>
    </PageTransition>
  );
}

function ChatInterface({ currentUser }: { currentUser: FirebaseUser }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Fetch users with public visibility
  useEffect(() => {
    const q = query(collection(db, 'users'), where('visibility', '==', 'public'));
    const unsub = onSnapshot(q, (snap) => {
      const userList = snap.docs
        .map(d => d.data())
        .filter(u => u.uid !== currentUser.uid); // Exclude self
      setUsers(userList);
      setErrorMsg(null);
    }, (err) => {
      setErrorMsg("Failed to load user directory.");
      try { handleFirestoreError(err, OperationType.LIST, 'users'); } catch (e) {}
    });
    return () => unsub();
  }, [currentUser.uid]);

  // Fetch conversations
  useEffect(() => {
    const q = query(
      collection(db, 'conversations'), 
      where('participantIds', 'array-contains', currentUser.uid),
      // Need composite index for orderBy so dropping orderBy temporarily: orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // manual sort
      convos.sort((a: any, b: any) => {
         const tA = a.updatedAt?.toMillis() || 0;
         const tB = b.updatedAt?.toMillis() || 0;
         return tB - tA;
      });
      setConversations(convos);
      setErrorMsg(null);
    }, (err) => {
      setErrorMsg("Failed to load conversations.");
      try { handleFirestoreError(err, OperationType.LIST, 'conversations'); } catch (e) {}
    });
    return () => unsub();
  }, [currentUser.uid]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, `conversations/${activeChat}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setErrorMsg(null);
    }, (err) => {
      setErrorMsg("Failed to load messages for this conversation.");
      try { handleFirestoreError(err, OperationType.LIST, `conversations/${activeChat}/messages`); } catch (e) {}
    });
    return () => unsub();
  }, [activeChat]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async (otherUser: any) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.participantIds.includes(otherUser.uid));
    if (existing) {
      setActiveChat(existing.id);
      return;
    }

    // Create new
    const id = currentUser.uid < otherUser.uid ? `${currentUser.uid}_${otherUser.uid}` : `${otherUser.uid}_${currentUser.uid}`;
    try {
      await setDoc(doc(db, 'conversations', id), {
        participantIds: [currentUser.uid, otherUser.uid],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Me',
          [otherUser.uid]: otherUser.displayName || 'User'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setErrorMsg(null);
      setActiveChat(id);
    } catch (err) {
      setErrorMsg("Could not start conversation. You may not have permission.");
      try { handleFirestoreError(err, OperationType.CREATE, `conversations`); } catch (e) {}
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      await addDoc(collection(db, `conversations/${activeChat}/messages`), {
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'conversations', activeChat), {
        lastMessage: text,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg("Could not send message. Please try again.");
      try { handleFirestoreError(err, OperationType.CREATE, `conversations/${activeChat}/messages`); } catch (e) {}
    }
  };

  // Get active chat metadata
  const currentConvo = conversations.find(c => c.id === activeChat);
  let otherParticipantName = 'Loading...';
  if (currentConvo) {
    const otherId = currentConvo.participantIds.find((id: string) => id !== currentUser.uid);
    otherParticipantName = currentConvo.participantNames?.[otherId] || 'User';
  }

  return (
    <>
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-0 left-1/2 z-50 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md shadow-lg w-max max-w-[90%]"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("w-full md:w-80 border-r border-base-text/10 bg-base-bg flex flex-col relative", activeChat && 'hidden md:flex')}>
        <div className="p-6 border-b border-base-text/10">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold uppercase border-2 border-base-bg">
                 {currentUser.displayName?.[0] || 'U'}
               </div>
               <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-base-text line-clamp-1">{currentUser.displayName}</h3>
                  <button onClick={logout} className="text-[10px] text-base-text/50 hover:text-primary transition-colors uppercase font-bold tracking-widest flex items-center gap-1 mt-0.5">
                    <LogOut className="w-3 h-3" /> Logout
                  </button>
               </div>
             </div>
          </div>
          <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-text/30" />
             <input type="text" placeholder="Search contacts..." className="w-full bg-card-light pl-9 pr-4 py-2.5 rounded-full text-xs font-bold font-sans text-base-text placeholder-base-text/40 outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-base-text/5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
          
          {/* Active Conversations */}
          {conversations.length > 0 && (
            <div>
               <h4 className="text-[10px] uppercase font-bold tracking-widest text-base-text/40 mb-3 px-2">Recent Chats</h4>
               <div className="space-y-1">
                 {conversations.map(convo => {
                   const otherId = convo.participantIds.find((id: string) => id !== currentUser.uid);
                   const pName = convo.participantNames?.[otherId] || 'User';
                   const isActive = activeChat === convo.id;
                   return (
                     <button
                       key={convo.id}
                       onClick={() => setActiveChat(convo.id)}
                       className={cn("w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group", isActive ? "bg-base-text text-white" : "hover:bg-card-light")}
                     >
                       <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase", isActive ? "bg-white/20" : "bg-secondary text-white")}>
                         {pName[0]}
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <h5 className={cn("text-xs font-bold uppercase tracking-widest truncate", isActive ? "text-white" : "text-base-text")}>{pName}</h5>
                         <p className={cn("text-[10px] truncate mt-0.5 font-medium", isActive ? "text-white/60" : "text-base-text/50")}>
                           {convo.lastMessage || 'Start a conversation'}
                         </p>
                       </div>
                     </button>
                   );
                 })}
               </div>
            </div>
          )}

          {/* User Directory */}
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-base-text/40 mb-3 px-2">Directory</h4>
            <div className="space-y-1">
              {users.map(u => (
                <button
                   key={u.uid}
                   onClick={() => startConversation(u)}
                   className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card-light transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-base-text text-base-bg flex items-center justify-center text-xs font-bold uppercase">
                    {u.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-widest text-base-text">{u.displayName}</h5>
                  </div>
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-xs text-base-text/40 px-2 italic font-medium">No other users found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col bg-white", !activeChat && 'hidden md:flex items-center justify-center')}>
        {!activeChat ? (
           <div className="text-center p-8">
             <MessageCircle className="w-16 h-16 text-base-text/10 mx-auto mb-4" />
             <p className="text-base-text/40 italic font-serif text-xl">Select a conversation to start chatting</p>
           </div>
        ) : (
          <>
            <div className="px-8 py-5 border-b border-base-text/10 bg-base-bg flex items-center gap-4">
              <button className="md:hidden p-2 -ml-2 text-base-text/60" onClick={() => setActiveChat(null)}>
                 <span className="text-xs font-bold uppercase tracking-widest">← Back</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold uppercase">
                {otherParticipantName?.[0] || 'U'}
              </div>
              <div>
                <h3 className="font-bold uppercase tracking-widest text-base-text">{otherParticipantName}</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-card-light/30">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.uid;
                const time = msg.createdAt ? format(msg.createdAt.toDate(), 'h:mm a') : '';
                return (
                  <div key={msg.id || idx} className={cn("flex flex-col max-w-[80%] sm:max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn(
                      "px-6 py-3 rounded-3xl font-medium leading-relaxed shadow-sm",
                      isMe 
                        ? "bg-primary text-white rounded-br-sm" 
                        : "bg-white text-base-text border border-base-text/10 rounded-bl-sm"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-base-text/30 mt-2 px-1">
                      {time}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 sm:p-6 border-t border-base-text/10 bg-white">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-card-light border border-base-text/10 rounded-full px-6 py-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-medium text-base-text placeholder-base-text/40"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-14 h-14 shrink-0 rounded-full bg-base-text text-white flex items-center justify-center hover:bg-primary transition-all disabled:opacity-50 disabled:hover:bg-base-text"
                >
                  <Send className="w-5 h-5 -ml-1" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
