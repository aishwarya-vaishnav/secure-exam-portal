import React, { useState, useEffect } from 'react';
import './App.css';
import { practiceQuestions, mockTests } from './questionsData';

function App() {
  // --- States ---
  const [screen, setScreen] = useState('home'); // home, student-login-form, dashboard, practice-portal, mock-portal, quiz, result, admin-panel, admin-login-screen
  const [quizMode, setQuizMode] = useState(''); 
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700);

  // Practice Mode Answer Lock State
  const [practiceAnswered, setPracticeAnswered] = useState({}); 

  // मुख्य स्टुडंट लॉगिन व्हेरीफिकेशन स्टेट
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false); 

  // Attempted Practice Sets State
  const [attemptedPracticeSets, setAttemptedPracticeSets] = useState([]); 

  // Admin Security States
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [localResults, setLocalResults] = useState([]); 

  // 🔐 ॲडमिनने अप्रूव्ह केलेल्या विद्यार्थियोंची लिस्ट
  const [allowedStudents, setAllowedStudents] = useState([]);
  const [newAllowedMobile, setNewAllowedMobile] = useState('');

  // Candidate Registration Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: ''
  });

  // --- लोकल स्टोरेजमधून डेटा लोड करणे (मोबाईल नंबरनुसार सुरक्षित बदल) ---
  useEffect(() => {
    const historyKey = formData.mobile ? `attemptedPractice_${formData.mobile.trim()}` : 'attemptedPractice';
    const history = JSON.parse(localStorage.getItem(historyKey)) || [];
    setAttemptedPracticeSets(history);

    const approved = JSON.parse(localStorage.getItem('allowedStudentsList')) || [];
    setAllowedStudents(approved);
  }, [screen, formData.mobile]);

  // --- 🔒 २४ तास लिमिट + सिंगल डिव्हाईस सेशन चेक ---
  useEffect(() => {
    // १. २४ तासांची टाईम लिमिट चेकिंग
    const loginTimestamp = localStorage.getItem('studentLoginTime');
    if (loginTimestamp) {
      const hoursPassed = (new Date().getTime() - parseInt(loginTimestamp)) / (1000 * 60 * 60);
      if (hoursPassed >= 24) {
        localStorage.removeItem('studentLoginTime');
        localStorage.removeItem('currentSessionToken');
        setIsStudentLoggedIn(false);
        setFormData({ name: '', email: '', mobile: '' });
        setScreen('home');
        alert("⏰ Your 24-hour session has expired! Please login again.");
        return;
      }
    }

    // २. सिंगल डिव्हाईस लॉगिन चेकिंग (डबल लॉगिन प्रिव्हेंशन)
    if (isStudentLoggedIn && formData.mobile) {
      const activeSessions = JSON.parse(localStorage.getItem('activeStudentSessions')) || {};
      const mySavedToken = localStorage.getItem('currentSessionToken');

      if (activeSessions[formData.mobile] !== mySavedToken) {
        localStorage.removeItem('studentLoginTime');
        localStorage.removeItem('currentSessionToken');
        setIsStudentLoggedIn(false);
        setFormData({ name: '', email: '', mobile: '' });
        setScreen('home');
        alert("⚠️ Access Revoked! This mobile number has been logged in on another device/browser. You are disconnected.");
      }
    }
  }, [screen, isStudentLoggedIn, formData.mobile]);

  // --- Fisher-Yates Shuffle Algorithm ---
  const shuffleArray = (array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // --- Score Calculation ---
  const getDetailedScore = () => {
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    questions.forEach((q) => {
      const selected = selectedOptions[q.id];
      if (!selected) {
        unattempted++;
      } else if (selected === q.correctOption) {
        correct++;
      } else {
        wrong++;
      }
    });

    return { correct, wrong, unattempted, total: questions.length };
  };

  // --- Submit Quiz & Save to LocalStorage (मोबाईल नंबरनुसार सुरक्षित बदल) ---
  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    const { correct, total } = getDetailedScore();

    if (quizMode === 'mock') {
      const newResult = {
        timestamp: new Date().toLocaleString(),
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        testName: quizTitle,
        score: `${correct} / ${total}`
      };

      const existingResults = JSON.parse(localStorage.getItem('studentResults')) || [];
      existingResults.push(newResult);
      localStorage.setItem('studentResults', JSON.stringify(existingResults));
    } else if (quizMode === 'practice') {
      const historyKey = formData.mobile ? `attemptedPractice_${formData.mobile.trim()}` : 'attemptedPractice';
      const existingPractice = JSON.parse(localStorage.getItem(historyKey)) || [];
      if (!existingPractice.includes(quizTitle)) {
        existingPractice.push(quizTitle);
        localStorage.setItem(historyKey, JSON.stringify(existingPractice));
        setAttemptedPracticeSets(existingPractice);
      }
    }
    setScreen('result'); 
  };

  const handleAutoSubmit = () => {
    alert("⏰ Time's up! Your Mock Test is submitting automatically.");
    handleSubmitQuiz();
  };

  useEffect(() => {
    if (screen === 'quiz' && quizMode === 'mock' && !isSubmitted) {
      if (timeLeft <= 0) {
        handleAutoSubmit();
        return;
      }
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, screen, quizMode, isSubmitted]);

  // --- Load Data for Admin Panel ---
  const openAdminPanel = () => {
    const data = JSON.parse(localStorage.getItem('studentResults')) || [];
    setLocalResults(data);
    
    const approved = JSON.parse(localStorage.getItem('allowedStudentsList')) || [];
    setAllowedStudents(approved);

    setScreen('admin-panel');
  };

  // --- Admin Login Verification ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === process.env.REACT_APP_ADMIN_PASSWORD) { 
      openAdminPanel(); 
      setAdminError('');
      setAdminPassword('');
    } else {
      setAdminError('❌ Wrong Password! Access Denied.');
    }
  };

  // --- ॲडमिनने नवीन मोबाईल नंबर अप्रूव्ह करणे ---
  const handleAddAllowedStudent = (e) => {
    e.preventDefault();
    if (!newAllowedMobile.trim() || newAllowedMobile.length < 10) {
      alert("⚠️ Please enter a valid 10-digit mobile number!");
      return;
    }
    const existingList = JSON.parse(localStorage.getItem('allowedStudentsList')) || [];
    if (existingList.includes(newAllowedMobile.trim())) {
      alert("ℹ️ This mobile number is already approved!");
      return;
    }
    existingList.push(newAllowedMobile.trim());
    localStorage.setItem('allowedStudentsList', JSON.stringify(existingList));
    setAllowedStudents(existingList);
    setNewAllowedMobile('');
    alert("✅ Student Mobile Number Approved Successfully!");
  };

  // --- ॲडमिनने अप्रूव्ह केलेला नंबर काढून टाकणे ---
  const handleRemoveAllowedStudent = (mobileNum) => {
    const existingList = JSON.parse(localStorage.getItem('allowedStudentsList')) || [];
    const updatedList = existingList.filter(num => num !== mobileNum);
    localStorage.setItem('allowedStudentsList', JSON.stringify(updatedList));
    setAllowedStudents(updatedList);

    const activeSessions = JSON.parse(localStorage.getItem('activeStudentSessions')) || {};
    delete activeSessions[mobileNum];
    localStorage.setItem('activeStudentSessions', JSON.stringify(activeSessions));
  };

  // --- Start Quiz Logic ---
  const startQuiz = (mode, title, rawQuestions) => {
    setQuizMode(mode);
    setQuizTitle(title);
    setIsSubmitted(false);
    setCurrentIdx(0);
    setSelectedOptions({});
    setPracticeAnswered({}); 

    if (mode === 'practice') {
      const shuffledAll = shuffleArray(practiceQuestions);
      setQuestions(shuffledAll.slice(0, 50));
    } else {
      setQuestions(shuffleArray(rawQuestions));
      setTimeLeft(2700); 
    }
    setScreen('quiz');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Handle Option Selection ---
  const handleSelectOption = (qId, optionChar) => {
    if (quizMode === 'mock' && isSubmitted) return;
    if (quizMode === 'practice' && practiceAnswered[qId]) return;

    setSelectedOptions({
      ...selectedOptions,
      [qId]: optionChar
    });

    if (quizMode === 'practice') {
      setPracticeAnswered({
        ...practiceAnswered,
        [qId]: true
      });
    }
  };

  const downloadCSV = () => {
    if (localResults.length === 0) {
      alert("⚠️ No student data available to download!");
      return;
    }
    let csvRows = [];
    csvRows.push("Timestamp,Student Name,Email ID,Mobile Number,Test Name,Score Obtained");
    localResults.forEach((row) => {
      const rowStr = `"${row.timestamp}","${row.name}","${row.email}","${row.mobile}","${row.testName}","${row.score}"`;
      csvRows.push(rowStr);
    });
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Results_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearDatabase = () => {
    if (window.confirm("⚠️ Are you sure you want to delete ALL collected student data? This cannot be undone!")) {
      localStorage.removeItem('studentResults');
      setLocalResults([]);
      alert("Database cleared successfully.");
    }
  };

  // --- Strict Student Login Verification WITH SESSION TOKEN & BLOCK MULTI-ATTEMPT ---
  const handleStudentLoginSubmit = (e) => {
    e.preventDefault();
    const inputMobile = formData.mobile.trim();

    // 🔒 चेकिंग १: नंबर ॲडमिन लिस्टमध्ये आहे का?
    const approvedList = JSON.parse(localStorage.getItem('allowedStudentsList')) || [];
    if (!approvedList.includes(inputMobile)) {
      alert("❌ Access Denied! Your mobile number is not registered/approved by the Admin. Please contact the instructor.");
      return;
    }

    // 🔒 चेकिंग २: या नंबरवरून आधीच टेस्ट सबमिट झाली आहे का?
    const existingResults = JSON.parse(localStorage.getItem('studentResults')) || [];
    const hasAlreadySubmitted = existingResults.some(result => result.mobile === inputMobile);
    if (hasAlreadySubmitted) {
      alert("❌ Exam Already Taken! A test result has already been submitted for this mobile number. Multiple attempts are strictly prohibited.");
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      alert("⚠️ Please fill in all details accurately!");
      return;
    }

    // युनिक सेशन टोकन तयार करणे
    const newGeneratedToken = 'TOKEN_' + Math.random().toString(36).substr(2, 9) + '_' + new Date().getTime();
    
    const activeSessions = JSON.parse(localStorage.getItem('activeStudentSessions')) || {};
    activeSessions[inputMobile] = newGeneratedToken;
    localStorage.setItem('activeStudentSessions', JSON.stringify(activeSessions));

    localStorage.setItem('currentSessionToken', newGeneratedToken);
    localStorage.setItem('studentLoginTime', new Date().getTime().toString());

    setIsStudentLoggedIn(true); 
    setScreen('dashboard'); 
    alert(`🎉 Welcome ${formData.name}! Secure Single-Device Session Approved.`);
  };

  // --- लॉग आऊट फंक्शन (स्क्रीन रीसेट बदल) ---
  const handleStudentLogOut = () => {
    const activeSessions = JSON.parse(localStorage.getItem('activeStudentSessions')) || {};
    delete activeSessions[formData.mobile];
    localStorage.setItem('activeStudentSessions', JSON.stringify(activeSessions));

    localStorage.removeItem('studentLoginTime');
    localStorage.removeItem('currentSessionToken');

    setIsStudentLoggedIn(false);
    setFormData({ name: '', email: '', mobile: '' });
    setAttemptedPracticeSets([]); // लॉग आऊट झाल्यावर प्रॅक्टिस हिस्ट्री स्टेट रीसेट करणे
    setScreen('home');
  };

  const scoreDetails = getDetailedScore();

  return (
    <div className={`app-container ${screen === 'home' ? 'home-bg' : ''}`}>
      
      {/* 1. LANDING HOME PAGE */}
      {screen === 'home' && (
        <div className="home-page-wrapper">
          <div className="top-nav-buttons">
            <button className="btn-top btn-student-login" onClick={() => setScreen(isStudentLoggedIn ? 'dashboard' : 'student-login-form')}>
              {isStudentLoggedIn ? '📊 Go to Dashboard' : '👨‍🎓 Student Login'}
            </button>
            <button className="btn-top btn-admin-login" onClick={() => setScreen('admin-login-screen')}>
              🔒 Admin Login
            </button>
          </div>

          <div className="home-hero-content animate-fade">
            <h1 className="main-portal-title">🎓 Exam Preparation Portal</h1>
            <p className="main-portal-subtitle">
              Your Exam. Your Clock. Your Success.
            </p>
            <button className="btn-get-started" onClick={() => setScreen(isStudentLoggedIn ? 'dashboard' : 'student-login-form')}>
              {isStudentLoggedIn ? 'Go to Dashboard Hub →' : 'Get Started Now →'}
            </button>
          </div>
        </div>
      )}

      {/* 2. STUDENT LOGIN SCREEN */}
      {screen === 'student-login-form' && (
        <div className="login-card-container animate-fade">
          <div className="login-glass-card">
            <div className="login-header">
              <div className="user-icon-circle">
                <i className="fa-solid fa-user-graduate"></i>
              </div>
              <h2>Student Login</h2>
              <p>Enter your details to access the portal</p>
            </div>
            
            <form onSubmit={handleStudentLoginSubmit} className="styled-form">
              <div className="input-group">
                <i className="fa-solid fa-user input-icon"></i>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              
              <div className="input-group">
                <i className="fa-solid fa-envelope input-icon"></i>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              
              <div className="input-group">
                <i className="fa-solid fa-phone input-icon"></i>
                <input 
                  type="tel" 
                  placeholder="Registered Mobile Number" 
                  required 
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                />
              </div>
              
              <button type="submit" className="btn-login-submit">
                Verify & Enter Portal <i className="fa-solid fa-arrow-right-to-bracket"></i>
              </button>
            </form>
            
            <button className="btn-login-back" onClick={() => setScreen('home')}>
              ← Back to Home
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD */}
      {screen === 'dashboard' && isStudentLoggedIn && (
        <div className="dashboard-box animate-fade">
          <div style={{display: 'flex', justifyContent: 'space-between', margin: '20px 0', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
            <span style={{fontSize: '15px', color: '#7f8c8d'}}>Candidate: <strong>{formData.name}</strong></span>
            <button onClick={handleStudentLogOut} style={{background: '#e74c3c', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>🚪 Log Out</button>
          </div>
          
          <h2>Welcome to Evaluation Hub!</h2>
          <p>Select your practice preference or challenge yourself with timed tests.</p>
          <div className="main-buttons">
            <button className="btn btn-main" onClick={() => setScreen('practice-portal')}>
              📖 Practice Test Zone
            </button>
            <button className="btn btn-main" onClick={() => setScreen('mock-portal')}>
              ⏳ Mock Test Series
            </button>
          </div>
          <button className="btn btn-back mt-20" onClick={() => setScreen('home')}>&larr; Back to Home Page</button>
        </div>
      )}

      {/* 4. PRACTICE MODE PORTAL */}
      {screen === 'practice-portal' && isStudentLoggedIn && (
        <div className="dashboard-box">
          <h2 style={{color: '#2c3e50', fontSize: '26px', marginBottom: '5px'}}>🎯 Shuffled Practice Zone</h2>
          <p style={{color: '#7f8c8d', fontSize: '15px', fontStyle: 'italic', marginBottom: '25px'}}>
            ⚡ Boost your preparation with 50 random mixed questions!
          </p>
          
          <div className="button-group">
            <button className="btn btn-practice" onClick={() => startQuiz('practice', 'Practice Set 1', [])}>
              Start Practice Set 1 {attemptedPracticeSets.includes('Practice Set 1') && <span className="attempted-badge">✅ Attempted</span>}
            </button>
            <button className="btn btn-practice" onClick={() => startQuiz('practice', 'Practice Set 2', [])}>
              Start Practice Set 2 {attemptedPracticeSets.includes('Practice Set 2') && <span className="attempted-badge">✅ Attempted</span>}
            </button>
            <button className="btn btn-practice" onClick={() => startQuiz('practice', 'Practice Set 3', [])}>
              Start Practice Set 3 {attemptedPracticeSets.includes('Practice Set 3') && <span className="attempted-badge">✅ Attempted</span>}
            </button>
            <button className="btn btn-practice" onClick={() => startQuiz('practice', 'Practice Set 4', [])}>
              Start Practice Set 4 {attemptedPracticeSets.includes('Practice Set 4') && <span className="attempted-badge">✅ Attempted</span>}
            </button>
            <button className="btn btn-practice" onClick={() => startQuiz('practice', 'Practice Set 5', [])}>
              Start Practice Set 5 {attemptedPracticeSets.includes('Practice Set 5') && <span className="attempted-badge">✅ Attempted</span>}
            </button>
            
            <button className="btn btn-back" onClick={() => setScreen('dashboard')}>&larr; Back to Dashboard</button>
          </div>
        </div>
      )}

      {/* 5. MOCK TEST PORTAL */}
      {screen === 'mock-portal' && isStudentLoggedIn && (
        <div className="dashboard-box">
          <h2>⏳ Mock Test Series</h2>
          <p>45 Minutes | 1 Mark Per Question | Timed Live Assessment</p>
          
          <div className="button-group animate-fade" style={{marginTop: '20px'}}>
            <button className="btn btn-mock" onClick={() => startQuiz('mock', 'Mock Test 1', mockTests.mock1)}>Start Mock Test 1</button>
            <button className="btn btn-mock" onClick={() => startQuiz('mock', 'Mock Test 2', mockTests.mock2)}>Start Mock Test 2</button>
            <button className="btn btn-mock" onClick={() => startQuiz('mock', 'Mock Test 3', mockTests.mock3)}>Start Mock Test 3</button>
            <button className="btn btn-mock" onClick={() => startQuiz('mock', 'Mock Test 4', mockTests.mock4)}>Start Mock Test 4</button>
            <button className="btn btn-mock" onClick={() => startQuiz('mock', 'Mock Test 5', mockTests.mock5)}>Start Mock Test 5</button>
          </div>

          <div style={{marginTop: '20px'}}>
            <button className="btn btn-back" onClick={() => setScreen('dashboard')}>&larr; Back to Dashboard</button>
          </div>
        </div>
      )}

      {/* 0. ADMIN LOGIN SCREEN */}
      {screen === 'admin-login-screen' && (
        <div className="dashboard-box text-center">
          <h2>🔒 Secured Admin Access</h2>
          <p>Enter password to view reports and manage registrations.</p>
          <form onSubmit={handleAdminLogin} className="form-container" style={{maxWidth: '300px', margin: '0 auto'}}>
            <input 
              type="password" 
              placeholder="Enter Admin Password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
            {adminError && <p style={{color: 'red', fontSize: '14px'}}>{adminError}</p>}
            <button type="submit" className="btn btn-main" style={{width: '100%', marginTop: '10px'}}>Login</button>
          </form>
          <button className="btn btn-back mt-20" onClick={() => { setScreen('home'); setAdminError(''); }}>&larr; Back to Home</button>
        </div>
      )}

      {/* 0.5 ADMIN PANEL SCREEN */}
      {screen === 'admin-panel' && (
        <div className="dashboard-box admin-box" style={{maxWidth: '95%'}}>
          <h2>📊 Admin Control Hub</h2>
          
          <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ddd', textAlign: 'left'}}>
            <h3 style={{marginTop: 0, color: '#2c3e50'}}>🔐 Register / Approve Student Mobile</h3>
            <p style={{fontSize: '13px', color: '#7f8c8d'}}>Only numbers added below will be allowed to log in and give tests.</p>
            
            <form onSubmit={handleAddAllowedStudent} style={{display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px'}}>
              <input 
                type="tel" 
                placeholder="Enter Student Mobile No." 
                value={newAllowedMobile}
                onChange={(e) => setNewAllowedMobile(e.target.value)}
                style={{maxWidth: '250px', padding: '8px'}}
              />
              <button type="submit" className="btn btn-main" style={{background: '#3498db', padding: '8px 20px', margin: 0}}>➕ Approve Number</button>
            </form>

            <h4 style={{marginBottom: '5px'}}>📋 Currently Approved Numbers ({allowedStudents.length}):</h4>
            <div style={{maxHeight: '120px', overflowY: 'auto', background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #eee', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
              {allowedStudents.length === 0 ? (
                <span style={{color: '#95a5a6', fontSize: '13px'}}>No students approved yet. Open system is locked.</span>
              ) : (
                allowedStudents.map((phone, i) => (
                  <span key={i} style={{background: '#e8f8f5', color: '#1abc9c', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
                    {phone} 
                    <strong style={{color: '#e74c3c', cursor: 'pointer'}} onClick={() => handleRemoveAllowedStudent(phone)}>×</strong>
                  </span>
                ))
              )}
            </div>
          </div>

          <h3 style={{textAlign: 'left', color: '#2c3e50'}}>📊 Live Student Evaluation Reports:</h3>
          <div className="table-responsive" style={{overflowX: 'auto', margin: '15px 0', maxHeight: '250px', border: '1px solid #ccc', borderRadius: '8px'}}>
            <table className="admin-table" style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'white'}}>
              <thead>
                <tr style={{background: '#34495e', color: 'white'}}>
                  <th style={{padding: '12px'}}>Date & Time</th>
                  <th style={{padding: '12px'}}>Student Name</th>
                  <th style={{padding: '12px'}}>Email ID</th>
                  <th style={{padding: '12px'}}>Mobile Number</th>
                  <th style={{padding: '12px'}}>Test Name</th>
                  <th style={{padding: '12px'}}>Score</th>
                </tr>
              </thead>
              <tbody>
                {localResults.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{padding: '20px', textAlign: 'center', color: '#7f8c8d'}}>⚠️ No students have submitted tests yet.</td>
                  </tr>
                ) : (
                  localResults.map((res, index) => (
                    <tr key={index} style={{borderBottom: '1px solid #ddd', background: index % 2 === 0 ? '#f9f9f9' : '#fff'}}>
                      <td style={{padding: '10px'}}>{res.timestamp}</td>
                      <td style={{padding: '10px'}}><strong>{res.name}</strong></td>
                      <td style={{padding: '10px'}}>{res.email}</td>
                      <td style={{padding: '10px'}}>{res.mobile}</td>
                      <td style={{padding: '10px'}}>{res.testName}</td>
                      <td style={{padding: '10px'}}><span className="badge-score" style={{background: '#2ecc71', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '13px'}}>{res.score}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="main-buttons" style={{flexDirection: 'row', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <button className="btn btn-main" style={{background: '#2ecc71', padding: '10px 20px'}} onClick={downloadCSV}>📥 Download Excel/CSV</button>
            <button className="btn btn-back" style={{background: '#e74c3c', color: 'white', padding: '10px 20px'}} onClick={clearDatabase}>🗑️ Clear Database</button>
            <button className="btn btn-back" style={{background: '#7f8c8d', color: 'white', padding: '10px 20px'}} onClick={() => setScreen('home')}>&larr; Exit Admin Panel</button>
          </div>
        </div>
      )}

      {/* 6. QUIZ INTERFACE SCREEN */}
      {screen === 'quiz' && questions.length > 0 && isStudentLoggedIn && (
        <div className="quiz-box">
          <div className="quiz-header">
            <h3>{quizTitle}</h3>
            {quizMode === 'mock' && (
              <div className={`timer-box ${timeLeft < 300 ? 'timer-warning' : ''}`}>
                ⏱️ Time Left: {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <div className="progress-bar">Question {currentIdx + 1} of {questions.length}</div>
          <div className="question-card">
            <p className="question-text"><strong>Q.{currentIdx + 1}:</strong> {questions[currentIdx].questionText}</p>
            <div className="options-list">
              {questions[currentIdx].options.map((opt, i) => {
                const char = String.fromCharCode(65 + i); 
                const currentQuestionId = questions[currentIdx].id;
                const isSelected = selectedOptions[currentQuestionId] === char;
                const isCorrect = questions[currentIdx].correctOption === char;
                const hasAnswered = practiceAnswered[currentQuestionId]; 
                
                let optClass = "option-btn";
                if (quizMode === 'mock') {
                  if (isSelected) optClass += " selected";
                } else {
                  if (hasAnswered) {
                    if (isCorrect) optClass += " correct-highlight"; 
                    else if (isSelected) optClass += " wrong-highlight"; 
                  } else {
                    if (isSelected) optClass += " selected";
                  }
                }
                return (
                  <button key={i} className={optClass} onClick={() => handleSelectOption(currentQuestionId, char)} disabled={quizMode === 'practice' && hasAnswered}>
                    <span className="opt-char">{char}.</span> {opt}
                  </button>
                );
              })}
            </div>
            {quizMode === 'practice' && practiceAnswered[questions[currentIdx].id] && questions[currentIdx].explanation && (
              <div className="explanation-box animate-fade">
                💡 <strong>Explanation:</strong> {questions[currentIdx].explanation}
              </div>
            )}
          </div>
          <div className="navigation-footer">
            <button className="btn btn-nav" disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)}>&larr; Previous</button>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-nav" onClick={() => setCurrentIdx(currentIdx + 1)}>Next &rarr;</button>
            ) : (
              <button className="btn btn-submit" onClick={handleSubmitQuiz}>Submit Test 🏁</button>
            )}
          </div>
        </div>
      )}

      {/* 7. DETAILED RESULT SCREEN */}
      {screen === 'result' && isStudentLoggedIn && (
        <div className="dashboard-box text-center animate-fade" style={{maxWidth: '700px'}}>
          <h2>🏁 {quizMode === 'mock' ? 'Mock Test' : 'Practice Set'} Completed!</h2>
          <div className="score-badge" style={{fontSize: '24px', padding: '15px 30px', margin: '20px auto', maxWidth: '300px'}}>🎯 Final Score: {scoreDetails.correct} / {scoreDetails.total}</div>
          <div className="result-stats-container" style={{background: '#f8f9fa', padding: '20px', borderRadius: '10px', maxWidth: '400px', margin: '20px auto', textAlign: 'left', border: '1px solid #e2e8f0'}}>
            <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#2c3e50'}}>📊 Performance Report:</h4>
            <p style={{fontSize: '16px', margin: '8px 0'}}>📋 Total Questions: <strong>{scoreDetails.total}</strong></p>
            <p style={{fontSize: '16px', margin: '8px 0', color: '#2ecc71'}}>✅ Correct Answers: <strong>{scoreDetails.correct}</strong></p>
            <p style={{fontSize: '16px', margin: '8px 0', color: '#e74c3c'}}>❌ Wrong Answers: <strong>{scoreDetails.wrong}</strong></p>
            <p style={{fontSize: '16px', margin: '8px 0', color: '#7f8c8d'}}>⚪ Unattempted Questions: <strong>{scoreDetails.unattempted}</strong></p>
          </div>
          <div className="answer-key-section" style={{marginTop: '35px', textAlign: 'left', borderTop: '2px dashed #ccc', paddingTop: '25px'}}>
            <h3 style={{color: '#2c3e50', marginBottom: '15px', textTransform: 'uppercase', fontSize: '18px', letterSpacing: '0.5px'}}>🔑 Detailed Answer Key Review:</h3>
            <div className="review-list" style={{maxHeight: '450px', overflowY: 'auto', paddingRight: '10px', border: '1px solid #eee', borderRadius: '8px', padding: '15px', background: '#fafafa'}}>
              {questions.map((q, idx) => {
                const studentAns = selectedOptions[q.id];
                const correctAns = q.correctOption;
                const isCorrect = studentAns === correctAns;
                return (
                  <div key={idx} style={{padding: '15px', background: 'white', borderRadius: '6px', marginBottom: '12px', borderLeft: `6px solid ${!studentAns ? '#7f8c8d' : isCorrect ? '#2ecc71' : '#e74c3c'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                    <p style={{fontWeight: 'bold', fontSize: '15px', color: '#2c3e50', margin: '0 0 10px 0'}}>Q.{idx + 1}: {q.questionText}</p>
                    <div style={{display: 'flex', gap: '20px', fontSize: '14px', flexWrap: 'wrap'}}>
                      <span style={{color: !studentAns ? '#7f8c8d' : isCorrect ? '#2ecc71' : '#e74c3c'}}>Your Answer: <strong>{studentAns || '❌ Not Attempted'}</strong></span>
                      <span style={{color: '#2ecc71'}}>Correct Answer: <strong>{correctAns}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button className="btn btn-back mt-20" onClick={() => setScreen('dashboard')} style={{width: '100%', maxWidth: '300px', margin: '30px auto 0 auto'}}>Back to Dashboard Hub</button>
        </div>
      )}
    </div>
  );
}

export default App;