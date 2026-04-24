import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Wrench, Smartphone, Search, PenSquare, LayoutDashboard, Clock, CheckCircle, ChevronRight, Menu, X, ArrowRight, ShieldCheck, Zap, HeadphonesIcon, MessageCircle, Send, LogOut } from 'lucide-react';
import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// --- Components ---

function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Book Repair', path: '/book', icon: PenSquare },
    { name: 'Track Status', path: '/track', icon: Search },
    { name: 'Services', path: '/services', icon: Wrench },
    { name: 'Chat', path: '/chat', icon: MessageCircle },
  ];

  return (
    <nav className="bg-base-bg border-b border-base-text/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight uppercase text-base-text">Kichwa Connect</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-10 text-sm font-bold uppercase tracking-widest text-base-text">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "transition-all duration-300 py-1",
                    isActive 
                      ? "border-b-2 border-primary text-base-text" 
                      : "text-base-text/50 hover:text-base-text hover:border-b-2 hover:border-base-text/20"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          
          <div className="hidden md:block">
            <Link to="/book" className="px-6 py-2 bg-base-text text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-base-text/90 transition-colors">
              Book Now
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-base-text focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-base-text/10 bg-base-bg overflow-hidden"
          >
            <div className="px-6 py-6 space-y-6">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block text-sm font-bold uppercase tracking-widest",
                      isActive 
                        ? "text-primary border-l-2 border-primary pl-3 -ml-3" 
                        : "text-base-text/50 hover:text-base-text"
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="pt-6 border-t border-base-text/10">
                <Link to="/book" onClick={() => setIsOpen(false)} className="inline-block px-6 py-3 bg-base-text text-white rounded-full text-xs font-bold uppercase tracking-widest text-center w-full">
                  Book Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

// --- Pages ---

function Dashboard() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col pt-8 pb-12">
        {/* Hero Section */}
        <div className="relative mb-16 sm:mb-24">
          <h1 className="text-6xl sm:text-[140px] md:text-[180px] leading-[0.85] font-serif font-black uppercase -ml-1 sm:-ml-2 tracking-tighter text-base-text">
            Kichwa<br/>Repair
          </h1>
          <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:w-80 sm:text-right mt-8 sm:mt-0 lg:pr-12 block">
            <p className="text-lg font-medium leading-tight mb-4 italic text-base-text">
              Connecting you to seamless device repairs and premium support.
            </p>
            <span className="text-primary font-bold text-sm uppercase tracking-[0.2em]">Fast & Reliable</span>
          </div>
        </div>

        {/* Quick Stats / Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {/* Card 1 */}
          <div className="bg-card-light p-8 md:p-10 rounded-3xl flex flex-col justify-between min-h-[250px]">
            <div>
              <h3 className="text-xs font-bold text-base-text uppercase tracking-widest mb-4 opacity-60">Warranty</h3>
              <h4 className="text-4xl sm:text-5xl font-serif font-bold italic mb-2 text-primary">1-Year</h4>
              <p className="text-sm leading-relaxed font-medium text-base-text pt-2">On all approved repairs for maximum peace of mind.</p>
            </div>
            <div className="mt-8 flex justify-end text-base-text/40">
              <ShieldCheck className="w-12 h-12 stroke-[1.5]" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-base-text text-base-bg p-8 md:p-10 rounded-3xl flex flex-col justify-between min-h-[250px] relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60 text-base-bg">Speed</h3>
              <div className="text-4xl sm:text-5xl font-serif font-bold italic mb-2 text-primary">Same-Day</div>
              <p className="text-sm font-medium leading-relaxed pt-2 opacity-80">Service for screens, batteries, and charging ports.</p>
            </div>
            <div className="mt-8 flex justify-end text-base-bg/20 relative z-10">
              <Zap className="w-12 h-12 stroke-[1.5]" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="border-2 border-base-text p-8 md:p-10 rounded-3xl flex flex-col justify-between min-h-[250px] group hover:bg-base-text hover:text-white transition-colors duration-300">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60 group-hover:text-white/60">Support</h3>
              <div className="text-4xl sm:text-5xl font-serif font-bold italic mb-2">Expert</div>
              <p className="text-sm font-medium leading-relaxed pt-2">Available 6 days a week to assist with any issue.</p>
            </div>
            <div className="mt-8 flex justify-end text-base-text/30 group-hover:text-white/30 transition-colors">
              <HeadphonesIcon className="w-12 h-12 stroke-[1.5]" />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function BookRepair() {
  const [submitted, setSubmitted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [newTicketNo, setNewTicketNo] = useState('');
  
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [issue, setIssue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };
  
  const handleConfirm = async () => {
    setIsConfirming(false);
    
    // Generate simple ID (e.g., KC-1234A)
    const generatedId = "KC-" + Math.floor(1000 + Math.random() * 9000).toString() + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    
    try {
      const ticketRef = doc(db, 'tickets', generatedId);
      await setDoc(ticketRef, {
        ticketNo: generatedId,
        deviceType,
        deviceModel,
        issue,
        customerName,
        customerPhone,
        status: 'created',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTicketNo(generatedId);
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tickets`);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl w-full mx-auto py-8 lg:py-16">
        <div className="mb-12 border-b border-base-text/10 pb-8">
          <h1 className="text-5xl sm:text-7xl font-serif font-black uppercase tracking-tighter text-base-text mb-4">Book Repair</h1>
          <p className="text-base-text/70 font-medium italic text-lg">Tell us about your device issue to receive an estimate and start a ticket.</p>
        </div>

        <AnimatePresence>
          {isConfirming && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-bg/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card-light p-8 md:p-12 rounded-[2rem] max-w-lg w-full shadow-2xl border border-base-text/10"
              >
                <div className="mx-auto w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-6 relative">
                   <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping"></div>
                   <PenSquare className="w-8 h-8 stroke-[2]" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-center text-base-text mb-4">Confirm Request</h3>
                <p className="text-center text-base-text/70 mb-8 font-medium">Are you ready to submit your device repair request? We will generate a tracking ticket for you.</p>
                <div className="flex flex-col-reverse sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => setIsConfirming(false)}
                    className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-base-text hover:bg-base-text/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-primary/30"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-light p-10 sm:p-16 rounded-3xl text-center space-y-6"
          >
            <div className="mx-auto w-20 h-20 bg-primary text-white flex items-center justify-center rounded-full mb-8 shadow-xl shadow-primary/20">
              <CheckCircle className="w-10 h-10 stroke-[2]" />
            </div>
            <h2 className="text-4xl font-serif font-bold text-base-text italic">Request Received</h2>
            <p className="text-base-text/80 text-lg">Your tracking number is <strong className="text-primary font-bold tracking-widest uppercase ml-2">{newTicketNo}</strong></p>
            <p className="text-base-text/60 text-sm max-w-lg mx-auto leading-relaxed">Please bring your device to our shop or package it securely if you chose mail-in delivery.</p>
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/track" className="inline-block px-10 py-4 bg-base-text text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors hover:bg-base-text/90 shadow-xl">
                Track this ticket
              </Link>
              <a 
                href={`https://wa.me/254701581233?text=Hello%20Kichwa%20Connect,%20I%20just%20created%20a%20repair%20request.%20My%20ticket%20number%20is%20${newTicketNo}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-10 py-4 bg-[#25D366] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#20bd5a] shadow-xl"
              >
                <MessageCircle className="w-4 h-4" />
                Notify via WhatsApp
              </a>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border border-base-text/20 p-8 sm:p-12 rounded-3xl space-y-10 bg-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-base-text/5 pointer-events-none group-focus-within:text-base-text/10 transition-colors">
                 <PenSquare className="w-48 h-48 sm:w-64 sm:h-64 stroke-[1]" />
              </div>
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-base-text opacity-70 block">Device Type</label>
                  <select required value={deviceType} onChange={e => setDeviceType(e.target.value)} className="w-full bg-transparent border-b-2 border-base-text/20 pb-3 text-base-text focus:border-primary outline-none transition-all appearance-none rounded-none font-serif italic text-2xl cursor-pointer">
                    <option value="" disabled>Select device...</option>
                    <option value="phone">Smartphone</option>
                    <option value="tablet">Tablet / iPad</option>
                    <option value="laptop">Laptop / MacBook</option>
                    <option value="console">Gaming Console</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-base-text opacity-70 block">Brand / Model</label>
                  <input required value={deviceModel} onChange={e => setDeviceModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" type="text" className="w-full bg-transparent border-b-2 border-base-text/20 pb-3 text-base-text placeholder-base-text/30 focus:border-primary outline-none transition-all rounded-none font-serif italic text-2xl" />
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <label className="text-xs font-bold uppercase tracking-widest text-base-text opacity-70 block">Describe the Issue</label>
                <textarea required value={issue} onChange={e => setIssue(e.target.value)} rows={3} placeholder="What seems to be wrong with the device?" className="w-full bg-transparent border-b-2 border-base-text/20 pb-3 text-base-text placeholder-base-text/30 focus:border-primary outline-none transition-all resize-y rounded-none font-serif italic text-2xl" />
              </div>

              <div className="pt-10 space-y-8 relative z-10">
                <h3 className="text-xl font-bold uppercase tracking-widest text-base-text">Contact Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-base-text opacity-70 block">Full Name</label>
                    <input required value={customerName} onChange={e => setCustomerName(e.target.value)} type="text" className="w-full bg-transparent border-b-2 border-base-text/20 pb-3 text-base-text focus:border-primary outline-none transition-all rounded-none font-serif italic text-2xl" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-base-text opacity-70 block">Phone Number</label>
                    <input required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" className="w-full bg-transparent border-b-2 border-base-text/20 pb-3 text-base-text focus:border-primary outline-none transition-all rounded-none font-serif italic text-2xl" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-full text-sm font-bold uppercase tracking-widest transition-colors shadow-2xl shadow-primary/30 flex items-center gap-3">
                Submit Request <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </PageTransition>
  );
}

type RepairStatus = 'created' | 'received' | 'diagnosing' | 'repairing' | 'ready' | 'completed';

function TrackRepair() {
  const [ticketNo, setTicketNo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorPrompt, setErrorPrompt] = useState<string | null>(null);
  const [result, setResult] = useState<null | { id: string, name: string, status: RepairStatus, device: string, updated: string, diagnosisNotes?: string, repairCost?: number }>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketNo.trim()) return;
    setIsSearching(true);
    setErrorPrompt(null);
    
    try {
      const ticketRef = doc(db, 'tickets', ticketNo.trim().toUpperCase());
      const snap = await getDoc(ticketRef);
      if (snap.exists()) {
        const data = snap.data();
        let formattedDate = 'Just now';
        if (data.updatedAt) {
          formattedDate = data.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
        setResult({
          id: data.ticketNo,
          name: data.customerName,
          status: data.status,
          device: `${data.deviceModel} - ${data.issue}`,
          updated: formattedDate,
          diagnosisNotes: data.diagnosisNotes,
          repairCost: data.repairCost
        });
      } else {
        setResult(null);
        setErrorPrompt('Ticket not found. Please double-check your ticket number.');
      }
    } catch (err) {
      setErrorPrompt('Failed to retrieve ticket status.');
      handleFirestoreError(err, OperationType.GET, `tickets/${ticketNo.trim().toUpperCase()}`);
    } finally {
      setIsSearching(false);
    }
  };

  const steps: { key: RepairStatus; label: string; desc: string }[] = [
    { key: 'received', label: 'Device Received', desc: 'We have your device in hand.' },
    { key: 'diagnosing', label: 'Diagnosing', desc: 'Running tests to find the issue.' },
    { key: 'repairing', label: 'In Repair', desc: 'Our technicians are fixing it.' },
    { key: 'ready', label: 'Ready for Pickup', desc: 'All done and ready for you.' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === result?.status) >= 0 ? steps.findIndex(s => s.key === result?.status) : 2;

  return (
    <PageTransition>
      <div className="max-w-4xl w-full mx-auto py-8 lg:py-16 space-y-16">
        <div className="text-center">
          <h1 className="text-5xl sm:text-7xl font-serif font-black uppercase tracking-tighter text-base-text mb-4">Track Status</h1>
          <p className="text-base-text/70 italic font-medium text-lg">Enter your ticket number to see real-time updates.</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative flex items-center border-b-2 border-base-text pb-4">
            <Search className="absolute left-2 w-8 h-8 text-primary" />
            <input
              type="text"
              value={ticketNo}
              onChange={(e) => setTicketNo(e.target.value)}
              placeholder="Your Ticket No."
              className="w-full bg-transparent pl-16 pr-32 py-2 text-3xl sm:text-5xl font-serif font-bold uppercase tracking-wider text-base-text placeholder-base-text/20 outline-none transition-all rounded-none"
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-0 bg-base-text text-white px-8 py-4 border-none rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-base-text/90 transition-colors"
            >
              {isSearching ? '...' : 'Track'}
            </button>
          </div>
          {errorPrompt && (
            <p className="mt-4 text-center text-red-500 font-bold uppercase tracking-widest text-xs">
              {errorPrompt}
            </p>
          )}
        </form>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-base-text text-base-bg rounded-[2.5rem] p-10 sm:p-16 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-8 sm:p-16 opacity-5 pointer-events-none">
               <Search className="w-48 h-48 sm:w-96 sm:h-96" />
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b border-base-bg/20 pb-10 mb-12">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">Ticket Status</h3>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <h2 className="text-5xl font-serif font-bold text-primary italic leading-none">{result.id}</h2>
                  <span className="border border-base-bg/30 text-base-bg text-[10px] sm:text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest bg-base-bg/5">
                    {result.status}
                  </span>
                </div>
                <p className="text-base-bg/70 mt-4 text-lg">{result.device}</p>
              </div>
              <div className="text-left sm:text-right pl-2 sm:pl-0 border-l sm:border-l-0 border-base-bg/20">
                 <h3 className="text-xs font-bold uppercase tracking-widest mb-2 opacity-60">Last Updated</h3>
                 <p className="font-serif italic text-xl">{result.updated}</p>
              </div>
            </div>

            {(result.diagnosisNotes || result.repairCost != null) && (
              <div className="relative z-10 mb-12 p-6 sm:p-8 bg-black/20 rounded-3xl border border-white/5 backdrop-blur-sm shadow-inner">
                <div className="flex flex-col md:flex-row gap-8">
                  {result.diagnosisNotes && (
                    <div className="flex-1">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Diagnosis & Notes
                      </h4>
                      <p className="text-base-bg/90 font-medium whitespace-pre-wrap leading-relaxed text-sm">
                        {result.diagnosisNotes}
                      </p>
                    </div>
                  )}
                  {result.repairCost != null && (
                    <div className="md:w-48 shrink-0">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Estimated Cost</h4>
                      <p className="text-4xl font-serif font-black italic">${result.repairCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative z-10 max-w-xl">
              <div className="relative border-l-2 border-base-bg/20 ml-4 space-y-12 py-6">
                {steps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step.key} className="relative flex items-start pl-12 group">
                      {/* Circle Indicator */}
                      <div className={cn(
                        "absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-base-text flex items-center justify-center transition-colors",
                        isCompleted ? "bg-primary" : "bg-base-bg/10",
                        isCurrent ? "shadow-[0_0_0_4px_#D94E2840]" : ""
                      )}>
                        {isCompleted && <CheckCircle className="w-4 h-4 text-base-text" />}
                      </div>

                      {/* Step Info */}
                      <div>
                        <h4 className={cn(
                          "text-xl sm:text-2xl font-serif font-bold mb-2",
                          isCurrent ? "text-primary italic" : (isCompleted ? "text-base-bg" : "text-base-bg/40")
                        )}>
                          {step.label}
                        </h4>
                        <p className={cn("text-xs font-bold uppercase tracking-widest leading-relaxed", isCurrent ? "text-base-bg/80" : "text-base-bg/40")}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {result.status === 'repairing' && (
              <div className="relative z-10 mt-16 bg-primary text-base-bg rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xl">
                <div className="bg-base-bg text-primary p-4 rounded-full mx-auto sm:mx-0 shrink-0">
                  <Clock className="w-8 h-8 stroke-[2]" />
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-base-bg/80">Estimated Completion</h4>
                  <p className="font-serif italic text-2xl leading-tight">Your repair is progressing seamlessly. Ready tomorrow by 2:00 PM.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

function Services() {
  const services = [
    { title: "Screen Replacement", price: "from $89", desc: "Premium grade displays used for replacements.", icon: Smartphone },
    { title: "Battery Refresh", price: "from $49", desc: "Restore your device's original day-long battery life.", icon: Zap },
    { title: "Water Damage Rx", price: "Assessment", desc: "Ultrasonic cleaning and logic board restoration.", icon: ShieldCheck },
    { title: "Point Repair", price: "from $69", desc: "Fix connection issues and extremely slow charging.", icon: Wrench },
    { title: "System Flash", price: "from $35", desc: "Resolve firmware loops and critical software glitches.", icon: LayoutDashboard },
    { title: "Microsoldering", price: "Quote", desc: "Advanced logic board & chip-level component repairs.", icon: CheckCircle },
  ];

  return (
    <PageTransition>
      <div className="py-8 lg:py-16">
        <div className="mb-16 border-b border-base-text/10 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-5xl sm:text-7xl font-serif font-black uppercase tracking-tighter text-base-text mb-4">Services</h1>
            <p className="text-base-text/70 font-medium italic text-lg sm:text-xl">Professional, reliable care.</p>
          </div>
          <div className="md:pb-4">
            <Link to="/book" className="inline-block px-10 py-4 bg-base-text text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-base-text/90 transition-colors shadow-lg">
              Book Assessment
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <div key={i} className="bg-card-light p-10 rounded-[2rem] flex flex-col justify-between min-h-[280px] group transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div className="text-primary group-hover:scale-110 transition-transform origin-top-left">
                      <Icon className="w-10 h-10 stroke-[2]" />
                    </div>
                    <span className="border-b-[3px] border-base-text text-base-text text-[10px] sm:text-xs font-bold uppercase tracking-widest pb-1.5 inline-block">
                      {service.price}
                    </span>
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-base-text mb-4 leading-tight italic group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-base-text/80">{service.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-20 bg-secondary text-white rounded-[2.5rem] p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -top-20 text-white/5 pointer-events-none">
             <Wrench className="w-[30rem] h-[30rem] rotate-12" />
          </div>
          <div className="relative z-10 max-w-2xl text-center lg:text-left">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-6 opacity-80 text-white">Need Something Else?</h3>
            <h4 className="text-4xl sm:text-6xl font-serif font-bold italic mb-6 leading-[1.1]">Custom Orders & Deep Diagnostics.</h4>
            <p className="text-white/80 font-medium text-lg sm:text-xl leading-relaxed lg:pr-8">We handle a wide array of specialized repairs and complex electronic surgery. Bring your device for an expert assessment.</p>
          </div>
          <div className="relative z-10 shrink-0 w-full lg:w-auto flex justify-center">
            <Link to="/book" className="inline-block px-12 py-6 bg-white text-secondary rounded-full text-sm font-bold uppercase tracking-widest hover:bg-base-bg hover:text-base-text transition-colors shadow-xl">
              Get A Quote
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

import { ChatApp } from './components/Chat';
import { AdminDashboard } from './components/Admin';

// --- Main App Config --- //

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-base-bg text-base-text font-sans flex flex-col selection:bg-primary/30 selection:text-base-text">
        <NavBar />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/book" element={<BookRepair />} />
              <Route path="/track" element={<TrackRepair />} />
              <Route path="/services" element={<Services />} />
              <Route path="/chat" element={<ChatApp />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 border-t border-base-text/10 flex flex-col sm:flex-row justify-between items-center gap-8 z-10 mt-auto">
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col sm:flex-row gap-4 sm:gap-10 items-center text-base-text">
            <span>© {new Date().getFullYear()} Kichwa Connect Repair</span>
            <span className="opacity-40 italic font-serif text-sm sm:text-base lowercase">Pachamama Care</span>
          </div>
          <div className="flex gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-base-text"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
