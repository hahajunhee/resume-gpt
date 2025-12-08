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
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, limit as firestoreLimit, writeBatch, getDocs
} from 'firebase/firestore';
import { 
  Save, Trash2, Copy, FileText, Briefcase, User, Layout, 
  Database, Sparkles, Edit2, ChevronDown, ChevronUp, CheckSquare, Square, XCircle, LogOut, Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft, Plus, ArrowDown, MousePointerClick, GripHorizontal, Info, HelpCircle, X, Maximize2, Minimize2
} from 'lucide-react';

// --- [중요] Firebase Configuration ---
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
  GENERATOR: 'generator'
};

const PRESET_STYLES = [
    { id: 's1', tone: '진정성/성장', focus: '꾸밈없는 태도와 꾸준한 성장 과정 강조' },
    { id: 's2', tone: '전문성/성과', focus: '구체적인 수치와 성과 중심의 논리적 서술' },
    { id: 's3', tone: '도전/열정', focus: '실패를 두려워하지 않는 도전 정신과 열정 부각' },
    { id: 's4', tone: '창의/혁신', focus: '기존 틀을 깨는 창의적인 문제해결 능력 강조' },
    { id: 's5', tone: '소통/협업', focus: '팀워크와 갈등 해결 및 소통 능력 중심' },
    { id: 's6', tone: '분석/논리', focus: '데이터 기반의 분석적 사고와 논리적 전개' },
    { id: 's7', tone: '리더십/주도성', focus: '주도적으로 문제를 해결하고 팀을 이끄는 리더십' },
    { id: 's8', tone: '성실/책임감', focus: '맡은 바를 끝까지 완수하는 책임감과 성실함' },
    { id: 's9', tone: '글로벌/개방성', focus: '글로벌 마인드와 새로운 문화에 대한 수용력' },
    { id: 's10', tone: '직무적합/실무', focus: '실무 경험과 직무 관련 핵심 역량 최우선' }
];

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
  { id: 'name', label: "기업명", shortLabel: "기업명", placeholder: "예: 현대글로비스" },
  { id: 'role', label: "지원 직무", shortLabel: "지원 직무", placeholder: "예: 포워딩" },
  { id: 'vision', label: "비전/방향성 - 이 회사는 지금 '어디로' 가려고 하는가?", shortLabel: "비전/방향성", placeholder: "예: 스마트 모빌리티 솔루션 기업으로의 전환..." },
  { id: 'business', label: "주력/신사업 - 무엇으로 돈을 벌고, 최근 '집중'하는 일은?", shortLabel: "주력/신사업", placeholder: "예: 완성차 해상운송, 배터리 리사이클링 등..." },
  { id: 'talent', label: "인재상 - 어떤 사람을 원하는가? (키워드 1~2개)", shortLabel: "인재상", placeholder: "예: 도전적 실행, 소통과 협력" },
  { id: 'jd_rnr', label: "핵심 R&R - [JD] 이 직무는 '무슨 일'을 하는가?", shortLabel: "핵심 R&R", placeholder: "1. 수출입 물류 운영 2. 운송 원가 관리..." },
  { id: 'jd_skills', label: "직무 역량 - [JD] 이 일을 하려면 '무엇을' 잘해야 하는가? (Hard/Soft)", shortLabel: "직무 역량", placeholder: "Hard: 물류 프로세스 이해 / Soft: 문제해결력" },
  { id: 'core_role_1', label: "핵심 직무 역할 1", shortLabel: "핵심 직무 역할 1", placeholder: "예: SCM 프로세스 최적화" },
  { id: 'core_role_2', label: "핵심 직무 역할 2", shortLabel: "핵심 직무 역할 2", placeholder: "예: 글로벌 커뮤니케이션 역량" },
  { id: 'market_issue', label: "경쟁/트렌드 - 이 '시장'의 가장 큰 화두는 무엇인가?", shortLabel: "경쟁/트렌드", placeholder: "예: 공급망 불안정성 증대, 친환경 물류 전환..." }
];

const PROFILE_FIELDS = [
  { id: 'strength', label: '① 나의 강점' },
  { id: 'keywords', label: '② 핵심 키워드' },
  { id: 'values', label: '③ 가치관/일하는 방식' },
  { id: 'goals', label: '④ 장래 목표' }
];

// Gemini Help Texts
const GEMINI_COMPANY_HELP_TEXT = `해당 내용을 복사해서 제미나이에게 물어보면 더 빠르게 입력할 수 있어요.
👇 (복사 후 수정해서 사용하세요)

현재 [기업명] 기업의 [직무명] 직무에 대해 아래 정보를 찾아줘.

1. 비전/방향성 - 이 회사는 지금 '어디로' 가려고 하는가?
2. 주력/신사업 - 무엇으로 돈을 벌고, 최근 '집중'하는 일은?
3. 인재상 - 어떤 사람을 원하는가? (키워드 1~2개)
4. 핵심 R&R - [JD] 이 직무는 '무슨 일'을 하는가?
5. 직무 역량 - [JD] 이 일을 하려면 '무엇을' 잘해야 하는가? (Hard/Soft)
6. 핵심 직무 역할 1
7. 핵심 직무 역할 2
8. 경쟁/트렌드 - 이 '시장'의 가장 큰 화두는 무엇인가?`;

const GEMINI_EXPERIENCE_HELP_TEXT = `해당 내용을 복사해서 제미나이에게 물어보면 더 빠르게 입력할수 있어요.

"아래는 내가 작성한 내 경험 정보에 대해서 적었어. 해당 경험정보를 통해 아래의 질문에 답변을 작성해줘."

1. 경험 제목 (예: 종합설계 프로젝트)
2. 계기나 목표
3. 마주한 어려움/문제
4. 해결을 위한 구체적 행동
5. 결과 확인 방식
6. 변화나 성과
7. 배운 점
8. 직무 연관성
9. 일하는 방식/철학 연관성
10. 향후 활용 방안

내경험 작성(하단에 자신의 경험에 대해 적으세요. 이전에 적은 자기소개서나 경력을 자유롭게 작성했던 과거자료를 작성해주시면 됩니다.)`;

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled, type = "button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
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

const InputField = ({ label, value, onChange, placeholder, multiline = false, isHighlighted, disabled = false }) => (
  <div className="mb-4 min-h-0">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {multiline ? (
      <textarea
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] transition-all duration-300 ${
            isHighlighted ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    ) : (
      <input
        type="text"
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ${
            isHighlighted ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    )}
  </div>
);

const MultiValueInput = ({ label, items = [], onChange, placeholder, isHighlighted, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (disabled || !inputValue.trim()) return;
    onChange([...items, inputValue.trim()]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index) => {
    if (disabled) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 transition-all duration-300 ${
            isHighlighted ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button onClick={handleAdd} variant="secondary" icon={Plus} disabled={disabled}>추가</Button>
      </div>
      <div className="space-y-2">
        {Array.isArray(items) && items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
            <span className="text-sm text-gray-700 break-all">{item}</span>
            {!disabled && (
              <button onClick={() => handleRemove(idx)} className="text-gray-400 hover:text-red-500 p-1 shrink-0">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {(!items || items.length === 0) && <p className="text-xs text-gray-400 ml-1">등록된 항목이 없습니다.</p>}
      </div>
    </div>
  );
};

const Card = ({ title, children, onDelete, onEdit, expandedContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-800 flex-1 mr-2 break-words">{title}</h3>
        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
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
const AuthScreen = ({ onGuestMode }) => {
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

        <div className="mt-6 space-y-4">
          {!resetMode && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
          )}
          
          {!resetMode && (
            <Button 
              type="button"
              variant="secondary" 
              className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              onClick={onGuestMode}
            >
              로그인 없이 참여하기
            </Button>
          )}

          <div className="text-center text-sm text-gray-500">
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
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestUserId, setGuestUserId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.GENERATOR);
  const [mobileSubTab, setMobileSubTab] = useState('form');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [savingTarget, setSavingTarget] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null); 
  const [editMode, setEditMode] = useState({ active: false, id: null, collection: null });
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const [showHelp, setShowHelp] = useState(null); 
  
  const [isMaximized, setIsMaximized] = useState(false);

  const mainContentRef = useRef(null);

  // Data Stores
  const [experiences, setExperiences] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profile, setProfile] = useState(null);

  // Form States
  const [expForm, setExpForm] = useState(EXP_QUESTIONS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  const [compForm, setCompForm] = useState(COMP_FIELDS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  const [profForm, setProfForm] = useState({ strength: [], keywords: [], values: [], goals: [] });
  
  // Generator Selections
  const [selections, setSelections] = useState({
    expIds: [], compId: '', compFields: {}, 
    profDetail: { strength: [], keywords: [], values: [], goals: [] }, 
    styleId: 's1', qType: '지원동기', limit: '900'
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const resultRef = useRef(null); 
  
  // Resize Logic States
  const [resultHeight, setResultHeight] = useState(200); 
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // --- Resize Handlers ---
  const startResize = (e) => {
    if (isMaximized) return;
    isResizing.current = true;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    startHeight.current = resultHeight;
    if(e.touches) document.body.style.overflow = 'hidden'; 
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchmove', handleResizeMove, { passive: false });
    window.addEventListener('touchend', stopResize);
  };

  const handleResizeMove = (e) => {
    if (!isResizing.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = startY.current - clientY; 
    const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight.current + delta));
    setResultHeight(newHeight);
    if(e.cancelable) e.preventDefault(); 
  };

  const stopResize = () => {
    isResizing.current = false;
    document.body.style.overflow = '';
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('touchmove', handleResizeMove);
    window.removeEventListener('touchend', stopResize);
  };

  // --- Find First User for Guest Mode ---
  const findFirstUserId = async () => {
    if (!db) return null;
    try {
      const usersRef = collection(db, 'artifacts', appId, 'users');
      const snapshot = await getDocs(usersRef);
      if (snapshot.empty) return null;
      
      // Find user with earliest experience or company creation
      let firstUserId = null;
      let earliestTime = null;
      
      for (const userDoc of snapshot.docs) {
        const userId = userDoc.id;
        const expRef = collection(db, 'artifacts', appId, 'users', userId, 'experiences');
        const compRef = collection(db, 'artifacts', appId, 'users', userId, 'companies');
        
        const [expSnapshot, compSnapshot] = await Promise.all([
          getDocs(query(expRef, orderBy('createdAt', 'asc'), firestoreLimit(1))),
          getDocs(query(compRef, orderBy('createdAt', 'asc'), firestoreLimit(1)))
        ]);
        
        const expTime = expSnapshot.docs[0]?.data()?.createdAt?.toMillis();
        const compTime = compSnapshot.docs[0]?.data()?.createdAt?.toMillis();
        
        const minTime = expTime && compTime 
          ? Math.min(expTime, compTime)
          : expTime || compTime;
        
        if (minTime && (!earliestTime || minTime < earliestTime)) {
          earliestTime = minTime;
          firstUserId = userId;
        }
      }
      
      // If no data found, use first user in collection
      return firstUserId || snapshot.docs[0].id;
    } catch (error) {
      console.error("Error finding first user:", error);
      return null;
    }
  };

  // --- Guest Mode Handler ---
  const handleGuestMode = async () => {
    const firstUserId = await findFirstUserId();
    if (!firstUserId) {
      alert('샘플 데이터를 찾을 수 없습니다. 먼저 계정을 생성해주세요.');
      return;
    }
    setGuestUserId(firstUserId);
    setIsGuestMode(true);
    setTutorialStep(1);
  };

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuestMode(false);
        setGuestUserId(null);
        setTutorialStep(1);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMobileSubTab('form');
  }, [activeTab]);

  useEffect(() => {
    if (!db) return;
    
    const targetUserId = isGuestMode ? guestUserId : (user?.uid);
    if (!targetUserId) return;
    
    const subExp = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUserId, 'experiences'), orderBy('createdAt', 'desc')),
      (snapshot) => setExperiences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const subComp = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUserId, 'companies'), orderBy('createdAt', 'desc')),
      (snapshot) => setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const subProf = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUserId, 'profiles'), firestoreLimit(1)),
      (snapshot) => {
         if (snapshot.empty) {
           // Init empty profile logic could be here if needed
         } else {
           const docData = snapshot.docs[0];
           const newData = { ...docData.data() };
           PROFILE_FIELDS.forEach(field => {
             if (!Array.isArray(newData[field.id])) newData[field.id] = [];
           });
           setProfile({ id: docData.id, ...newData });
           // Initial load for form
           if (!editMode.active && activeTab === TABS.PROFILE) {
              setProfForm(newData);
           }
         }
       }
    );

    return () => { subExp(); subComp(); subProf(); };
  }, [user, isGuestMode, guestUserId, activeTab]); 

  // --- Helpers ---
  const nextTutorial = () => {
    if (tutorialStep === 1) setTutorialStep(2);
    else setTutorialStep(0);
  };

  const finishTutorial = () => {
    setTutorialStep(0);
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const copyHelpText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert("제미나이 질문 양식이 복사되었습니다!");
        setShowHelp(null);
    });
  };

  // --- CRUD Operations ---
  const handleSave = async (targetName, colName, data, clearFn) => {
    if (isGuestMode) return alert("게스트 모드에서는 데이터를 저장할 수 없습니다.");
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
      alert(`[저장 실패] 오류 내용: ${error.message}`);
    } finally {
      setSavingTarget(null);
    }
  };

  const handleSaveProfile = async () => {
    if (isGuestMode) return alert("게스트 모드에서는 데이터를 저장할 수 없습니다.");
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
       alert(`[저장 실패] 오류 내용: ${error.message}`);
    } finally {
      setSavingTarget(null);
    }
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      setIsGuestMode(false);
      setGuestUserId(null);
      setUser(null);
      return;
    }
    if(confirm('로그아웃 하시겠습니까?')) await signOut(auth);
  };

  const resetExpForm = () => setExpForm(EXP_QUESTIONS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  const resetCompForm = () => setCompForm(COMP_FIELDS.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}));
  
  const handleEdit = (colName, item, setFormFn) => {
    if (isGuestMode) return alert("게스트 모드에서는 데이터를 수정할 수 없습니다.");
    setFormFn(item); 
    setEditMode({ active: true, id: item.id, collection: colName });
    setMobileSubTab('form');
    if (mainContentRef.current) mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    setIsFormHighlighted(true);
    setTimeout(() => setIsFormHighlighted(false), 2000);
    
    const isMobile = window.innerWidth < 768;
    showStatus('info', isMobile ? "모든 수정이 완료후 저장버튼을 눌러주세요!" : "내용을 수정한 뒤 하단의 '수정 완료' 버튼을 눌러주세요.");
  };

  const cancelEdit = (clearFn) => {
    setEditMode({ active: false, id: null, collection: null });
    if(clearFn) clearFn();
  };

  const handleDelete = async (colName, id) => {
    if (isGuestMode) return alert("게스트 모드에서는 데이터를 삭제할 수 없습니다.");
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, id));
    } catch (e) { alert('삭제 실패: ' + e.message); }
  };

  const toggleProfileItem = (fieldId, itemText) => {
    setSelections(prev => {
      const currentList = prev.profDetail[fieldId] || [];
      const exists = currentList.includes(itemText);
      return {
        ...prev,
        profDetail: {
          ...prev.profDetail,
          [fieldId]: exists ? currentList.filter(t => t !== itemText) : [...currentList, itemText]
        }
      };
    });
  };

  const generatePrompt = () => {
    if (selections.expIds.length === 0) return alert("최소 1개 이상의 경험을 선택해주세요.");
    if (!selections.compId) return alert("기업 정보를 선택해주세요.");

    const selExps = experiences.filter(e => selections.expIds.includes(e.id));
    const selComp = companies.find(e => e.id === selections.compId);
    const selStyle = PRESET_STYLES.find(s => s.id === selections.styleId) || PRESET_STYLES[0];

    let compInfoStr = `기업명: ${selComp.name} / 직무: ${selComp.role}\n`;
    COMP_FIELDS.forEach(field => {
       if(field.id !== 'name' && field.id !== 'role' && selections.compFields[field.id] && selComp[field.id]) {
         compInfoStr += `- ${field.label}: ${selComp[field.id]}\n`;
       }
    });

    let profInfoStr = "";
    let hasProfData = false;
    PROFILE_FIELDS.forEach(field => {
      const selectedItems = selections.profDetail[field.id] || [];
      if (selectedItems.length > 0) {
        hasProfData = true;
        profInfoStr += `- ${field.label}: ${selectedItems.join(', ')}\n`;
      }
    });
    if (!hasProfData) profInfoStr = "(선택된 정보 없음)";

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
${profInfoStr}

2-4) 지원자 핵심 경험 상세
${expInfoStr}

3. 핵심 지침 (Style Guide)
[Tone]: ${selStyle.tone}
[Focus]: ${selStyle.focus}
- 두괄식 구조, STAR 프레임워크 활용.
- 구체적인 수치와 성과 중심 서술.
- ${selections.limit}자 내외 준수.

4. 출력 (Output)
위 지침을 준수하여 최고의 자기소개서 초안을 작성해주세요.
`;
    setGeneratedPrompt(prompt);
    setTimeout(() => { resultRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  };

  const copyToClipboard = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => showStatus('success', '클립보드에 복사되었습니다!')).catch(() => alert('복사 실패'));
  };

  // --- Mobile Nav ---
  const MobileNav = ({ activeTab, setActiveTab, setEditMode }) => {
    const tabs = [
      { id: TABS.GENERATOR, icon: Layout, label: '생성' },
      { id: TABS.EXPERIENCE, icon: FileText, label: '경험' },
      { id: TABS.COMPANY, icon: Briefcase, label: '기업' },
      { id: TABS.PROFILE, icon: User, label: '정보' },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-[60] pb-safe md:hidden">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setEditMode({ active: false, id: null, collection: null }); }} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}>
            <tab.icon size={24} className={activeTab === tab.id ? 'fill-blue-100' : ''} />
            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // --- Sidebar ---
  const Sidebar = ({ activeTab, setActiveTab, setEditMode, tutorialStep, user, handleLogout, isGuestMode }) => (
    <div className={`hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shadow-lg relative ${tutorialStep > 0 ? 'z-auto' : 'z-10'}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <Sparkles className="fill-blue-600" /> <span>자소서 GPT</span>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className={tutorialStep === 2 ? "relative z-[60]" : ""}>
             <button onClick={() => { setActiveTab(TABS.GENERATOR); setEditMode({active:false,id:null,collection:null}); }} className={`flex items-center gap-2 px-4 py-3 rounded-lg w-full text-left transition-all duration-300 mb-1 ${activeTab === TABS.GENERATOR ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-blue-50'} ${tutorialStep === 2 ? 'ring-4 ring-yellow-400 scale-105 bg-white text-blue-700' : ''}`}>
                <Layout size={20}/> <span className="font-medium">프롬프트 생성기</span>
             </button>
          </div>
          <div className="text-xs font-bold text-gray-400 mt-6 mb-2 px-4 uppercase">데이터 관리</div>
          <div className={`transition-all duration-300 ${tutorialStep === 1 ? 'relative z-[60] bg-white p-2 -m-2 rounded-xl ring-4 ring-yellow-400 shadow-2xl' : ''}`}>
            {[
                {id: TABS.EXPERIENCE, icon: FileText, label: "1. 경험 (Experience)"},
                {id: TABS.COMPANY, icon: Briefcase, label: "2. 기업 (Company)"},
                {id: TABS.PROFILE, icon: User, label: "3. 자기 정보 (Me)"}
            ].map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setEditMode({active:false,id:null,collection:null}); }} className={`flex items-center gap-2 px-4 py-3 rounded-lg w-full text-left transition-all mb-1 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-blue-50'}`}>
                    <item.icon size={20}/> <span className="font-medium">{item.label}</span>
                </button>
            ))}
          </div>
        </nav>
        <div className="p-4 bg-gray-50 border-t">
           <p className="text-sm font-bold text-gray-700 mb-2 truncate">
             {isGuestMode ? '게스트 모드 (읽기 전용)' : (user?.email || '')}
           </p>
           {isGuestMode && (
             <p className="text-xs text-gray-500 mb-2">데이터 입력/수정 불가, 프롬프트 생성 가능</p>
           )}
           <button onClick={handleLogout} className="text-sm text-gray-500 flex items-center gap-2 hover:text-red-600">
             <LogOut size={16}/> {isGuestMode ? '나가기' : '로그아웃'}
           </button>
        </div>
    </div>
  );

  if (!auth) return <div className="p-10 text-red-500">Firebase 설정 오류</div>;
  if (!user && !isGuestMode) return <AuthScreen onGuestMode={handleGuestMode} />;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden relative">
      
      {/* Help Popup */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowHelp(null)}>
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                 <h3 className="font-bold text-blue-800 flex items-center gap-2"><Sparkles size={18}/> 제미나이 질문 도우미</h3>
                 <button onClick={() => setShowHelp(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
              </div>
              <div className="p-6 bg-gray-50">
                 <p className="text-sm text-gray-600 mb-4">아래 내용을 복사해서 제미나이(또는 ChatGPT)에게 물어보면 <br/>{showHelp === 'experience' ? '경험을 체계적으로 정리할 수' : '기업 분석 정보를 빠르게 채울 수'} 있습니다!</p>
                 <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap mb-4 shadow-inner max-h-64 overflow-y-auto">
                    {showHelp === 'experience' ? GEMINI_EXPERIENCE_HELP_TEXT : GEMINI_COMPANY_HELP_TEXT}
                 </div>
                 <Button className="w-full" onClick={() => copyHelpText(showHelp === 'experience' ? GEMINI_EXPERIENCE_HELP_TEXT : GEMINI_COMPANY_HELP_TEXT)} icon={Copy}>양식 복사하기</Button>
              </div>
           </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {tutorialStep > 0 && (
        <div className="fixed inset-0 bg-black/70 z-50 cursor-pointer animate-in fade-in duration-300" onClick={nextTutorial}>
          {/* Tutorial Steps - Unchanged */}
          {tutorialStep === 1 && (
            <div className="hidden md:block absolute left-[280px] top-[40%] text-white animate-bounce-x">
              <div className="flex items-center gap-4"><ArrowLeft size={48} className="text-yellow-400" /><div><h2 className="text-3xl font-bold text-yellow-400 mb-2">1단계: 재료 준비</h2><p className="text-xl font-medium">먼저 이 3개 탭에서 <br/>자신의 경험과 기업 정보를 작성해주세요.</p></div></div>
            </div>
          )}
          {tutorialStep === 1 && (
            <div className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center w-full px-4 animate-bounce-y">
               <div className="flex flex-col items-center gap-2"><div className="text-yellow-400"><ArrowDown size={40} /></div><h2 className="text-2xl font-bold text-yellow-400">1단계: 재료 준비</h2><p className="text-lg">하단 탭을 눌러<br/>경험과 정보를 채워주세요.</p></div>
            </div>
          )}
          {tutorialStep === 2 && (
            <div className="hidden md:block absolute left-[280px] top-14 text-white">
              <div className="flex items-center gap-4"><ArrowLeft size={48} className="text-yellow-400" /><div><h2 className="text-3xl font-bold text-yellow-400 mb-2">2단계: 요리하기</h2><p className="text-xl font-medium">프롬프트 생성기로 이동하여 <br/>1단계에서 작성한 재료를 조립하세요.</p><button onClick={(e) => { e.stopPropagation(); finishTutorial(); }} className="mt-4 bg-yellow-400 text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-300 transition-colors flex items-center gap-2">사용해보러 가기 <ChevronDown className="-rotate-90"/></button></div></div>
            </div>
          )}
          {tutorialStep === 2 && (
             <div className="md:hidden absolute bottom-20 left-4 text-white w-full px-4 animate-bounce-y">
                <div className="flex flex-col items-start gap-2"><div className="text-yellow-400 ml-4"><ArrowDown size={40} /></div><h2 className="text-2xl font-bold text-yellow-400">2단계: 프롬프트 생성</h2><p className="text-lg">여기서 재료를 조립해<br/>최고의 자소서를 만드세요.</p><button onClick={(e) => { e.stopPropagation(); finishTutorial(); }} className="mt-4 bg-yellow-400 text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-300">시작하기</button></div>
             </div>
          )}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
         <div className="flex items-center gap-2 text-blue-700 font-bold text-lg"><Sparkles className="fill-blue-600" size={20} /> <span>자소서 GPT</span></div>
         <div className="flex items-center gap-2">
           {isGuestMode && <span className="text-xs text-gray-500">게스트</span>}
           <button onClick={handleLogout} className="text-gray-500"><LogOut size={20}/></button>
         </div>
      </div>

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} setEditMode={setEditMode} tutorialStep={tutorialStep} user={user} handleLogout={handleLogout} isGuestMode={isGuestMode} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pt-14 md:pt-0 pb-16 md:pb-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 bg-white border-b border-gray-200 items-center justify-between px-8 shadow-sm shrink-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {activeTab === TABS.GENERATOR && "프롬프트 조립 & 생성"}
            {activeTab === TABS.EXPERIENCE && "나의 핵심 경험 관리"}
            {activeTab === TABS.COMPANY && "목표 기업 및 직무 분석"}
            {activeTab === TABS.PROFILE && "나의 정보 관리"}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === TABS.GENERATOR && generatedPrompt && <Button onClick={copyToClipboard} icon={Copy}>복사</Button>}
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 flex items-center gap-1 font-medium text-sm transition-colors"><LogOut size={18}/> 로그아웃</button>
          </div>
        </header>

        {/* PC: overflow-hidden, Mobile: overflow-y-auto */}
        <main ref={mainContentRef} className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-8 bg-gray-100 relative">
          {/* Status Toast */}
          {statusMsg && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[70] p-3 rounded-full shadow-lg border animate-in slide-in-from-top-4 fade-in duration-200 flex items-center gap-2 font-medium ${statusMsg.type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : statusMsg.type === 'info' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={18}/> : statusMsg.type === 'info' ? <Info size={18}/> : <AlertCircle size={18}/>}
                {statusMsg.text}
            </div>
          )}
          
          {/* Generator Tab */}
          {activeTab === TABS.GENERATOR && (
            <div className="flex flex-col md:flex-row gap-6 h-full relative">
              {/* Left Side: Inputs Area */}
              <div className="w-full md:w-7/12 flex flex-col h-full overflow-hidden">
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100 shrink-0"><h3 className="font-bold text-lg text-gray-800">재료 선택</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
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
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                         </select>
                         {selections.compId && (
                           <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded">
                              {COMP_FIELDS.map(f => {
                                 if (f.id === 'name' || f.id === 'role') return null;
                                 const c = companies.find(x=>x.id===selections.compId);
                                 if(!c?.[f.id]) return null;
                                 return (
                                   <label key={f.id} className="flex items-start gap-2 text-xs cursor-pointer p-1 hover:bg-white rounded">
                                      <input type="checkbox" className="mt-1 shrink-0" checked={!!selections.compFields[f.id]} onChange={() => setSelections(p => ({...p, compFields: {...p.compFields, [f.id]: !p.compFields[f.id]}}))} />
                                      <div><span className="font-bold block text-gray-700">{f.shortLabel}</span><span className="text-gray-500 block leading-tight">{c[f.id]}</span></div>
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
                               <div key={e.id} onClick={() => setSelections(p => ({...p, expIds: p.expIds.includes(e.id) ? p.expIds.filter(x=>x!==e.id) : [...p.expIds, e.id]}))} className={`p-2 rounded text-sm cursor-pointer flex gap-2 ${selections.expIds.includes(e.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}>
                                  {selections.expIds.includes(e.id)?<CheckSquare size={16} className="shrink-0"/>:<Square size={16} className="shrink-0"/>} <span className="truncate">{e.title}</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">내 정보 포함</label>
                         <div className="bg-gray-50 p-2 rounded space-y-2">
                            {PROFILE_FIELDS.map(f => {
                               const savedItems = profile?.[f.id] || [];
                               return (
                                 <div key={f.id}>
                                    <p className="text-xs font-bold text-gray-500 mb-1">{f.label}</p>
                                    {Array.isArray(savedItems) && savedItems.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {savedItems.map((item, idx) => (
                                          <label key={idx} className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${selections.profDetail[f.id]?.includes(item) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                             <input type="checkbox" className="hidden" checked={selections.profDetail[f.id]?.includes(item)} onChange={() => toggleProfileItem(f.id, item)} />
                                             {selections.profDetail[f.id]?.includes(item) ? <CheckCircle2 size={12}/> : <Square size={12}/>}
                                             {item}
                                          </label>
                                        ))}
                                      </div>
                                    ) : <p className="text-xs text-gray-400 pl-1">(작성된 항목 없음)</p>}
                                 </div>
                               )
                            })}
                         </div>
                      </div>

                      <div className="pb-10 md:pb-0">
                          <label className="block text-sm font-bold text-gray-700 mb-2">자소서 스타일 선택</label>
                          <select className="w-full p-2 border rounded bg-gray-50" value={selections.styleId} onChange={e => setSelections({...selections, styleId:e.target.value})}>
                              {PRESET_STYLES.map(s => (<option key={s.id} value={s.id}>{s.tone} - {s.focus}</option>))}
                          </select>
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 shrink-0 bg-white md:relative fixed bottom-16 left-0 right-0 md:bottom-0 md:left-auto md:right-auto z-50 md:z-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
                       <div className="md:hidden absolute -top-12 left-1/2 -translate-x-1/2 text-blue-500 animate-bounce pointer-events-none bg-white/90 rounded-full p-2 shadow-sm border border-gray-100"><ArrowDown size={20} /></div>
                       <Button className="w-full py-3 shadow-lg md:shadow-none text-lg md:text-base font-bold" onClick={generatePrompt} disabled={savingTarget === 'generator'} icon={Sparkles}>프롬프트 생성</Button>
                    </div>
                 </div>
              </div>

              {/* Right Side: Result Area */}
              <div 
                ref={resultRef} 
                onClick={copyToClipboard} 
                style={!isMaximized ? { height: window.innerWidth < 768 ? `${resultHeight}px` : 'auto', minHeight: window.innerWidth < 768 ? '100px' : '0' } : {}}
                className={`bg-slate-900 text-slate-200 overflow-y-auto whitespace-pre-wrap font-mono text-sm border border-slate-700 relative transition-all duration-300 ease-out cursor-pointer hover:bg-slate-800 
                    ${isMaximized 
                        ? 'fixed inset-0 z-[80] m-0 rounded-none w-full h-full p-8 pt-12' 
                        : 'w-full md:w-5/12 rounded-xl p-6 mb-32 md:mb-0'
                    }`}
                title="클릭하여 복사"
              >
                 {/* Resize Handle (Mobile Only, when not maximized) */}
                 {!isMaximized && (
                    <div 
                        className="md:hidden absolute top-0 left-0 right-0 h-8 flex items-center justify-center bg-slate-800 border-b border-slate-700 cursor-row-resize rounded-t-xl touch-none"
                        onTouchStart={startResize}
                        onMouseDown={startResize}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripHorizontal className="text-slate-500" />
                    </div>
                 )}
                 
                 {/* Maximize/Minimize Toggle Button (Right Top) */}
                 <div className="absolute top-2 right-2 z-10">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white shadow-md transition-colors"
                    >
                        {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                 </div>

                 <div className={!isMaximized ? "mt-4 md:mt-0" : ""}>
                    {generatedPrompt || "좌측에서 재료를 선택하여 프롬프트를 생성하세요."}
                 </div>
              </div>
            </div>
          )}

          {/* Experience Tab (Mobile Tabs Implementation) */}
          {activeTab === TABS.EXPERIENCE && (
            <>
               <div className="md:hidden flex mb-4 bg-gray-200 p-1 rounded-lg shrink-0">
                  <button className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mobileSubTab === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`} onClick={() => setMobileSubTab('form')}>✏️ 작성하기</button>
                  <button className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mobileSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`} onClick={() => setMobileSubTab('list')}>📋 목록 ({experiences.length})</button>
               </div>
               <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 h-auto lg:h-full">
                  {/* Form Section */}
                  <div className={`${mobileSubTab === 'list' ? 'hidden' : 'flex'} lg:flex bg-white rounded-xl border border-gray-200 flex-col h-auto lg:h-full order-1 lg:order-none overflow-hidden ${isFormHighlighted ? 'ring-4 ring-yellow-300 transition-all duration-500' : ''}`}>
                     <div className="flex justify-between p-6 border-b border-gray-100 shrink-0 bg-white items-center">
                        <h3 className="font-bold text-blue-800">{editMode.active && editMode.collection==='experiences' ? '경험 수정' : '새 경험 등록'}</h3>
                        <button onClick={() => setShowHelp('experience')} className="text-gray-400 hover:text-blue-500"><HelpCircle size={20}/></button>
                        {editMode.active && editMode.collection==='experiences' && <Button variant="ghost" onClick={() => cancelEdit(resetExpForm)}><XCircle size={14}/> 취소</Button>}
                     </div>
                     {isGuestMode && (
                       <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                         <p className="text-sm text-yellow-800 flex items-center gap-2">
                           <AlertCircle size={16}/> 게스트 모드에서는 데이터를 입력하거나 수정할 수 없습니다.
                         </p>
                       </div>
                     )}
                     <div className="flex-1 lg:overflow-y-auto p-6 custom-scrollbar space-y-4 min-h-0">
                        {EXP_QUESTIONS.map(q => (
                           <InputField key={q.id} label={q.label} value={expForm[q.id]} onChange={v => setExpForm(p => ({...p, [q.id]: v}))} multiline={q.id!=='title'} isHighlighted={isFormHighlighted} disabled={isGuestMode} />
                        ))}
                     </div>
                     <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
                        <Button className="w-full" onClick={() => handleSave('experience', 'experiences', expForm, resetExpForm)} disabled={savingTarget === 'experience' || isGuestMode} icon={Save}>{savingTarget === 'experience' ? '저장 중...' : '저장하기'}</Button>
                     </div>
                  </div>

                  {/* List Section */}
                  <div className={`${mobileSubTab === 'form' ? 'hidden' : 'flex'} lg:flex flex-col h-auto lg:h-full lg:overflow-hidden order-2 lg:order-none`}>
                     <h3 className="font-bold text-gray-700 mb-4 shrink-0">목록 ({experiences.length})</h3>
                     <div className="grid gap-4 pb-24 lg:pb-10 pr-2 custom-scrollbar lg:overflow-y-auto h-auto lg:h-full">
                        {experiences.map(e => (
                           <Card key={e.id} title={e.title} onDelete={isGuestMode ? null : ()=>handleDelete('experiences', e.id)} onEdit={isGuestMode ? null : ()=>handleEdit('experiences', e, setExpForm)} 
                                 expandedContent={<div className="space-y-3 text-sm">
                                  {EXP_QUESTIONS.slice(1).map(q => 
                                    e[q.id] ? (
                                      <div key={q.id}>
                                        <strong className="block text-xs text-blue-600 mb-1">{q.label}</strong>
                                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                           {typeof e[q.id] === 'object' ? JSON.stringify(e[q.id]) : String(e[q.id])}
                                        </p>
                                      </div>
                                    ) : null
                                  )}
                                </div>}>
                              <p className="line-clamp-2 mt-2 text-gray-600">{e.result}</p>
                           </Card>
                        ))}
                     </div>
                  </div>
               </div>
            </>
          )}

          {/* Company Tab */}
          {activeTab === TABS.COMPANY && (
             <>
                <div className="md:hidden flex mb-4 bg-gray-200 p-1 rounded-lg shrink-0">
                   <button className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mobileSubTab === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`} onClick={() => setMobileSubTab('form')}>✏️ 작성하기</button>
                   <button className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mobileSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`} onClick={() => setMobileSubTab('list')}>📋 목록 ({companies.length})</button>
                </div>
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 h-auto lg:h-full">
                   <div className={`${mobileSubTab === 'list' ? 'hidden' : 'flex'} lg:flex bg-white rounded-xl border border-gray-200 flex-col h-auto lg:h-full order-1 lg:order-none overflow-hidden ${isFormHighlighted ? 'ring-4 ring-yellow-300 transition-all duration-500' : ''}`}>
                      <div className="flex justify-between p-6 border-b border-gray-100 shrink-0 bg-white items-center">
                         <h3 className="font-bold text-blue-800">{editMode.active && editMode.collection==='companies' ? '기업 수정' : '새 기업 등록'}</h3>
                         <button onClick={() => setShowHelp('company')} className="text-gray-400 hover:text-blue-500"><HelpCircle size={20}/></button>
                         {editMode.active && editMode.collection==='companies' && <Button variant="ghost" onClick={() => cancelEdit(resetCompForm)}><XCircle size={14}/> 취소</Button>}
                      </div>
                      {isGuestMode && (
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                          <p className="text-sm text-yellow-800 flex items-center gap-2">
                            <AlertCircle size={16}/> 게스트 모드에서는 데이터를 입력하거나 수정할 수 없습니다.
                          </p>
                        </div>
                      )}
                      <div className="flex-1 lg:overflow-y-auto p-6 custom-scrollbar space-y-4 min-h-0">
                         <InputField label="기업명" value={compForm.name} onChange={v=>setCompForm(p=>({...p, name:v}))} isHighlighted={isFormHighlighted} disabled={isGuestMode} />
                         <InputField label="직무" value={compForm.role} onChange={v=>setCompForm(p=>({...p, role:v}))} isHighlighted={isFormHighlighted} disabled={isGuestMode} />
                         {COMP_FIELDS.slice(2).map(f => (
                            <InputField key={f.id} label={f.label} value={compForm[f.id]} onChange={v=>setCompForm(p=>({...p, [f.id]:v}))} multiline placeholder={f.placeholder} isHighlighted={isFormHighlighted} disabled={isGuestMode} />
                         ))}
                      </div>
                      <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
                         <Button className="w-full" onClick={() => handleSave('company', 'companies', compForm, resetCompForm)} disabled={savingTarget === 'company' || isGuestMode} icon={Save}>{savingTarget === 'company' ? '저장 중...' : '저장하기'}</Button>
                      </div>
                   </div>

                   <div className={`${mobileSubTab === 'form' ? 'hidden' : 'flex'} lg:flex flex-col h-auto lg:h-full lg:overflow-hidden order-2 lg:order-none`}>
                      <h3 className="font-bold text-gray-700 mb-4 shrink-0">목록 ({companies.length})</h3>
                      <div className="grid gap-4 pb-24 lg:pb-10 pr-2 custom-scrollbar lg:overflow-y-auto h-auto lg:h-full">
                         {companies.map(c => (
                            <Card key={c.id} title={`${c.name} (${c.role})`} onDelete={isGuestMode ? null : ()=>handleDelete('companies', c.id)} onEdit={isGuestMode ? null : ()=>handleEdit('companies', c, setCompForm)}
                                  expandedContent={<div className="space-y-3 text-sm">
                                  {COMP_FIELDS.slice(2).map(f => 
                                    c[f.id] ? (
                                      <div key={f.id}>
                                        <strong className="block text-xs text-blue-600 mb-1">{f.label}</strong>
                                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                           {typeof c[f.id] === 'object' ? JSON.stringify(c[f.id]) : String(c[f.id])}
                                        </p>
                                      </div>
                                    ) : null
                                  )}
                                </div>}>
                               <div className="mt-2 text-xs text-gray-500 space-y-1">
                                  {c.vision && <p className="line-clamp-1">비전: {c.vision}</p>}
                                  {c.jd_skills && <p className="line-clamp-1">역량: {c.jd_skills}</p>}
                               </div>
                            </Card>
                         ))}
                      </div>
                   </div>
                </div>
             </>
          )}

          {/* Profile Tab */}
          {activeTab === TABS.PROFILE && (
             <div className="max-w-3xl mx-auto h-full overflow-y-auto custom-scrollbar p-1 pb-32 lg:pb-0">
                <div className={`bg-white p-8 rounded-xl border border-gray-200 mb-20 md:mb-0 ${isFormHighlighted ? 'ring-4 ring-yellow-300 transition-all duration-500' : ''}`}>
                   <h3 className="font-bold text-xl mb-6 text-blue-800 flex items-center gap-2"><User size={24}/> 나의 정보 관리 (자동 저장 아님)</h3>
                   {isGuestMode && (
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                       <p className="text-sm text-yellow-800 flex items-center gap-2">
                         <AlertCircle size={16}/> 게스트 모드에서는 데이터를 입력하거나 수정할 수 없습니다.
                       </p>
                     </div>
                   )}
                   <div className="space-y-8">
                      {PROFILE_FIELDS.map(f => (
                         <MultiValueInput key={f.id} label={f.label} items={profForm[f.id] || []} onChange={newItems => setProfForm(prev => ({ ...prev, [f.id]: newItems }))} placeholder={`${f.label.split(' ').slice(1).join(' ')} 입력 후 Enter 또는 추가 버튼`} isHighlighted={isFormHighlighted} disabled={isGuestMode} />
                      ))}
                      <div className="pt-4 border-t pb-20 md:pb-0">
                        <Button className="w-full py-3" onClick={handleSaveProfile} disabled={savingTarget === 'profile' || isGuestMode} icon={Save}>{savingTarget === 'profile' ? '저장 중...' : (profile ? '정보 업데이트' : '정보 저장')}</Button>
                        <p className="text-xs text-gray-400 text-center mt-2">* 작성 후 반드시 저장 버튼을 눌러주세요.</p>
                      </div>
                   </div>
                </div>
             </div>
          )}
          
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} setEditMode={setEditMode} />
      </div>
    </div>
  );
}