'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Button, App, Typography, Spin, List, Empty } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTypewriter } from 'react-simple-typewriter';
import { v4 as uuidv4 } from 'uuid';
import HistoryDrawer from '../../../components/HistoryDrawer';
import { ServerFileInfo, Chat, Message, Attachment, API_BASE_URL } from '../../../types';
import PageHeader from '@/components/PageHeader';
import ChatFooter from '@/components/ChatFooter';
import FileDisplay from '@/lib/GetIconFile';

const { Content } = Layout;
const { Text } = Typography;
const getMessageBubbleStyles = (msg: Message): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '10px',
    maxWidth: '100%',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };
  if (msg.role === 'user') {
    return {
      ...baseStyle,
      background: 'rgba(0, 0, 0, 0.1)',
      marginLeft: 'auto',
      borderBottomRightRadius: '2px',
      minWidth: '100%'
    };
  } else {
    return {
      ...baseStyle,
      color: 'black',
      marginRight: 'auto',
      borderBottomLeftRadius: '2px',
      minWidth: '100%'
    };
  }
};
const TypewriterWrapper = React.memo(
  ({
    content,
    onTypingComplete,
  }: {
    content: string;
    onTypingComplete: () => void;
  }) => {
    const [typedText, helpers] = useTypewriter({
      words: [content || ''],
      loop: 1,
      typeSpeed: 5,
    });

    useEffect(() => {
      if (helpers.isDone) {
        onTypingComplete();
      }
    }, [helpers.isDone, onTypingComplete]);

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{typedText}</ReactMarkdown>
    );
  }
);
TypewriterWrapper.displayName = 'TypewriterWrapper';

export default function ChatPage() {
  const { message: messageApi } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const routeChatId = params.chatId as string;

  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isBotReplying, setIsBotReplying] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleOpenHistoryDrawer = () => setIsHistoryDrawerOpen(true);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) };

  const handleSendMessage = useCallback(async (content: string, attachments: ServerFileInfo[]) => {
    const trimmedContent = content.trim();
    if (!trimmedContent && attachments.length === 0) {
      messageApi.warning('Введите сообщение или прикрепите файлы.');
      return;
    }

    setSendingMessage(true);
    const clientMessageUid = uuidv4();

    const messageAttachments: Attachment[] = attachments.map(sf => ({
      uid: sf.uid,
      name: sf.name,
      type: sf.type,
      size: sf.size,
      url: sf.url || ''
    }));

    const userMessage: Message = {
      uid: clientMessageUid,
      chatUid: routeChatId,
      role: 'user',
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      attachments: messageAttachments,
      isLoading: false,
      error: false,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const attachmentUids = attachments
        .filter(sf => sf && sf.uid)
        .map(sf => sf.uid);

      const payload = {
        uid: clientMessageUid,
        messageUid: clientMessageUid,
        chatUid: routeChatId,
        role: 'user',
        content: trimmedContent,
        attachments: attachmentUids
      };

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        setMessages(prevMsgs => prevMsgs.map(msg =>
          msg.uid === clientMessageUid ? { ...msg, isLoading: false, error: true, content: `${msg.content}\n\n(Ошибка отправки)` } : msg
        ));
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }

      const apiBotMessage = (await response.json()) as Message;

      setMessages((prevMsgs): Message[] => {
        let updatedMessages = prevMsgs.map((msg): Message => {
          if (msg.uid === clientMessageUid) {
            return {
              ...msg,
              isLoading: false,
              error: false,
            };
          }
          return msg;
        });

        if (apiBotMessage && apiBotMessage.uid) {
          const concreteBotMessage: Message = {
            ...apiBotMessage,
            attachments: Array.isArray(apiBotMessage.attachments) ? apiBotMessage.attachments : [],
            isLoading: true,
            createdAt: apiBotMessage.createdAt || new Date().toISOString(),
            error: false,
          };
          updatedMessages.push(concreteBotMessage);
        }
        return updatedMessages;
      });

      if (apiBotMessage && apiBotMessage.uid) {
        setTypingMessageId(apiBotMessage.uid);
        setIsBotReplying(true);
      } else {
        setIsBotReplying(false);
      }

    } catch (error: any) {
      messageApi.error(error.message || 'Ошибка отправки сообщения');
      setMessages(prev => prev.map(m => m.uid === clientMessageUid ? { ...m, isLoading: false, error: true } : m));
      setIsBotReplying(false);
    } finally {
      setSendingMessage(false);
    }
  }, [routeChatId, messageApi]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageId]);

  useEffect(() => {
    if (!routeChatId) return;

    const currentSearchParams = new URLSearchParams(window.location.search);
    const isFirstMessageFlow = currentSearchParams.get('firstMessage') === 'true';

    const fetchChatAndProcess = async () => {
      setLoadingChat(true);
      try {
        const chatResponse = await fetch(`${API_BASE_URL}/chats/${routeChatId}`);
        if (!chatResponse.ok) {
          if (chatResponse.status === 404) {
            messageApi.error(`Чат с ID ${routeChatId} не найден.`);
          } else {
            const errorData = await chatResponse.json().catch(() => ({}));
            messageApi.error(errorData.error || 'Не удалось загрузить данные чата');
          }
          setCurrentChat(null);
          router.push('/');
          return;
        }
        const chatData: Chat = await chatResponse.json();
        setCurrentChat(chatData);
        setMessages(chatData.messages || []);

        if (isFirstMessageFlow) {
          const pendingMessageJSON = sessionStorage.getItem(`pendingMessage_${routeChatId}`);
          if (pendingMessageJSON) {
            const pendingMessage: { content: string; attachments: ServerFileInfo[] } = JSON.parse(pendingMessageJSON);
            sessionStorage.removeItem(`pendingMessage_${routeChatId}`);

            const nextURL = `/chat/${routeChatId}`;
            window.history.replaceState({ ...window.history.state, as: nextURL, url: nextURL }, '', nextURL);

            if (pendingMessage.content || (pendingMessage.attachments && pendingMessage.attachments.length > 0)) {
              await handleSendMessage(pendingMessage.content, pendingMessage.attachments);
            }
          }
        }
      } catch (error: any) {
        messageApi.error(error.message || 'Ошибка загрузки чата или обработки первого сообщения');
        setCurrentChat(null);
        router.push('/');
      } finally {
        setLoadingChat(false);
      }
    };

    fetchChatAndProcess();
  }, [routeChatId, messageApi, router, handleSendMessage]);

  const handleTypingComplete = () => {
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.uid === typingMessageId) {
          return { ...msg, isLoading: false };
        }

        return msg;
      })
    );
    setTypingMessageId(null);
    setIsBotReplying(false);
    scrollToBottom();
  };

  const handleCopyMessage = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => messageApi.success('Текст скопирован!'))
      .catch(() => messageApi.error('Не удалось скопировать текст.'));
  };

  if (loadingChat && !currentChat) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="default" />
      </Layout>
    );
  }

  if (!currentChat) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Чат не найден или произошла ошибка загрузки." />
        <Button type="primary" onClick={() => router.push('/')} style={{ marginTop: 20 }}>
          На главную
        </Button>
      </Layout>
    );
  }

  return (
    <Layout style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PageHeader
        onHistoryClick={handleOpenHistoryDrawer}
        showNewChatButton={true}
      />

      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingLeft: '12px',
          paddingRight: '12px',
          flexGrow: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{
          width: '90%',
          maxWidth: '800px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: '20px',
        }}>
          {messages.length === 0 && !loadingChat ? (
            <Empty description="Сообщений пока нет. Начните диалог!" style={{ marginTop: '20px', marginBottom: '20px', alignSelf: 'center' }} />
          ) : (
            <List
              style={{ width: '100%' }}
              itemLayout="vertical"
              dataSource={messages}
              renderItem={(msg) => (
                <List.Item key={msg.uid} style={{ borderBottom: 'none', padding: '8px 0' }}>
                  {msg.role === 'user' ? (
                    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                      <div style={{ maxWidth: '75%', display: 'flex' }}>
                        <div style={getMessageBubbleStyles(msg)}>
                          {/* Содержимое для пользователя */}
                          <div style={{ width: '100%' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || (msg.isLoading ? 'Отправка...' : '')}</ReactMarkdown>
                          </div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ paddingTop: msg.content ? '8px' : '0px', 
                                          display: 'grid', 
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                          gap: '4px', 
                                          marginTop: '5px'
                            }}>
                              {msg.attachments.map(att => (
                                <div
                                  key={att.uid}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'right',
                                    overflow: 'hidden',
                                    gap: '6px',
                                  }}
                                >
                                  <FileDisplay fileName={`${att.name.substring(0,10)}...`} fileType={att.type} fileSize={att.size} size={10} url={att.uid} />
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ textAlign: 'right', marginTop: '4px' }}>
                            {msg.error && <Text type="danger" style={{ fontSize: '11px', marginLeft: '8px' }}>(Ошибка)</Text>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    //  Для ассистента
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      <div style={getMessageBubbleStyles(msg)}>
                        {/* Содержимое для ассистента */}
                        {msg.isLoading && msg.uid !== typingMessageId ? (
                          <Spin size="small" />
                        ) : (
                          <>
                            <div style={{ width: '100%' }}>
                              {msg.uid === typingMessageId ? (
                                <TypewriterWrapper content={msg.content || ''} onTypingComplete={handleTypingComplete} />
                              ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ''}</ReactMarkdown>
                              )}
                            </div>
                            {(!msg.isLoading && msg.uid !== typingMessageId) && (
                              <div style={{ textAlign: 'left', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyMessage(msg.content)} />
                                  {msg.error && <Text type="danger" style={{ fontSize: '11px', marginLeft: '8px' }}>(Ошибка)</Text>}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </List.Item>
              )}
            />
          )}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </Content>

      <ChatFooter
        onSend={handleSendMessage}
        loading={sendingMessage || isBotReplying}
        chatUid={routeChatId}
        fileUploadUrl={`${API_BASE_URL}/files`}
        fileDeleteUrl={`${API_BASE_URL}/files`}
      />

      <HistoryDrawer
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        currentChatUid={routeChatId}
      />
    </Layout>
  );
}