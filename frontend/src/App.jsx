import { useForm } from 'react-hook-form';
import useAnswerQuery from './hooks/useAnswerQuery';
import useProcessVideo from './hooks/useProcessVideo';
import { useState, useRef, useCallback, useLayoutEffect} from 'react';
import { MdOutlineArrowLeft, MdOutlineArrowRight } from 'react-icons/md';
import { BiPlus, BiUser, BiSend, BiSolidUserCircle, BiVideo } from 'react-icons/bi';

function App() {
  const [messages, setMessages] = useState([]);
  const [chatMap, setChatMap] = useState([]);
  const [currentTitle, setCurrentTitle] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [errorText] = useState('');
  const [isShowSidebar, setIsShowSidebar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollToLastItem = useRef(null);
  const lastUserIndexRef = useRef(null);
  const generateId = () => Math.random().toString(36).substring(2, 10);

  const { mutate: answerQuery , isPending} = useAnswerQuery({
    onSuccess: (response) => {
      const { answer } = response;
      console.log('Response:', answer);
      addMessage('assistant', answer);
    },
    onError: () => {
      addMessage('assistant', 'Failed to get a response.');
      setIsProcessing(false);
    }
  });

  const { mutate: processVideo } = useProcessVideo({
    onSuccess: (response) => {
      const { prediction } = response;
      updateUserMessage(prediction);
      answerQuery(prediction);
      setIsProcessing(false);
    },
    onError: () => {
      updateUserMessage('Failed to process the video.');
      setIsProcessing(false);
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const createNewChat = () => {
    setMessages([]);
    setCurrentTitle(null);
    setCurrentChatId(null);
    reset();
  };

  const backToHistoryPrompt = (chatId) => {
    const chat = chatMap.find((c) => c.id === chatId);
    if (!chat) return;
    setCurrentTitle(chat.title);
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    reset();
  };

  const toggleSidebar = useCallback(() => {
    setIsShowSidebar((prev) => !prev);
  }, []);

  const submitHandler = (data) => {
    if (!data.text || isProcessing) return;
    const firstMessage = data.text.trim();
    if (!firstMessage) return;

    const newTitle = currentTitle || firstMessage.substring(0, 30).trim() || 'New Chat';
    const newChatId = currentChatId || generateId();
    if (!currentChatId) {
      setCurrentTitle(newTitle);
      setCurrentChatId(newChatId);
      setChatMap((prev) => [...prev, { id: newChatId, title: newTitle, messages: [] }]);
    }

    setIsProcessing(true);
    setMessages((prev) => {
      const updated = [...prev, { role: 'user', content: firstMessage }];
      lastUserIndexRef.current = updated.length - 1;
      setChatMap((prev) => prev.map((chat) =>
        chat.id === (currentChatId || newChatId) ? { ...chat, messages: updated } : chat
      ));
      return updated;
    });

    setTimeout(() => scrollToLastItem.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' }), 1);
    setTimeout(() => reset(), 2);

    // setTimeout(() => {
    //   addMessage('assistant', `echo: ${firstMessage}`);
    //   setIsProcessing(false);
    // }, 100);
    answerQuery(firstMessage);
    setIsProcessing(false);
  };

  const addMessage = (role, content) => {
    setMessages((prev) => {
      const updated = [...prev, { role, content }];
      setChatMap((prevMap) =>
        prevMap.map((chat) =>
          chat.id === currentChatId ? { ...chat, messages: updated } : chat
        )
      );
      return updated;
    });
  };

  const updateUserMessage = (newContent) => {
    if (lastUserIndexRef.current == null) return;
    setMessages((prev) => {
      const updated = [...prev];
      updated[lastUserIndexRef.current] = { role: 'user', content: newContent };
      setChatMap((prevMap) =>
        prevMap.map((chat) =>
          chat.id === currentChatId ? { ...chat, messages: updated } : chat
        )
      );
      return updated;
    });
  };

  useLayoutEffect(() => {
    const handleResize = () => {
      setIsShowSidebar(window.innerWidth <= 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="container">
      <section className={`sidebar ${isShowSidebar ? 'open' : ''}`}>
        <div className="sidebar-header" onClick={createNewChat} role="button">
          <BiPlus size={20} />
          <button>New Chat</button>
        </div>
        <div className="sidebar-history">
          {chatMap.length > 0 && (
            <>
              <p>Chats</p>
              <ul>
                {chatMap.map((chat) => (
                  <li key={chat.id} onClick={() => backToHistoryPrompt(chat.id)}>
                    {chat.title}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="main">
        {!currentTitle && (
          <div className="empty-chat-container">
            <img src="images/ASL_GPT_Logo.png" width={125} height={125} alt="ASL-GPT" />
            <h1>ASL-GPT</h1>
            <h3>How can I help you today?</h3>
          </div>
        )}

        {isShowSidebar ? (
          <MdOutlineArrowRight className="burger" size={28.8} onClick={toggleSidebar} />
        ) : (
          <MdOutlineArrowLeft className="burger" size={28.8} onClick={toggleSidebar} />
        )}

        <div className="main-header">
          <ul>
            {messages.map((chatMsg, idx) => (
              <li key={idx} ref={scrollToLastItem}>
                {chatMsg.role === 'user' ? (
                  <div><BiSolidUserCircle size={28.8} /></div>
                ) : (
                  <img src="images/agent.png" alt="ASL-GPT" />
                )}
                <div>
                  <p className="role-title">{chatMsg.role === 'user' ? 'You' : 'ASL-GPT'}</p>
                  <p>{chatMsg.content}</p>
                </div>
              </li>
            ))}
            {isPending && 
              <li ref={scrollToLastItem}>
                <img src="images/agent.png" alt="ASL-GPT" />
              <div>
                <p className="role-title">ASL-GPT</p>
                <p>Thinking ...</p>
              </div>
              </li>
            }
          </ul>
        </div>

        <div className="main-bottom">
          {errorText && <p className="errorText">{errorText}</p>}
          <form className="form-container" onSubmit={handleSubmit(submitHandler)}>
            <input
              type="text"
              placeholder="Send a message."
              spellCheck="false"
              {...register('text')}
              disabled={isProcessing}
            />
            <label htmlFor="video-upload" className="icon-button">
              <BiVideo size={24} />
            </label>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={(e) => {
                const videoFile = e.target.files[0];
                if (videoFile && !isProcessing) {
                  const initial = 'Video sent';
                  const processing = 'Processing the video...';
                  const title = currentTitle || initial.substring(0, 30).trim();
                  const id = currentChatId || generateId();
                  if (!currentChatId) {
                    setCurrentTitle(title);
                    setCurrentChatId(id);
                    setChatMap((prev) => [...prev, { id, title, messages: [] }]);
                  }
                  setIsProcessing(true);
                  setMessages((prev) => {
                    const updated = [...prev, { role: 'user', content: initial }];
                    lastUserIndexRef.current = updated.length - 1;
                    setChatMap((map) =>
                      map.map((chat) =>
                        chat.id === (currentChatId || id) ? { ...chat, messages: updated } : chat
                      )
                    );
                    return updated;
                  });
                  setTimeout(() => updateUserMessage(processing), 300);
                  processVideo(videoFile);
                }
              }}
              className="file-input"
              style={{ display: 'none' }}
              disabled={isProcessing}
            />
            <button type="submit" disabled={isProcessing}>
              <BiSend size={22.5} style={{ marginLeft: 10 }} />
            </button>
          </form>
          <p>ASL GPT can make mistakes. Consider checking important information.</p>
        </div>
      </section>
    </div>
  );
}

export default App;