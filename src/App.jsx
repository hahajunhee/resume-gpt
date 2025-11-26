import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, limit as firestoreLimit 
} from 'firebase/firestore';
import { 
  Save, Trash2, Copy, FileText, Briefcase, User, PenTool, Layout, 
  Database, Sparkles, Edit2, ChevronDown, ChevronUp, CheckSquare, Square, XCircle, LogOut, Lock, Mail, AlertCircle, CheckCircle2
} from 'lucide-react';

// --- [중요] Firebase Configuration ---
// 본인의 Firebase 설정값으로 변경해주세요.
const firebaseConfig = {
  apiKey: "AIzaSyCRRqFzQJAIfbos7wg2GIItjzqmThrIZYc",
  authDomain: "jasoseo-cff03.firebaseapp.com",
  projectId: "jasoseo-cff03",
  storageBucket: "jasoseo-cff03.firebasestorage.app",
  messagingSenderId: "1028616419862",
  appId: "1:1028616419862:web:2f6635eb745d15543a1337",
  measurementId: "G-MQ32GG48GK"
};

// 앱 초기화
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 초기화 실패:", error);
}

const appId = "my-resume-gpt-v1";

// --- Constants ---
const TABS = {
  EXPERIENCE: 'experience',
  COMPANY: 'company',
  PROFILE: 'profile',
  STYLE: 'style',
  GENERATOR: 'generator'
};

const EXP_QUESTIONS = [
  { id: 'title', label: '1. 경험 제목 (예: 종합설계 프로젝트)' },
  { id: 'motivation', label: '2. 계기나 목표' },
  { id: 'obstacle', label: '3. 마주한 어려움/문제' },
  { id: 'action', label: '4. 해결을 위한 구체적 행동' },
  { id: 'verification', label: '5. 결과 확인 방식' },
  { id: 'result', label: '6. 변화나 성과' },
  { id: 'learning', label: '7. 배운 점' },
  { id: 'similarity', label: '8. 직무 연관성' },
  { id: 'philosophy', label: '9. 일하는 방식/철학 연관성' },
  { id: 'future', label: '10. 향후 활용 방안' }
];

const COMP_FIELDS = [
  { id: 'name', label: "기업명", placeholder: "예: 현대글로비스" },
  { id: 'role', label: "지원 직무", placeholder: "예: 포워딩" },
  { id: 'vision', label: "이 회사는 지금 '어디로' 가려고 하는가? (비전/방향성)", placeholder: "예: 스마트 모빌리티 솔루션 기업으로의 전환..." },
  { id: 'business', label: "무엇으로 돈을 벌고, 최근 '집중'하는 일은? (주력/신사업)", placeholder: "예: 완성차 해상운송, 배터리 리사이클링 등..." },
  { id: 'talent', label: "어떤 사람을 원하는가? (인재상 키워드 1~2개)", placeholder: "예: 도전적 실행, 소통과 협력" },
  { id: 'jd_rnr', label: "[JD] 이 직무는 '무슨 일'을 하는가? (핵심 R&R 3가지)", placeholder: "1. 수출입 물류 운영 2. 운송 원가 관리..." },
  { id: 'jd_skills', label: "[JD] 이 일을 하려면 '무엇을' 잘해야 하는가? (Hard/Soft)", placeholder: "Hard: 물류 프로세스 이해 / Soft: 문제해결력" },
  { id: 'core_role_1', label: "핵심 직무 역할 1", placeholder: "예: SCM 프로세스 최적화" },
  { id: 'core_role_2', label: "핵심 직무 역할 2", placeholder: "예: 글로벌 커뮤니케이션 역량" },
  { id: 'market_issue', label: "이 '시장'의 가장 큰 화두는 무엇인가? (경쟁/트렌드)", placeholder: "예: 공급망 불안정성 증대, 친환경 물류 전환..." }
];

const PROFILE_FIELDS = [
  { id: 'strength', label: '① 나의 강점' },
  { id: 'keywords', label: '② 핵심 키워드' },
  { id: 'experienceList', label: '③ 주요 경험 목록' },
  { id: 'values', label: '④ 가치관/일하는 방식' },
  { id: 'goals', label: '⑤ 장래 목표' }
];

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled, type = "button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const InputField = ({ label, value, onChange, placeholder, multiline = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {multiline ? (
      <textarea
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const Card = ({ title, children, onDelete, onEdit, expandedContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-800 flex-1 mr-2">{title}</h3>
        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="수정">
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md hover:text-red-600" title="삭제">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
        {children}
      </div>

      {expandedContent && (
        <div className="mt-3 pt-3 border-t border-gray-100">
           {isExpanded ? (
             <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                {expandedContent}
             </div>
           ) : null}
           <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-blue-600 py-1"
          >
            {isExpanded ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> 전체 보기</>}
          </button>
        </div>
      )}
    </div>
  );
};

// --- Auth Component ---
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    
    if (!auth) {
      setError('Firebase 설정 오류. 코드를 확인해주세요.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (resetMode) {
        await sendPasswordResetEmail(auth, email);
        alert('비밀번호 재설정 이메일 전송 완료!');
        setResetMode(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError('이메일 또는 비밀번호가 틀렸습니다.');
      else if (err.code === 'auth/email-already-in-use') setError('이미 사용 중인 이메일입니다.');
      else if (err.code === 'auth/weak-password') setError('비밀번호는 6자 이상이어야 합니다.');
      else setError('오류: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <Sparkles className="text-blue-600" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">자소서 GPT</h2>
          <p className="text-gray-500 mt-1">{resetMode ? '비밀번호 재설정' : (isLogin ? '로그인' : '회원가입')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="email" required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          {!resetMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="password" required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full py-2.5">
            {isSubmitting ? '처리 중...' : (resetMode ? '전송' : (isLogin ? '로그인' : '회원가입'))}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {resetMode ? (
            <button onClick={() => setResetMode(false)} className="text-blue-600 hover:underline">돌아가기</button>
          ) : (
            <>
              {isLogin ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold hover:underline">{isLogin ? '회원가입' : '로그인'}</button>
              {isLogin && <div className="mt-2"><button onClick={() => setResetMode(true)} className="text-gray-400 hover:text-gray-600 text-xs">비밀번호 찾기</button></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.GENERATOR);
  
  const [savingTarget, setSavingTarget] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null); 
  const [editMode, setEditMode] = useState({ active: false, id: null, collection: null });

  // Data Stores
  const [experiences, setExperiences] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profile, setProfile] = useState(null);
  const [styles, setStyles] = useState([]);

  // Form States
  const [expForm, setExpForm] = useState(
    EXP_QUESTIONS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {})
  );
  const [compForm, setCompForm] = useState(
    COMP_FIELDS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {})
  );
  const [profForm, setProfForm] = useState({ strength: '', keywords: '', experienceList: '', values: '', goals: '' });
  const [styleForm, setStyleForm] = useState({ tone: '', focus: '' });

  // Flags
  const isProfileLoaded = useRef(false);

  // Generator Selections
  const [selections, setSelections] = useState({
    expIds: [], compId: '', compFields: {}, profFields: {}, styleId: '', qType: '지원동기', limit: '900'
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const subList = (colName, setter) => {
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, colName), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.error("Listener Error:", err));
    };

    const subProfile = () => {
       const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'profiles'), firestoreLimit(1));
       return onSnapshot(q, (snapshot) => {
         if (!snapshot.empty) {
           const docData = snapshot.docs[0];
           setProfile({ id: docData.id, ...docData.data() });
           if (!isProfileLoaded.current) {
             setProfForm(prev => ({ ...prev, ...docData.data() }));
             isProfileLoaded.current = true;
           }
         } else {
           setProfile(null);
         }
       }, (err) => console.error("Profile Listener Error:", err));
    };

    const unsubExp = subList('experiences', setExperiences);
    const unsubComp = subList('companies', setCompanies);
    const unsubProf = subProfile();
    const unsubStyle = subList('styles', setStyles);

    return () => {
      unsubExp(); unsubComp(); unsubProf(); unsubStyle();
    };
  }, [user]);

  // --- Helper: Status Message ---
  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // --- CRUD Operations (Debug Version) ---
  const handleSave = async (targetName, colName, data, clearFn) => {
    if (!user) return alert("로그인이 필요합니다.");
    if (savingTarget) return;

    setSavingTarget(targetName); 
    setStatusMsg(null);
    
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, colName);
      
      if (editMode.active && editMode.collection === colName) {
        await updateDoc(doc(colRef, editMode.id), { ...data, updatedAt: serverTimestamp() });
        setEditMode({ active: false, id: null, collection: null });
        alert('수정이 완료되었습니다!'); 
      } else {
        await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
        alert('저장이 완료되었습니다!'); 
      }
      if (clearFn) clearFn(); 
    } catch (error) {
      console.error("Error saving:", error);
      alert(`[저장 실패] 오류 내용: ${error.message}\n\n파이어베이스 콘솔의 Rules 설정을 확인해주세요!`);
    } finally {
      setSavingTarget(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    setSavingTarget('profile');
    setStatusMsg(null);
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'profiles');
      if (profile) {
        await updateDoc(doc(colRef, profile.id), { ...profForm, updatedAt: serverTimestamp() });
      } else {
        await addDoc(colRef, { ...profForm, createdAt: serverTimestamp() });
      }
      alert('나의 정보가 업데이트되었습니다!');
    } catch (error) {
       console.error("Profile Save Error:", error);
       alert(`[저장 실패] 오류 내용: ${error.message}\n\n파이어베이스 콘솔의 Rules 설정을 확인해주세요!`);
    } finally {
      setSavingTarget(null);
    }
  };

  const handleLogout = async () => {
    if(confirm('로그아웃 하시겠습니까?')) {
      await signOut(auth);
    }
  };

  // --- Reset Helpers ---
  const resetExpForm = () => setExpForm(EXP_QUESTIONS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  const resetCompForm = () => setCompForm(COMP_FIELDS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  
  const handleEdit = (colName, item, setFormFn) => {
    setFormFn(item); 
    setEditMode({ active: true, id: item.id, collection: colName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = (clearFn) => {
    setEditMode({ active: false, id: null, collection: null });
    if(clearFn) clearFn();
  };

  const handleDelete = async (colName, id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, id));
    } catch (e) { 
      console.error(e);
      alert('삭제 실패: ' + e.message);
    }
  };

  // --- Generator Logic ---
  const generatePrompt = () => {
    if (selections.expIds.length === 0) return alert("최소 1개 이상의 경험을 선택해주세요.");
    if (!selections.compId) return alert("기업 정보를 선택해주세요.");

    const selExps = experiences.filter(e => selections.expIds.includes(e.id));
    const selComp = companies.find(e => e.id === selections.compId);
    const selStyle = styles.find(e => e.id === selections.styleId);

    let compInfoStr = `기업명: ${selComp.name} / 직무: ${selComp.role}\n`;
    COMP_FIELDS.forEach(field => {
       if(selections.compFields[field.id] && selComp[field.id]) {
         compInfoStr += `- ${field.label}: ${selComp[field.id]}\n`;
       }
    });

    let profInfoStr = "";
    if (profile) {
      PROFILE_FIELDS.forEach(field => {
        if (selections.profFields[field.id]) {
          profInfoStr += `- ${field.label}: ${profile[field.id]}\n`;
        }
      });
    }

    let expInfoStr = "";
    selExps.forEach((exp, index) => {
      expInfoStr += `\n[경험 모듈 ${index + 1}: ${exp.title}]\n`;
      EXP_QUESTIONS.slice(1).forEach(q => {
         if(exp[q.id]) expInfoStr += `${q.label}: ${exp[q.id]}\n`;
      });
    });

    const prompt = `
1. 역할
당신은 '전략적 사고'를 하는 동시에 '진정성'과 '겸손한 열망'을 가진 지원자입니다.

2. 입력 (Input)

2-1) 자소서문항 
${selections.qType}
(제한 글자수: ${selections.limit}자 내외)
${selections.qType.includes('지원동기') ? `지원동기 문항은 [회사 매력형 + 직무 적합형 + 성장 포부형]의 균형이 3:4:3이 되도록 한다.` : `해당 문항의 의도를 파악하여 구조적으로 답변을 작성한다.`}

2-2) 기업/직무 정보 (사용할 정보)
${compInfoStr}

2-3) 지원자 추가 정보
${profInfoStr || "(선택된 정보 없음)"}

2-4) 지원자 핵심 경험 상세
${expInfoStr}

3. 핵심 지침 (Style Guide)
${selStyle ? `[Tone]: ${selStyle.tone} / [Focus]: ${selStyle.focus}` : '기본 스타일: 전략적이고 진정성 있는 톤'}
- 두괄식 구조, STAR 프레임워크 활용.
- 구체적인 수치와 성과 중심 서술.
- ${selections.limit}자 내외 준수.

4. 출력 (Output)
위 지침을 준수하여 최고의 자기소개서 초안을 작성해주세요.
`;
    setGeneratedPrompt(prompt);
  };

  const copyToClipboard = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => alert('복사 완료!')).catch(() => alert('복사 실패'));
  };

  // --- Helper Components ---
  const NavItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setActiveTab(id); setEditMode({active:false,id:null,collection:null}); }} className={`flex items-center gap-2 px-4 py-3 rounded-lg w-full text-left transition-colors mb-1 ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-blue-50'}`}>
      <Icon size={20} /> <span className="font-medium">{label}</span>
    </button>
  );

  if (!auth) return <div className="p-10 text-red-500">Firebase 설정 오류</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <Sparkles className="fill-blue-600" /> <span>자소서 GPT</span>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavItem id={TABS.GENERATOR} icon={Layout} label="프롬프트 생성기" />
          <div className="text-xs font-bold text-gray-400 mt-6 mb-2 px-4 uppercase">데이터 관리</div>
          <NavItem id={TABS.EXPERIENCE} icon={FileText} label="1. 경험 (Experience)" />
          <NavItem id={TABS.COMPANY} icon={Briefcase} label="2. 기업 (Company)" />
          <NavItem id={TABS.PROFILE} icon={User} label="3. 자기 정보 (Me)" />
          <NavItem id={TABS.STYLE} icon={PenTool} label="4. 문체 (Style)" />
        </nav>
        <div className="p-4 bg-gray-50 border-t">
           <p className="text-sm font-bold text-gray-700 mb-2 truncate">{user.email}</p>
           <button onClick={handleLogout} className="text-sm text-gray-500 flex items-center gap-2 hover:text-red-600"><LogOut size={16}/> 로그아웃</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {activeTab === TABS.GENERATOR && "프롬프트 조립 & 생성"}
            {activeTab === TABS.EXPERIENCE && "나의 핵심 경험 관리"}
            {activeTab === TABS.COMPANY && "목표 기업 및 직무 분석"}
            {activeTab === TABS.PROFILE && "나의 정보 관리"}
            {activeTab === TABS.STYLE && "자소서 문체 설정"}
          </h2>
          {activeTab === TABS.GENERATOR && generatedPrompt && <Button onClick={copyToClipboard} icon={Copy}>복사</Button>}
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          
          {/* Generator Tab */}
          {activeTab === TABS.GENERATOR && (
            <div className="flex gap-6 h-full">
              <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">질문 유형 / 글자수</label>
                      <div className="flex gap-2">
                         <input type="text" className="flex-1 p-2 border rounded" value={selections.qType} onChange={e => setSelections({...selections, qType:e.target.value})} list="qs" placeholder="질문 유형"/>
                         <datalist id="qs"><option value="지원동기"/><option value="성장과정"/></datalist>
                         <input type="number" className="w-20 p-2 border rounded" value={selections.limit} onChange={e => setSelections({...selections, limit:e.target.value})}/>
                      </div>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-2">기업 선택</label>
                       <select className="w-full p-2 border rounded bg-blue-50" value={selections.compId} onChange={e => setSelections({...selections, compId:e.target.value})}>
                          <option value="">선택하세요</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                       {selections.compId && (
                         <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded">
                            {COMP_FIELDS.map(f => {
                               const c = companies.find(x=>x.id===selections.compId);
                               if(!c?.[f.id]) return null;
                               return (
                                 <label key={f.id} className="flex items-start gap-2 text-xs cursor-pointer p-1 hover:bg-white rounded">
                                    <input type="checkbox" className="mt-1" checked={!!selections.compFields[f.id]} onChange={() => setSelections(p => ({...p, compFields: {...p.compFields, [f.id]: !p.compFields[f.id]}}))} />
                                    <div>
                                      <span className="font-bold block text-gray-700">{f.label.split('?')[0]}</span>
                                      <span className="text-gray-500 block leading-tight">{c[f.id]}</span>
                                    </div>
                                 </label>
                               )
                            })}
                         </div>
                       )}
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-2">경험 선택 ({selections.expIds.length})</label>
                       <div className="max-h-40 overflow-y-auto border rounded bg-gray-50 p-2 space-y-1">
                          {experiences.map(e => (
                             <div key={e.id} onClick={() => setSelections(p => ({...p, expIds: p.expIds.includes(e.id) ? p.expIds.filter(x=>x!==e.id) : [...p.expIds, e.id]}))} 
                                  className={`p-2 rounded text-sm cursor-pointer flex gap-2 ${selections.expIds.includes(e.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}>
                                {selections.expIds.includes(e.id)?<CheckSquare size={16}/>:<Square size={16}/>} {e.title}
                             </div>
                          ))}
                       </div>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-2">내 정보 포함</label>
                       <div className="bg-gray-50 p-2 rounded space-y-1">
                          {PROFILE_FIELDS.map(f => (
                             <label key={f.id} className="flex items-start gap-2 text-xs cursor-pointer p-1 hover:bg-white rounded">
                                <input type="checkbox" className="mt-1" checked={!!selections.profFields[f.id]} onChange={() => setSelections(p => ({...p, profFields: {...p.profFields, [f.id]: !p.profFields[f.id]}}))} />
                                <div>
                                  <span className="font-bold block text-gray-700">{f.label}</span>
                                  <span className="text-gray-500 block leading-tight">{profile?.[f.id] || '(내용 없음)'}</span>
                                </div>
                             </label>
                          ))}
                       </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">문체 스타일 선택</label>
                        <select className="w-full p-2 border rounded bg-gray-50" value={selections.styleId} onChange={e => setSelections({...selections, styleId:e.target.value})}>
                            <option value="">기본 (선택 안 함)</option>
                            {styles.map(s => (
                                <option key={s.id} value={s.id}>{s.tone} / {s.focus}</option>
                            ))}
                        </select>
                    </div>
                    
                    <Button className="w-full" onClick={generatePrompt} disabled={savingTarget === 'generator'} icon={Sparkles}>프롬프트 생성</Button>
                 </div>
              </div>
              <div className="w-2/3 bg-slate-900 rounded-xl p-6 text-slate-200 overflow-y-auto whitespace-pre-wrap font-mono text-sm border border-slate-700">
                 {generatedPrompt || "좌측에서 재료를 선택하여 프롬프트를 생성하세요."}
              </div>
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === TABS.EXPERIENCE && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
               <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col h-full">
                  <div className="flex justify-between mb-4">
                     <h3 className="font-bold text-blue-800">{editMode.active && editMode.collection==='experiences' ? '경험 수정' : '새 경험 등록'}</h3>
                     {editMode.active && editMode.collection==='experiences' && <Button variant="ghost" onClick={() => cancelEdit(resetExpForm)}><XCircle size={14}/> 취소</Button>}
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                     {EXP_QUESTIONS.map(q => (
                        <InputField key={q.id} label={q.label} value={expForm[q.id]} onChange={v => setExpForm(p => ({...p, [q.id]: v}))} multiline={q.id!=='title'} />
                     ))}
                     <Button className="w-full" onClick={() => handleSave('experience', 'experiences', expForm, resetExpForm)} disabled={savingTarget === 'experience'} icon={Save}>{savingTarget === 'experience' ? '저장 중...' : '저장하기'}</Button>
                     {statusMsg && (
                        <div className={`p-3 rounded text-sm flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {statusMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                           {statusMsg.text}
                        </div>
                     )}
                  </div>
               </div>
               <div className="flex flex-col h-full overflow-hidden">
                  <h3 className="font-bold text-gray-700 mb-4">목록 ({experiences.length})</h3>
                  <div className="grid gap-4 overflow-y-auto pb-10 pr-2 custom-scrollbar">
                     {experiences.map(e => (
                        <Card key={e.id} title={e.title} onDelete={()=>handleDelete('experiences', e.id)} onEdit={()=>handleEdit('experiences', e, setExpForm)} 
                              expandedContent={<div className="space-y-2 text-sm">{EXP_QUESTIONS.slice(1).map(q => e[q.id] && <div key={q.id}><strong className="text-xs text-gray-500">{q.label}</strong><p>{e[q.id]}</p></div>)}</div>}>
                           <p className="line-clamp-2 mt-2 text-gray-600">{e.result}</p>
                        </Card>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === TABS.COMPANY && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col h-full">
                   <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-blue-800">{editMode.active && editMode.collection==='companies' ? '기업 수정' : '새 기업 등록'}</h3>
                      {editMode.active && editMode.collection==='companies' && <Button variant="ghost" onClick={() => cancelEdit(resetCompForm)}><XCircle size={14}/> 취소</Button>}
                   </div>
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                      <InputField label="기업명" value={compForm.name} onChange={v=>setCompForm(p=>({...p, name:v}))} />
                      <InputField label="직무" value={compForm.role} onChange={v=>setCompForm(p=>({...p, role:v}))} />
                      {COMP_FIELDS.slice(2).map(f => (
                         <InputField key={f.id} label={f.label} value={compForm[f.id]} onChange={v=>setCompForm(p=>({...p, [f.id]:v}))} multiline placeholder={f.placeholder} />
                      ))}
                      <Button className="w-full" onClick={() => handleSave('company', 'companies', compForm, resetCompForm)} disabled={savingTarget === 'company'} icon={Save}>{savingTarget === 'company' ? '저장 중...' : '저장하기'}</Button>
                      {statusMsg && (
                        <div className={`p-3 rounded text-sm flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {statusMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                           {statusMsg.text}
                        </div>
                     )}
                   </div>
                </div>
                <div className="flex flex-col h-full overflow-hidden">
                   <h3 className="font-bold text-gray-700 mb-4">목록 ({companies.length})</h3>
                   <div className="grid gap-4 overflow-y-auto pb-10 pr-2 custom-scrollbar">
                      {companies.map(c => (
                         <Card key={c.id} title={`${c.name} (${c.role})`} onDelete={()=>handleDelete('companies', c.id)} onEdit={()=>handleEdit('companies', c, setCompForm)}
                               expandedContent={<div className="space-y-2 text-sm">{COMP_FIELDS.slice(2).map(f => c[f.id] && <div key={f.id}><strong className="text-xs text-gray-500">{f.label}</strong><p>{c[f.id]}</p></div>)}</div>}>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                               {c.vision && <p className="line-clamp-1">비전: {c.vision}</p>}
                               {c.jd_skills && <p className="line-clamp-1">역량: {c.jd_skills}</p>}
                            </div>
                         </Card>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {/* Profile Tab */}
          {activeTab === TABS.PROFILE && (
             <div className="max-w-3xl mx-auto h-full overflow-y-auto custom-scrollbar p-1">
                <div className="bg-white p-8 rounded-xl border border-gray-200">
                   <h3 className="font-bold text-xl mb-6 text-blue-800 flex items-center gap-2"><User size={24}/> 나의 정보 관리 (자동 저장 아님)</h3>
                   <div className="space-y-5">
                      {PROFILE_FIELDS.map(f => (
                         <InputField key={f.id} label={f.label} value={profForm[f.id]} onChange={v => setProfForm(p => ({...p, [f.id]: v}))} multiline />
                      ))}
                      <Button className="w-full py-3 mt-4" onClick={handleSaveProfile} disabled={savingTarget === 'profile'} icon={Save}>
                         {savingTarget === 'profile' ? '저장 중...' : (profile ? '정보 업데이트' : '정보 저장')}
                      </Button>
                      {statusMsg && (
                        <div className={`p-3 rounded text-sm flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {statusMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                           {statusMsg.text}
                        </div>
                     )}
                      <p className="text-xs text-gray-400 text-center">* 작성 후 반드시 저장 버튼을 눌러주세요.</p>
                   </div>
                </div>
             </div>
          )}

          {/* Style Tab */}
          {activeTab === TABS.STYLE && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit">
                   <h3 className="font-bold text-blue-800 mb-4">스타일 등록</h3>
                   <InputField label="톤 (Tone)" value={styleForm.tone} onChange={v => setStyleForm(p=>({...p, tone:v}))} placeholder="예: 진정성 있는" />
                   <InputField label="초점 (Focus)" value={styleForm.focus} onChange={v => setStyleForm(p=>({...p, focus:v}))} placeholder="예: 성과 중심" />
                   <Button className="w-full mt-4" onClick={() => handleSave('style', 'styles', styleForm, () => setStyleForm({tone:'', focus:''}))} disabled={savingTarget === 'style'}>{savingTarget === 'style' ? '저장 중...' : '저장'}</Button>
                   {statusMsg && (
                        <div className={`p-3 rounded text-sm flex items-center gap-2 mt-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {statusMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                           {statusMsg.text}
                        </div>
                     )}
                </div>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                   {styles.map(s => (
                      <Card key={s.id} title={s.tone} onDelete={()=>handleDelete('styles', s.id)}><p>초점: {s.focus}</p></Card>
                   ))}
                </div>
             </div>
          )}
          
        </main>
      </div>
    </div>
  );
}