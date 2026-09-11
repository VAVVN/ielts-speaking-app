import { useState, useEffect, useRef } from 'react';

// The main flow this component handles:
// 1. Load the topic list from the backend (each topic bundles its Part 1,
//    Part 2, and matching Part 3 questions - see backend/topicMap.js)
// 2. Student picks a topic, then works through its questions in order
// 3. Student SPEAKS their answer - the browser's built-in speech
//    recognition (Web Speech API) transcribes it live into the answer box.
//    The student can still edit the text afterwards before submitting.
// 4. Submit -> backend calls Claude -> show sample answer
// 5. Student can "Try again" (same question) or "Next question"
// 6. After the last question in a topic, go back to topic selection

// Chrome/Edge ship this as the prefixed webkitSpeechRecognition; Safari and
// Firefox don't support it at all, so we detect and fall back to typing.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4 9 8 9 13 4 13 20 8 15 4 15 4 9" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

export default function App() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [previousAttempt, setPreviousAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPunctuating, setIsPunctuating] = useState(false);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef(''); // answer text already there before this recording started
  const audioRef = useRef(null); // currently playing sample-answer <audio> element, if any
  const wasRecordingRef = useRef(false); // detects the true -> false transition of isRecording

  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data) => setTopics(data))
      .catch(() => setError('Could not load topics. Is the backend running?'));
  }, []);

  // Runs once recording actually stops (isRecording flips to false) - not
  // inside the button's click handler, because .stop() finalizes the last
  // bit of transcript asynchronously, so we need the up-to-date answerText
  // from the render after that happens, not a stale closure from when
  // recording started.
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      punctuateAnswer();
    }
    wasRecordingRef.current = isRecording;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const currentQuestion = currentQuestions[currentIndex];
  const isLastQuestion = currentIndex === currentQuestions.length - 1;

  function handleSelectTopic(topic) {
    recognitionRef.current?.stop();
    stopSpeaking();
    setSelectedTopic(topic);
    setCurrentQuestions([...topic.part1, ...topic.part2, ...topic.part3]);
    setCurrentIndex(0);
    setAnswerText('');
    setPreviousAttempt(null);
    setResult(null);
    setError(null);
  }

  function handleBackToTopics() {
    recognitionRef.current?.stop();
    stopSpeaking();
    setSelectedTopic(null);
    setCurrentQuestions([]);
  }

  // Text-to-speech for the sample answer, via the backend's /api/tts route
  // (Microsoft Edge's free "Read Aloud" voices - see backend/server.js).
  async function speakSampleAnswer() {
    stopSpeaking();
    setIsSpeaking(true);
    setError(null);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.sample_answer }),
      });

      if (!res.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      setError('Something went wrong generating audio. Please try again.');
      setIsSpeaking(false);
    }
  }

  function stopSpeaking() {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  }

  function startRecording() {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge, or type your answer instead.');
      return;
    }
    setError(null);
    baseTextRef.current = answerText ? `${answerText} ` : '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) baseTextRef.current += finalText;
      setAnswerText(baseTextRef.current + interimText);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  // Sends the raw transcript to the backend to get punctuation/capitalization
  // added and obvious mis-transcriptions fixed, without changing the
  // student's actual wording (see backend/server.js PUNCTUATE_SYSTEM_PROMPT).
  async function punctuateAnswer() {
    if (!answerText.trim() || !currentQuestion) return;
    setIsPunctuating(true);

    try {
      const res = await fetch('/api/punctuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, text: answerText }),
      });

      if (!res.ok) {
        throw new Error('Punctuate request failed');
      }

      const data = await res.json();
      setAnswerText(data.text);
    } catch (err) {
      // Non-fatal: the raw transcript is still there and submittable as-is.
      setError('Could not clean up the transcript automatically. You can still edit it before submitting.');
    } finally {
      setIsPunctuating(false);
    }
  }

  async function handleSubmit() {
    if (!answerText.trim()) return;
    recognitionRef.current?.stop();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerText,
          previousAttempt,
        }),
      });

      if (!res.ok) {
        throw new Error('Evaluation failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong getting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTryAgain() {
    stopSpeaking();
    setPreviousAttempt(answerText);
    setAnswerText('');
    setResult(null);
  }

  function handleNextQuestion() {
    if (isLastQuestion) {
      handleBackToTopics();
      return;
    }
    stopSpeaking();
    setCurrentIndex((i) => i + 1);
    setAnswerText('');
    setPreviousAttempt(null);
    setResult(null);
  }

  if (!selectedTopic) {
    return (
      <div className="page">
        <header className="header">
          <h1>IELTS Speaking Practice</h1>
          <p className="subtitle">Pick a topic to practice</p>
        </header>

        {error && <p className="error-text">{error}</p>}

        {topics.length > 0 && (
          <div className="topic-columns">
            <section className="topic-section">
              <h2 className="topic-section-title">Part 1 topics</h2>
              <ul className="topic-list">
                {topics
                  .filter((topic) => topic.part1.length > 0)
                  .map((topic) => (
                    <li key={topic.id}>
                      <button className="topic-list-item" onClick={() => handleSelectTopic(topic)}>
                        {topic.topic}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>

            <section className="topic-section">
              <h2 className="topic-section-title">Part 2 &amp; 3 topics</h2>
              <ul className="topic-list">
                {topics
                  .filter((topic) => topic.part2.length > 0)
                  .map((topic) => (
                    <li key={topic.id}>
                      <button className="topic-list-item" onClick={() => handleSelectTopic(topic)}>
                        {topic.topic}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        )}

        {topics.length === 0 && !error && <p>Loading topics...</p>}
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="page"><p>Loading questions...</p></div>;
  }

  return (
    <div className="page">
      <header className="header">
        <h1>IELTS Speaking Practice</h1>
        <button className="back-link" onClick={handleBackToTopics}>
          &larr; Quay lại các chủ đề
        </button>
      </header>

      <section className="question-card">
        <span className="part-label">Part {currentQuestion.part} &middot; {currentQuestion.topic}</span>
        <p className="question-text">{currentQuestion.prompt}</p>
      </section>

      {!result && (
        <section className="answer-section">
          <div className="record-row">
            <button
              type="button"
              className={isRecording ? 'record-button recording' : 'record-button'}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
              {isRecording ? 'Stop recording' : 'Start speaking'}
            </button>
            {isRecording && <span className="recording-indicator">Listening...</span>}
            {isPunctuating && <span className="recording-indicator">Cleaning up transcript...</span>}
          </div>
          <textarea
            className="answer-input"
            placeholder="Click “Start speaking” and answer out loud - your words will appear here. You can edit the text before submitting."
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={6}
            disabled={loading || isPunctuating}
          />
          <button
            className="primary-button"
            onClick={handleSubmit}
            disabled={loading || isRecording || isPunctuating || !answerText.trim()}
          >
            {loading ? 'Đang phản hồi...' : 'Gửi câu trả lời'}
          </button>
          {error && <p className="error-text">{error}</p>}
        </section>
      )}

      {result && (
        <section className="result-section">
          <div className="answer-comparison">
            <div className="answer-card">
              <h3>Bạn trả lời</h3>
              <p>{answerText}</p>
            </div>
            <div className="answer-card">
              <h3>Mình điều chỉnh một chút nhé</h3>
              <p>{result.sample_answer}</p>
              <button
                type="button"
                className="speak-button"
                onClick={isSpeaking ? stopSpeaking : speakSampleAnswer}
              >
                {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
                {isSpeaking ? 'Dừng' : 'Nghe'}
              </button>
            </div>
          </div>

          <div className="button-row">
            <button className="secondary-button" onClick={handleTryAgain}>
              Thử lại câu hỏi này
            </button>
            <button className="primary-button" onClick={handleNextQuestion}>
              {isLastQuestion ? 'Finish topic' : 'Câu hỏi tiếp theo'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
