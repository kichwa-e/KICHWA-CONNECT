import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle, Clock, Save, ShieldCheck, FileText, DollarSign } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

type RepairStatus = 'created' | 'received' | 'diagnosing' | 'repairing' | 'ready' | 'completed';

export function AdminDashboard() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email === 'kichwarepair@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 m-8 border border-red-500/20 bg-red-50/50 rounded-3xl">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-3xl font-serif font-bold mb-4 text-red-900">Access Denied</h2>
        <p className="text-red-800/70 font-medium">You do not have administrative privileges to view this page.</p>
      </div>
    );
  }

  return <AdminInterface />;
}

function AdminInterface() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data());
      setTickets(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tickets');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
     return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-6 p-4 md:p-8"
    >
      {/* Ticket List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <h2 className="text-2xl font-serif font-bold italic text-base-text mb-2">Repair Tickets</h2>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] pr-2 scrollbar-hide">
          {tickets.length === 0 ? (
            <p className="italic text-base-text/50">No tickets found.</p>
          ) : (
            tickets.map(ticket => (
              <button
                key={ticket.ticketNo}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "p-4 rounded-3xl border text-left transition-all hover:border-primary/50",
                  selectedTicket?.ticketNo === ticket.ticketNo 
                    ? "bg-primary text-white border-primary shadow-lg" 
                    : "bg-white border-base-text/10 text-base-text"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold uppercase tracking-widest text-xs opacity-80">{ticket.ticketNo}</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                    selectedTicket?.ticketNo === ticket.ticketNo ? "bg-white/20" : "bg-base-text/5"
                  )}>
                    {ticket.status}
                  </span>
                </div>
                <div className="font-serif font-bold truncate">{ticket.deviceModel}</div>
                <div className="text-sm opacity-70 truncate mt-1">{ticket.customerName}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ticket Editor */}
      <div className="w-full md:w-2/3 bg-white border border-base-text/10 rounded-3xl p-6 md:p-10 shadow-sm relative">
        {!selectedTicket ? (
          <div className="flex flex-col items-center justify-center h-full text-base-text/30">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-medium italic text-lg">Select a ticket to view and edit details</p>
          </div>
        ) : (
          <TicketEditor ticket={selectedTicket} />
        )}
      </div>
    </motion.div>
  );
}

function TicketEditor({ ticket }: { ticket: any }) {
  const [status, setStatus] = useState<RepairStatus>(ticket.status || 'created');
  const [diagnosisNotes, setDiagnosisNotes] = useState(ticket.diagnosisNotes || '');
  const [repairCost, setRepairCost] = useState(ticket.repairCost || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStatus(ticket.status || 'created');
    setDiagnosisNotes(ticket.diagnosisNotes || '');
    setRepairCost(ticket.repairCost || '');
    setSaved(false);
  }, [ticket]);

  const STABLE_STATUSES: RepairStatus[] = ['created', 'received', 'diagnosing', 'repairing', 'ready', 'completed'];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ticketRef = doc(db, 'tickets', ticket.ticketNo);
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (diagnosisNotes.trim()) {
        updateData.diagnosisNotes = diagnosisNotes.trim();
      }
      if (repairCost !== '') {
        updateData.repairCost = Number(repairCost);
      }

      await updateDoc(ticketRef, updateData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticket.ticketNo}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-8 border-b border-base-text/10 pb-6">
        <div>
          <h3 className="text-3xl font-serif font-bold text-base-text">{ticket.ticketNo}</h3>
          <p className="text-base-text/60 mt-1 font-medium">{format(ticket.createdAt.toDate(), 'PPP p')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-base-text text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-base-text/50 mb-1">Customer Info</h4>
           <p className="font-medium text-base-text text-lg">{ticket.customerName}</p>
           <p className="text-base-text/70">{ticket.customerPhone}</p>
        </div>
        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-base-text/50 mb-1">Device</h4>
           <p className="font-medium text-base-text text-lg">{ticket.deviceModel}</p>
           <p className="text-base-text/70">{ticket.deviceType}</p>
        </div>
        <div className="md:col-span-2">
           <h4 className="text-xs font-bold uppercase tracking-widest text-base-text/50 mb-1">Reported Issue</h4>
           <div className="p-4 bg-base-bg rounded-2xl border border-base-text/5 text-base-text/80 font-medium whitespace-pre-wrap leading-relaxed">
             {ticket.issue}
           </div>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-base-text block mb-3">Update Status</label>
          <div className="flex flex-wrap gap-2">
            {STABLE_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors border",
                  status === s 
                    ? "bg-primary text-white border-primary" 
                    : "bg-transparent text-base-text/70 border-base-text/20 hover:border-base-text/40"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-base-text flex gap-2 items-center mb-3">
             <FileText className="w-4 h-4" />
             Diagnosis & Tech Notes
          </label>
          <textarea 
            value={diagnosisNotes}
            onChange={(e) => setDiagnosisNotes(e.target.value)}
            placeholder="Enter findings after diagnosing the device..."
            rows={4}
            className="w-full bg-card-light border border-base-text/20 rounded-2xl p-4 text-base-text outline-none focus:border-primary/50 transition-all resize-y font-medium text-sm placeholder:text-base-text/30"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-base-text flex gap-2 items-center mb-3">
             <DollarSign className="w-4 h-4" />
             Est. Repair Cost ($)
          </label>
          <input 
            type="number"
            value={repairCost}
            onChange={(e) => setRepairCost(e.target.value)}
            placeholder="0.00"
             className="w-full max-w-[200px] bg-card-light border border-base-text/20 rounded-xl px-4 py-3 text-base-text outline-none focus:border-primary/50 transition-all font-medium text-lg placeholder:text-base-text/30"
          />
        </div>
      </div>
    </div>
  );
}
